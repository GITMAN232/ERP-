import React from 'react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, mobileOpen, onCloseMobile }) => {
  const { user, logout, hasRole } = useAuth();

  if (!user) return null;

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span>Operations Portal</span>
            <span className="sidebar-brand-badge">ERP</span>
          </div>
          {mobileOpen && (
            <button
              className="btn-close"
              style={{ color: '#94a3b8' }}
              onClick={onCloseMobile}
              aria-label="Close menu"
            >
              &times;
            </button>
          )}
        </div>

        <nav>
          <ul className="sidebar-nav">
            <li>
              <button
                className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleNavClick('dashboard')}
              >
                <span>Dashboard</span>
              </button>
            </li>

            {hasRole(['Admin', 'Sales', 'Accounts']) && (
              <li>
                <button
                  className={`sidebar-link ${activeTab === 'customers' ? 'active' : ''}`}
                  onClick={() => handleNavClick('customers')}
                >
                  <span>Customers</span>
                </button>
              </li>
            )}

            {hasRole(['Admin', 'Sales', 'Warehouse']) && (
              <li>
                <button
                  className={`sidebar-link ${activeTab === 'products' ? 'active' : ''}`}
                  onClick={() => handleNavClick('products')}
                >
                  <span>Products</span>
                </button>
              </li>
            )}

            {hasRole(['Admin', 'Warehouse', 'Sales']) && (
              <li>
                <button
                  className={`sidebar-link ${activeTab === 'inventory' ? 'active' : ''}`}
                  onClick={() => handleNavClick('inventory')}
                >
                  <span>Inventory</span>
                </button>
              </li>
            )}

            {hasRole(['Admin', 'Sales', 'Warehouse', 'Accounts']) && (
              <li>
                <button
                  className={`sidebar-link ${activeTab === 'challans' ? 'active' : ''}`}
                  onClick={() => handleNavClick('challans')}
                >
                  <span>Sales Challans</span>
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="user-info-box">
          <span className="user-name">{user.name}</span>
          <div className="user-role-line">
            <span className={`role-badge role-${user.role}`}>{user.role}</span>
          </div>
        </div>
        <button onClick={logout} className="btn-sidebar-logout">
          Sign Out
        </button>
      </div>
    </aside>
  );
};
