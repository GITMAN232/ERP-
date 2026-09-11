import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import type { Customer, CustomerType, CustomerStatus } from '../types';
import { useAuth } from '../context/AuthContext';

export const CustomersPage: React.FC<{ onSelectCustomer: (id: number) => void }> = ({ onSelectCustomer }) => {
  const { hasRole } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    mobileNumber: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'Retail' as CustomerType,
    address: '',
    status: 'Active' as CustomerStatus,
    followUpDate: '',
    notes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async (searchQuery = search) => {
    setLoading(true);
    setError(null);
    try {
      const q = searchQuery.trim() ? `?search=${encodeURIComponent(searchQuery.trim())}` : '';
      const data = await apiRequest(`/customers${q}`);
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(search);
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      customerName: '',
      mobileNumber: '',
      email: '',
      businessName: '',
      gstNumber: '',
      customerType: 'Retail',
      address: '',
      status: 'Active',
      followUpDate: '',
      notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(c);
    setFormData({
      customerName: c.customerName,
      mobileNumber: c.mobileNumber,
      email: c.email || '',
      businessName: c.businessName,
      gstNumber: c.gstNumber || '',
      customerType: c.customerType,
      address: c.address,
      status: c.status,
      followUpDate: c.followUpDate ? c.followUpDate.split('T')[0] : '',
      notes: c.notes || ''
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingCustomer) {
        await apiRequest(`/customers/${editingCustomer.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        setSuccessMsg('Customer updated successfully');
      } else {
        await apiRequest('/customers', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        setSuccessMsg('Customer added successfully');
      }
      setShowModal(false);
      fetchCustomers();

      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error saving customer');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage wholesale & retail accounts, contact details, and status.</p>
        </div>
        {hasRole(['Admin', 'Sales']) && (
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add Customer
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="card" style={{ marginBottom: '1rem', padding: '0.85rem 1rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: '220px' }}
            placeholder="Search by name, mobile, business, or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">Search</button>
          {search && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setSearch(''); fetchCustomers(''); }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty-state">
            <p>Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <p>No customers found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Business Name</th>
                  <th>Mobile</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Follow-Up Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => onSelectCustomer(c.id)}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.customerName}</td>
                    <td>{c.businessName}</td>
                    <td>{c.mobileNumber}</td>
                    <td>
                      <span className="badge badge-info">{c.customerType}</span>
                    </td>
                    <td>
                      <span className={`badge ${c.status === 'Active' ? 'badge-success' : c.status === 'Lead' ? 'badge-warning' : 'badge-danger'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>{c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={e => { e.stopPropagation(); onSelectCustomer(c.id); }}
                      >
                        View
                      </button>
                      {hasRole(['Admin', 'Sales']) && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ marginLeft: '0.35rem' }}
                          onClick={e => openEditModal(c, e)}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label>Customer Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.customerName}
                  onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Business Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.businessName}
                    onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Mobile Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.mobileNumber}
                    onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>GST Number (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.gstNumber}
                    onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Customer Type *</label>
                  <select
                    className="form-control"
                    value={formData.customerType}
                    onChange={e => setFormData({ ...formData, customerType: e.target.value as CustomerType })}
                  >
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Distributor">Distributor</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status *</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                  >
                    <option value="Lead">Lead</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Address *</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Next Follow-Up Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.followUpDate}
                    onChange={e => setFormData({ ...formData, followUpDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes or details..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
