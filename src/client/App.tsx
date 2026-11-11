import React, { useState, Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext.js';
import { CartProvider } from './context/CartContext.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { CartDrawer } from './components/CartDrawer.js';
import { AuthModal } from './components/AuthModal.js';
import { HomePage } from './pages/HomePage.js';

// Code-split pages to optimize production bundle size
const CatalogPage = lazy(() => import('./pages/CatalogPage.js').then(m => ({ default: m.CatalogPage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage.js').then(m => ({ default: m.ProductDetailPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.js').then(m => ({ default: m.CheckoutPage })));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage.js').then(m => ({ default: m.OrderSuccessPage })));
const CustomerProfilePage = lazy(() => import('./pages/CustomerProfilePage.js').then(m => ({ default: m.CustomerProfilePage })));
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage.js').then(m => ({ default: m.OrderHistoryPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.js').then(m => ({ default: m.AdminDashboardPage })));
const AboutPage = lazy(() => import('./pages/AboutPage.js').then(m => ({ default: m.AboutPage })));

const LoadingSpinner = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-3"></div>
    <span className="text-xs uppercase tracking-widest text-gray-400">Loading collection...</span>
  </div>
);

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
        <Suspense fallback={<LoadingSpinner />}>
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
        </Suspense>
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
