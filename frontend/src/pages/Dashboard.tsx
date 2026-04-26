import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  ArrowLeftRight, 
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
// Removed direct bank/rate imports previously used for legacy inline checklist
import React from "react";
import { connectSSE } from "@/lib/sse";
const ChartsPanel = React.lazy(() => import("@/components/ChartsPanel"));
import http from "@/lib/http";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import BrandedEmptyState from "@/components/BrandedEmptyState";

interface DashboardStats {
  totalOrdersReceived: number; // accepted + declined
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  completedTransactions: number;
  pendingQueries: number;
}

interface RecentActivity {
  orders: any[];
  transactions: any[];
  queries: any[];
  broadcasts: any[];
}

interface DashboardSummaryResponse {
  profile?: {
    currency?: string;
    telegram_username?: string | null;
    bot_link?: string | null;
  };
  stats: {
    total_orders_received: number;
    pending_orders: number;
    completed_orders: number;
    total_revenue: number;
    completed_transactions: number;
    pending_queries: number;
  };
  recent: {
    orders: any[];
    transactions: any[];
    queries: any[];
    broadcasts: any[];
  };
  insights?: {
    daily_completed?: Array<{ date: string; count: number; revenue: number }>;
  };
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrdersReceived: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    completedTransactions: 0,
    pendingQueries: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity>({
    orders: [],
    transactions: [],
    queries: [],
    broadcasts: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [completedSeries, setCompletedSeries] = useState<Array<{ date: string; count: number; revenue: number }>>([]);
  const [botLink, setBotLink] = useState<string | null>(null);
  const [telegramUser, setTelegramUser] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  const [userCurrency, setUserCurrency] = useState<string>('USD');
  const lastReloadRef = useRef(0);
  const reloadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadDashboardData();
    // Live updates via SSE; fallback is manual refresh via user actions
    const sub = connectSSE('/api/v1/stream/', {
      onMessage: (ev) => {
        if (ev.type === 'snapshot') {
          const now = Date.now();
          const minInterval = 3000;
          if (now - lastReloadRef.current > minInterval) {
            lastReloadRef.current = now;
            loadDashboardData({ silent: true });
            return;
          }
          if (reloadTimerRef.current) {
            window.clearTimeout(reloadTimerRef.current);
          }
          reloadTimerRef.current = window.setTimeout(() => {
            lastReloadRef.current = Date.now();
            loadDashboardData({ silent: true });
            reloadTimerRef.current = null;
          }, minInterval);
        }
      },
    });
    return () => {
      if (reloadTimerRef.current) {
        window.clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
      sub.close();
    };
  }, []);

  // Stagger card reveal for a more noticeable dashboard entrance
  useEffect(() => {
    const cards = Array.from(document.querySelectorAll('.card-anim')) as HTMLElement[];
    cards.forEach((c, i) => setTimeout(() => c.classList.add('show'), 90 * i + 50));
    return () => cards.forEach(c => c.classList.remove('show'));
  }, []);

  // Defer heavy charts to after first paint/idle to improve LCP
  useEffect(() => {
    const schedule = (fn: () => void) =>
      ("requestIdleCallback" in window
        ? (window as any).requestIdleCallback(fn)
        : setTimeout(fn, 1200));
    schedule(() => setShowCharts(true));
  }, []);

  useEffect(() => {
    // Keep dashboard responsive with a sensible default before summary arrives
    setUserCurrency(user?.currency || 'USD');
  }, []);

  const loadDashboardData = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }

      const summary = await http.get<DashboardSummaryResponse>('/api/v1/accounts/dashboard-summary/');
      const summaryStats = summary.data?.stats;
      const summaryRecent = summary.data?.recent;
      const summaryProfile = summary.data?.profile;

      setBotLink(summaryProfile?.bot_link || null);
      setTelegramUser(summaryProfile?.telegram_username || null);
      setUserCurrency(summaryProfile?.currency || user?.currency || 'USD');

