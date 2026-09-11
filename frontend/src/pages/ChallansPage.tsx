import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import type { Challan } from '../types';
import { useAuth } from '../context/AuthContext';

interface ChallansPageProps {
  onCreateChallan: () => void;
  onSelectChallan: (id: number) => void;
  onEditChallan: (id: number) => void;
}

export const ChallansPage: React.FC<ChallansPageProps> = ({
  onCreateChallan,
  onSelectChallan,
  onEditChallan
}) => {
  const { hasRole } = useAuth();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChallans();
  }, []);

  const fetchChallans = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/challans');
      setChallans(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sales challans');
    } finally {
      setLoading(false);
    }
  };

  const filteredChallans = challans.filter(c => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Challans</h1>
          <p className="page-subtitle">Track wholesale dispatch challans, draft orders, and confirmation status.</p>
        </div>
        {hasRole(['Admin', 'Sales']) && (
          <button className="btn btn-primary" onClick={onCreateChallan}>
            + Create Challan
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card" style={{ marginBottom: '1rem', padding: '0.65rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          Status:
        </span>
        {['ALL', 'Draft', 'Confirmed', 'Cancelled'].map(st => (
          <button
            key={st}
            className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(st)}
          >
            {st}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty-state">
            <p>Loading sales challans...</p>
          </div>
        ) : filteredChallans.length === 0 ? (
          <div className="empty-state">
            <p>No sales challans found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Customer Name</th>
                  <th>Business Name</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Created By</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChallans.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => onSelectChallan(c.id)}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                      {c.challanNumber}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {c.customer ? c.customer.customerName : 'N/A'}
                    </td>
                    <td>{c.customer ? c.customer.businessName : 'N/A'}</td>
                    <td>{c.totalQuantity} units</td>
                    <td>
                      <span className={`badge ${c.status === 'Confirmed' ? 'badge-success' : c.status === 'Draft' ? 'badge-warning' : 'badge-danger'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>{new Date(c.createdDate).toLocaleDateString()}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.createdBy}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={e => { e.stopPropagation(); onSelectChallan(c.id); }}
                      >
                        View
                      </button>
                      {c.status === 'Draft' && hasRole(['Admin', 'Sales']) && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ marginLeft: '0.35rem' }}
                          onClick={e => { e.stopPropagation(); onEditChallan(c.id); }}
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
    </div>
  );
};
