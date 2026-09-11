import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import type { Customer, Product } from '../types';

interface ChallanFormPageProps {
  challanId?: number | null;
  onBack: () => void;
  onSuccess: (id: number) => void;
}

interface FormItem {
  productId: number;
  quantity: number;
}

export const ChallanFormPage: React.FC<ChallanFormPageProps> = ({ challanId, onBack, onSuccess }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [items, setItems] = useState<FormItem[]>([{ productId: 0, quantity: 1 }]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, [challanId]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [custData, prodData] = await Promise.all([
        apiRequest('/customers'),
        apiRequest('/products')
      ]);
      setCustomers(custData);
      setProducts(prodData);

      if (challanId) {
        const challanData = await apiRequest(`/challans/${challanId}`);
        if (challanData.status !== 'Draft') {
          setError(`Challan ${challanData.challanNumber} is ${challanData.status} and cannot be edited.`);
          return;
        }
        setSelectedCustomerId(challanData.customerId);
        setItems(challanData.items.map((i: any) => ({
          productId: i.productId,
          quantity: i.quantity
        })));
      } else if (custData.length > 0) {
        setSelectedCustomerId(custData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItemRow = () => {
    const firstProd = products[0]?.id || 0;
    setItems([...items, { productId: firstProd, quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'productId' | 'quantity', value: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError('Please select a customer');
      return;
    }

    const validItems = items.filter(i => i.productId > 0 && i.quantity > 0);
    if (validItems.length === 0) {
      setError('Please add at least one valid product line item with quantity greater than 0');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let result;
      if (challanId) {
        result = await apiRequest(`/challans/${challanId}`, {
          method: 'PUT',
          body: JSON.stringify({
            customerId: Number(selectedCustomerId),
            items: validItems
          })
        });
      } else {
        result = await apiRequest('/challans', {
          method: 'POST',
          body: JSON.stringify({
            customerId: Number(selectedCustomerId),
            items: validItems
          })
        });
      }

      onSuccess(result.id);
    } catch (err: any) {
      setError(err.message || 'Error saving sales challan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <p>Loading form data...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '0.65rem' }}>
            &larr; Back to Challans
          </button>
          <h1 className="page-title">{challanId ? 'Edit Draft Challan' : 'Create Sales Challan'}</h1>
          <p className="page-subtitle">Draft challans do not affect stock until confirmed.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            Customer Information
          </h3>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Customer Account *</label>
            <select
              className="form-control"
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(Number(e.target.value))}
              required
            >
              <option value="">-- Select Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.customerName} ({c.businessName}) — {c.customerType}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Line Items
            </h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddItemRow}>
              + Add Product
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Product</th>
                  <th style={{ width: '15%' }}>Unit Price</th>
                  <th style={{ width: '15%' }}>Available Stock</th>
                  <th style={{ width: '15%' }}>Quantity *</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const selectedProd = products.find(p => p.id === Number(item.productId));
                  const stock = selectedProd ? selectedProd.currentStock : 0;
                  const unitPrice = selectedProd ? selectedProd.unitPrice : 0;
                  const isInsufficient = selectedProd && item.quantity > stock;

                  return (
                    <tr key={index}>
                      <td>
                        <select
                          className="form-control"
                          value={item.productId}
                          onChange={e => handleItemChange(index, 'productId', Number(e.target.value))}
                          required
                        >
                          <option value={0}>-- Select Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.productName} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>${unitPrice.toFixed(2)}</td>
                      <td>
                        <span className={`badge ${stock > 0 ? 'badge-info' : 'badge-danger'}`}>
                          {stock} in stock
                        </span>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          value={item.quantity}
                          onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                          required
                        />
                        {isInsufficient && (
                          <div style={{ color: '#b91c1c', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                            Exceeds stock ({stock})
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRemoveItemRow(index)}
                          disabled={items.length === 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onBack}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Draft Challan'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
