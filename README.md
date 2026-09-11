# Mini ERP + CRM Operations Portal

A complete, production-ready Mini ERP + CRM Operations Portal designed for wholesale and distribution operations. Built with a clean full-stack architecture using Node.js, Express, TypeScript, PostgreSQL (Supabase), and React.

---

## 🚀 Key Features

- **Role-Based Access Control (RBAC)**:
  - 4 distinct user roles: `Admin`, `Sales`, `Warehouse`, `Accounts`.
  - Backend-enforced authorization with route-level middleware returning `403 Forbidden` on unauthorized access.
  - Role-aware frontend navigation, buttons, and views.

- **CRM & Customer Lifecycle Management**:
  - Full Customer CRUD with parameterized search across name, email, phone, and company.
  - Interactive communication timeline notes / follow-up log per customer.

- **Product Catalog & Real-Time Inventory**:
  - Unique SKU tracking with name, category, pricing, minimum stock levels, and current stock.
  - Low-stock indicators and visual threshold badges.
  - Complete `stock_movements` audit logging recording every `IN` (restock) and `OUT` (challan fulfillment) transaction with timestamps and references.

- **Sales Challans (Draft to Fulfilled)**:
  - Auto-generated unique challan sequence numbering (`CH-YYYY-XXXX`).
  - Immutable product snapshotting (`product_name_snapshot`, `sku_snapshot`, `unit_price_snapshot`) preventing historical data distortion when product catalog prices change.
  - **Atomic Transactional Confirmation**: PostgreSQL `BEGIN ... COMMIT / ROLLBACK` with pessimistic row-locking (`SELECT ... FOR UPDATE`). If any line item has insufficient stock, the entire transaction rolls back cleanly without partial deductions.

- **Security & Reliability**:
  - In-memory rate limiting against brute-force login attempts (5 failed attempts locks for 15 minutes).
  - Generic authentication responses (`"Invalid credentials"`).
  - Safe error-handling middleware preventing internal database error dumps or stack traces from reaching client responses.
  - Password hashing with bcrypt and JWT-based session security.

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript (`ts-node-dev`)
- **Framework**: Express.js
- **Database**: PostgreSQL (via `pg` connection pool with SSL)
- **Security**: `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv`

### Frontend
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite
- **Routing**: React Router DOM (v6)
- **Styling**: Modern, responsive Vanilla CSS with smooth CSS transitions and keyframes
- **Icons**: Lucide React

---

## 👥 Default Demo Credentials

All test accounts use the password: `password123`

| Role | Email | Permissions |
| :--- | :--- | :--- |
| **Admin** | `admin@minierp.com` | Full access across CRM, Inventory, Challans, and System Logs |
| **Sales** | `sales@minierp.com` | Customers, View Inventory, Create & Edit Challans |
| **Warehouse** | `warehouse@minierp.com` | Inventory Management, Stock Adjustments, Confirm Challans |
| **Accounts** | `accounts@minierp.com` | View-only access to Challans, Customers, and Financial summaries |

---

## 💻 Getting Started Locally

### Prerequisites
- Node.js (v18+)
- npm

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure DATABASE_URL and JWT_SECRET in .env
npm run dev
```
The backend API will run on `http://localhost:5000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The web portal will open on `http://localhost:5173`.

---

## 📂 Project Structure

```text
├── backend/
│   ├── src/
│   │   ├── controllers/     # Auth, Customer, Product, Challan controllers
│   │   ├── middleware/      # JWT auth, RBAC (requireRole), error handling
│   │   ├── db.ts            # PostgreSQL connection pool configuration
│   │   ├── seed.ts          # DB schema migration & initial seed script
│   │   └── server.ts        # Express app initialization & route registration
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, Layout, Modals
│   │   ├── context/         # AuthContext (user session & permissions)
│   │   ├── pages/           # Dashboard, Customers, Products, Inventory, Challans
│   │   ├── api.ts           # Centralized API service with auth interceptor
│   │   ├── App.tsx          # Route definitions & protected routes
│   │   ├── index.css        # Core design system & theme variables
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## 🛡️ License
MIT License. Built for internal distribution and wholesale operations management.