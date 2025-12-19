import { Router, Request, Response } from 'express';
import { isAuthenticated, requireAdmin, requireRole } from '../auth';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { BigCommerceIntegration } from '../integrations/bigcommerce';
import { AmazonIntegration } from '../integrations/amazon';
import { CloverInventoryService } from '../services/clover-inventory-service';
import { z } from 'zod';

const router = Router();
const bigCommerce = new BigCommerceIntegration();

const marketplaceOrderQuerySchema = z.object({
  channelId: z.string().optional(),
  status: z.string().optional(),
  page: z.string().default('1'),
  limit: z.string().default('50'),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

const fulfillOrderSchema = z.object({
  orderId: z.number(),
  carrier: z.string().min(1),
  trackingNumber: z.string().min(1),
  trackingUrl: z.string().optional(),
  serviceLevel: z.string().optional(),
  items: z.array(z.object({
    itemId: z.number(),
    quantity: z.number().min(1),
  })).optional(),
  notes: z.string().optional(),
});

const inventoryRuleSchema = z.object({
  name: z.string().min(1),
  channelId: z.number().optional(),
  ruleType: z.enum(['percentage', 'fixed', 'reserve', 'exclude']),
  percentageAllocation: z.number().min(0).max(100).default(100),
  minStockThreshold: z.number().min(0).default(0),
  reserveQuantity: z.number().min(0).default(0),
  excludedSkus: z.array(z.string()).default([]),
  excludedCategories: z.array(z.string()).default([]),
  includedSkus: z.array(z.string()).optional(),
  includedCategories: z.array(z.string()).optional(),
  syncEnabled: z.boolean().default(true),
  syncIntervalMinutes: z.number().default(60),
  priority: z.number().default(0),
  isActive: z.boolean().default(true),
});

const authorizedUserSchema = z.object({
  userId: z.string(),
  channelId: z.number().optional(),
  permissionLevel: z.enum(['view', 'fulfill', 'manage']).default('view'),
  permissions: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  expiresAt: z.string().optional(),
});

router.get('/channels', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`
      SELECT * FROM marketplace_channels ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching marketplace channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

router.get('/orders', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const params = marketplaceOrderQuerySchema.parse(req.query);
    const page = parseInt(params.page);
    const limit = parseInt(params.limit);
    const offset = (page - 1) * limit;

    let whereClause = sql`1=1`;
    if (params.channelId) {
      whereClause = sql`${whereClause} AND o.channel_id = ${parseInt(params.channelId)}`;
    }
    if (params.status) {
      whereClause = sql`${whereClause} AND o.status = ${params.status}`;
    }
    if (params.fromDate) {
      whereClause = sql`${whereClause} AND o.order_date >= ${params.fromDate}`;
    }
    if (params.toDate) {
      whereClause = sql`${whereClause} AND o.order_date <= ${params.toDate}`;
    }

    const ordersResult = await db.execute(sql`
      SELECT o.*, c.name as channel_name, c.type as channel_type
      FROM marketplace_orders o
      LEFT JOIN marketplace_channels c ON o.channel_id = c.id
      WHERE ${whereClause}
      ORDER BY o.order_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM marketplace_orders o
      WHERE ${whereClause}
    `);

    res.json({
      orders: ordersResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0]?.total as string || '0'),
        totalPages: Math.ceil(parseInt(countResult.rows[0]?.total as string || '0') / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching marketplace orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/orders/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    
    const orderResult = await db.execute(sql`
      SELECT o.*, c.name as channel_name, c.type as channel_type
      FROM marketplace_orders o
      LEFT JOIN marketplace_channels c ON o.channel_id = c.id
      WHERE o.id = ${orderId}
    `);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsResult = await db.execute(sql`
      SELECT * FROM marketplace_order_items WHERE order_id = ${orderId}
    `);

    const fulfillmentsResult = await db.execute(sql`
      SELECT * FROM marketplace_fulfillments WHERE order_id = ${orderId}
    `);

    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows,
      fulfillments: fulfillmentsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

router.post('/sync/orders', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { channelId } = req.body;
    const userId = (req.user as any)?.id;

    const channelResult = await db.execute(sql`
      SELECT * FROM marketplace_channels WHERE id = ${channelId}
    `);

    if (channelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channel = channelResult.rows[0] as any;

    const jobResult = await db.execute(sql`
      INSERT INTO marketplace_sync_jobs (channel_id, job_type, status, triggered_by, started_at)
      VALUES (${channelId}, 'orders', 'running', ${userId}, NOW())
      RETURNING *
    `);

    const job = jobResult.rows[0] as any;

    (async () => {
      try {
        let orders: any[] = [];
        
        if (channel.type === 'bigcommerce') {
          orders = await bigCommerce.getOrdersAwaitingFulfillment(100);
          orders = [...orders, ...(await bigCommerce.getOrdersAwaitingShipment(100))];
        } else if (channel.type === 'amazon') {
          console.log('Amazon order sync not yet implemented');
        }

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const order of orders) {
          try {
            const existingOrder = await db.execute(sql`
              SELECT id FROM marketplace_orders 
              WHERE channel_id = ${channelId} AND external_order_id = ${order.id.toString()}
            `);

            if (existingOrder.rows.length > 0) {
              await db.execute(sql`
                UPDATE marketplace_orders 
                SET status = ${order.status}, 
                    payment_status = ${order.payment_status || 'unknown'},
                    updated_at = NOW(),
                    raw_payload = ${JSON.stringify(order)}
                WHERE id = ${(existingOrder.rows[0] as any).id}
              `);
            } else {
              const shippingAddresses = await bigCommerce.getOrderShippingAddresses(order.id);
              const shippingAddr = shippingAddresses[0] || order.billing_address;

              await db.execute(sql`
                INSERT INTO marketplace_orders (
                  channel_id, external_order_id, order_number, status, order_date,
                  customer_email, customer_name, customer_phone,
                  shipping_address, billing_address,
                  subtotal, shipping_total, tax_total, discount_total, total,
                  currency, payment_status, raw_payload
                ) VALUES (
                  ${channelId}, ${order.id.toString()}, ${order.id.toString()}, ${order.status}, ${order.date_created},
                  ${order.billing_address?.email || null}, 
                  ${`${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim() || 'Unknown'},
                  ${order.billing_address?.phone || null},
                  ${JSON.stringify(shippingAddr)}, ${JSON.stringify(order.billing_address)},
                  ${parseFloat(order.subtotal_ex_tax) || 0}, ${parseFloat(order.shipping_cost_ex_tax) || 0},
                  ${parseFloat(order.total_tax) || 0}, 0, ${parseFloat(order.total_inc_tax) || 0},
                  ${order.currency_code || 'USD'}, ${order.payment_status || 'unknown'}, ${JSON.stringify(order)}
                )
              `);

              const newOrderResult = await db.execute(sql`
                SELECT id FROM marketplace_orders 
                WHERE channel_id = ${channelId} AND external_order_id = ${order.id.toString()}
              `);
              const newOrderId = (newOrderResult.rows[0] as any)?.id;

              if (newOrderId) {
                const products = await bigCommerce.getOrderProducts(order.id);
                for (const product of products) {
                  await db.execute(sql`
                    INSERT INTO marketplace_order_items (
                      order_id, external_item_id, external_product_id, external_variant_id,
                      sku, name, quantity, unit_price, total_price, weight, raw_payload
                    ) VALUES (
                      ${newOrderId}, ${product.id.toString()}, ${product.product_id.toString()}, 
                      ${product.variant_id ? product.variant_id.toString() : null},
                      ${product.sku || null}, ${product.name}, ${product.quantity},
                      ${parseFloat(product.price_ex_tax) || 0}, ${parseFloat(product.total_ex_tax) || 0},
                      ${parseFloat(product.weight) || null}, ${JSON.stringify(product)}
                    )
                  `);
                }
              }
            }
            successCount++;
          } catch (orderError) {
            errorCount++;
            errors.push(`Order ${order.id}: ${orderError instanceof Error ? orderError.message : String(orderError)}`);
          }
        }

        await db.execute(sql`
          UPDATE marketplace_sync_jobs 
          SET status = 'completed',
              total_items = ${orders.length},
              processed_items = ${successCount + errorCount},
              success_count = ${successCount},
              error_count = ${errorCount},
              completed_at = NOW(),
              results = ${JSON.stringify({ ordersProcessed: orders.length })},
              errors = ${JSON.stringify(errors)}
          WHERE id = ${job.id}
        `);

        await db.execute(sql`
          UPDATE marketplace_channels SET last_sync_at = NOW() WHERE id = ${channelId}
        `);

      } catch (syncError) {
        console.error('Order sync failed:', syncError);
        await db.execute(sql`
          UPDATE marketplace_sync_jobs 
          SET status = 'failed',
              completed_at = NOW(),
              errors = ${JSON.stringify([syncError instanceof Error ? syncError.message : String(syncError)])}
          WHERE id = ${job.id}
        `);
      }
    })();

    res.json({ message: 'Order sync started', jobId: job.id });
  } catch (error) {
    console.error('Error starting order sync:', error);
    res.status(500).json({ error: 'Failed to start order sync' });
  }
});

