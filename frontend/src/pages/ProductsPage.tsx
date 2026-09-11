import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import type { Product } from '../types';
import { useAuth } from '../context/AuthContext';

export const ProductsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    productName: '',
    sku: '',
    category: '',
    unitPrice: 0,
    currentStock: 0,
    minimumStockAlertQuantity: 0,
    warehouseLocation: ''
  });

  useEffect(() => {
    fetchProducts();
  }, [lowStockFilter]);

  const fetchProducts = async (searchQuery = search) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (lowStockFilter) params.append('low_stock', 'true');

      const q = params.toString() ? `?${params.toString()}` : '';
      const data = await apiRequest(`/products${q}`);
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(search);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      productName: '',
      sku: '',
      category: '',
      unitPrice: 0,
      currentStock: 0,
      minimumStockAlertQuantity: 5,
      warehouseLocation: 'Main Warehouse'
    });
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      productName: p.productName,
      sku: p.sku,
      category: p.category,
      unitPrice: p.unitPrice,
      currentStock: p.currentStock,
      minimumStockAlertQuantity: p.minimumStockAlertQuantity,
      warehouseLocation: p.warehouseLocation
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingProduct) {
        await apiRequest(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        setSuccessMsg('Product updated successfully');
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        setSuccessMsg('Product created successfully');
      }
      setShowModal(false);
      fetchProducts();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error saving product');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Product catalog, inventory levels, and low-stock monitoring.</p>
        </div>
        {hasRole(['Admin', 'Warehouse', 'Sales']) && (
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add Product
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="card" style={{ marginBottom: '1rem', padding: '0.85rem 1rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: '220px' }}
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">Search</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-main)', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={e => setLowStockFilter(e.target.checked)}
            />
            Show Low Stock Only
          </label>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty-state">
            <p>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <p>No products found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Stock Level</th>
                  <th>Min Alert</th>
                  <th>Location</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const isLowStock = p.currentStock <= p.minimumStockAlertQuantity;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{p.sku}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.productName}</td>
                      <td><span className="badge badge-info">{p.category}</span></td>
                      <td>${p.unitPrice.toFixed(2)}</td>
                      <td>
                        {isLowStock ? (
                          <span className="badge badge-danger">
                            {p.currentStock} (Low Stock)
                          </span>
                        ) : (
                          <span className="badge badge-success">
                            {p.currentStock} in stock
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.minimumStockAlertQuantity}</td>
                      <td>{p.warehouseLocation}</td>
                      <td style={{ textAlign: 'right' }}>
                        {hasRole(['Admin', 'Warehouse', 'Sales']) && (
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(p)}>
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.productName}
                  onChange={e => setFormData({ ...formData, productName: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>SKU *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Unit Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={formData.unitPrice}
                    onChange={e => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                {!editingProduct && (
                  <div className="form-group">
                    <label>Initial Stock Quantity *</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={formData.currentStock}
                      onChange={e => setFormData({ ...formData, currentStock: parseInt(e.target.value, 10) || 0 })}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Minimum Stock Alert Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={formData.minimumStockAlertQuantity}
                    onChange={e => setFormData({ ...formData, minimumStockAlertQuantity: parseInt(e.target.value, 10) || 0 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Warehouse Location *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.warehouseLocation}
                    onChange={e => setFormData({ ...formData, warehouseLocation: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
