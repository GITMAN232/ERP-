import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { pool } from '../db.js';

function mapProduct(row: any) {
  return {
    id: row.id,
    productName: row.product_name,
    sku: row.sku,
    category: row.category,
    unitPrice: parseFloat(row.unit_price),
    currentStock: parseInt(row.current_stock, 10),
    minimumStockAlertQuantity: parseInt(row.minimum_stock_alert_quantity, 10),
    warehouseLocation: row.warehouse_location,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function validateProductBody(body: any) {
  const { productName, sku, category, unitPrice, currentStock, minimumStockAlertQuantity, warehouseLocation } = body;
  const errors: string[] = [];

  if (!productName || typeof productName !== 'string' || !productName.trim()) {
    errors.push('productName is required');
  }

  if (!sku || typeof sku !== 'string' || !sku.trim()) {
    errors.push('sku is required');
  }

  if (!category || typeof category !== 'string' || !category.trim()) {
    errors.push('category is required');
  }

  if (unitPrice === undefined || isNaN(Number(unitPrice)) || Number(unitPrice) < 0) {
    errors.push('unitPrice must be a non-negative number');
  }

  if (currentStock !== undefined && (isNaN(Number(currentStock)) || Number(currentStock) < 0 || !Number.isInteger(Number(currentStock)))) {
    errors.push('currentStock must be a non-negative integer');
  }

  if (minimumStockAlertQuantity === undefined || isNaN(Number(minimumStockAlertQuantity)) || Number(minimumStockAlertQuantity) < 0 || !Number.isInteger(Number(minimumStockAlertQuantity))) {
    errors.push('minimumStockAlertQuantity must be a non-negative integer');
  }

  if (!warehouseLocation || typeof warehouseLocation !== 'string' || !warehouseLocation.trim()) {
    errors.push('warehouseLocation is required');
  }

  return errors;
}

export async function getProducts(req: AuthRequest, res: Response): Promise<void> {
  const search = req.query.search ? String(req.query.search).trim() : '';
  const category = req.query.category ? String(req.query.category).trim() : '';
  const lowStock = req.query.low_stock === 'true';

  let sql = 'SELECT * FROM products WHERE 1=1';
  const params: any[] = [];

  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (LOWER(product_name) LIKE LOWER($${params.length}) OR LOWER(sku) LIKE LOWER($${params.length}))`;
  }

  if (category) {
    params.push(category);
    sql += ` AND category = $${params.length}`;
  }

  if (lowStock) {
    sql += ` AND current_stock <= minimum_stock_alert_quantity`;
  }

  sql += ' ORDER BY created_at DESC';

  const result = await pool.query(sql, params);
  res.status(200).json(result.rows.map(mapProduct));
}

export async function getProductById(req: AuthRequest, res: Response): Promise<void> {
  const paramId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(paramId, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid product ID' });
    return;
  }

  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  res.status(200).json(mapProduct(result.rows[0]));
}

export async function createProduct(req: AuthRequest, res: Response): Promise<void> {
  const errors = validateProductBody(req.body);
  if (errors.length > 0) {
    res.status(400).json({ message: errors.join(', ') });
    return;
  }

  const { productName, sku, category, unitPrice, currentStock, minimumStockAlertQuantity, warehouseLocation } = req.body;
  const initialStock = currentStock ? parseInt(currentStock, 10) : 0;
  const userId = req.user ? req.user.id : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const skuCheck = await client.query('SELECT id FROM products WHERE LOWER(sku) = LOWER($1)', [sku.trim()]);
    if (skuCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(409).json({ message: 'Product with this SKU already exists' });
      return;
    }

    const prodRes = await client.query(`
      INSERT INTO products (
        product_name, sku, category, unit_price, current_stock, minimum_stock_alert_quantity, warehouse_location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      productName.trim(),
      sku.trim().toUpperCase(),
      category.trim(),
      parseFloat(unitPrice),
      initialStock,
      parseInt(minimumStockAlertQuantity, 10),
      warehouseLocation.trim()
    ]);

    const product = prodRes.rows[0];

    if (initialStock > 0) {
      await client.query(`
        INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
        VALUES ($1, $2, 'IN', 'Initial stock setup', $3)
      `, [product.id, initialStock, userId]);
    }

    await client.query('COMMIT');
    res.status(201).json(mapProduct(product));
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message || 'Error creating product' });
  } finally {
    client.release();
  }
}

export async function updateProduct(req: AuthRequest, res: Response): Promise<void> {
  const paramId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(paramId, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid product ID' });
    return;
  }

  const errors = validateProductBody(req.body);
  if (errors.length > 0) {
    res.status(400).json({ message: errors.join(', ') });
    return;
  }

  const { productName, sku, category, unitPrice, minimumStockAlertQuantity, warehouseLocation } = req.body;

  const existingRes = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
  if (existingRes.rows.length === 0) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }

  const skuCheck = await pool.query('SELECT id FROM products WHERE LOWER(sku) = LOWER($1) AND id != $2', [sku.trim(), id]);
  if (skuCheck.rows.length > 0) {
    res.status(409).json({ message: 'Another product with this SKU already exists' });
    return;
  }

  const result = await pool.query(`
    UPDATE products SET
      product_name = $1,
      sku = $2,
      category = $3,
      unit_price = $4,
      minimum_stock_alert_quantity = $5,
      warehouse_location = $6,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *
  `, [
    productName.trim(),
    sku.trim().toUpperCase(),
    category.trim(),
    parseFloat(unitPrice),
    parseInt(minimumStockAlertQuantity, 10),
    warehouseLocation.trim(),
    id
  ]);

  res.status(200).json(mapProduct(result.rows[0]));
}

export async function getStockMovements(req: AuthRequest, res: Response): Promise<void> {
  const result = await pool.query(`
    SELECT 
      sm.id,
      sm.product_id,
      sm.quantity_changed,
      sm.movement_type,
      sm.reason,
      sm.timestamp,
      p.product_name,
      p.sku,
      u.name as created_by_name
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    LEFT JOIN users u ON sm.created_by = u.id
    ORDER BY sm.timestamp DESC
  `);

  res.status(200).json(result.rows.map((row: any) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    sku: row.sku,
    quantityChanged: parseInt(row.quantity_changed, 10),
    movementType: row.movement_type,
    reason: row.reason,
    createdBy: row.created_by_name || 'System',
    timestamp: row.timestamp
  })));
}
