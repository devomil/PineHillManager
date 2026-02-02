import { Router, Request, Response } from 'express';
import { isAuthenticated, requireAdmin, requireRole } from '../auth';
import { db } from '../db';
import { storage } from '../storage';
import { sql } from 'drizzle-orm';
import { BigCommerceIntegration } from '../integrations/bigcommerce';
import { AmazonIntegration } from '../integrations/amazon';
import { shippoIntegration } from '../integrations/shippo';
import { CloverInventoryService } from '../services/clover-inventory-service';
import { marketplaceSyncScheduler } from '../services/marketplace-sync-scheduler';
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
  timePeriod: z.string().optional(),
});

// Helper to calculate date ranges for time period filters
function getTimePeriodDates(timePeriod: string): { fromDate: Date; toDate: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (timePeriod) {
    case 'today':
      return { fromDate: today, toDate: now };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { fromDate: yesterday, toDate: today };
    }
    case 'this_week': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      return { fromDate: startOfWeek, toDate: now };
    }
    case 'last_week': {
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - startOfLastWeek.getDay() - 7);
      // End of last week = start of this week minus 1 millisecond
      const startOfThisWeek = new Date(today);
      startOfThisWeek.setDate(startOfThisWeek.getDate() - startOfThisWeek.getDay());
      const endOfLastWeek = new Date(startOfThisWeek.getTime() - 1);
      return { fromDate: startOfLastWeek, toDate: endOfLastWeek };
    }
    case 'this_month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { fromDate: startOfMonth, toDate: now };
    }
    case 'last_month': {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      // End of last month = start of current month minus 1 millisecond
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      endOfLastMonth.setMilliseconds(endOfLastMonth.getMilliseconds() - 1);
      return { fromDate: startOfLastMonth, toDate: endOfLastMonth };
    }
    case 'last_30_days': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return { fromDate: thirtyDaysAgo, toDate: now };
    }
    case 'last_90_days': {
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      return { fromDate: ninetyDaysAgo, toDate: now };
    }
    default:
      return null;
  }
}

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
    
    // Handle status filtering including special pending_fulfillment which matches multiple statuses
    // Use case-insensitive matching and normalize underscores/spaces since database has mixed formats
    if (params.status) {
      if (params.status === 'pending_fulfillment') {
        whereClause = sql`${whereClause} AND LOWER(o.status) IN ('pending', 'awaiting_payment', 'awaiting_fulfillment', 'awaiting_shipment', 'partially_shipped')`;
      } else if (params.status === 'cancelled') {
        // Handle both British (cancelled) and American (canceled) spellings
        whereClause = sql`${whereClause} AND LOWER(o.status) IN ('cancelled', 'canceled')`;
      } else if (params.status === 'partially_refunded') {
        // Handle both underscore and space versions
        whereClause = sql`${whereClause} AND (LOWER(o.status) = 'partially_refunded' OR LOWER(o.status) = 'partially refunded')`;
      } else {
        // General case: match with underscore replaced by space for flexibility
        const statusWithSpace = params.status.replace(/_/g, ' ');
        whereClause = sql`${whereClause} AND (LOWER(o.status) = LOWER(${params.status}) OR LOWER(o.status) = LOWER(${statusWithSpace}))`;
      }
    }
    
    // Handle time period filtering
    if (params.timePeriod && params.timePeriod !== 'all') {
      const dateRange = getTimePeriodDates(params.timePeriod);
      if (dateRange) {
        whereClause = sql`${whereClause} AND o.order_placed_at >= ${dateRange.fromDate.toISOString()} AND o.order_placed_at <= ${dateRange.toDate.toISOString()}`;
      }
    } else {
      // Fall back to explicit date params
      if (params.fromDate) {
        whereClause = sql`${whereClause} AND o.order_placed_at >= ${params.fromDate}`;
      }
      if (params.toDate) {
        whereClause = sql`${whereClause} AND o.order_placed_at <= ${params.toDate}`;
      }
    }

    const ordersResult = await db.execute(sql`
      SELECT o.*, c.name as channel_name, c.type as channel_type
      FROM marketplace_orders o
      LEFT JOIN marketplace_channels c ON o.channel_id = c.id
      WHERE ${whereClause}
      ORDER BY o.order_placed_at DESC
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

router.patch('/orders/:id/notes', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const { seller_notes } = req.body;
    
    const existingOrder = await db.execute(sql`
      SELECT id FROM marketplace_orders WHERE id = ${orderId}
    `);
    
    if (existingOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    await db.execute(sql`
      UPDATE marketplace_orders 
      SET internal_notes = ${seller_notes}, updated_at = NOW()
      WHERE id = ${orderId}
    `);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating order notes:', error);
    res.status(500).json({ error: 'Failed to update order notes' });
  }
});

router.get('/inventory/by-sku/:sku', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const sku = req.params.sku;
    const productName = req.query.name as string | undefined;
    
    // Try multiple matching strategies:
    // 1. Exact SKU match
    // 2. Match by UPC field
    // 3. Fallback: fuzzy name match if provided
    let inventoryResult = await db.execute(sql`
      SELECT i.id, i.sku, i.item_name, i.quantity_on_hand, i.unit_price, i.unit_cost,
             l.id as location_id, l.name as location_name
      FROM inventory_items i
      LEFT JOIN locations l ON i.location_id = l.id
      WHERE (i.sku = ${sku} OR i.upc = ${sku}) AND i.is_active = true
      ORDER BY l.name
    `);
    
    // If no match by SKU/UPC and product name provided, try name-based matching
    if (inventoryResult.rows.length === 0 && productName) {
      // Extract key words from product name for matching
      const searchTerms = productName.toLowerCase()
        .replace(/pine hill farm/gi, '')
        .replace(/cultivating wellness/gi, '')
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 3);
      
      if (searchTerms.length > 0) {
        const searchPattern = '%' + searchTerms.join('%') + '%';
        inventoryResult = await db.execute(sql`
          SELECT i.id, i.sku, i.item_name, i.quantity_on_hand, i.unit_price, i.unit_cost,
                 l.id as location_id, l.name as location_name
          FROM inventory_items i
          LEFT JOIN locations l ON i.location_id = l.id
          WHERE LOWER(i.item_name) LIKE ${searchPattern} AND i.is_active = true
          ORDER BY l.name
          LIMIT 10
        `);
      }
    }
    
    res.json({
      sku,
      locations: inventoryResult.rows.map((row: any) => ({
        id: row.location_id,
        name: row.location_name || 'Unknown Location',
        available_quantity: parseFloat(row.quantity_on_hand) || 0,
        unit_price: row.unit_price,
        unit_cost: row.unit_cost,
        margin: row.unit_price && row.unit_cost 
          ? ((1 - parseFloat(row.unit_cost) / parseFloat(row.unit_price)) * 100).toFixed(2) + '%'
          : 'N/A'
      }))
    });
  } catch (error) {
    console.error('Error fetching inventory by SKU:', error);
    res.status(500).json({ error: 'Failed to fetch inventory data' });
  }
});

router.post('/orders/:id/fulfill', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const { items, carrier, trackingNumber, trackingUrl } = req.body;
    const userId = (req.user as any)?.id;
    
    const existingOrder = await db.execute(sql`
      SELECT * FROM marketplace_orders WHERE id = ${orderId}
    `);
    
    if (existingOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = existingOrder.rows[0] as any;
    
    await db.execute(sql`
      UPDATE marketplace_orders 
      SET status = 'shipped',
          fulfillment_status = 'fulfilled',
          fulfilled_at = NOW(),
          fulfilled_by = ${userId},
          shipping_carrier = ${carrier || order.shipping_carrier},
          updated_at = NOW()
      WHERE id = ${orderId}
    `);
    
    if (trackingNumber) {
      await db.execute(sql`
        INSERT INTO marketplace_fulfillments (
          order_id, tracking_number, tracking_url, carrier, status, created_at
        ) VALUES (
          ${orderId}, ${trackingNumber}, ${trackingUrl || null}, ${carrier || 'Other'}, 'shipped', NOW()
        )
      `);
    }

    res.json({ success: true, message: 'Order fulfilled successfully' });
  } catch (error) {
    console.error('Error fulfilling order:', error);
    res.status(500).json({ error: 'Failed to fulfill order' });
  }
});

// In-store pickup endpoint
router.post('/orders/:id/in-store-pickup', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = (req.user as any)?.id;
    
    const existingOrder = await db.execute(sql`
      SELECT * FROM marketplace_orders WHERE id = ${orderId}
    `);
    
    if (existingOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = existingOrder.rows[0] as any;
    const pickupReference = 'PICKUP-' + order.external_order_number;
    
    await db.execute(sql`
      UPDATE marketplace_orders 
      SET status = 'ready_for_pickup',
          fulfillment_status = 'ready_for_pickup',
          shipping_method = 'In-Store Pickup',
          shipping_carrier = 'In-Store',
          updated_at = NOW()
      WHERE id = ${orderId}
    `);
    
    // Create a fulfillment record for tracking
    await db.execute(sql`
      INSERT INTO marketplace_fulfillments (
        order_id, tracking_number, carrier, status, created_at
      ) VALUES (
        ${orderId}, ${pickupReference}, 'In-Store', 'ready_for_pickup', NOW()
      )
    `);

    res.json({ 
      success: true, 
      message: 'Order marked for in-store pickup',
      reference: pickupReference
    });
  } catch (error) {
    console.error('Error marking order for pickup:', error);
    res.status(500).json({ error: 'Failed to mark order for in-store pickup' });
  }
});

router.post('/sync/orders', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { channelId } = req.body;
    const userId = (req.user as any)?.id;
    
    console.log('📦 [Marketplace Sync] Starting order sync for channel:', channelId);

    const channelResult = await db.execute(sql`
      SELECT * FROM marketplace_channels WHERE id = ${channelId}
    `);

    if (channelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channel = channelResult.rows[0] as any;
    console.log('📦 [Marketplace Sync] Channel found:', channel.type, channel.name);

    const jobResult = await db.execute(sql`
      INSERT INTO marketplace_sync_jobs (channel_id, job_type, status, triggered_by, started_at)
      VALUES (${channelId}, 'orders', 'running', ${userId}, NOW())
      RETURNING *
    `);

    const job = jobResult.rows[0] as any;
    console.log('📦 [Marketplace Sync] Job created:', job.id);

    (async () => {
      try {
        let orders: any[] = [];
        
        if (channel.type === 'bigcommerce') {
          // Fetch orders from multiple statuses:
          // BigCommerce order status IDs:
          // 0=Pending, 1=Awaiting Payment, 2=Shipped, 3=Partially Shipped
          // 4=Refunded, 5=Cancelled, 6=Declined, 7=Awaiting Pickup
          // 8=Awaiting Shipment, 9=Awaiting Shipment, 10=Completed, 11=Awaiting Fulfillment
          // 12=Manual Verification Required, 13=Disputed, 14=Partially Refunded
          const statusesToFetch = [
            { id: 0, name: 'Pending' },
            { id: 1, name: 'Awaiting Payment' },
            { id: 11, name: 'Awaiting Fulfillment' },
            { id: 9, name: 'Awaiting Shipment' },
            { id: 3, name: 'Partially Shipped' },
            { id: 2, name: 'Shipped' },
            { id: 10, name: 'Completed' },
            { id: 5, name: 'Cancelled' },
            { id: 4, name: 'Refunded' },
            { id: 14, name: 'Partially Refunded' },
            { id: 13, name: 'Disputed' },
            { id: 12, name: 'Manual Verification Required' },
          ];
          
          for (const status of statusesToFetch) {
            console.log(`📦 [BigCommerce Sync] Fetching ${status.name} orders (status ${status.id})...`);
            // Sort by date_created:desc to get newest orders first, and fetch up to 250 per status
            const statusOrders = await bigCommerce.getOrders({ 
              statusId: status.id, 
              limit: 250,
              sort: 'date_created:desc'
            });
            console.log(`📦 [BigCommerce Sync] Got ${statusOrders.length} ${status.name} orders`);
            orders = [...orders, ...statusOrders];
          }
          
          console.log(`📦 [BigCommerce Sync] Total orders to sync: ${orders.length}`);
        } else if (channel.type === 'amazon') {
          console.log('📦 [Amazon Sync] Starting Amazon order sync...');
          
          try {
            // Use environment secrets for Amazon credentials, with channel config for marketplace-specific settings
            const channelConfig = channel.api_config || {};
            const amazonCredentials = {
              sellerId: process.env.AMAZON_SELLER_ID,
              refreshToken: process.env.AMAZON_REFRESH_TOKEN,
              clientId: process.env.AMAZON_CLIENT_ID,
              clientSecret: process.env.AMAZON_CLIENT_SECRET,
              marketplaceId: channelConfig.marketplaceId || process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER',
              baseUrl: channelConfig.baseUrl || process.env.AMAZON_BASE_URL || 'https://sellingpartnerapi-na.amazon.com'
            };
            
            if (!amazonCredentials.sellerId || !amazonCredentials.refreshToken) {
              throw new Error('Amazon credentials not configured in environment secrets');
            }
            
            const amazon = new AmazonIntegration(amazonCredentials);
            
            // Fetch orders from last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const ordersResponse = await amazon.getOrders(thirtyDaysAgo.toISOString());
            
            if (ordersResponse && ordersResponse.payload && ordersResponse.payload.Orders) {
              orders = ordersResponse.payload.Orders.map((order: any) => {
                // Parse buyer name from BuyerInfo or ShippingAddress
                const buyerName = order.BuyerInfo?.BuyerName || 
                  (order.ShippingAddress ? `${order.ShippingAddress.Name || ''}`.trim() : '');
                const nameParts = buyerName.split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                
                // Map Amazon shipping address to our format
                const amazonAddr = order.ShippingAddress;
                const shippingAddress = amazonAddr ? {
                  first_name: firstName,
                  last_name: lastName,
                  street_1: amazonAddr.AddressLine1 || '',
                  street_2: amazonAddr.AddressLine2 || '',
                  city: amazonAddr.City || '',
                  state: amazonAddr.StateOrRegion || '',
                  zip: amazonAddr.PostalCode || '',
                  country: amazonAddr.CountryCode || 'US',
                  phone: amazonAddr.Phone || '',
                } : null;
                
                return {
                  id: order.AmazonOrderId,
                  status: order.OrderStatus,
                  date_created: order.PurchaseDate,
                  billing_address: {
                    email: order.BuyerInfo?.BuyerEmail || '',
                    first_name: firstName,
                    last_name: lastName,
                    phone: amazonAddr?.Phone || '',
                  },
                  subtotal_ex_tax: order.OrderTotal?.Amount || '0',
                  shipping_cost_ex_tax: '0', // Amazon doesn't expose shipping separately in order response
                  total_tax: '0', // Tax included in total
                  total_inc_tax: order.OrderTotal?.Amount || '0',
                  currency_code: order.OrderTotal?.CurrencyCode || 'USD',
                  payment_status: order.PaymentMethodDetails || order.PaymentMethod || 'Other',
                  shipping_address: shippingAddress,
                  shipping_method: order.ShipServiceLevel || order.ShipmentServiceLevelCategory || null,
                  shipping_carrier: order.ShipmentCarrier || null,
                  is_amazon: true,
                };
              });
              console.log(`📦 [Amazon Sync] Got ${orders.length} orders`);
            }
          } catch (amazonError) {
            console.error('📦 [Amazon Sync] Error:', amazonError);
            orders = [];
          }
        }

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        console.log(`📦 [Sync] Starting to process ${orders.length} orders for ${channel.type}...`);
        for (const order of orders) {
          try {
            const existingOrder = await db.execute(sql`
              SELECT id FROM marketplace_orders 
              WHERE channel_id = ${channelId} AND external_order_id = ${order.id.toString()}
            `);

            // Normalize status to lowercase for consistent filtering
            const normalizedStatus = String(order.status).toLowerCase().replace(/\s+/g, '_');

            if (existingOrder.rows.length > 0) {
              // Fetch shipping method for existing BigCommerce orders if missing
              let orderShippingAddr = order.shipping_address;
              let orderShippingMethod = order.shipping_method || null;
              
              if (channel.type === 'bigcommerce' && order.id) {
                try {
                  const shippingAddresses = await bigCommerce.getOrderShippingAddresses(order.id);
                  const firstShipping = shippingAddresses[0] as any;
                  if (firstShipping) {
                    orderShippingAddr = firstShipping;
                    orderShippingMethod = firstShipping.shipping_method || firstShipping.shippingMethod || null;
                  }
                } catch (e) {
                  // Use existing data
                }
              }
              
              await db.execute(sql`
                UPDATE marketplace_orders 
                SET status = ${normalizedStatus}, 
                    payment_status = ${order.payment_status || 'unknown'},
                    shipping_address = COALESCE(shipping_address, ${JSON.stringify(orderShippingAddr)}::jsonb),
                    shipping_method = COALESCE(shipping_method, ${orderShippingMethod}),
                    shipping_carrier = COALESCE(shipping_carrier, ${order.shipping_carrier || null}),
                    updated_at = NOW(),
                    raw_payload = ${JSON.stringify(order)}
                WHERE id = ${(existingOrder.rows[0] as any).id}
              `);
            } else {
              // Handle different channel types for address and product fetching
              let shippingAddr = order.shipping_address || order.billing_address;
              let shippingMethod = order.shipping_method || null;
              let shippingCarrier = order.shipping_carrier || null;
              
              if (channel.type === 'bigcommerce' && order.id) {
                try {
                  const shippingAddresses = await bigCommerce.getOrderShippingAddresses(order.id);
                  const firstShipping = shippingAddresses[0] as any;
                  if (firstShipping) {
                    shippingAddr = firstShipping;
                    // BigCommerce includes shipping_method in the shipping address response
                    shippingMethod = firstShipping.shipping_method || firstShipping.shippingMethod || null;
                  }
                } catch (e) {
                  // Use existing shipping address
                }
              }
              
              await db.execute(sql`
                INSERT INTO marketplace_orders (
                  channel_id, external_order_id, external_order_number, status, order_placed_at,
                  customer_email, customer_name, customer_phone,
                  shipping_address, billing_address, shipping_method, shipping_carrier,
                  subtotal, shipping_total, tax_total, discount_total, grand_total,
                  currency, payment_status, raw_payload
                ) VALUES (
                  ${channelId}, ${order.id.toString()}, ${order.id.toString()}, ${normalizedStatus}, ${order.date_created},
                  ${order.billing_address?.email || null}, 
                  ${`${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim() || 'Unknown'},
                  ${order.billing_address?.phone || null},
                  ${JSON.stringify(shippingAddr)}, ${JSON.stringify(order.billing_address)}, 
                  ${shippingMethod}, ${shippingCarrier},
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

              // Fetch line items based on channel type
              if (newOrderId) {
                if (channel.type === 'bigcommerce') {
                  try {
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
                  } catch (e) {
                    console.error(`Failed to fetch products for BigCommerce order ${order.id}:`, e);
                  }
                } else if (channel.type === 'amazon' && order.is_amazon) {
                  // Fetch order items from Amazon
                  try {
                    const channelConfig = channel.api_config || {};
                    const amazonCredentials = {
                      sellerId: process.env.AMAZON_SELLER_ID,
                      refreshToken: process.env.AMAZON_REFRESH_TOKEN,
                      clientId: process.env.AMAZON_CLIENT_ID,
                      clientSecret: process.env.AMAZON_CLIENT_SECRET,
                      marketplaceId: channelConfig.marketplaceId || process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER',
                      baseUrl: channelConfig.baseUrl || process.env.AMAZON_BASE_URL || 'https://sellingpartnerapi-na.amazon.com'
                    };
                    const amazonClient = new AmazonIntegration(amazonCredentials);
                    const itemsResponse = await amazonClient.getOrderItems(order.id);
                    
                    if (itemsResponse?.payload?.OrderItems) {
                      for (const item of itemsResponse.payload.OrderItems) {
                        const unitPrice = parseFloat(item.ItemPrice?.Amount || '0') / (item.QuantityOrdered || 1);
                        await db.execute(sql`
                          INSERT INTO marketplace_order_items (
                            order_id, external_item_id, external_product_id, external_variant_id,
                            sku, name, quantity, unit_price, total_price, weight, raw_payload
                          ) VALUES (
                            ${newOrderId}, ${item.OrderItemId || ''}, ${item.ASIN || ''}, 
                            ${item.SellerSKU || null},
                            ${item.SellerSKU || null}, ${item.Title || 'Unknown Item'}, ${item.QuantityOrdered || 1},
                            ${unitPrice}, ${parseFloat(item.ItemPrice?.Amount || '0')},
                            ${null}, ${JSON.stringify(item)}
                          )
                        `);
                      }
                      console.log(`📦 [Amazon Sync] Saved ${itemsResponse.payload.OrderItems.length} items for order ${order.id}`);
                    }
                  } catch (e) {
                    console.error(`Failed to fetch items for Amazon order ${order.id}:`, e);
                  }
                }
              }
            }
            successCount++;
            if (successCount % 20 === 0) {
              console.log(`📦 [Sync] Processed ${successCount} orders...`);
            }
          } catch (orderError) {
            errorCount++;
            const errorMsg = `Order ${order.id}: ${orderError instanceof Error ? orderError.message : String(orderError)}`;
            console.error(`📦 [Sync] Error: ${errorMsg}`);
            errors.push(errorMsg);
          }
        }

        console.log(`📦 [Sync] Completed! Success: ${successCount}, Errors: ${errorCount}`);
        
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
        
        // Get active Clover configuration to initialize the inventory service
        const activeCloverConfig = await storage.getActiveCloverConfig();
        if (!activeCloverConfig) {
          console.warn('⚠️ [Marketplace] No active Clover configuration found, skipping inventory adjustment');
        } else {
          const cloverInventoryService = new CloverInventoryService();
          await cloverInventoryService.initialize(activeCloverConfig.merchantId);
        
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

// Marketplace sync scheduler status
router.get('/sync-scheduler/status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const status = marketplaceSyncScheduler.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting sync scheduler status:', error);
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

// Trigger manual marketplace sync
router.post('/sync-scheduler/trigger', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { channelId } = req.body;
    const result = await marketplaceSyncScheduler.triggerManualSync(channelId);
    res.json(result);
  } catch (error) {
    console.error('Error triggering manual sync:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

router.get('/sync-jobs', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { channelId, status, limit = '20' } = req.query;
    const limitNum = parseInt(limit as string) || 20;

    // Simple query - just get sync jobs data
    const result = await db.execute(sql`
      SELECT j.*, c.name as channel_name, 'System' as triggered_by_name
      FROM marketplace_sync_jobs j
      LEFT JOIN marketplace_channels c ON j.channel_id = c.id
      ORDER BY j.created_at DESC
      LIMIT ${limitNum}
    `);

    // Filter in memory if channel/status filters are provided
    let jobs = result.rows;
    if (channelId) {
      const channelIdNum = parseInt(channelId as string);
      jobs = jobs.filter((j: any) => j.channel_id === channelIdNum);
    }
    if (status) {
      jobs = jobs.filter((j: any) => j.status === status);
    }

    res.json(jobs);
  } catch (error: any) {
    console.error('Error fetching sync jobs:', error?.message || error);
    res.status(500).json({ error: 'Failed to fetch sync jobs', details: error?.message });
  }
});

router.get('/analytics', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter condition
    let dateFilter = sql`1=1`;
    if (startDate && endDate) {
      dateFilter = sql`o.order_placed_at >= ${startDate}::timestamp AND o.order_placed_at <= ${endDate}::timestamp + interval '1 day'`;
    } else if (startDate) {
      dateFilter = sql`o.order_placed_at >= ${startDate}::timestamp`;
    } else if (endDate) {
      dateFilter = sql`o.order_placed_at <= ${endDate}::timestamp + interval '1 day'`;
    }

    const ordersResult = await db.execute(sql`
      SELECT 
        c.name as channel,
        c.type as channel_type,
        COUNT(*) as total_orders,
        SUM(CASE WHEN LOWER(o.status) IN ('pending', 'awaiting_fulfillment', 'awaiting_shipment', 'incomplete') THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN LOWER(o.status) = 'shipped' THEN 1 ELSE 0 END) as shipped_orders,
        SUM(CASE WHEN LOWER(o.status) = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(o.grand_total::numeric) as total_revenue
      FROM marketplace_orders o
      LEFT JOIN marketplace_channels c ON o.channel_id = c.id
      WHERE ${dateFilter}
      GROUP BY c.name, c.type
    `);

    const recentOrdersResult = await db.execute(sql`
      SELECT 
        DATE(order_placed_at) as date,
        COUNT(*) as orders,
        SUM(grand_total::numeric) as revenue
      FROM marketplace_orders
      WHERE order_placed_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(order_placed_at)
      ORDER BY date DESC
    `);

    // Also get totals
    let totalDateFilter = sql`1=1`;
    if (startDate && endDate) {
      totalDateFilter = sql`order_placed_at >= ${startDate}::timestamp AND order_placed_at <= ${endDate}::timestamp + interval '1 day'`;
    } else if (startDate) {
      totalDateFilter = sql`order_placed_at >= ${startDate}::timestamp`;
    } else if (endDate) {
      totalDateFilter = sql`order_placed_at <= ${endDate}::timestamp + interval '1 day'`;
    }

    const totalsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN LOWER(status) IN ('pending', 'awaiting_fulfillment', 'awaiting_shipment', 'incomplete') THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN LOWER(status) = 'shipped' THEN 1 ELSE 0 END) as shipped_orders,
        SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(grand_total::numeric) as total_revenue
      FROM marketplace_orders
      WHERE ${totalDateFilter}
    `);

    res.json({
      byChannel: ordersResult.rows,
      dailyTrend: recentOrdersResult.rows,
      totals: totalsResult.rows[0] || { total_orders: 0, pending_orders: 0, shipped_orders: 0, completed_orders: 0, total_revenue: 0 },
    });
  } catch (error) {
    console.error('Error fetching marketplace analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ============ SHIPPO SHIPPING INTEGRATION ============

const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY;
const SHIPPO_BASE_URL = 'https://api.goshippo.com';

interface ShippoAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

// Get shipping rates for an order
router.post('/shippo/rates', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!SHIPPO_API_KEY) {
      return res.status(500).json({ error: 'Shippo API key not configured' });
    }

    const { orderId, fromAddress, toAddress, parcels } = req.body;

    // Default from address (Pine Hill Farm - Watertown location)
    const defaultFromAddress: ShippoAddress = fromAddress || {
      name: 'Pine Hill Farm',
      street1: '200 W. Main Street',
      city: 'Watertown',
      state: 'WI',
      zip: '53094',
      country: 'US',
      phone: '2628034121',
      email: 'orders@pinehillfarm.com'
    };

    // Default parcel dimensions
    const defaultParcels = parcels || [{
      length: '10',
      width: '8',
      height: '4',
      distance_unit: 'in',
      weight: '1',
      mass_unit: 'lb'
    }];

    // Create shipment to get rates
    const shipmentResponse = await fetch(`${SHIPPO_BASE_URL}/shipments`, {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address_from: defaultFromAddress,
        address_to: toAddress,
        parcels: defaultParcels,
        async: false
      })
    });

    if (!shipmentResponse.ok) {
      const errorText = await shipmentResponse.text();
      console.error('Shippo shipment error:', errorText);
      return res.status(shipmentResponse.status).json({ error: 'Failed to get shipping rates', details: errorText });
    }

    const shipmentData = await shipmentResponse.json();

    // Format rates for frontend
    const rates = shipmentData.rates?.map((rate: any) => ({
      id: rate.object_id,
      carrier: rate.provider,
      service: rate.servicelevel?.name || rate.servicelevel?.token,
      serviceToken: rate.servicelevel?.token,
      amount: rate.amount,
      currency: rate.currency,
      estimatedDays: rate.estimated_days,
      durationTerms: rate.duration_terms,
      carrierAccount: rate.carrier_account,
      attributes: rate.attributes || []
    })) || [];

    // Sort by price
    rates.sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount));

    res.json({
      shipmentId: shipmentData.object_id,
      rates,
      fromAddress: shipmentData.address_from,
      toAddress: shipmentData.address_to
    });
  } catch (error: any) {
    console.error('Error fetching Shippo rates:', error);
    res.status(500).json({ error: 'Failed to fetch shipping rates', details: error?.message });
  }
});

