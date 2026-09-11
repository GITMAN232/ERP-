import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import type { Challan } from '../types';
import { useAuth } from '../context/AuthContext';

interface ChallanDetailsPageProps {
  challanId: number;
  onBack: () => void;
  onEdit: (id: number) => void;
}

export const ChallanDetailsPage: React.FC<ChallanDetailsPageProps> = ({ challanId, onBack, onEdit }) => {
  const { hasRole } = useAuth();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchChallanDetails();
  }, [challanId]);

  const fetchChallanDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/challans/${challanId}`);
      setChallan(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load challan details');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmChallan = async () => {
    if (!window.confirm(`Confirm sales challan ${challan?.challanNumber}? This will deduct inventory and record stock movements.`)) {
      return;
    }

    setConfirming(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await apiRequest(`/challans/${challanId}/confirm`, {
        method: 'POST'
      });
      setChallan(updated);
      setSuccessMsg(`Challan ${updated.challanNumber} confirmed successfully. Inventory has been updated.`);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm sales challan');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <p>Loading sales challan details...</p>
      </div>
    );
  }

  if (!challan) {
    return (
      <div>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>&larr; Back to Challans</button>
        <div className="empty-state">
          <p>Sales challan not found.</p>
        </div>
      </div>
    );
  }

  const grandTotal = challan.items ? challan.items.reduce((sum, item) => sum + item.totalPrice, 0) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '0.65rem' }}>
            &larr; Back to Challans
          </button>
          <h1 className="page-title">{challan.challanNumber}</h1>
          <p className="page-subtitle">Created on {new Date(challan.createdDate).toLocaleDateString()} by {challan.createdBy}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <span className={`badge ${challan.status === 'Confirmed' ? 'badge-success' : challan.status === 'Draft' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
            {challan.status}
          </span>

          {challan.status === 'Draft' && hasRole(['Admin', 'Sales']) && (
            <>
              <button className="btn btn-secondary" onClick={() => onEdit(challan.id)}>
                Edit Draft
              </button>
              <button className="btn btn-success" onClick={handleConfirmChallan} disabled={confirming}>
                {confirming ? 'Confirming...' : 'Confirm Challan'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="form-row" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            Customer Information
          </h3>
          {challan.customer ? (
            <>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{challan.customer.customerName}</p>
              <p style={{ marginBottom: '0.25rem' }}><strong>Business:</strong> {challan.customer.businessName}</p>
              <p style={{ marginBottom: '0.25rem' }}><strong>Mobile:</strong> {challan.customer.mobileNumber}</p>
              <p style={{ marginBottom: '0.25rem' }}><strong>Email:</strong> {challan.customer.email || 'N/A'}</p>
              <p style={{ marginTop: '0.4rem', color: 'var(--text-muted)' }}><strong>Address:</strong> {challan.customer.address}</p>
            </>
          ) : (
            <p>Customer details unavailable</p>
          )}
        </div>

        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            Challan Summary
          </h3>
          <p style={{ marginBottom: '0.35rem' }}><strong>Status:</strong> {challan.status}</p>
          <p style={{ marginBottom: '0.35rem' }}><strong>Total Line Items:</strong> {challan.items ? challan.items.length : 0}</p>
          <p style={{ marginBottom: '0.35rem' }}><strong>Total Quantity:</strong> {challan.totalQuantity} units</p>
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Value</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>
              ${grandTotal.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
            Item Snapshots
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Historical record of products, SKUs, and pricing captured when this challan was generated.
          </p>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Snapshot</th>
                <th>Unit Price</th>
                <th>Quantity</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {challan.items && challan.items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{item.skuSnapshot}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.productNameSnapshot}</td>
                  <td>${item.unitPriceSnapshot.toFixed(2)}</td>
                  <td><strong>{item.quantity}</strong></td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>${item.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