router.post('/orders/:id/fulfill', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = (req.user as any)?.id;
    const fulfillData = fulfillOrderSchema.parse(req.body);

    const orderResult = await db.execute(sql`
      SELECT o.*, c.type as channel_type
      FROM marketplace_orders o
      LEFT JOIN marketplace_channels c ON o.channel_id = c.id
      WHERE o.id = ${orderId}
    `);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0] as any;

    const itemsResult = await db.execute(sql`
      SELECT * FROM marketplace_order_items WHERE order_id = ${orderId}
    `);
    const allItems = itemsResult.rows as any[];

    // Determine which items and quantities to fulfill
    // If fulfillData.items is provided, use those specific quantities (partial fulfillment)
    // Otherwise, fulfill all items with their full quantities
    let itemsToFulfill: Array<{ itemId: number; quantity: number; dbItem: any }> = [];
    
    if (fulfillData.items && fulfillData.items.length > 0) {
      // Partial fulfillment - use specified items and quantities
      const overshipmentErrors: string[] = [];
      
      for (const fulfillItem of fulfillData.items) {
        const dbItem = allItems.find((i: any) => i.id === fulfillItem.itemId);
        if (dbItem) {
          // Calculate remaining unfulfilled quantity
          const remainingQty = (dbItem.quantity || 0) - (dbItem.quantity_fulfilled || 0);
          
          // Guardrail: prevent over-shipment
          if (fulfillItem.quantity > remainingQty) {
            overshipmentErrors.push(
              `Item "${dbItem.name || dbItem.sku}" requested qty ${fulfillItem.quantity} exceeds remaining ${remainingQty}`
            );
          } else {
            itemsToFulfill.push({
              itemId: fulfillItem.itemId,
              quantity: fulfillItem.quantity,
              dbItem,
            });
          }
        }
      }
      
      // If any over-shipment detected, return error
      if (overshipmentErrors.length > 0) {
        return res.status(400).json({ 
          error: 'Over-shipment detected', 
          details: overshipmentErrors 
        });
      }
    } else {
      // Full fulfillment - use remaining unfulfilled quantities for each item
      const overshipmentErrors: string[] = [];
      
      for (const item of allItems) {
        const remainingQty = (item.quantity || 0) - (item.quantity_fulfilled || 0);
        
        if (remainingQty <= 0) {
          // Item already fully fulfilled, skip
          continue;
        }
        
        itemsToFulfill.push({
          itemId: item.id,
          quantity: remainingQty,
          dbItem: item,
        });
      }
      
      // If no items left to fulfill
      if (itemsToFulfill.length === 0) {
        return res.status(400).json({ 
          error: 'No items to fulfill', 
          details: ['All items in this order have already been shipped'] 
        });
      }
    }

    const fulfillmentResult = await db.execute(sql`
      INSERT INTO marketplace_fulfillments (
        order_id, carrier, tracking_number, tracking_url, service_level,
        status, items, shipped_at, fulfilled_by, notes
      ) VALUES (
        ${orderId}, ${fulfillData.carrier}, ${fulfillData.trackingNumber},
        ${fulfillData.trackingUrl || null}, ${fulfillData.serviceLevel || null},
        'shipped', ${JSON.stringify(itemsToFulfill.map(i => ({ itemId: i.itemId, quantity: i.quantity })))},
        NOW(), ${userId}, ${fulfillData.notes || null}
      )
      RETURNING *
    `);

    const fulfillment = fulfillmentResult.rows[0] as any;

    if (order.channel_type === 'bigcommerce') {
      try {
        const shippingAddresses = await bigCommerce.getOrderShippingAddresses(parseInt(order.external_order_id));
        const addressId = shippingAddresses[0]?.id;

        if (addressId) {
          // Use only the items being fulfilled, not all items
          const shipment = await bigCommerce.createOrderShipment(parseInt(order.external_order_id), {
            tracking_number: fulfillData.carrier === 'other' ? '' : fulfillData.trackingNumber,
            shipping_provider: fulfillData.carrier,
            order_address_id: addressId,
            items: itemsToFulfill.map((item) => ({
              order_product_id: parseInt(item.dbItem.external_item_id),
              quantity: item.quantity,
            })),
          });

          await db.execute(sql`
            UPDATE marketplace_fulfillments 
            SET external_shipment_id = ${shipment.id?.toString() || null},
                raw_response = ${JSON.stringify(shipment)}
            WHERE id = ${fulfillment.id}
          `);

          // Check if all items are now fulfilled
          const totalItemsToFulfill = allItems.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
          const totalFulfilled = itemsToFulfill.reduce((sum, i) => sum + i.quantity, 0);
          const previouslyFulfilled = allItems.reduce((sum: number, i: any) => sum + (i.quantity_fulfilled || 0), 0);
          const isFullyFulfilled = (previouslyFulfilled + totalFulfilled) >= totalItemsToFulfill;

          // Update order status: 3 = Partially Shipped, 2 = Shipped
          await bigCommerce.updateOrderStatus(parseInt(order.external_order_id), isFullyFulfilled ? 2 : 3);
        }
      } catch (bcError) {
        console.error('BigCommerce fulfillment error:', bcError);
      }
    }

    // Determine if order is fully or partially shipped
    const totalOrderQty = allItems.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
    const previouslyFulfilledQty = allItems.reduce((sum: number, i: any) => sum + (i.quantity_fulfilled || 0), 0);
    const nowFulfilledQty = itemsToFulfill.reduce((sum, i) => sum + i.quantity, 0);
    const isFullyShipped = (previouslyFulfilledQty + nowFulfilledQty) >= totalOrderQty;

    await db.execute(sql`
      UPDATE marketplace_orders 
      SET status = ${isFullyShipped ? 'shipped' : 'partially_shipped'}, 
          shipped_at = ${isFullyShipped ? sql`NOW()` : sql`shipped_at`},
          updated_at = NOW()
      WHERE id = ${orderId}
    `);

    // Update quantity_fulfilled for each fulfilled item
    for (const item of itemsToFulfill) {
      await db.execute(sql`
        UPDATE marketplace_order_items 
        SET quantity_fulfilled = COALESCE(quantity_fulfilled, 0) + ${item.quantity}
        WHERE id = ${item.itemId}
      `);
    }

    // Adjust Clover inventory for fulfilled items (deduct quantities)
    const inventoryAdjustmentResults: any[] = [];
    try {
      // Only deduct the quantities that are being fulfilled in this shipment
      const itemsWithSku = itemsToFulfill.filter((item) => item.dbItem.sku && item.quantity > 0);
      
      if (itemsWithSku.length > 0) {
        console.log(`📦 [Marketplace] Adjusting Clover inventory for ${itemsWithSku.length} items`);
        const cloverInventoryService = new CloverInventoryService();
        
        const deductionItems = itemsWithSku.map((item) => ({
          sku: item.dbItem.sku,
          quantity: item.quantity,
          itemName: item.dbItem.name,
        }));
        
        const result = await cloverInventoryService.batchDeductStock(deductionItems);
        inventoryAdjustmentResults.push(...result.results);
        
        console.log(`📦 [Marketplace] Inventory adjustment complete:`, {
          success: result.success,
          itemsProcessed: result.results.length,
          successful: result.results.filter(r => r.success).length,
          failed: result.results.filter(r => !r.success).length,
        });

        // Update fulfillment record with inventory adjustment results
        await db.execute(sql`
          UPDATE marketplace_fulfillments 
          SET notes = COALESCE(notes, '') || ${`\nInventory adjusted: ${result.results.filter(r => r.success).length}/${result.results.length} items`}
          WHERE id = ${fulfillment.id}
        `);
      }
    } catch (inventoryError) {
      console.error('Error adjusting Clover inventory:', inventoryError);
      // Don't fail the fulfillment if inventory adjustment fails
    }

    res.json({
      message: 'Order fulfilled successfully',
      fulfillment: fulfillmentResult.rows[0],
      inventoryAdjustments: inventoryAdjustmentResults,
    });
  } catch (error) {
    console.error('Error fulfilling order:', error);
    res.status(500).json({ error: 'Failed to fulfill order' });
  }
});

