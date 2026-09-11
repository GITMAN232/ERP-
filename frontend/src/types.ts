export type UserRole = 'Admin' | 'Sales' | 'Warehouse' | 'Accounts';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export type CustomerType = 'Retail' | 'Wholesale' | 'Distributor';
export type CustomerStatus = 'Lead' | 'Active' | 'Inactive';

export interface Customer {
  id: number;
  customerName: string;
  mobileNumber: string;
  email: string | null;
  businessName: string;
  gstNumber: string | null;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFollowUp {
  id: number;
  note: string;
  followUpDate: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CustomerDetails extends Customer {
  followups: CustomerFollowUp[];
}

export interface Product {
  id: number;
  productName: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minimumStockAlertQuantity: number;
  warehouseLocation: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  quantityChanged: number;
  movementType: 'IN' | 'OUT';
  reason: string;
  createdBy: string;
  timestamp: string;
}

export type ChallanStatus = 'Draft' | 'Confirmed' | 'Cancelled';

export interface ChallanItem {
  id: number;
  productId: number;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  totalPrice: number;
}

export interface Challan {
  id: number;
  challanNumber: string;
  customerId: number;
  customer: {
    id: number;
    customerName: string;
    businessName: string;
    mobileNumber: string;
    email: string | null;
    address: string;
  } | null;
  totalQuantity: number;
  status: ChallanStatus;
  createdBy: string;
  createdDate: string;
  updatedDate: string;
  items: ChallanItem[];
}
