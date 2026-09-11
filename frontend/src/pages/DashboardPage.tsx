import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import type { Customer, Product, Challan } from '../types';

export const DashboardPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProducts: 0,
    lowStockCount: 0,
    draftChallans: 0,
    confirmedChallans: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      let customers: Customer[] = [];
      let products: Product[] = [];
      let challans: Challan[] = [];

      try { customers = await apiRequest('/customers'); } catch (e) {}
      try { products = await apiRequest('/products'); } catch (e) {}
      try { challans = await apiRequest('/challans'); } catch (e) {}

      const lowStock = products.filter(p => p.currentStock <= p.minimumStockAlertQuantity).length;
      const draftCount = challans.filter(c => c.status === 'Draft').length;
      const confirmedCount = challans.filter(c => c.status === 'Confirmed').length;

      setStats({
        totalCustomers: customers.length,
        totalProducts: products.length,
        lowStockCount: lowStock,
        draftChallans: draftCount,
        confirmedChallans: confirmedCount
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <p>Loading dashboard metrics...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of wholesale operations, customers, and inventory.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadDashboardData}>
          Refresh
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="grid-kpi">
        <div
          className="kpi-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('customers')}
        >
          <div className="kpi-title">Total Customers</div>
          <div className="kpi-value">{stats.totalCustomers}</div>
        </div>

        <div
          className="kpi-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('products')}
        >
          <div className="kpi-title">Total Products</div>
          <div className="kpi-value">{stats.totalProducts}</div>
        </div>

        <div
          className="kpi-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('products')}
        >
          <div className="kpi-title">Low Stock</div>
          <div
            className="kpi-value"
            style={{ color: stats.lowStockCount > 0 ? '#b91c1c' : 'inherit' }}
          >
            {stats.lowStockCount}
          </div>
        </div>

        <div
          className="kpi-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('challans')}
        >
          <div className="kpi-title">Draft Challans</div>
          <div className="kpi-value">{stats.draftChallans}</div>
        </div>

        <div
          className="kpi-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('challans')}
        >
          <div className="kpi-title">Confirmed Challans</div>
          <div className="kpi-value">{stats.confirmedChallans}</div>
        </div>
      </div>
    </div>
  );
};
