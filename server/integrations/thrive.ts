import { storage } from '../storage';

// Thrive Inventory API Configuration
interface ThriveConfig {
  apiKey: string;
  storeId: string;
  baseUrl: string;
  webhookSecret?: string;
}

// Thrive API Response Types
interface ThriveProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  unitCost: number;
  retailPrice: number;
  wholesalePrice: number;
  quantityOnHand: number;
  reorderLevel: number;
  maxStockLevel: number;
  supplier: {
    id: string;
    name: string;
    contactInfo: string;
  };
  isActive: boolean;
  lastUpdated: string;
}

interface ThriveStockMovement {
  id: string;
  productId: string;
  movementType: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  reason: string;
  reference: string;
  timestamp: string;
  location: string;
  unitCost?: number;
}

interface ThrivePurchaseOrder {
  id: string;
  supplierId: string;
  orderDate: string;
  expectedDelivery: string;
  status: 'pending' | 'ordered' | 'received' | 'cancelled';
  totalAmount: number;
  items: {
    productId: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
  }[];
}

export class ThriveIntegration {
  private config: ThriveConfig;

  constructor() {
    this.config = {
      apiKey: process.env.THRIVE_API_KEY || '',
      storeId: process.env.THRIVE_STORE_ID || '',
      baseUrl: process.env.THRIVE_BASE_URL || 'https://api.thrive.com/v1',
      webhookSecret: process.env.THRIVE_WEBHOOK_SECRET || ''
    };
  }

  // Make authenticated API calls to Thrive
  private async makeThriveAPICall(endpoint: string, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: any): Promise<any> {
    try {
      const config = await storage.getThriveConfig();
      if (!config || !config.apiKey) {
        throw new Error('Thrive Inventory not configured');
      }

      const url = `${config.baseUrl}/stores/${config.storeId}/${endpoint}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        throw new Error(`Thrive API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Thrive API call error:', error);
      throw error;
    }
  }

