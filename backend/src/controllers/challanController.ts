import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { pool } from '../db.js';

async function generateChallanNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CH-${year}-`;
  
  const res = await pool.query(
    'SELECT challan_number FROM challans WHERE challan_number LIKE $1 ORDER BY id DESC LIMIT 1',
    [`${prefix}%`]
  );

  let nextSeq = 1;
  if (res.rows.length > 0) {
    const lastNum = res.rows[0].challan_number;
    const parts = lastNum.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

async function formatChallan(row: any) {
  const customerRes = await pool.query(
    'SELECT id, customer_name, business_name, mobile_number, email, address FROM customers WHERE id = $1',
    [row.customer_id]
  );
  const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [row.created_by]);

  const itemsRes = await pool.query(`
    SELECT 
      ci.id,
      ci.product_id,
      ci.product_name_snapshot,
      ci.sku_snapshot,
      ci.unit_price_snapshot,
      ci.quantity
    FROM challan_items ci
    WHERE ci.challan_id = $1
  `, [row.id]);

  const customer = customerRes.rows[0] ? {
    id: customerRes.rows[0].id,
    customerName: customerRes.rows[0].customer_name,
    businessName: customerRes.rows[0].business_name,
    mobileNumber: customerRes.rows[0].mobile_number,
    email: customerRes.rows[0].email,
    address: customerRes.rows[0].address
  } : null;

  const items = itemsRes.rows.map((item: any) => ({
    id: item.id,
    productId: item.product_id,
    productNameSnapshot: item.product_name_snapshot,
    skuSnapshot: item.sku_snapshot,
    unitPriceSnapshot: parseFloat(item.unit_price_snapshot),
    quantity: parseInt(item.quantity, 10),
    totalPrice: parseFloat(item.unit_price_snapshot) * parseInt(item.quantity, 10)
  }));

  return {
    id: row.id,
    challanNumber: row.challan_number,
    customerId: row.customer_id,
    customer,
    totalQuantity: parseInt(row.total_quantity, 10),
    status: row.status,
    createdBy: userRes.rows[0] ? userRes.rows[0].name : 'System',
    createdDate: row.created_at,
    updatedDate: row.updated_at,
    items
  };
}

export async function getChallans(req: AuthRequest, res: Response): Promise<void> {
  const challanRows = await pool.query('SELECT * FROM challans ORDER BY created_at DESC');

  const formatted = await Promise.all(
    challanRows.rows.map((row: any) => formatChallan(row))
  );

  res.status(200).json(formatted);
}

export async function getChallanById(req: AuthRequest, res: Response): Promise<void> {
  const paramId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(paramId, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid challan ID' });
    return;
  }

  const challanRes = await pool.query('SELECT * FROM challans WHERE id = $1', [id]);

  if (challanRes.rows.length === 0) {
    res.status(404).json({ message: 'Challan not found' });
    return;
  }

  const challan = await formatChallan(challanRes.rows[0]);
  res.status(200).json(challan);
}

export async function createChallan(req: AuthRequest, res: Response): Promise<void> {
  const { customerId, items } = req.body;

  if (!customerId || isNaN(Number(customerId))) {
    res.status(400).json({ message: 'Valid customerId is required' });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: 'At least one product item is required' });
    return;
  }

  for (const item of items) {
    if (!item.productId || isNaN(Number(item.productId)) || !item.quantity || Number(item.quantity) <= 0 || !Number.isInteger(Number(item.quantity))) {
      res.status(400).json({ message: 'Each item must have a valid productId and positive integer quantity' });
      return;
    }
  }

  const userId = req.user ? req.user.id : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const custCheck = await client.query('SELECT id FROM customers WHERE id = $1', [customerId]);
    if (custCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    const itemSnapshots = [];
    let totalQty = 0;

    for (const item of items) {
      const prodRes = await client.query('SELECT id, product_name, sku, unit_price FROM products WHERE id = $1', [item.productId]);
      if (prodRes.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ message: `Product with ID ${item.productId} not found` });
        return;
      }

      const prod = prodRes.rows[0];
      const qty = parseInt(item.quantity, 10);
      totalQty += qty;

      itemSnapshots.push({
        productId: prod.id,
        productNameSnapshot: prod.product_name,
        skuSnapshot: prod.sku,
        unitPriceSnapshot: prod.unit_price,
        quantity: qty
      });
    }

    const challanNumber = await generateChallanNumber();

    const challanRes = await client.query(`
      INSERT INTO challans (challan_number, customer_id, total_quantity, status, created_by)
      VALUES ($1, $2, $3, 'Draft', $4)
      RETURNING *
    `, [challanNumber, customerId, totalQty, userId]);

    const newChallan = challanRes.rows[0];

    for (const snap of itemSnapshots) {
      await client.query(`
        INSERT INTO challan_items (
          challan_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        newChallan.id,
        snap.productId,
        snap.productNameSnapshot,
        snap.skuSnapshot,
        snap.unitPriceSnapshot,
        snap.quantity
      ]);
    }

    await client.query('COMMIT');

    const formatted = await formatChallan(newChallan);
    res.status(201).json(formatted);
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message || 'Error creating challan' });
  } finally {
    client.release();
  }
}

