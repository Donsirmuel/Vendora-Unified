import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { isAuthenticated } from "@/lib/auth";

// Public / light pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PasswordReset from "./pages/PasswordReset";
import PasswordResetConfirm from "./pages/PasswordResetConfirm";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Pricing from "./pages/Pricing";

// Lazy-loaded heavy pages (route-based code splitting)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));
const Transactions = lazy(() => import("./pages/Transactions"));
const TransactionDetails = lazy(() => import("./pages/TransactionDetails"));
const Settings = lazy(() => import("./pages/Settings"));
const Availability = lazy(() => import("./pages/Availability"));
const BroadcastMessages = lazy(() => import("./pages/BroadcastMessages"));
const Queries = lazy(() => import("./pages/Queries"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const AdminPayments = lazy(() => import("./pages/AdminPayments"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // cache data for 1 minute to reduce refetch churn
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Public Route Component (redirect to dashboard if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  return !isAuthenticated() ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes - Default to Home */}
            <Route path="/terms" element={
              <PublicRoute>
                <Terms />
              </PublicRoute>
            } />
            <Route path="/privacy" element={
              <PublicRoute>
                <Privacy />
              </PublicRoute>
            } />
            <Route path="/pricing" element={
              <PublicRoute>
                <Pricing />
              </PublicRoute>
            } />
            <Route path="/" element={
              <PublicRoute>
                <Home />
              </PublicRoute>
            } />
            <Route path="/signup" element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            } />
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/password-reset" element={
              <PublicRoute>
                <PasswordReset />
              </PublicRoute>
            } />
            <Route path="/password-reset/confirm" element={
              <PublicRoute>
                <PasswordResetConfirm />
              </PublicRoute>
            } />

            {/* Protected Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading dashboard…</div>}>
                    <Dashboard />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading orders…</div>}>
                    <Orders />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading order…</div>}>
                    <OrderDetails />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading transactions…</div>}>
                    <Transactions />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions/:id"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading transaction…</div>}>
                    <TransactionDetails />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading settings…</div>}>
                    <Settings />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/availability"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
                    <Availability />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/broadcast-messages"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
                    <BroadcastMessages />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/queries"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
                    <Queries />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/upgrade"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
                    <Upgrade />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/payments"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
                    <AdminPayments />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            {/* Default Redirects */}
            {/* No duplicate root route here — keep Home as the public default above */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
