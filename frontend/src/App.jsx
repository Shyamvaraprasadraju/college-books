import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import IntroLoader from './components/common/IntroLoader';

// Lazy loaded (Code Split) pages
const Home = React.lazy(() => import('./pages/Home'));
const Upload = React.lazy(() => import('./pages/Upload'));
const AdminPage = React.lazy(() => import('./components/data/AdminPage'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFD]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-3 border-slate-200 border-t-[#1B2845] rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading...</p>
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <>
      {showIntro && <IntroLoader onComplete={() => setShowIntro(false)} />}
      
      {/* 
        We use an inline style or class to hide the main app's scrollbar 
        while the intro is playing to prevent jarring layout shifts 
      */}
      <div style={{ display: showIntro ? 'none' : 'block' }}>
        <AuthProvider>
          <Router>
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-[#FAFBFD]">
                <div className="w-12 h-12 border-3 border-slate-200 border-t-[#1B2845] rounded-full animate-spin" />
              </div>
            }>
              <Routes>
            <Route path="/" element={
              <ErrorBoundary>
                <Home />
              </ErrorBoundary>
            } />
            <Route
              path="/upload"
              element={
                <ErrorBoundary>
                  <ProtectedRoute>
                    <Upload />
                  </ProtectedRoute>
                </ErrorBoundary>
              }
            />
            <Route
              path="/admin-dashboard"
              element={
                <ErrorBoundary>
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                </ErrorBoundary>
              }
            />
            {/* Catch all 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster
          position="top-center"
          reverseOrder={false}
          gutter={8}
          containerClassName=""
          containerStyle={{}}
          toastOptions={{
            // Define default options
            className: '',
            duration: 5000,
            style: {
              background: '#363636',
              color: '#fff',
              padding: '16px',
              borderRadius: '16px',
              fontSize: '16px',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            },

            // Default options for specific types
            success: {
              duration: 5000,
              style: {
                background: '#22c55e', // Bright vivid green
                color: '#ffffff',
                fontWeight: '600',
                border: 'none',
                padding: '16px 24px',
                fontSize: '16px',
              },
              iconTheme: {
                primary: '#ffffff',
                secondary: '#22c55e',
              },
            },
            error: {
              duration: 5000,
              style: {
                background: '#ef4444', // Bright vivid red
                color: '#ffffff',
                fontWeight: '600',
                border: 'none',
                padding: '16px 24px',
                fontSize: '16px',
              },
              iconTheme: {
                primary: '#ffffff',
                secondary: '#ef4444',
              },
            },
          }}
        />
      </Router>
        </AuthProvider>
      </div>
    </>
  );
}

export default App;
