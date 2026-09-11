import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import type { StockMovement } from '../types';

export const InventoryPage: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/stock/movements');
      setMovements(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stock movements');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory & Stock Movements</h1>
          <p className="page-subtitle">Complete audit trail of all inbound and outbound stock transactions.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchMovements}>
          Refresh Log
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty-state">
            <p>Loading stock movements log...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="empty-state">
            <p>No stock movement records logged yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Movement</th>
                  <th>Quantity</th>
                  <th>Reason / Reference</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(m.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{m.productName}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{m.sku}</td>
                    <td>
                      <span className={`badge ${m.movementType === 'IN' ? 'badge-success' : 'badge-danger'}`}>
                        {m.movementType}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: m.movementType === 'IN' ? '#059669' : '#dc2626' }}>
                      {m.movementType === 'IN' ? `+${m.quantityChanged}` : `-${m.quantityChanged}`}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{m.reason}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{m.createdBy}</td>
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
