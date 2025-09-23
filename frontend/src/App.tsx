import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { isAuthenticated } from "@/lib/auth";

// Auth pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PasswordReset from "./pages/PasswordReset";
import PasswordResetConfirm from "./pages/PasswordResetConfirm";

// Protected pages
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import Transactions from "./pages/Transactions";
import TransactionDetails from "./pages/TransactionDetails";
import Settings from "./pages/Settings";
import Availability from "./pages/Availability";
import BroadcastMessages from "./pages/BroadcastMessages";
import Queries from "./pages/Queries";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Upgrade from "./pages/Upgrade";
import AdminPayments from "./pages/AdminPayments";

const queryClient = new QueryClient();

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
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            } />
            <Route path="/orders/:id" element={
              <ProtectedRoute>
                <OrderDetails />
              </ProtectedRoute>
            } />
            <Route path="/transactions" element={
              <ProtectedRoute>
                <Transactions />
              </ProtectedRoute>
            } />
            <Route path="/transactions/:id" element={
              <ProtectedRoute>
                <TransactionDetails />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/availability" element={
              <ProtectedRoute>
                <Availability />
              </ProtectedRoute>
            } />
            <Route path="/broadcast-messages" element={
              <ProtectedRoute>
                <BroadcastMessages />
              </ProtectedRoute>
            } />
            <Route path="/queries" element={
              <ProtectedRoute>
                <Queries />
              </ProtectedRoute>
            } />
            <Route path="/upgrade" element={
              <ProtectedRoute>
                <Upgrade />
              </ProtectedRoute>
            } />

            <Route path="/admin/payments" element={
              <ProtectedRoute>
                <AdminPayments />
              </ProtectedRoute>
            } />

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
