import { ReactNode } from "react";
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
import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const Layout = ({ children, title }: LayoutProps) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("vendora_theme") || "dark");

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('vendora_theme', next);
    const root = document.documentElement;
    if (next === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
  };

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
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-y-auto ${
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
                <Button variant="ghost" size="icon" className="ml-auto" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}
                </Button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
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
  <div className="lg:ml-64">
        <div className="flex-1">
          {/* Header */}
          {title && (
            <header className="bg-card border-b border-border px-6 py-4">
              <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            </header>
          )}

          {/* Page content */}
          <main className="p-6 pb-24 safe-pb">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;