// Purchase a shipping label
router.post('/shippo/label', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!SHIPPO_API_KEY) {
      return res.status(500).json({ error: 'Shippo API key not configured' });
    }

    const { rateId, orderId } = req.body;

    if (!rateId) {
      return res.status(400).json({ error: 'Rate ID is required' });
    }

    // Get order details for metadata if orderId provided
    let orderMetadata = '';
    let shippoOrderObjectId: string | null = null;
    if (orderId) {
      const orderLookup = await db.execute(sql`
        SELECT o.external_order_number, o.external_order_id, o.customer_name, o.customer_email,
               o.shipping_address, o.order_placed_at, o.grand_total
        FROM marketplace_orders o WHERE o.id = ${orderId}
      `);
      if (orderLookup.rows.length > 0) {
        const orderInfo = orderLookup.rows[0] as any;
        const orderNumber = orderInfo.external_order_number || orderInfo.external_order_id || orderId;
        orderMetadata = `Order ${orderNumber}`;
        
        // Look up Shippo order object_id to link the transaction properly
        try {
          const shippoOrdersResponse = await fetch(`${SHIPPO_BASE_URL}/orders`, {
            headers: { 'Authorization': `ShippoToken ${SHIPPO_API_KEY}` }
          });
          if (shippoOrdersResponse.ok) {
            const shippoOrdersData = await shippoOrdersResponse.json();
            const matchingOrder = shippoOrdersData.results?.find(
              (o: any) => o.order_number === String(orderNumber)
            );
            if (matchingOrder) {
              shippoOrderObjectId = matchingOrder.object_id;
              console.log(`📦 [Shippo] Found existing Shippo order ${shippoOrderObjectId} for order ${orderNumber}`);
            }
          }
        } catch (err) {
          console.warn('⚠️ [Shippo] Could not look up Shippo order:', err);
        }
        
        // If no Shippo order exists, create one so the transaction links properly
        if (!shippoOrderObjectId) {
          try {
            const shippingAddr = orderInfo.shipping_address || {};
            
            // Get order items for line_items
            const itemsResult = await db.execute(sql`
              SELECT product_name, sku, quantity, total_price FROM marketplace_order_items WHERE order_id = ${orderId}
            `);
            
            const lineItems = itemsResult.rows.map((item: any) => ({
              title: item.product_name || 'Item',
              sku: item.sku || '',
              quantity: Number(item.quantity) || 1,
              total_price: String(item.total_price || '0.00'),
              currency: 'USD'
            }));
            
            const shippoOrderData = {
              order_number: String(orderNumber),
              to_address: {
                name: shippingAddr.first_name && shippingAddr.last_name 
                  ? `${shippingAddr.first_name} ${shippingAddr.last_name}` 
                  : orderInfo.customer_name || 'Customer',
                street1: shippingAddr.street_1 || shippingAddr.address1 || '',
                street2: shippingAddr.street_2 || shippingAddr.address2 || '',
                city: shippingAddr.city || '',
                state: shippingAddr.state || '',
                zip: shippingAddr.zip || shippingAddr.postal_code || '',
                country: shippingAddr.country_iso2 || shippingAddr.country || 'US',
                phone: shippingAddr.phone || '',
                email: orderInfo.customer_email || ''
              },
              from_address: {
                name: 'Pine Hill Farm',
                company: 'Pine Hill Farm LLC',
                street1: '200 W. Main Street',
                city: 'Watertown',
                state: 'WI',
                zip: '53094',
                country: 'US',
                phone: '920-253-0255',
                email: 'info@pinehillfarm.co'
              },
              line_items: lineItems.length > 0 ? lineItems : undefined,
              placed_at: orderInfo.order_placed_at ? new Date(orderInfo.order_placed_at).toISOString() : new Date().toISOString()
            };
            
            const newShippoOrder = await shippoIntegration.createOrder(shippoOrderData);
            shippoOrderObjectId = newShippoOrder.object_id;
            console.log(`✅ [Shippo] Created new Shippo order ${shippoOrderObjectId} for order ${orderNumber}`);
          } catch (createErr) {
            console.warn('⚠️ [Shippo] Could not create Shippo order (will proceed without linking):', createErr);
          }
        }
      }
    }

    // Create transaction (purchase label) with order metadata and link to Shippo order
    // Use PDF_4x6 for 4"x6" thermal label printers (portrait orientation)
    const transactionBody: any = {
      rate: rateId,
      label_file_type: 'PDF_4x6',
      async: false,
      metadata: orderMetadata || undefined
    };
    
    // If we found the Shippo order, link the transaction to it
    if (shippoOrderObjectId) {
      transactionBody.order = shippoOrderObjectId;
      console.log(`📦 [Shippo] Linking transaction to Shippo order ${shippoOrderObjectId}`);
    }
    
    const transactionResponse = await fetch(`${SHIPPO_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionBody)
    });

    if (!transactionResponse.ok) {
      const errorText = await transactionResponse.text();
      console.error('Shippo transaction error:', errorText);
      return res.status(transactionResponse.status).json({ error: 'Failed to create label', details: errorText });
    }

    const transactionData = await transactionResponse.json();

    if (transactionData.status !== 'SUCCESS') {
      return res.status(400).json({ 
        error: 'Label creation failed', 
        details: transactionData.messages?.join(', ') || 'Unknown error'
      });
    }

    // Update order with tracking info if orderId provided
    if (orderId) {
      // Get order details to check channel type
      const orderResult = await db.execute(sql`
        SELECT o.*, c.type as channel_type
        FROM marketplace_orders o
        LEFT JOIN marketplace_channels c ON o.channel_id = c.id
        WHERE o.id = ${orderId}
      `);
      
      if (orderResult.rows.length === 0) {
        console.warn(`⚠️ [Shippo] Order ${orderId} not found in database, skipping status update`);
        // Continue with response - label was still purchased successfully
      } else {
        const order = orderResult.rows[0] as any;
        const carrier = transactionData.rate?.provider || 'Unknown';
        const trackingNumber = transactionData.tracking_number;
        const trackingUrl = transactionData.tracking_url_provider;
        const serviceLevel = transactionData.rate?.servicelevel?.name || 'Standard';
        
        // Update order status to 'shipped' in our database
        await db.execute(sql`
          UPDATE marketplace_orders 
          SET status = 'shipped',
              fulfillment_status = 'fulfilled',
              shipping_carrier = ${carrier},
              updated_at = NOW()
          WHERE id = ${orderId}
        `);

        // Create fulfillment record
        const rawResponse = {
          labelUrl: transactionData.label_url,
          shippoTransactionId: transactionData.object_id,
          rate: transactionData.rate,
          eta: transactionData.eta
        };
        
        const labelUrl = transactionData.label_url;
        
        await db.execute(sql`
          INSERT INTO marketplace_fulfillments (
            order_id, tracking_number, tracking_url, label_url, carrier, service_level, status, 
            external_shipment_id, raw_response, shipped_at, created_at
          ) VALUES (
            ${orderId}, 
            ${trackingNumber}, 
            ${trackingUrl}, 
            ${labelUrl},
            ${carrier},
            ${serviceLevel},
            'shipped',
            ${transactionData.object_id},
            ${JSON.stringify(rawResponse)}::jsonb,
            NOW(),
            NOW()
          )
        `);
        
        // For BigCommerce orders, sync tracking info back to BigCommerce
        if (order.channel_type === 'bigcommerce' && order.external_order_id) {
          try {
            const bcOrderId = parseInt(order.external_order_id);
            
            // Get shipping address to get address ID for shipment
            const shippingAddresses = await bigCommerce.getOrderShippingAddresses(bcOrderId);
            const addressId = shippingAddresses[0]?.id;
            
            if (addressId) {
              // Get order items to include in shipment
              const itemsResult = await db.execute(sql`
                SELECT * FROM marketplace_order_items WHERE order_id = ${orderId}
              `);
              const orderItems = itemsResult.rows as any[];
              
              // Create shipment in BigCommerce with tracking info - filter out invalid item IDs
              const shipmentItems = orderItems
                .filter((item: any) => item.external_item_id && !isNaN(parseInt(item.external_item_id)))
                .map((item: any) => ({
                  order_product_id: parseInt(item.external_item_id),
                  quantity: item.quantity,
                }));
              
              if (shipmentItems.length > 0) {
                // Map carrier name to BigCommerce shipping_provider
                const carrierMapping: Record<string, string> = {
                  'usps': 'usps',
                  'ups': 'ups',
                  'fedex': 'fedex',
                  'unknown': 'usps',
                };
                const shippingProvider = carrierMapping[carrier.toLowerCase()] || 'usps';
                
                const shipment = await bigCommerce.createOrderShipment(bcOrderId, {
                  tracking_number: trackingNumber,
                  shipping_provider: shippingProvider,
                  order_address_id: addressId,
                  items: shipmentItems,
                });
                
                console.log(`✅ [Shippo->BigCommerce] Created shipment ${shipment.id} for order ${bcOrderId}`);
                
                // Update fulfillment record with BigCommerce shipment ID
                await db.execute(sql`
                  UPDATE marketplace_fulfillments 
                  SET external_shipment_id = ${shipment.id?.toString() || transactionData.object_id}
                  WHERE order_id = ${orderId} AND tracking_number = ${trackingNumber}
                `);
              }
              
              // Update BigCommerce order status to Shipped (status 2)
              await bigCommerce.updateOrderStatus(bcOrderId, 2);
              console.log(`✅ [Shippo->BigCommerce] Updated order ${bcOrderId} status to Shipped`);
            }
          } catch (bcError) {
            console.error('⚠️ [Shippo->BigCommerce] Failed to sync tracking:', bcError);
            // Don't fail the label creation if BigCommerce sync fails
          }
        }
        
        // Register tracking with Shippo using order metadata
        // This associates the tracking number with the order in Shippo's system
        try {
          const orderNumber = order.external_order_number || order.external_order_id;
          if (orderNumber && trackingNumber) {
            // Map carrier to Shippo carrier token
            const carrierToken = (carrier || 'usps').toLowerCase();
            await shippoIntegration.registerTrackingWithOrder(
              carrierToken,
              trackingNumber,
              orderNumber
            );
          }
        } catch (shippoTrackingError) {
          console.error('⚠️ [Shippo] Failed to register tracking:', shippoTrackingError);
          // Don't fail the label creation if Shippo tracking registration fails
        }
      } // end else (order found)
    }

    res.json({
      success: true,
      transactionId: transactionData.object_id,
      trackingNumber: transactionData.tracking_number,
      trackingUrl: transactionData.tracking_url_provider,
      labelUrl: transactionData.label_url,
      carrier: transactionData.rate?.provider,
      service: transactionData.rate?.servicelevel?.name
    });
  } catch (error: any) {
    console.error('Error purchasing Shippo label:', error);
    res.status(500).json({ error: 'Failed to purchase label', details: error?.message });
  }
});

// Register tracking with Shippo for an order (associates tracking with order in Shippo dashboard)
router.post('/orders/:id/register-shippo-tracking', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!SHIPPO_API_KEY) {
      return res.status(500).json({ error: 'Shippo API key not configured' });
    }
    
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    
    // Get order and fulfillment details
    const orderResult = await db.execute(sql`
      SELECT o.external_order_number, o.external_order_id, f.tracking_number, f.carrier
      FROM marketplace_orders o
      JOIN marketplace_fulfillments f ON f.order_id = o.id
      WHERE o.id = ${orderId}
      ORDER BY f.created_at DESC
      LIMIT 1
    `);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order or fulfillment not found' });
    }
    
    const { external_order_number, external_order_id, tracking_number, carrier } = orderResult.rows[0] as any;
    
    if (!tracking_number) {
      return res.status(400).json({ error: 'No tracking number found for this order' });
    }
    
    // Map carrier to Shippo carrier token
    const carrierMapping: Record<string, string> = {
      'usps': 'usps',
      'ups': 'ups',
      'fedex': 'fedex',
      'unknown': 'usps',
    };
    
    // Detect carrier from tracking number format if carrier is unknown
    let detectedCarrier = (carrier || 'unknown').toLowerCase();
    if (detectedCarrier === 'unknown' && tracking_number) {
      // USPS tracking numbers are typically 20-22 digits
      if (/^\d{20,22}$/.test(tracking_number)) {
        detectedCarrier = 'usps';
      }
      // UPS starts with 1Z
      else if (/^1Z/i.test(tracking_number)) {
        detectedCarrier = 'ups';
      }
      // FedEx is typically 12-15 digits
      else if (/^\d{12,15}$/.test(tracking_number)) {
        detectedCarrier = 'fedex';
      }
    }
    
    const shippoCarrier = carrierMapping[detectedCarrier] || 'usps';
    const orderNumber = external_order_number || external_order_id || orderId;
    
    console.log(`📦 [Shippo] Registering tracking: carrier=${shippoCarrier}, tracking=${tracking_number}, order=${orderNumber}`);
    
    // Register tracking with Shippo using JSON format
    const trackResponse = await fetch(`${SHIPPO_BASE_URL}/tracks/`, {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        carrier: shippoCarrier,
        tracking_number: tracking_number,
        metadata: `Order ${orderNumber}`
      })
    });
    
    if (!trackResponse.ok) {
      const errorText = await trackResponse.text();
      console.error('Shippo track registration error:', errorText);
      return res.status(trackResponse.status).json({ error: 'Failed to register tracking with Shippo', details: errorText });
    }
    
    const trackData = await trackResponse.json();
    console.log(`✅ [Shippo] Registered tracking ${tracking_number} for order ${orderNumber}`);
    
    res.json({
      success: true,
      message: `Tracking registered with Shippo for order ${orderNumber}`,
      trackingNumber: tracking_number,
      carrier: shippoCarrier,
      trackingStatus: trackData.tracking_status
    });
  } catch (error: any) {
    console.error('Error registering tracking with Shippo:', error);
    res.status(500).json({ error: 'Failed to register tracking', details: error?.message });
  }
});

// Create Shippo order and link existing fulfillment to it (for orders that were fulfilled before Shippo order creation)
router.post('/orders/:id/sync-to-shippo', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!SHIPPO_API_KEY) {
      return res.status(500).json({ error: 'Shippo API key not configured' });
    }
    
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    
    // Get order and fulfillment details
    const orderResult = await db.execute(sql`
      SELECT o.external_order_number, o.external_order_id, o.customer_name, o.customer_email,
             o.shipping_address, o.order_placed_at, o.grand_total,
             f.tracking_number, f.tracking_url, f.carrier, f.service_level, f.label_url, f.external_shipment_id
      FROM marketplace_orders o
      LEFT JOIN marketplace_fulfillments f ON f.order_id = o.id
      WHERE o.id = ${orderId}
      ORDER BY f.created_at DESC
      LIMIT 1
    `);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderInfo = orderResult.rows[0] as any;
    const orderNumber = orderInfo.external_order_number || orderInfo.external_order_id || orderId;
    const shippingAddr = orderInfo.shipping_address || {};
    
    // Check if Shippo order already exists using order_number query for better matching
    let shippoOrderObjectId: string | null = null;
    try {
      // Use order_number query parameter for more targeted search
      const shippoOrdersResponse = await fetch(
        `${SHIPPO_BASE_URL}/orders?order_number=${encodeURIComponent(String(orderNumber))}`, 
        {
          headers: { 'Authorization': `ShippoToken ${SHIPPO_API_KEY}` }
        }
      );
      if (shippoOrdersResponse.ok) {
        const shippoOrdersData = await shippoOrdersResponse.json();
        // Find exact match
        const matchingOrder = shippoOrdersData.results?.find(
          (o: any) => o.order_number === String(orderNumber)
        );
        if (matchingOrder) {
          shippoOrderObjectId = matchingOrder.object_id;
          console.log(`📦 [Shippo] Found existing Shippo order ${shippoOrderObjectId} for order ${orderNumber}`);
        }
      }
    } catch (err) {
      console.warn('⚠️ [Shippo] Could not look up Shippo order:', err);
    }
    
    // If no Shippo order exists, create one
    if (!shippoOrderObjectId) {
      // Get order items for line_items
      const itemsResult = await db.execute(sql`
        SELECT product_name, sku, quantity, total_price FROM marketplace_order_items WHERE order_id = ${orderId}
      `);
      
      const lineItems = itemsResult.rows.map((item: any) => ({
        title: item.product_name || 'Item',
        sku: item.sku || '',
        quantity: Number(item.quantity) || 1,
        total_price: String(item.total_price || '0.00'),
        currency: 'USD'
      }));
      
      const shippoOrderData = {
        order_number: String(orderNumber),
        to_address: {
          name: shippingAddr.first_name && shippingAddr.last_name 
            ? `${shippingAddr.first_name} ${shippingAddr.last_name}` 
            : orderInfo.customer_name || 'Customer',
          street1: shippingAddr.street_1 || shippingAddr.address1 || '',
          street2: shippingAddr.street_2 || shippingAddr.address2 || '',
          city: shippingAddr.city || '',
          state: shippingAddr.state || '',
          zip: shippingAddr.zip || shippingAddr.postal_code || '',
          country: shippingAddr.country_iso2 || shippingAddr.country || 'US',
          phone: shippingAddr.phone || '',
          email: orderInfo.customer_email || ''
        },
        from_address: {
          name: 'Pine Hill Farm',
          company: 'Pine Hill Farm LLC',
          street1: '200 W. Main Street',
          city: 'Watertown',
          state: 'WI',
          zip: '53094',
          country: 'US',
          phone: '920-253-0255',
          email: 'info@pinehillfarm.co'
        },
        line_items: lineItems.length > 0 ? lineItems : undefined,
        placed_at: orderInfo.order_placed_at ? new Date(orderInfo.order_placed_at).toISOString() : new Date().toISOString(),
        order_status: orderInfo.tracking_number ? 'SHIPPED' : 'PAID'
      };
      
      try {
        const newShippoOrder = await shippoIntegration.createOrder(shippoOrderData);
        shippoOrderObjectId = newShippoOrder.object_id;
        console.log(`✅ [Shippo] Created Shippo order ${shippoOrderObjectId} for order ${orderNumber}`);
      } catch (createErr: any) {
        console.error('⚠️ [Shippo] Failed to create Shippo order:', createErr);
        return res.status(500).json({ error: 'Failed to create Shippo order', details: createErr?.message });
      }
    }
    
    // If there's a tracking number, register tracking with Shippo
    let trackingRegistered = false;
    if (orderInfo.tracking_number) {
      const carrierMapping: Record<string, string> = {
        'usps': 'usps',
        'USPS': 'usps',
        'USPS Ground Advantage': 'usps',
        'ups': 'ups',
        'UPS': 'ups',
        'fedex': 'fedex',
        'FedEx': 'fedex',
      };
      
      let detectedCarrier = carrierMapping[orderInfo.carrier] || 'usps';
      
      // Register tracking webhook for status updates
      try {
        await fetch(`${SHIPPO_BASE_URL}/tracks/`, {
          method: 'POST',
          headers: {
            'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            carrier: detectedCarrier,
            tracking_number: orderInfo.tracking_number,
            metadata: `Order ${orderNumber}`
          })
        });
        trackingRegistered = true;
        console.log(`✅ [Shippo] Registered tracking ${orderInfo.tracking_number} for order ${orderNumber}`);
      } catch (trackErr) {
        console.warn('⚠️ [Shippo] Could not register tracking:', trackErr);
      }
    }
    
    res.json({
      success: true,
      message: `Order ${orderNumber} synced to Shippo`,
      shippoOrderId: shippoOrderObjectId,
      trackingRegistered,
      trackingNumber: orderInfo.tracking_number || null
    });
  } catch (error: any) {
    console.error('Error syncing order to Shippo:', error);
    res.status(500).json({ error: 'Failed to sync order to Shippo', details: error?.message });
  }
});

// Manually sync tracking info to BigCommerce for orders that have labels but weren't synced
router.post('/orders/:id/sync-tracking', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    
    // Get order details
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
    
    // Get fulfillment with tracking info
    const fulfillmentResult = await db.execute(sql`
      SELECT * FROM marketplace_fulfillments WHERE order_id = ${orderId} ORDER BY created_at DESC LIMIT 1
    `);
    
    if (fulfillmentResult.rows.length === 0) {
      return res.status(400).json({ error: 'No fulfillment record found for this order' });
    }
    
    const fulfillment = fulfillmentResult.rows[0] as any;
    const trackingNumber = fulfillment.tracking_number;
    const carrier = fulfillment.carrier || 'usps';
    
    if (!trackingNumber) {
      return res.status(400).json({ error: 'No tracking number found in fulfillment record' });
    }
    
    // For BigCommerce orders, sync tracking info
    if (order.channel_type === 'bigcommerce' && order.external_order_id) {
      const bcOrderId = parseInt(order.external_order_id);
      
      // Get shipping address to get address ID for shipment
      const shippingAddresses = await bigCommerce.getOrderShippingAddresses(bcOrderId);
      const addressId = shippingAddresses[0]?.id;
      
      if (!addressId) {
        return res.status(400).json({ error: 'No shipping address found for this order in BigCommerce' });
      }
      
      // Get order items to include in shipment
      const itemsResult = await db.execute(sql`
        SELECT * FROM marketplace_order_items WHERE order_id = ${orderId}
      `);
      const orderItems = itemsResult.rows as any[];
      
      // Create shipment in BigCommerce with tracking info - filter out invalid item IDs
      const shipmentItems = orderItems
        .filter((item: any) => item.external_item_id && !isNaN(parseInt(item.external_item_id)))
        .map((item: any) => ({
          order_product_id: parseInt(item.external_item_id),
          quantity: item.quantity,
        }));
      
      if (shipmentItems.length === 0) {
        return res.status(400).json({ error: 'No valid items found for this order (missing or invalid external_item_id)' });
      }
      
      // Map carrier name to BigCommerce shipping_provider
      const carrierMapping: Record<string, string> = {
        'usps': 'usps',
        'ups': 'ups',
        'fedex': 'fedex',
        'unknown': 'usps', // Default to USPS for unknown carriers
      };
      const shippingProvider = carrierMapping[carrier.toLowerCase()] || 'usps';
      
      const shipment = await bigCommerce.createOrderShipment(bcOrderId, {
        tracking_number: trackingNumber,
        shipping_provider: shippingProvider,
        order_address_id: addressId,
        items: shipmentItems,
      });
      
      console.log(`✅ [Manual Sync] Created shipment ${shipment.id} for BigCommerce order ${bcOrderId}`);
      
      // Update fulfillment record with BigCommerce shipment ID
      await db.execute(sql`
        UPDATE marketplace_fulfillments 
        SET external_shipment_id = ${shipment.id?.toString()},
            status = 'shipped',
            updated_at = NOW()
        WHERE id = ${fulfillment.id}
      `);
      
      // Update BigCommerce order status to Shipped (status 2)
      await bigCommerce.updateOrderStatus(bcOrderId, 2);
      console.log(`✅ [Manual Sync] Updated BigCommerce order ${bcOrderId} status to Shipped`);
      
      return res.json({
        success: true,
        message: 'Tracking synced to BigCommerce',
        shipmentId: shipment.id,
        trackingNumber,
      });
    } else {
      return res.status(400).json({ error: 'Order is not a BigCommerce order or missing external_order_id' });
    }
  } catch (error: any) {
    console.error('Error syncing tracking to BigCommerce:', error);
    res.status(500).json({ error: 'Failed to sync tracking', details: error?.message });
  }
});

// Get available carriers
router.get('/shippo/carriers', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!SHIPPO_API_KEY) {
      return res.status(500).json({ error: 'Shippo API key not configured' });
    }

    const response = await fetch(`${SHIPPO_BASE_URL}/carrier_accounts`, {
      headers: {
        'Authorization': `ShippoToken ${SHIPPO_API_KEY}`
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch carriers' });
    }

    const data = await response.json();
    res.json(data.results || []);
  } catch (error: any) {
    console.error('Error fetching Shippo carriers:', error);
    res.status(500).json({ error: 'Failed to fetch carriers', details: error?.message });
  }
});

// Backfill shipping data from Shippo
router.post('/shippo/backfill', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!SHIPPO_API_KEY) {
      return res.status(500).json({ error: 'Shippo API key not configured' });
    }

    console.log('📦 [Shippo Backfill] Starting shipping data backfill...');
    
    // Fetch all transactions from Shippo
    const transactions = await shippoIntegration.getAllTransactions();
    
    // Log sample metadata for debugging
    const sampleMetadata = transactions.slice(0, 5).map(t => ({ 
      tracking: t.tracking_number, 
      metadata: t.metadata,
      parsed: shippoIntegration.parseOrderNumberFromMetadata(t.metadata || '')
    }));
    console.log('📦 [Shippo Backfill] Sample metadata:', JSON.stringify(sampleMetadata, null, 2));
    
    let matchedCount = 0;
    let updatedCount = 0;
    let notFoundCount = 0;
    const results: { orderNumber: string; trackingNumber: string; status: string; matched: boolean }[] = [];

    for (const transaction of transactions) {
      const trackingNumber = transaction.tracking_number;
      const trackingUrl = transaction.tracking_url_provider;
      const carrier = transaction.rate?.provider || 'Unknown';
      const serviceLevel = transaction.rate?.servicelevel?.name || '';
      const metadata = transaction.metadata || '';
      const orderNumber = shippoIntegration.parseOrderNumberFromMetadata(metadata);
      
      // Try to match by order number in metadata first
      let orderResult = null;
      
      if (orderNumber) {
        orderResult = await db.execute(sql`
          SELECT id, external_order_number, external_order_id, status
          FROM marketplace_orders 
          WHERE external_order_number = ${orderNumber} 
             OR external_order_id = ${orderNumber}
          LIMIT 1
        `);
      }
      
      // If no match by order number, try matching by existing tracking number in fulfillments
      if ((!orderResult || orderResult.rows.length === 0) && trackingNumber) {
        orderResult = await db.execute(sql`
          SELECT o.id, o.external_order_number, o.external_order_id, o.status
          FROM marketplace_orders o
          JOIN marketplace_fulfillments f ON f.order_id = o.id
          WHERE f.tracking_number = ${trackingNumber}
          LIMIT 1
        `);
      }

      if (orderResult && orderResult.rows.length > 0) {
        const order = orderResult.rows[0] as any;
        matchedCount++;
        
        // Check if fulfillment record exists
        const existingFulfillment = await db.execute(sql`
          SELECT id FROM marketplace_fulfillments 
          WHERE order_id = ${order.id} AND tracking_number = ${trackingNumber}
        `);
        
        if (existingFulfillment.rows.length === 0) {
          // Create fulfillment record
          await db.execute(sql`
            INSERT INTO marketplace_fulfillments (
              order_id, tracking_number, tracking_url, carrier, service_level,
              status, external_shipment_id, raw_response, created_at, updated_at
            ) VALUES (
              ${order.id}, ${trackingNumber}, ${trackingUrl}, ${carrier}, ${serviceLevel},
              ${transaction.status}, ${transaction.object_id}, ${JSON.stringify(transaction)}::jsonb, NOW(), NOW()
            )
          `);
        } else {
          // Update existing fulfillment
          await db.execute(sql`
            UPDATE marketplace_fulfillments 
            SET tracking_url = ${trackingUrl},
                carrier = ${carrier},
                service_level = ${serviceLevel},
                status = ${transaction.status},
                raw_response = ${JSON.stringify(transaction)}::jsonb,
                updated_at = NOW()
            WHERE order_id = ${order.id} AND tracking_number = ${trackingNumber}
          `);
        }
        
        updatedCount++;
        results.push({
          orderNumber: order.external_order_number || order.external_order_id,
          trackingNumber,
          status: 'updated',
          matched: true
        });
      } else {
        notFoundCount++;
        results.push({
          orderNumber: orderNumber || metadata || 'Unknown',
          trackingNumber,
          status: 'not_found',
          matched: false
        });
      }
    }

    console.log(`📦 [Shippo Backfill] Complete: ${matchedCount} matched, ${updatedCount} updated, ${notFoundCount} not found`);
    
    res.json({
      success: true,
      summary: {
        totalTransactions: transactions.length,
        matched: matchedCount,
        updated: updatedCount,
        notFound: notFoundCount
      },
      details: results.slice(0, 100) // Return first 100 results for review
    });
  } catch (error: any) {
    console.error('📦 [Shippo Backfill] Error:', error);
    res.status(500).json({ error: 'Failed to backfill shipping data', details: error?.message });
  }
});

// Get Shippo backfill status/preview
router.get('/shippo/backfill/preview', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!SHIPPO_API_KEY) {
      return res.status(500).json({ error: 'Shippo API key not configured' });
    }

    // Get first page of transactions for preview
    const transactionsResponse = await shippoIntegration.getTransactions(1, 25);
    
    const preview = await Promise.all(transactionsResponse.results.map(async (transaction) => {
      const orderNumber = shippoIntegration.parseOrderNumberFromMetadata(transaction.metadata);
      
      let matchedOrder = null;
      if (orderNumber) {
        const orderResult = await db.execute(sql`
          SELECT id, external_order_number, external_order_id, customer_name, status
          FROM marketplace_orders 
          WHERE external_order_number = ${orderNumber} 
             OR external_order_id = ${orderNumber}
          LIMIT 1
        `);
        if (orderResult.rows.length > 0) {
          matchedOrder = orderResult.rows[0];
        }
      }
      
      // Check fulfillment status for this order
      let hasFulfillment = false;
      if (matchedOrder) {
        const fulfillmentResult = await db.execute(sql`
          SELECT id FROM marketplace_fulfillments WHERE order_id = ${(matchedOrder as any).id} LIMIT 1
        `);
        hasFulfillment = fulfillmentResult.rows.length > 0;
      }
      
      return {
        trackingNumber: transaction.tracking_number,
        carrier: transaction.rate?.provider || 'Unknown',
        serviceLevel: transaction.rate?.servicelevel?.name || '',
        metadata: transaction.metadata,
        parsedOrderNumber: orderNumber,
        matchedOrder: matchedOrder ? {
          id: (matchedOrder as any).id,
          orderNumber: (matchedOrder as any).external_order_number || (matchedOrder as any).external_order_id,
          customer: (matchedOrder as any).customer_name,
          currentStatus: (matchedOrder as any).status,
          hasFulfillment
        } : null,
        status: transaction.status,
        createdAt: transaction.object_created
      };
    }));

    res.json({
      totalTransactions: transactionsResponse.count,
      preview,
      message: `Found ${transactionsResponse.count} total transactions in Shippo. Preview shows first 25.`
    });
  } catch (error: any) {
    console.error('📦 [Shippo Preview] Error:', error);
    res.status(500).json({ error: 'Failed to preview Shippo data', details: error?.message });
  }
});

// Manual Clover inventory adjustment for specific order
router.post('/orders/:id/adjust-clover-inventory', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    console.log(`📦 [Manual Inventory] Starting adjustment for order ${orderId}`);
    
    // Get order items
    const itemsResult = await db.execute(sql`
      SELECT oi.id, oi.sku, oi.name, oi.quantity, oi.quantity_fulfilled
      FROM marketplace_order_items oi
      WHERE oi.order_id = ${orderId}
    `);
    
    console.log(`📦 [Manual Inventory] Found ${itemsResult.rows.length} items in database`);
    console.log(`📦 [Manual Inventory] Items:`, JSON.stringify(itemsResult.rows));
    
    if (itemsResult.rows.length === 0) {
      return res.status(404).json({ error: 'No items found for this order' });
    }
    
    const itemsWithSku = itemsResult.rows.filter((item: any) => item.sku);
    console.log(`📦 [Manual Inventory] Items with SKU: ${itemsWithSku.length}`);
    
    if (itemsWithSku.length === 0) {
      return res.status(400).json({ error: 'No items with SKUs found for this order' });
    }
    
    // Get active Clover configuration
    const activeCloverConfig = await storage.getActiveCloverConfig();
    if (!activeCloverConfig) {
      return res.status(400).json({ error: 'No active Clover configuration found' });
    }
    
    console.log(`📦 [Manual Inventory] Using Clover merchant: ${activeCloverConfig.merchantId}`);
    
    const cloverInventoryService = new CloverInventoryService();
    await cloverInventoryService.initialize(activeCloverConfig.merchantId);
    
    const deductionItems = itemsWithSku.map((item: any) => ({
      sku: item.sku,
      quantity: item.quantity || 1,
      itemName: item.name,
    }));
    
    console.log(`📦 [Manual Inventory] Deduction items:`, JSON.stringify(deductionItems));
    
    const result = await cloverInventoryService.batchDeductStock(deductionItems);
    console.log(`📦 [Manual Inventory] Batch deduct result:`, JSON.stringify(result));
    
    console.log(`📦 [Manual Inventory] Adjustment complete:`, {
      success: result.success,
      itemsProcessed: result.results.length,
      successful: result.results.filter(r => r.success).length,
      failed: result.results.filter(r => !r.success).length,
    });
    
    res.json({
      message: 'Clover inventory adjustment complete',
      orderId,
      results: result.results,
      summary: {
        total: result.results.length,
        successful: result.results.filter(r => r.success).length,
        failed: result.results.filter(r => !r.success).length,
      }
    });
  } catch (error: any) {
    console.error('Error adjusting Clover inventory:', error);
    res.status(500).json({ error: 'Failed to adjust Clover inventory', details: error?.message });
  }
});

export default router;