  // Sync all inventory items from Thrive
  async syncInventory(): Promise<void> {
    try {
      const response = await this.makeThriveAPICall('products');
      const products: ThriveProduct[] = response.products || [];

      for (const product of products) {
        const inventoryData = {
          externalId: product.id,
          itemName: product.name,
          sku: product.sku,
          description: product.description,
          category: product.category,
          brand: product.brand,
          currentQuantity: product.quantityOnHand,
          unitCost: product.unitCost.toString(),
          unitPrice: product.retailPrice.toString(),
          wholesalePrice: product.wholesalePrice.toString(),
          reorderLevel: product.reorderLevel,
          maxStockLevel: product.maxStockLevel,
          supplierId: product.supplier.id,
          supplierName: product.supplier.name,
          isActive: product.isActive,
          lastSyncDate: new Date(),
          source: 'thrive' as const
        };

        await storage.upsertInventoryItem(inventoryData);
      }

      // Log successful sync
      await storage.createIntegrationLog({
        integration: 'thrive',
        operation: 'sync_inventory',
        status: 'success',
        details: `Synced ${products.length} inventory items`,
        timestamp: new Date()
      });

    } catch (error) {
      await storage.createIntegrationLog({
        integration: 'thrive',
        operation: 'sync_inventory',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  // Monitor stock levels and generate alerts
  async checkStockLevels(): Promise<{ lowStockItems: any[]; outOfStockItems: any[] }> {
    try {
      const response = await this.makeThriveAPICall('products/stock-status');
      const stockData = response.stockStatus || [];

      const lowStockItems: any[] = [];
      const outOfStockItems: any[] = [];

      for (const item of stockData) {
        if (item.quantityOnHand <= 0) {
          outOfStockItems.push({
            productId: item.productId,
            name: item.productName,
            sku: item.sku,
            quantityOnHand: item.quantityOnHand,
            reorderLevel: item.reorderLevel
          });
        } else if (item.quantityOnHand <= item.reorderLevel) {
          lowStockItems.push({
            productId: item.productId,
            name: item.productName,
            sku: item.sku,
            quantityOnHand: item.quantityOnHand,
            reorderLevel: item.reorderLevel
          });
        }
      }

      // Update inventory quantities in our database
      for (const item of stockData) {
        await storage.updateInventoryQuantity(item.productId, item.quantityOnHand);
      }

      return { lowStockItems, outOfStockItems };

    } catch (error) {
      console.error('Error checking stock levels:', error);
      throw error;
    }
  }

  // Sync stock movements (transactions)
  async syncStockMovements(startDate?: Date, endDate?: Date): Promise<void> {
    try {
      const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
      const end = endDate || new Date();

      const params = new URLSearchParams({
        'start_date': start.toISOString().split('T')[0],
        'end_date': end.toISOString().split('T')[0]
      });

      const response = await this.makeThriveAPICall(`stock-movements?${params.toString()}`);
      const movements: ThriveStockMovement[] = response.movements || [];

      for (const movement of movements) {
        // Create financial transaction for inventory movements
        await this.createFinancialTransactionForStockMovement(movement);
      }

      // Log successful sync
      await storage.createIntegrationLog({
        integration: 'thrive',
        operation: 'sync_stock_movements',
        status: 'success',
        details: `Synced ${movements.length} stock movements`,
        timestamp: new Date()
      });

    } catch (error) {
      await storage.createIntegrationLog({
        integration: 'thrive',
        operation: 'sync_stock_movements',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  // Create financial transaction for stock movement
  private async createFinancialTransactionForStockMovement(movement: ThriveStockMovement): Promise<void> {
    try {
      const inventoryAccount = await storage.getFinancialAccountByName('Inventory');
      const cogsAccount = await storage.getFinancialAccountByName('Cost of Goods Sold');
      const purchaseAccount = await storage.getFinancialAccountByName('Purchases');

      if (!inventoryAccount) {
        console.warn('Inventory account not found in chart of accounts');
        return;
      }

      const product = await storage.getInventoryItemByExternalId(movement.productId);
      if (!product) {
        console.warn(`Product not found for movement: ${movement.productId}`);
        return;
      }

      const unitCost = movement.unitCost || parseFloat(product.unitCost);
      const totalValue = unitCost * Math.abs(movement.quantity);

      const transactionData = {
        transactionDate: new Date(movement.timestamp),
        description: `Inventory ${movement.movementType}: ${product.itemName} (${movement.reason})`,
        reference: movement.reference,
        totalAmount: totalValue.toString(),
        source: 'thrive' as const
      };

      const transaction = await storage.createFinancialTransaction(transactionData);

      // Handle different movement types
      switch (movement.movementType) {
        case 'in':
          // Inventory purchase - Debit Inventory, Credit Purchases/AP
          await storage.createTransactionLine({
            transactionId: transaction.id,
            accountId: inventoryAccount.id,
            description: 'Inventory received',
            debitAmount: totalValue.toString(),
            creditAmount: null
          });

          if (purchaseAccount) {
            await storage.createTransactionLine({
              transactionId: transaction.id,
              accountId: purchaseAccount.id,
              description: 'Purchase cost',
              debitAmount: null,
              creditAmount: totalValue.toString()
            });
          }
          break;

        case 'out':
          // Inventory sale/usage - Credit Inventory, Debit COGS
          await storage.createTransactionLine({
            transactionId: transaction.id,
            accountId: inventoryAccount.id,
            description: 'Inventory sold/used',
            debitAmount: null,
            creditAmount: totalValue.toString()
          });

          if (cogsAccount) {
            await storage.createTransactionLine({
              transactionId: transaction.id,
              accountId: cogsAccount.id,
              description: 'Cost of goods sold',
              debitAmount: totalValue.toString(),
              creditAmount: null
            });
          }
          break;

        case 'adjustment':
          // Inventory adjustment - adjust inventory value
          const isIncrease = movement.quantity > 0;
          
          await storage.createTransactionLine({
            transactionId: transaction.id,
            accountId: inventoryAccount.id,
            description: `Inventory adjustment: ${movement.reason}`,
            debitAmount: isIncrease ? totalValue.toString() : null,
            creditAmount: !isIncrease ? totalValue.toString() : null
          });

          // Counter-entry to adjustment account (or COGS for decreases)
          const adjustmentAccount = await storage.getFinancialAccountByName('Inventory Adjustments') || cogsAccount;
          if (adjustmentAccount) {
            await storage.createTransactionLine({
              transactionId: transaction.id,
              accountId: adjustmentAccount.id,
              description: `Inventory adjustment: ${movement.reason}`,
              debitAmount: !isIncrease ? totalValue.toString() : null,
              creditAmount: isIncrease ? totalValue.toString() : null
            });
          }
          break;
      }

    } catch (error) {
      console.error('Failed to create financial transaction for stock movement:', error);
    }
  }

  // Sync purchase orders
  async syncPurchaseOrders(): Promise<void> {
    try {
      const response = await this.makeThriveAPICall('purchase-orders');
      const purchaseOrders: ThrivePurchaseOrder[] = response.orders || [];

      for (const po of purchaseOrders) {
        // Store purchase order data
        const purchaseOrderData = {
          externalId: po.id,
          supplierId: po.supplierId,
          orderDate: new Date(po.orderDate),
          expectedDelivery: new Date(po.expectedDelivery),
          status: po.status,
          totalAmount: po.totalAmount.toString(),
          source: 'thrive' as const
        };

        await storage.upsertPurchaseOrder(purchaseOrderData);

        // If order is received, create financial transaction
        if (po.status === 'received') {
          await this.createFinancialTransactionForPurchaseOrder(po);
        }
      }

      // Log successful sync
      await storage.createIntegrationLog({
        integration: 'thrive',
        operation: 'sync_purchase_orders',
        status: 'success',
        details: `Synced ${purchaseOrders.length} purchase orders`,
        timestamp: new Date()
      });

    } catch (error) {
      await storage.createIntegrationLog({
        integration: 'thrive',
        operation: 'sync_purchase_orders',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  // Create financial transaction for received purchase order
  private async createFinancialTransactionForPurchaseOrder(po: ThrivePurchaseOrder): Promise<void> {
    try {
      const inventoryAccount = await storage.getFinancialAccountByName('Inventory');
      const apAccount = await storage.getFinancialAccountByName('Accounts Payable');

      if (!inventoryAccount || !apAccount) {
        console.warn('Required accounts not found for purchase order transaction');
        return;
      }

      const transactionData = {
        transactionDate: new Date(),
        description: `Purchase Order Received: ${po.id}`,
        reference: po.id,
        totalAmount: po.totalAmount.toString(),
        source: 'thrive' as const
      };

      const transaction = await storage.createFinancialTransaction(transactionData);

      // Debit Inventory
      await storage.createTransactionLine({
        transactionId: transaction.id,
        accountId: inventoryAccount.id,
        description: 'Inventory received',
        debitAmount: po.totalAmount.toString(),
        creditAmount: null
      });

      // Credit Accounts Payable
      await storage.createTransactionLine({
        transactionId: transaction.id,
        accountId: apAccount.id,
        description: `Payable to supplier`,
        debitAmount: null,
        creditAmount: po.totalAmount.toString()
      });

    } catch (error) {
      console.error('Failed to create financial transaction for purchase order:', error);
    }
  }

  // Test connection to Thrive
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeThriveAPICall('health');
      
      return {
        success: true,
        message: `Connected to Thrive Inventory for store: ${response.storeName || 'Unknown'}`
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  // Generate low stock alert report
  async generateLowStockReport(): Promise<any> {
    try {
      const { lowStockItems, outOfStockItems } = await this.checkStockLevels();
      
      const report = {
        generatedAt: new Date(),
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        lowStockItems,
        outOfStockItems,
        recommendations: []
      };

      // Add recommendations
      if (outOfStockItems.length > 0) {
        report.recommendations.push('Immediate action required: Out of stock items need reordering');
      }
      
      if (lowStockItems.length > 5) {
        report.recommendations.push('Consider bulk ordering to optimize purchase costs');
      }

      return report;

    } catch (error) {
      throw new Error(`Failed to generate low stock report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Load configuration from database
  async loadConfig(): Promise<void> {
    const config = await storage.getThriveConfig();
    if (config) {
      this.config.apiKey = config.apiKey || '';
      this.config.storeId = config.storeId || '';
      this.config.baseUrl = config.baseUrl || '';
    }
  }

  // Create purchase order for low stock items
  async createPurchaseOrderForLowStock(supplierId: string, items: { productId: string; quantity: number }[]): Promise<{ success: boolean; orderId?: string; message: string }> {
    try {
      const orderData = {
        supplierId: supplierId,
        items: items,
        orderDate: new Date().toISOString(),
        notes: 'Auto-generated order for low stock items'
      };

      const response = await this.makeThriveAPICall('purchase-orders', 'POST', orderData);
      
      return {
        success: true,
        orderId: response.orderId,
        message: `Purchase order created successfully: ${response.orderId}`
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create purchase order'
      };
    }
  }
}

export const thriveIntegration = new ThriveIntegration();