router.get('/inventory-rules', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`
      SELECT r.*, c.name as channel_name
      FROM marketplace_inventory_rules r
      LEFT JOIN marketplace_channels c ON r.channel_id = c.id
      ORDER BY r.priority DESC, r.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inventory rules:', error);
    res.status(500).json({ error: 'Failed to fetch inventory rules' });
  }
});

router.post('/inventory-rules', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const ruleData = inventoryRuleSchema.parse(req.body);

    const result = await db.execute(sql`
      INSERT INTO marketplace_inventory_rules (
        name, channel_id, rule_type, percentage_allocation, min_stock_threshold,
        reserve_quantity, excluded_skus, excluded_categories, included_skus, included_categories,
        sync_enabled, sync_interval_minutes, priority, is_active, created_by
      ) VALUES (
        ${ruleData.name}, ${ruleData.channelId || null}, ${ruleData.ruleType},
        ${ruleData.percentageAllocation}, ${ruleData.minStockThreshold},
        ${ruleData.reserveQuantity}, ${ruleData.excludedSkus}, ${ruleData.excludedCategories},
        ${ruleData.includedSkus || null}, ${ruleData.includedCategories || null},
        ${ruleData.syncEnabled}, ${ruleData.syncIntervalMinutes}, ${ruleData.priority},
        ${ruleData.isActive}, ${userId}
      )
      RETURNING *
    `);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating inventory rule:', error);
    res.status(500).json({ error: 'Failed to create inventory rule' });
  }
});

router.put('/inventory-rules/:id', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const ruleId = parseInt(req.params.id);
    const ruleData = inventoryRuleSchema.partial().parse(req.body);

    const updates: string[] = [];
    if (ruleData.name !== undefined) updates.push(`name = '${ruleData.name}'`);
    if (ruleData.channelId !== undefined) updates.push(`channel_id = ${ruleData.channelId}`);
    if (ruleData.ruleType !== undefined) updates.push(`rule_type = '${ruleData.ruleType}'`);
    if (ruleData.percentageAllocation !== undefined) updates.push(`percentage_allocation = ${ruleData.percentageAllocation}`);
    if (ruleData.minStockThreshold !== undefined) updates.push(`min_stock_threshold = ${ruleData.minStockThreshold}`);
    if (ruleData.reserveQuantity !== undefined) updates.push(`reserve_quantity = ${ruleData.reserveQuantity}`);
    if (ruleData.syncEnabled !== undefined) updates.push(`sync_enabled = ${ruleData.syncEnabled}`);
    if (ruleData.syncIntervalMinutes !== undefined) updates.push(`sync_interval_minutes = ${ruleData.syncIntervalMinutes}`);
    if (ruleData.priority !== undefined) updates.push(`priority = ${ruleData.priority}`);
    if (ruleData.isActive !== undefined) updates.push(`is_active = ${ruleData.isActive}`);
    updates.push(`updated_at = NOW()`);

    const result = await db.execute(sql.raw(`
      UPDATE marketplace_inventory_rules 
      SET ${updates.join(', ')}
      WHERE id = ${ruleId}
      RETURNING *
    `));

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating inventory rule:', error);
    res.status(500).json({ error: 'Failed to update inventory rule' });
  }
});

router.delete('/inventory-rules/:id', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const ruleId = parseInt(req.params.id);
    await db.execute(sql`DELETE FROM marketplace_inventory_rules WHERE id = ${ruleId}`);
    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory rule:', error);
    res.status(500).json({ error: 'Failed to delete inventory rule' });
  }
});

router.get('/authorized-users', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`
      SELECT au.*, u.name as user_name, u.email as user_email, c.name as channel_name
      FROM marketplace_authorized_users au
      LEFT JOIN users u ON au.user_id = u.id
      LEFT JOIN marketplace_channels c ON au.channel_id = c.id
      ORDER BY au.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching authorized users:', error);
    res.status(500).json({ error: 'Failed to fetch authorized users' });
  }
});

