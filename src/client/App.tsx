import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext.js';
import { CartProvider } from './context/CartContext.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { CartDrawer } from './components/CartDrawer.js';
import { AuthModal } from './components/AuthModal.js';

import { HomePage } from './pages/HomePage.js';
import { CatalogPage } from './pages/CatalogPage.js';
import { ProductDetailPage } from './pages/ProductDetailPage.js';
import { CheckoutPage } from './pages/CheckoutPage.js';
import { OrderSuccessPage } from './pages/OrderSuccessPage.js';
import { CustomerProfilePage } from './pages/CustomerProfilePage.js';
import { OrderHistoryPage } from './pages/OrderHistoryPage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';
import { AboutPage } from './pages/AboutPage.js';

export const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('home');
  const [viewParams, setViewParams] = useState<any>({});
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  const navigate = (view: string, params: any = {}) => {
    setCurrentView(view);
    setViewParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col selection:bg-white selection:text-black overflow-x-hidden">
      {/* Navigation Header */}
      <Navbar
        onNavigate={navigate}
        activeView={currentView}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Slide-over Cart Drawer */}
      <CartDrawer onNavigate={navigate} />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Main Dynamic View Content */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            onNavigate={navigate}
            onSelectProduct={(p) => navigate('product-detail', { slugOrId: p.slug })}
          />
        )}

        {currentView === 'catalog' && (
          <CatalogPage
            initialCategory={viewParams.category}
            initialQuery={viewParams.q}
            onSelectProduct={(p) => navigate('product-detail', { slugOrId: p.slug })}
          />
        )}

        {currentView === 'product-detail' && (
          <ProductDetailPage
            productSlugOrId={viewParams.slugOrId}
            onBack={() => navigate('catalog')}
            onNavigate={navigate}
          />
        )}

        {currentView === 'checkout' && (
          <CheckoutPage
            onBack={() => navigate('catalog')}
            onOrderSuccess={(orderData) => navigate('order-success', { orderData })}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentView === 'order-success' && (
          <OrderSuccessPage
            orderData={viewParams.orderData}
            onNavigate={navigate}
          />
        )}

        {currentView === 'profile' && (
          <CustomerProfilePage />
        )}

        {currentView === 'orders' && (
          <OrderHistoryPage
            onViewOrder={(order) => navigate('order-success', { orderData: order })}
            onNavigate={navigate}
          />
        )}

        {currentView === 'admin' && (
          <AdminDashboardPage />
        )}

        {currentView === 'about' && (
          <AboutPage />
        )}
      </main>

      {/* Global Footer */}
      <Footer onNavigate={navigate} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
