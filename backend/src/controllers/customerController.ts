import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { pool } from '../db.js';

function mapCustomer(row: any) {
  return {
    id: row.id,
    customerName: row.customer_name,
    mobileNumber: row.mobile_number,
    email: row.email || null,
    businessName: row.business_name,
    gstNumber: row.gst_number || null,
    customerType: row.customer_type,
    address: row.address,
    status: row.status,
    followUpDate: row.follow_up_date ? new Date(row.follow_up_date).toISOString() : null,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function validateCustomerBody(body: any) {
  const { customerName, mobileNumber, email, businessName, customerType, address, status, followUpDate } = body;
  const errors: string[] = [];

  if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
    errors.push('customerName is required');
  }

  if (!mobileNumber || typeof mobileNumber !== 'string' || !/^\+?[0-9\s\-]{7,15}$/.test(mobileNumber.trim())) {
    errors.push('valid mobileNumber is required');
  }

  if (email && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) {
    errors.push('valid email format is required when provided');
  }

  if (!businessName || typeof businessName !== 'string' || !businessName.trim()) {
    errors.push('businessName is required');
  }

  if (!customerType || !['Retail', 'Wholesale', 'Distributor'].includes(customerType)) {
    errors.push('customerType must be Retail, Wholesale, or Distributor');
  }

  if (!address || typeof address !== 'string' || !address.trim()) {
    errors.push('address is required');
  }

  if (!status || !['Lead', 'Active', 'Inactive'].includes(status)) {
    errors.push('status must be Lead, Active, or Inactive');
  }

  if (followUpDate && isNaN(Date.parse(followUpDate))) {
    errors.push('valid followUpDate is required when provided');
  }

  return errors;
}

export async function getCustomers(req: AuthRequest, res: Response): Promise<void> {
  const search = req.query.search ? String(req.query.search).trim() : '';

  let sql = 'SELECT * FROM customers';
  const params: any[] = [];

  if (search) {
    sql += ` WHERE LOWER(customer_name) LIKE LOWER($1) 
               OR LOWER(mobile_number) LIKE LOWER($1) 
               OR LOWER(business_name) LIKE LOWER($1) 
               OR LOWER(COALESCE(email, '')) LIKE LOWER($1)`;
    params.push(`%${search}%`);
  }

  sql += ' ORDER BY created_at DESC';

  const result = await pool.query(sql, params);
  res.status(200).json(result.rows.map(mapCustomer));
}

export async function getCustomerById(req: AuthRequest, res: Response): Promise<void> {
  const paramId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(paramId, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid customer ID' });
    return;
  }

  const customerRes = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);

  if (customerRes.rows.length === 0) {
    res.status(404).json({ message: 'Customer not found' });
    return;
  }

  const followupsRes = await pool.query(`
    SELECT f.*, u.name as created_by_name 
    FROM customer_followups f 
    LEFT JOIN users u ON f.created_by = u.id 
    WHERE f.customer_id = $1 
    ORDER BY f.created_at DESC
  `, [id]);

  const customer = mapCustomer(customerRes.rows[0]);
  const followups = followupsRes.rows.map(f => ({
    id: f.id,
    note: f.note,
    followUpDate: f.follow_up_date ? new Date(f.follow_up_date).toISOString() : null,
    createdBy: f.created_by_name || 'System',
    createdAt: f.created_at
  }));

  res.status(200).json({
    ...customer,
    followups
  });
}

export async function createCustomer(req: AuthRequest, res: Response): Promise<void> {
  const errors = validateCustomerBody(req.body);
  if (errors.length > 0) {
    res.status(400).json({ message: errors.join(', ') });
    return;
  }

  const {
    customerName,
    mobileNumber,
    email,
    businessName,
    gstNumber,
    customerType,
    address,
    status,
    followUpDate,
    notes
  } = req.body;

  const parsedFollowUpDate = followUpDate ? new Date(followUpDate) : null;

  const result = await pool.query(`
    INSERT INTO customers (
      customer_name, mobile_number, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    customerName.trim(),
    mobileNumber.trim(),
    email ? email.trim() : null,
    businessName.trim(),
    gstNumber ? gstNumber.trim() : null,
    customerType,
    address.trim(),
    status,
    parsedFollowUpDate,
    notes ? notes.trim() : null
  ]);

  res.status(201).json(mapCustomer(result.rows[0]));
}

export async function updateCustomer(req: AuthRequest, res: Response): Promise<void> {
  const paramId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(paramId, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid customer ID' });
    return;
  }

  const errors = validateCustomerBody(req.body);
  if (errors.length > 0) {
    res.status(400).json({ message: errors.join(', ') });
    return;
  }

  const checkRes = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
  if (checkRes.rows.length === 0) {
    res.status(404).json({ message: 'Customer not found' });
    return;
  }

  const {
    customerName,
    mobileNumber,
    email,
    businessName,
    gstNumber,
    customerType,
    address,
    status,
    followUpDate,
    notes
  } = req.body;

  const parsedFollowUpDate = followUpDate ? new Date(followUpDate) : null;

  const result = await pool.query(`
    UPDATE customers SET
      customer_name = $1,
      mobile_number = $2,
      email = $3,
      business_name = $4,
      gst_number = $5,
      customer_type = $6,
      address = $7,
      status = $8,
      follow_up_date = $9,
      notes = $10,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $11
    RETURNING *
  `, [
    customerName.trim(),
    mobileNumber.trim(),
    email ? email.trim() : null,
    businessName.trim(),
    gstNumber ? gstNumber.trim() : null,
    customerType,
    address.trim(),
    status,
    parsedFollowUpDate,
    notes ? notes.trim() : null,
    id
  ]);

  res.status(200).json(mapCustomer(result.rows[0]));
}

export async function addFollowUp(req: AuthRequest, res: Response): Promise<void> {
  const paramId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(paramId, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: 'Invalid customer ID' });
    return;
  }

  const { note, followUpDate } = req.body;
  if (!note || typeof note !== 'string' || !note.trim()) {
    res.status(400).json({ message: 'note is required for follow-up' });
    return;
  }

  const customerRes = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
  if (customerRes.rows.length === 0) {
    res.status(404).json({ message: 'Customer not found' });
    return;
  }

  const parsedFollowUpDate = followUpDate ? new Date(followUpDate) : null;
  const userId = req.user ? req.user.id : null;

  await pool.query(`
    INSERT INTO customer_followups (customer_id, note, follow_up_date, created_by)
    VALUES ($1, $2, $3, $4)
  `, [id, note.trim(), parsedFollowUpDate, userId]);

  await pool.query(`
    UPDATE customers SET
      follow_up_date = COALESCE($1, follow_up_date),
      notes = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
  `, [parsedFollowUpDate, note.trim(), id]);

  res.status(201).json({ message: 'Follow-up note added successfully' });
}
