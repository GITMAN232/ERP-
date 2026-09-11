import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import type { CustomerDetails } from '../types';
import { useAuth } from '../context/AuthContext';

export const CustomerDetailsPage: React.FC<{ customerId: number; onBack: () => void }> = ({ customerId, onBack }) => {
  const { hasRole } = useAuth();
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [noteText, setNoteText] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    fetchCustomerDetails();
  }, [customerId]);

  const fetchCustomerDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/customers/${customerId}`);
      setCustomer(data);
      if (data.followUpDate) {
        setNextFollowUpDate(data.followUpDate.split('T')[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customer details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setSubmittingNote(true);
    setError(null);
    try {
      await apiRequest(`/customers/${customerId}/followups`, {
        method: 'POST',
        body: JSON.stringify({
          note: noteText,
          followUpDate: nextFollowUpDate || null
        })
      });
      setNoteText('');
      setSuccessMsg('Follow-up note recorded successfully');
      fetchCustomerDetails();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add follow-up note');
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <p>Loading customer profile...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>&larr; Back to Customers</button>
        <div className="empty-state">
          <p>Customer not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '0.65rem' }}>
            &larr; Back to Customers
          </button>
          <h1 className="page-title">{customer.customerName}</h1>
          <p className="page-subtitle">{customer.businessName}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className={`badge ${customer.status === 'Active' ? 'badge-success' : customer.status === 'Lead' ? 'badge-warning' : 'badge-danger'}`}>
            {customer.status}
          </span>
          <span className="badge badge-info">
            {customer.customerType}
          </span>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="form-row" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            Account Details
          </h3>
          <p style={{ marginBottom: '0.35rem' }}><strong>Mobile:</strong> {customer.mobileNumber}</p>
          <p style={{ marginBottom: '0.35rem' }}><strong>Email:</strong> {customer.email || 'N/A'}</p>
          <p style={{ marginBottom: '0.35rem' }}><strong>GST Number:</strong> {customer.gstNumber || 'N/A'}</p>
          <p style={{ marginTop: '0.5rem' }}><strong>Address:</strong><br />{customer.address}</p>
        </div>

        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            Follow-Up Status
          </h3>
          <p style={{ marginBottom: '0.35rem' }}>
            <strong>Next Scheduled Follow-Up:</strong>{' '}
            {customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : 'None scheduled'}
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            <strong>Latest Notes:</strong><br />
            {customer.notes || 'No notes on file.'}
          </p>
        </div>
      </div>

      {hasRole(['Admin', 'Sales']) && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.85rem' }}>Log Follow-Up Activity</h3>
          <form onSubmit={handleAddFollowUp}>
            <div className="form-group">
              <label>Follow-Up Notes *</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Enter details of conversation or next steps..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                required
              />
            </div>
            <div className="form-row" style={{ alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Next Follow-Up Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={nextFollowUpDate}
                  onChange={e => setNextFollowUpDate(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={submittingNote}>
                  {submittingNote ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          Follow-Up Activity Timeline
        </h3>

        {!customer.followups || customer.followups.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <p>No follow-up notes recorded yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {customer.followups.map(f => (
              <div
                key={f.id}
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: 'var(--radius)',
                  borderLeft: '3px solid var(--primary)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  <span>Logged by: <strong>{f.createdBy}</strong></span>
                  <span>{new Date(f.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{f.note}</p>
                {f.followUpDate && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem', fontWeight: 500 }}>
                    Scheduled Follow-Up: {new Date(f.followUpDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