      setStats({
        totalOrdersReceived: summaryStats?.total_orders_received || 0,
        pendingOrders: summaryStats?.pending_orders || 0,
        completedOrders: summaryStats?.completed_orders || 0,
        totalRevenue: Number(summaryStats?.total_revenue || 0),
        completedTransactions: summaryStats?.completed_transactions || 0,
        pendingQueries: summaryStats?.pending_queries || 0,
      });

      setRecentActivity({
        orders: summaryRecent?.orders || [],
        transactions: summaryRecent?.transactions || [],
        queries: summaryRecent?.queries || [],
        broadcasts: summaryRecent?.broadcasts || [],
      });

      setCompletedSeries(summary.data?.insights?.daily_completed || []);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  // Expire overdue control removed per request

  const formatCurrencyDisplay = (amount: number) => formatCurrency(amount, userCurrency);

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; icon: any } } = {
      pending: { color: "border border-warning/35 bg-warning/15 text-warning-foreground", icon: Clock },
      completed: { color: "border border-success/35 bg-success/15 text-success-foreground", icon: CheckCircle },
      declined: { color: "border border-destructive/35 bg-destructive/15 text-destructive", icon: AlertCircle }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Build insights from completed transactions
  const insights = useMemo(() => {
    const series = completedSeries.length > 0 ? completedSeries : [];

    const statusCounts = { completed: 0, pending: 0, failed: 0 };

    statusCounts.completed = stats.completedTransactions || 0;
    statusCounts.pending = 0; // not shown now

    const totals = series.reduce(
      (acc, d) => ({ revenue: acc.revenue + Number(d.revenue || 0), count: acc.count + Number(d.count || 0) }),
      { revenue: 0, count: 0 }
    );

    return { series, statusCounts, totals };
  }, [completedSeries, stats.completedTransactions, stats.completedOrders]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64" role="status" aria-live="polite" aria-label="Loading dashboard data">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" aria-hidden="true"></div>
            <p className="text-muted-foreground">Loading dashboard…</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 page-anim">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/10 p-6 shadow-[0_30px_80px_-45px_oklch(var(--primary)/0.55)] sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl space-y-3">
                <Badge className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-primary">
                  Daily dashboard
                </Badge>
                <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                  Vendora dashboard
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Welcome back, {user?.name || 'vendor'}. Manage orders, payments, and customer updates in one place.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-primary/40 bg-background/70 text-primary hover:bg-primary/10"
                onClick={() => loadDashboardData()}
              >
                Sync dashboard
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/orders">
                <Button variant="secondary" className="rounded-full">Review orders</Button>
              </Link>
              <Link to="/transactions">
                <Button variant="secondary" className="rounded-full">Track settlements</Button>
              </Link>
              <Link to="/broadcast-messages">
                <Button className="rounded-full bg-gradient-primary text-primary-foreground">Send update</Button>
              </Link>
            </div>
          </div>
        </div>

  {/* Onboarding Checklist (derived from backend) */}
  <OnboardingChecklist />

  {/* Share your bot link (customers use bot, vendors share link) */}
        {botLink && (
          <Card className="card-anim">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Share your bot link with customers</CardTitle>
              <CardDescription>Customers trade via your Telegram bot, not the PWA.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row md:items-center gap-2">
              <div className="flex-1 truncate text-sm">
                <span className="font-medium mr-2">Link:</span>
                <a className="text-primary underline break-all" href={botLink} target="_blank" rel="noreferrer">{botLink}</a>
                {telegramUser && (
                  <span className="ml-2 text-xs text-muted-foreground">(@{telegramUser})</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(botLink);
                      toast({ title: 'Copied', description: 'Bot link copied to clipboard' });
                    } catch {
                      toast({ title: 'Copy failed', description: 'Select and copy manually', variant: 'destructive' });
                    }
                  }}
                >
                  Copy
                </Button>
                <a href={botLink} target="_blank" rel="noreferrer">
                  <Button variant="default">Open in Telegram</Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}

  {/* (Legacy inline checklist removed in favour of server-derived OnboardingChecklist component) */}

        {/* Stats Cards */}
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
    <Card className="card-anim rounded-3xl border-border/70 bg-gradient-to-br from-card via-card to-primary/10 shadow-[0_26px_55px_-38px_oklch(var(--primary)/0.45)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Orders received</CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
        <div className="text-2xl font-bold">{stats.totalOrdersReceived}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats.pendingOrders} waiting on vendor approval
              </p>
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                <TrendingUp className="h-3.5 w-3.5" />
                Needs action
              </div>
            </CardContent>
          </Card>

          <Card className="card-anim rounded-3xl border-border/70 bg-gradient-to-br from-card via-card to-accent/10 shadow-[0_26px_55px_-38px_oklch(var(--accent)/0.5)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total revenue ({userCurrency})</CardTitle>
              <span className="sr-only">{userCurrency}</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrencyDisplay(stats.totalRevenue)}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Driven by {stats.completedOrders} completed orders
              </p>
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                Money in
              </div>
            </CardContent>
          </Card>

          <Card className="card-anim rounded-3xl border-border/70 bg-gradient-to-br from-card via-card to-success/10 shadow-[0_26px_55px_-38px_oklch(var(--success)/0.45)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Transactions</CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedTransactions}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats.completedTransactions} released in the latest sync
              </p>
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs text-success-foreground">
                <CheckCircle className="h-3.5 w-3.5" />
                Done today
              </div>
            </CardContent>
          </Card>

          <Card className="card-anim rounded-3xl border-border/70 bg-gradient-to-br from-card via-card to-warning/10 shadow-[0_26px_55px_-38px_oklch(var(--warning)/0.45)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open queries</CardTitle>
              <MessageCircle className="h-4 w-4 text-warning-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingQueries}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Require vendor response
              </p>
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-warning/20 px-2.5 py-1 text-xs text-warning-foreground">
                <TrendingDown className="h-3.5 w-3.5" />
                Answer soon
              </div>
            </CardContent>
          </Card>
        </div>

  {/* Recent Activity */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Orders */}
          <Card className="rounded-3xl border border-border bg-gradient-to-br from-background via-muted/40 to-primary/10 shadow-xl shadow-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Recent Pending Orders</span>
              </CardTitle>
              <CardDescription>
                Orders awaiting vendor decisioning
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.orders.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.orders.map((order) => (
                    <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border/70 bg-card/80 p-3">
                      <div className="min-w-0">
                        <p className="font-medium">{order.asset}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.amount} {order.asset} @ {order.rate}
                        </p>
                      </div>
                      <div className="flex items-center flex-wrap gap-2">
                        {getStatusBadge(order.status)}
                        <Link to={`/orders/${order.id}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                  <Link to="/orders">
                    <Button variant="outline" className="w-full">View All Orders</Button>
                  </Link>
                </div>
              ) : (
                <BrandedEmptyState
                  icon={ShoppingCart}
                  title="No pending orders"
                  description="All active orders are cleared. Publish a fresh rate card to stay ahead of demand."
                  badge="All clear"
                  actions={
                    <>
                      <Link to="/orders">
                        <Button
                          variant="secondary"
                        >
                          Review order history
                        </Button>
                      </Link>
                      <Link to="/broadcast-messages">
                        <Button className="bg-gradient-primary text-primary-foreground">
                          Broadcast new rate
                        </Button>
                      </Link>
                    </>
                  }
                />
              )}
            </CardContent>
          </Card>

          {/* Latest Uncompleted Transactions */}
          <Card className="rounded-3xl border border-border bg-gradient-to-br from-background via-muted/40 to-primary/10 shadow-xl shadow-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ArrowLeftRight className="h-5 w-5" />
                <span>Latest Uncompleted Transactions</span>
              </CardTitle>
              <CardDescription>
                Transactions awaiting release
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.transactions.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.transactions.map((tx: any) => (
                    <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border/70 bg-card/80 p-3">
                      <div className="min-w-0">
                        <p className="font-medium">{tx.order_asset} • {tx.order_type?.toUpperCase()}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrencyDisplay(Number(tx.order_total_value || 0))}</p>
                      </div>
                      <div className="flex items-center flex-wrap gap-2">
                        <Badge className="bg-yellow-100 text-yellow-800">Uncompleted</Badge>
                        <Link to={`/transactions/${tx.id}`}>
                          <Button size="sm" variant="outline">Open</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                  <Link to="/transactions">
                    <Button variant="outline" className="w-full">View All Transactions</Button>
                  </Link>
                </div>
              ) : (
                <BrandedEmptyState
                  icon={ArrowLeftRight}
                  title="No transactions pending release"
                  description="Every buyer has been settled. Queue new deals or follow up on pipeline leads."
                  badge="Settlement complete"
                  actions={
                    <>
                      <Link to="/transactions">
                        <Button
                          variant="secondary"
                        >
                          Review transaction log
                        </Button>
                      </Link>
                      <Link to="/queries">
                        <Button className="bg-gradient-primary text-primary-foreground">
                          Check buyer queries
                        </Button>
                      </Link>
                    </>
                  }
                />
              )}
            </CardContent>
          </Card>

          {/* Recent Queries */}
          <Card className="rounded-3xl border border-border bg-gradient-to-br from-background via-muted/40 to-primary/10 shadow-xl shadow-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>Recent Queries</span>
              </CardTitle>
              <CardDescription>
                Buyer questions and support requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.queries.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.queries.map((query) => (
                    <div key={query.id} className="rounded-lg border border-border/70 bg-card/80 p-3">
                      <p className="font-medium text-sm">{query.message.substring(0, 50)}...</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Contact: {query.contact}
                      </p>
                      <Link to={`/queries`}>
                        <Button size="sm" variant="outline" className="mt-2">Respond</Button>
                      </Link>
                    </div>
                  ))}
                  <Link to="/queries">
                    <Button variant="outline" className="w-full">View All Queries</Button>
                  </Link>
                </div>
              ) : (
                <BrandedEmptyState
                  icon={MessageCircle}
                  title="No open buyer queries"
                  description="Your support queue is quiet. Share your Vendora bot link to let buyers reach you 24/7."
                  badge="Inbox clear"
                  actions={
                    <>
                      <Link to="/broadcast-messages">
                        <Button
                          variant="secondary"
                        >
                          Share availability update
                        </Button>
                      </Link>
                      {botLink && (
                        <Button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(botLink);
                              toast({ title: 'Copied', description: 'Bot link copied to clipboard' });
                            } catch {
                              toast({ title: 'Copy failed', description: 'Select and copy manually', variant: 'destructive' });
                            }
                          }}
                          className="bg-gradient-primary text-primary-foreground"
                        >
                          Copy Vendora bot link
                        </Button>
                      )}
                    </>
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Broadcasts */}
        {recentActivity.broadcasts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Broadcasts</CardTitle>
              <CardDescription>
                Your latest announcements to customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.broadcasts.map((broadcast) => (
                  <div key={broadcast.id} className="p-3 border rounded-lg">
                    <h4 className="font-medium">{broadcast.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {String(broadcast.content || '').substring(0, 100)}...
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Sent: {new Date(broadcast.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                <Link to="/broadcast-messages">
                  <Button variant="outline" className="w-full">Send New Broadcast</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insights: completed transactions per day */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {!showCharts && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Completed Transactions per Day</CardTitle>
                  <CardDescription>Loading…</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full animate-pulse bg-muted rounded" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Revenue (last 14 days)</CardTitle>
                  <CardDescription>Loading…</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full animate-pulse bg-muted rounded" />
                </CardContent>
              </Card>
            </>
          )}
          {showCharts && (
            <React.Suspense fallback={<div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Card><CardHeader><CardTitle>Charts</CardTitle><CardDescription>Loading…</CardDescription></CardHeader><CardContent><div className="h-72 bg-muted rounded animate-pulse" /></CardContent></Card></div>}>
              <ChartsPanel insights={insights as any} formatCurrency={formatCurrency} />
            </React.Suspense>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;