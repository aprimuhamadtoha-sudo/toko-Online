import * as React from 'react';
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Toaster } from './components/ui/sonner';
import Navbar from './components/Navbar';
import { db } from './lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import Dashboard from './pages/Dashboard';
import Store from './pages/Store';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Chat from './pages/Chat';
import AdminProducts from './pages/AdminProducts';
import AdminOrders from './pages/AdminOrders';
import Login from './pages/Login';

import AdminVisitors from './pages/AdminVisitors';
import AdminSettings from './pages/AdminSettings';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, profile, loading, isAdmin } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      // Log visitor to Firestore
      const logVisitor = async () => {
        try {
          const timestamp = new Date().toLocaleString('id-ID');
          const lastSeen = new Date().toLocaleString('id-ID');
          
          // Check if visitor exists via API or just send to backend to handle (backend handles update gracefully)
          await fetch('/api/visitors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: profile?.displayName || user.displayName || 'Anonymous',
              timestamp,
              lastSeen
            })
          });
        } catch (error) {
          console.error('Error logging visitor:', error);
        }
      };
      logVisitor();
    }
  }, [user, loading, profile]);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;

  return <>{children}</>;
};

function AppContent() {
  const { isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-200 to-blue-50 font-sans antialiased">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Buyer Routes */}
          <Route path="/" element={<Store />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute adminOnly><AdminProducts /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute adminOnly><AdminOrders /></ProtectedRoute>} />
          <Route path="/admin/visitors" element={<ProtectedRoute adminOnly><AdminVisitors /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute adminOnly><AdminSettings /></ProtectedRoute>} />
        </Routes>
      </main>
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
