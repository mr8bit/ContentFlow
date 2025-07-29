import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster, TooltipProvider } from './components/ui/index';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Channels from './pages/Channels';
import Posts from './pages/Posts';
import CreatePost from './pages/CreatePost';
import Settings from './pages/Settings';
import { PostViewPage } from './pages/PostViewPage';
import './i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Register />
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Layout>
              <Analytics />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/channels"
        element={
          <ProtectedRoute>
            <Layout>
              <Channels />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/posts"
        element={
          <ProtectedRoute>
            <Layout>
              <Posts />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/posts/create"
        element={
          <ProtectedRoute>
            <Layout>
              <CreatePost />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/posts/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <PostViewPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <TooltipProvider>
            <Router>
              <div className="min-h-screen bg-background">
                <AppRoutes />
                <Toaster />
              </div>
            </Router>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;