import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_DB_URL = 'postgresql://postgres.eapwxlwsgfiualqedksu:KTMduke%40200@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres';
const connectionString = process.env.DATABASE_URL || DEFAULT_DB_URL;
const isRemote = connectionString.includes('supabase') || connectionString.includes('sslmode=') || connectionString.includes('ssl=true');

export const pool = new Pool({
  connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined
});

export async function initDB(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Sales', 'Warehouse', 'Accounts')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      mobile_number VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      business_name VARCHAR(255) NOT NULL,
      gst_number VARCHAR(100),
      customer_type VARCHAR(50) NOT NULL CHECK (customer_type IN ('Retail', 'Wholesale', 'Distributor')),
      address TEXT NOT NULL,
      status VARCHAR(50) NOT NULL CHECK (status IN ('Lead', 'Active', 'Inactive')),
      follow_up_date TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customer_followups (
      id SERIAL PRIMARY KEY,
      customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      note TEXT NOT NULL,
      follow_up_date TIMESTAMP,
      created_by INT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      product_name VARCHAR(255) NOT NULL,
      sku VARCHAR(100) UNIQUE NOT NULL,
      category VARCHAR(100) NOT NULL,
      unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
      current_stock INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
      minimum_stock_alert_quantity INT NOT NULL DEFAULT 0,
      warehouse_location VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id SERIAL PRIMARY KEY,
      product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity_changed INT NOT NULL CHECK (quantity_changed > 0),
      movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
      reason TEXT NOT NULL,
      created_by INT REFERENCES users(id),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS challans (
      id SERIAL PRIMARY KEY,
      challan_number VARCHAR(100) UNIQUE NOT NULL,
      customer_id INT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      total_quantity INT NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL CHECK (status IN ('Draft', 'Confirmed', 'Cancelled')) DEFAULT 'Draft',
      created_by INT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS challan_items (
      id SERIAL PRIMARY KEY,
      challan_id INT NOT NULL REFERENCES challans(id) ON DELETE CASCADE,
      product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      product_name_snapshot VARCHAR(255) NOT NULL,
      sku_snapshot VARCHAR(100) NOT NULL,
      unit_price_snapshot NUMERIC(10, 2) NOT NULL,
      quantity INT NOT NULL CHECK (quantity > 0)
    );

    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(customer_name);
    CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile_number);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_challans_number ON challans(challan_number);
    CREATE INDEX IF NOT EXISTS idx_challan_items_challan ON challan_items(challan_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
  `);
}
