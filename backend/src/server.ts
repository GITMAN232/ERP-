import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './db.js';
import { runSeed } from './seed.js';
import { authenticateToken, requireRole } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { login } from './controllers/authController.js';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  addFollowUp
} from './controllers/customerController.js';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  getStockMovements
} from './controllers/productController.js';
import {
  getChallans,
  getChallanById,
  createChallan,
  updateChallan,
  confirmChallan
} from './controllers/challanController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Public Auth route
app.post('/auth/login', login);
app.post('/api/auth/login', login);

// Router setup to support both /... and /api/...
const router = express.Router();

// Customer endpoints
router.get('/customers', authenticateToken, requireRole(['Admin', 'Sales', 'Accounts']), getCustomers);
router.get('/customers/:id', authenticateToken, requireRole(['Admin', 'Sales', 'Accounts']), getCustomerById);
router.post('/customers', authenticateToken, requireRole(['Admin', 'Sales']), createCustomer);
router.put('/customers/:id', authenticateToken, requireRole(['Admin', 'Sales']), updateCustomer);
router.post('/customers/:id/followups', authenticateToken, requireRole(['Admin', 'Sales']), addFollowUp);

// Product endpoints
router.get('/products', authenticateToken, requireRole(['Admin', 'Sales', 'Warehouse']), getProducts);
router.get('/products/:id', authenticateToken, requireRole(['Admin', 'Sales', 'Warehouse']), getProductById);
router.post('/products', authenticateToken, requireRole(['Admin', 'Warehouse', 'Sales']), createProduct);
router.put('/products/:id', authenticateToken, requireRole(['Admin', 'Warehouse', 'Sales']), updateProduct);

// Stock movements endpoint
router.get('/stock/movements', authenticateToken, requireRole(['Admin', 'Warehouse', 'Sales']), getStockMovements);

// Challans endpoints
router.get('/challans', authenticateToken, requireRole(['Admin', 'Sales', 'Warehouse', 'Accounts']), getChallans);
router.get('/challans/:id', authenticateToken, requireRole(['Admin', 'Sales', 'Warehouse', 'Accounts']), getChallanById);
router.post('/challans', authenticateToken, requireRole(['Admin', 'Sales']), createChallan);
router.put('/challans/:id', authenticateToken, requireRole(['Admin', 'Sales']), updateChallan);
router.post('/challans/:id/confirm', authenticateToken, requireRole(['Admin', 'Sales']), confirmChallan);

// Mount router under root and /api
app.use('/', router);
app.use('/api', router);

// DB initialization promise for serverless and long-running environments
let dbReadyPromise: Promise<void> | null = null;

function ensureDB(): Promise<void> {
  if (!dbReadyPromise) {
    dbReadyPromise = (async () => {
      try {
        await initDB();
        await runSeed();
      } catch (err) {
        console.error('Database connection/initialization error:', err);
      }
    })();
  }
  return dbReadyPromise;
}

app.use(async (_req, _res, next) => {
  await ensureDB();
  next();
});

// Error handler
app.use(errorHandler);

async function startServer() {
  await ensureDB();

  if (!process.env.VERCEL) {
    const server = app.listen(PORT, () => {
      console.log(`Mini ERP + CRM Operations Portal server running on port ${PORT}`);
    });
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${PORT} is already in use.`);
      } else {
        console.error('Server listen error:', err);
      }
    });
  }
}

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  startServer();
}

export default app;
