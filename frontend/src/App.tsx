import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailsPage } from './pages/CustomerDetailsPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { ChallansPage } from './pages/ChallansPage';
import { ChallanFormPage } from './pages/ChallanFormPage';
import { ChallanDetailsPage } from './pages/ChallanDetailsPage';

const MainContent: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedChallanId, setSelectedChallanId] = useState<number | null>(null);
  const [editingChallanId, setEditingChallanId] = useState<number | null>(null);
  const [creatingChallan, setCreatingChallan] = useState<boolean>(false);

  if (!user) {
    return <LoginPage />;
  }

  const navigateToTab = (tab: string) => {
    setSelectedCustomerId(null);
    setSelectedChallanId(null);
    setEditingChallanId(null);
    setCreatingChallan(false);
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const renderCurrentView = () => {
    if (selectedCustomerId !== null) {
      return (
        <CustomerDetailsPage
          customerId={selectedCustomerId}
          onBack={() => setSelectedCustomerId(null)}
        />
      );
    }

    if (creatingChallan || editingChallanId !== null) {
      return (
        <ChallanFormPage
          challanId={editingChallanId}
          onBack={() => { setCreatingChallan(false); setEditingChallanId(null); }}
          onSuccess={(id) => { setCreatingChallan(false); setEditingChallanId(null); setSelectedChallanId(id); }}
        />
      );
    }

    if (selectedChallanId !== null) {
      return (
        <ChallanDetailsPage
          challanId={selectedChallanId}
          onBack={() => setSelectedChallanId(null)}
          onEdit={(id) => { setSelectedChallanId(null); setEditingChallanId(id); }}
        />
      );
    }

    switch (activeTab) {
      case 'customers':
        return <CustomersPage onSelectCustomer={(id) => setSelectedCustomerId(id)} />;
      case 'products':
        return <ProductsPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'challans':
        return (
          <ChallansPage
            onCreateChallan={() => setCreatingChallan(true)}
            onSelectChallan={(id) => setSelectedChallanId(id)}
            onEditChallan={(id) => setEditingChallanId(id)}
          />
        );
      case 'dashboard':
      default:
        return <DashboardPage onNavigate={navigateToTab} />;
    }
  };

  // View key for smooth page entrance transition
  const viewKey = `${activeTab}-${selectedCustomerId}-${selectedChallanId}-${editingChallanId}-${creatingChallan}`;

  return (
    <div className="app-layout">
      {/* Mobile Topbar */}
      <header className="mobile-topbar">
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>Operations Portal</span>
        <button
          className="btn-menu-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>
      </header>

      {/* Sidebar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 45 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Content Area with smooth entrance animation */}
      <main className="main-content">
        <div className="page-wrapper page-enter" key={viewKey}>
          {renderCurrentView()}
        </div>
      </main>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}

export default App;