router.post('/authorized-users', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const grantedBy = (req.user as any)?.id;
    const userData = authorizedUserSchema.parse(req.body);

    const result = await db.execute(sql`
      INSERT INTO marketplace_authorized_users (
        user_id, channel_id, permission_level, permissions, is_active, granted_by, expires_at
      ) VALUES (
        ${userData.userId}, ${userData.channelId || null}, ${userData.permissionLevel},
        ${userData.permissions}, ${userData.isActive}, ${grantedBy},
        ${userData.expiresAt ? new Date(userData.expiresAt) : null}
      )
      ON CONFLICT (user_id, channel_id) DO UPDATE SET
        permission_level = EXCLUDED.permission_level,
        permissions = EXCLUDED.permissions,
        is_active = EXCLUDED.is_active,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
      RETURNING *
    `);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error granting marketplace access:', error);
    res.status(500).json({ error: 'Failed to grant marketplace access' });
  }
});

router.delete('/authorized-users/:id', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const authId = parseInt(req.params.id);
    await db.execute(sql`DELETE FROM marketplace_authorized_users WHERE id = ${authId}`);
    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    console.error('Error revoking access:', error);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

router.get('/sync-jobs', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { channelId, status, limit = '20' } = req.query;

    let whereClause = sql`1=1`;
    if (channelId) {
      whereClause = sql`${whereClause} AND j.channel_id = ${parseInt(channelId as string)}`;
    }
    if (status) {
      whereClause = sql`${whereClause} AND j.status = ${status}`;
    }

    const result = await db.execute(sql`
      SELECT j.*, c.name as channel_name, u.name as triggered_by_name
      FROM marketplace_sync_jobs j
      LEFT JOIN marketplace_channels c ON j.channel_id = c.id
      LEFT JOIN users u ON j.triggered_by = u.id
      WHERE ${whereClause}
      ORDER BY j.created_at DESC
      LIMIT ${parseInt(limit as string)}
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sync jobs:', error);
    res.status(500).json({ error: 'Failed to fetch sync jobs' });
  }
});

router.get('/analytics', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const ordersResult = await db.execute(sql`
      SELECT 
        c.name as channel,
        COUNT(*) as total_orders,
        SUM(CASE WHEN o.status IN ('pending', 'awaiting_fulfillment', 'awaiting_shipment') THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN o.status = 'shipped' THEN 1 ELSE 0 END) as shipped_orders,
        SUM(o.total) as total_revenue
      FROM marketplace_orders o
      LEFT JOIN marketplace_channels c ON o.channel_id = c.id
      GROUP BY c.name
    `);

    const recentOrdersResult = await db.execute(sql`
      SELECT 
        DATE(order_date) as date,
        COUNT(*) as orders,
        SUM(total) as revenue
      FROM marketplace_orders
      WHERE order_date >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(order_date)
      ORDER BY date DESC
    `);

    res.json({
      byChannel: ordersResult.rows,
      dailyTrend: recentOrdersResult.rows,
    });
  } catch (error) {
    console.error('Error fetching marketplace analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
