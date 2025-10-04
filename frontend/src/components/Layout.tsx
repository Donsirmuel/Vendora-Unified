import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  ArrowLeftRight, 
  Settings, 
  LogOut,
  Menu,
  X,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from "@/contexts/AuthContext";
// TrialBanner intentionally not displayed globally; shown only on Settings page
import Footer from '@/components/Footer';
import { ensurePushRegistered } from "@/main";
import { toast } from "@/components/ui/use-toast";

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const Layout = ({ children, title }: LayoutProps) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!user || typeof window === 'undefined' || typeof Notification === 'undefined') {
      return;
    }

    if (Notification.permission !== 'default') {
      return;
    }

    const storageKey = 'vendora_push_prompted_at_v1';
    const cooldownMs = 1000 * 60 * 60 * 24 * 3; // 3 days cooldown between automatic prompts
    try {
      const lastPrompt = Number(localStorage.getItem(storageKey) || '0');
      if (!Number.isNaN(lastPrompt) && lastPrompt > 0 && Date.now() - lastPrompt < cooldownMs) {
        return;
      }
    } catch {
      // ignore storage access errors
    }

    const schedule = () => {
      const handler = async () => {
        let result: Awaited<ReturnType<typeof ensurePushRegistered>> | null = null;
        try {
          result = await ensurePushRegistered({ prompt: true });
          switch (result) {
            case 'subscribed':
              toast({ title: 'Notifications enabled', description: 'You will now receive alerts for new activity.' });
              break;
            case 'permission-blocked':
              toast({ title: 'Notifications blocked', description: 'Enable notifications from your browser settings to receive alerts.', variant: 'destructive' });
              break;
            case 'prompt-required':
              toast({ title: 'Enable notifications later', description: 'You can turn on notifications anytime from Settings.' });
              break;
            case 'unsupported':
              toast({ title: 'Notifications unavailable', description: 'This device does not support push notifications.', variant: 'destructive' });
              break;
            case 'error':
            case 'unauthenticated':
              toast({ title: 'Notifications unavailable', description: 'We could not enable notifications automatically. Try again from Settings.', variant: 'destructive' });
              break;
            default:
              break;
          }
        } catch (error) {
          toast({ title: 'Notifications error', description: 'We could not enable notifications. Try again from Settings.', variant: 'destructive' });
        } finally {
          try {
            localStorage.setItem(storageKey, String(Date.now()));
          } catch {
            // ignore storage errors
          }
        }
      };

      if ('requestIdleCallback' in window) {
        const id = (window as any).requestIdleCallback(handler, { timeout: 2000 });
        return () => (window as any).cancelIdleCallback?.(id);
      }
      const timeoutId = (window as Window).setTimeout(handler, 1800);
      return () => (window as Window).clearTimeout(timeoutId);
    };

    return schedule();
  }, [user]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      return;
    }

    const flag = '__vendora_prefetched__';
    const win = window as any;
    if (win[flag]) {
      return;
    }

    const loaders = [
      () => import('../pages/Dashboard'),
      () => import('../pages/Orders'),
      () => import('../pages/OrderDetails'),
      () => import('../pages/Transactions'),
      () => import('../pages/TransactionDetails'),
      () => import('../pages/Settings'),
      () => import('../pages/Availability'),
      () => import('../pages/BroadcastMessages'),
      () => import('../pages/Queries'),
      () => import('../pages/Upgrade'),
      () => import('../pages/AdminPayments'),
    ];

    const prefetch = () => {
      if (win[flag]) return;
      win[flag] = true;
      for (const load of loaders) {
        load().catch(() => {});
      }
    };

    if ('requestIdleCallback' in window) {
      const idleId = (window as any).requestIdleCallback(prefetch, { timeout: 4000 });
      return () => (window as any).cancelIdleCallback?.(idleId);
    }

    const timeoutId = setTimeout(prefetch, 2000);
    return () => clearTimeout(timeoutId);
  }, [user]);
  // Theme handled by ThemeToggle component now

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Orders", href: "/orders", icon: ShoppingCart },
    { name: "Transactions", href: "/transactions", icon: ArrowLeftRight },
    { name: "Queries", href: "/queries", icon: MessageCircle },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Logout", href: "#logout", icon: LogOut, action: 'logout' as const },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
  };

  return (
  <div className="min-h-dvh bg-background safe-pt">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-card border-border"
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

  {/* Sidebar */}
  <div role="navigation" aria-label="Primary" className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-y-auto ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full pb-6">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 border-b border-border">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Vendora
            </h1>
          </div>

          {/* User Info */}
          {user && (
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {(() => {
                    const avatarUrl = (user as any)?.avatar_url as string | undefined;
                    const name = user.name || '';
                    const parts = name.trim().split(/\s+/).filter(Boolean);
                    const first = parts[0]?.[0] || '';
                    const last = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] || '');
                    const initials = (first + last).toUpperCase() || '?';
                    return (
                      <>
                        <AvatarImage src={avatarUrl || undefined} alt={name || 'User'} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </>
                    );
                  })()}
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
                <ThemeToggle className="ml-auto" />
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2" aria-label="Main menu">
            {navigation.map((item) => {
              const Icon = item.icon;
              if ((item as any).action === 'logout') {
                return (
                  <button
                    key={item.name}
                    onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                    className={`w-full text-left flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </button>
                );
              }
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-64 flex flex-col min-h-dvh">
          {title && (
            <header className="bg-card border-b border-border px-6 py-4" role="banner">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
                {/* Trial indicator moved to Settings page only */}
              </div>
            </header>
          )}

          {/* Page content */}
          <main id="main-content" className="flex-1 p-6 pb-12 safe-pb" role="main" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </div>
      </div>
  );
};

export default Layout;