export async function updateChallan(req: AuthRequest, res: Response): Promise<void> {
  const paramId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(paramId, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid challan ID' });
    return;
  }

  const { customerId, items } = req.body;

  if (!customerId || isNaN(Number(customerId))) {
    res.status(400).json({ message: 'Valid customerId is required' });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: 'At least one product item is required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const challanRes = await client.query('SELECT * FROM challans WHERE id = $1 FOR UPDATE', [id]);
    if (challanRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Challan not found' });
      return;
    }

    const existing = challanRes.rows[0];
    if (existing.status !== 'Draft') {
      await client.query('ROLLBACK');
      res.status(400).json({ message: `Cannot edit challan with status '${existing.status}'. Only Draft challans are editable.` });
      return;
    }

    await client.query('DELETE FROM challan_items WHERE challan_id = $1', [id]);

    let totalQty = 0;
    for (const item of items) {
      const prodRes = await client.query('SELECT id, product_name, sku, unit_price FROM products WHERE id = $1', [item.productId]);
      if (prodRes.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ message: `Product with ID ${item.productId} not found` });
        return;
      }

      const prod = prodRes.rows[0];
      const qty = parseInt(item.quantity, 10);
      totalQty += qty;

      await client.query(`
        INSERT INTO challan_items (
          challan_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [id, prod.id, prod.product_name, prod.sku, prod.unit_price, qty]);
    }

    const updateRes = await client.query(`
      UPDATE challans SET
        customer_id = $1,
        total_quantity = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [customerId, totalQty, id]);

    await client.query('COMMIT');

    const formatted = await formatChallan(updateRes.rows[0]);
    res.status(200).json(formatted);
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message || 'Error updating challan' });
  } finally {
    client.release();
  }
}

export async function confirmChallan(req: AuthRequest, res: Response): Promise<void> {
  const paramId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(paramId, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid challan ID' });
    return;
  }

  const userId = req.user ? req.user.id : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch challan FOR UPDATE
    const challanRes = await client.query('SELECT * FROM challans WHERE id = $1 FOR UPDATE', [id]);
    if (challanRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Challan not found' });
      return;
    }

    const challan = challanRes.rows[0];
    if (challan.status === 'Confirmed') {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Challan is already confirmed' });
      return;
    }

    if (challan.status === 'Cancelled') {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Cannot confirm a cancelled challan' });
      return;
    }

    // 2. Retrieve items
    const itemsRes = await client.query('SELECT * FROM challan_items WHERE challan_id = $1', [id]);
    const items = itemsRes.rows;

    if (items.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Challan has no product items' });
      return;
    }

    // 3. Check stock for EVERY product
    for (const item of items) {
      const prodRes = await client.query('SELECT id, product_name, current_stock FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      if (prodRes.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ message: `Product ID ${item.product_id} no longer exists` });
        return;
      }

      const prod = prodRes.rows[0];
      const currentStock = parseInt(prod.current_stock, 10);
      const requestedQty = parseInt(item.quantity, 10);

      if (currentStock < requestedQty) {
        await client.query('ROLLBACK');
        res.status(400).json({
          message: `Insufficient stock for product: ${prod.product_name}. Available: ${currentStock}, requested: ${requestedQty}`
        });
        return;
      }
    }

    // 4. If all sufficient, deduct stock & record OUT movement
    for (const item of items) {
      const qty = parseInt(item.quantity, 10);

      await client.query(
        'UPDATE products SET current_stock = current_stock - $1::int, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [qty, item.product_id]
      );

      await client.query(`
        INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
        VALUES ($1, $2, 'OUT', $3, $4)
      `, [
        item.product_id,
        qty,
        `Sales Challan Confirmed: ${challan.challan_number}`,
        userId
      ]);
    }

    // 5. Update status
    const updatedRes = await client.query(`
      UPDATE challans SET status = 'Confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *
    `, [id]);

    await client.query('COMMIT');

    const formatted = await formatChallan(updatedRes.rows[0]);
    res.status(200).json(formatted);
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message || 'Error confirming challan' });
  } finally {
    client.release();
  }
}
