import bcrypt from 'bcryptjs';
import { pool, initDB } from './db.js';

export async function runSeed(): Promise<void> {
  await initDB();

  console.log('Seeding initial system users...');

  const usersToSeed = [
    { name: 'System Admin', email: 'admin@minierp.com', password: 'password123', role: 'Admin' },
    { name: 'Sales Manager', email: 'sales@minierp.com', password: 'password123', role: 'Sales' },
    { name: 'Warehouse Supervisor', email: 'warehouse@minierp.com', password: 'password123', role: 'Warehouse' },
    { name: 'Accounts Officer', email: 'accounts@minierp.com', password: 'password123', role: 'Accounts' }
  ];

  for (const u of usersToSeed) {
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [u.email]);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash(u.password, 10);
      await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        [u.name, u.email, hash, u.role]
      );
      console.log(`Seeded user: ${u.email} (${u.role})`);
    } else {
      console.log(`User already exists: ${u.email}`);
    }
  }

  console.log('Seed completed successfully.');
}

if (process.argv[1]?.includes('seed')) {
  runSeed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
