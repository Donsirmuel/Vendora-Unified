import { useState, useEffect, useMemo } from "react";
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
import { listOrders } from "@/lib/orders";
import { listTransactions, type Transaction } from "@/lib/transactions";
import { listQueries } from "@/lib/queries";
import { listBroadcasts } from "@/lib/broadcast";
import { useToast } from "@/hooks/use-toast";
// Removed direct bank/rate imports previously used for legacy inline checklist
import React from "react";
import { connectSSE } from "@/lib/sse";
const ChartsPanel = React.lazy(() => import("@/components/ChartsPanel"));
import http from "@/lib/http";
import OnboardingChecklist from "@/components/OnboardingChecklist";

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
  const [completedTx, setCompletedTx] = useState<Transaction[]>([]);
  const [botLink, setBotLink] = useState<string | null>(null);
  const [telegramUser, setTelegramUser] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => {
    loadDashboardData();
    // Live updates via SSE; fallback is manual refresh via user actions
    const sub = connectSSE('/api/v1/stream/', {
      onMessage: (ev) => {
        if (ev.type === 'snapshot') {
          // Whenever snapshot markers change, refresh dashboard data
          loadDashboardData();
        }
      },
    });
    return () => sub.close();
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
    // Load vendor bot link for easy sharing (vendors only)
    (async () => {
      try {
        const res = await http.get('/api/v1/accounts/vendors/me/');
        const data = res.data || {};
        setBotLink(data.bot_link || null);
        setTelegramUser(data.telegram_username || null);
      } catch {
        // ignore
      }
    })();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load orders by status (use counts for accuracy)
      const [pendingOrdersResp, acceptedOrdersResp, declinedOrdersResp, completedOrdersResp] = await Promise.all([
        listOrders(1, 'pending'),
        listOrders(1, 'accepted'),
        listOrders(1, 'declined'),
        listOrders(1, 'completed'),
      ]);
      const pendingOrders = pendingOrdersResp.results;
      const acceptedCount = acceptedOrdersResp.count || 0;
      const declinedCount = declinedOrdersResp.count || 0;
      const completedOrdersCount = completedOrdersResp.count || 0;
      
      // Load transactions: completed (for charts) and uncompleted (latest list)
      const allTransactions: Transaction[] = [];
      let completedCount = 0;
      try {
        const completedPage1 = await listTransactions(1, 'completed');
        completedCount = completedPage1.count || 0;
        let pageRes = completedPage1;
        allTransactions.push(...pageRes.results);
        // fetch up to 2 more pages
        for (let page = 2; page <= 3 && pageRes.next; page++) {
          pageRes = await listTransactions(page, 'completed');
          allTransactions.push(...pageRes.results);
        }
      } catch {}
      const completedTransactions = allTransactions;
      const uncompletedResp = await listTransactions(1, 'uncompleted');
      const uncompletedTransactions = uncompletedResp.results;
      
      // Load queries
  const queriesResponse = await listQueries(1);
  // Backend Query model has no explicit status; treat those without reply as pending
  const pendingQueries = queriesResponse.results.filter((q: any) => !q.reply || String(q.reply).trim() === "");
      
      // Load recent broadcasts
      const broadcastsResponse = await listBroadcasts(1);
      const recentBroadcasts = broadcastsResponse.results.slice(0, 2);
      
      // Calculate revenue from NGN totals exposed via order_total_value
      const totalRevenue = completedTransactions.reduce((sum: number, tx: any) => {
        const v = (tx as any).order_total_value;
        const n = v != null ? Number(v) : NaN;
        return sum + (isFinite(n) ? n : 0);
      }, 0);
      
      setStats({
        totalOrdersReceived: acceptedCount + declinedCount,
        pendingOrders: pendingOrdersResp.count || 0,
        completedOrders: completedOrdersCount,
        totalRevenue,
        completedTransactions: completedCount,
        pendingQueries: pendingQueries.length
      });
  setCompletedTx(completedTransactions);
      
      setRecentActivity({
        orders: pendingOrders.slice(0, 3),
  transactions: uncompletedTransactions.slice(0, 3),
  queries: pendingQueries.slice(0, 3),
        broadcasts: recentBroadcasts
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Expire overdue control removed per request

  const formatCurrency = (amount: number) => `₦${Number(amount || 0).toLocaleString()}`;

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; icon: any } } = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      completed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      declined: { color: "bg-red-100 text-red-800", icon: AlertCircle }
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
    // last 14 days timeline
    const days = 14;
    const today = new Date();
    const byDay: Record<string, { revenue: number; count: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      byDay[key] = { revenue: 0, count: 0 };
    }

    let statusCounts = { completed: 0, pending: 0, failed: 0 };

    // We only have completedTx here; for statusCounts, estimate from stats
    statusCounts.completed = completedTx.length;
  statusCounts.pending = 0; // not shown now
    // failed count best-effort (unknown without dedicated fetch). Leave as 0 if not present

    for (const tx of completedTx) {
      if (!tx.completed_at) continue;
      const dayKey = tx.completed_at.slice(0, 10);
      if (!(dayKey in byDay)) continue; // only chart last 14 days
  const amt = (tx as any).order_total_value != null ? Number((tx as any).order_total_value) : 0;
  byDay[dayKey].revenue += isFinite(amt) ? amt : 0;
      byDay[dayKey].count += 1;
    }

    const series = Object.entries(byDay).map(([date, v]) => ({ date, ...v }));

    const totals = series.reduce(
      (acc, d) => ({ revenue: acc.revenue + d.revenue, count: acc.count + d.count }),
      { revenue: 0, count: 0 }
    );

    return { series, statusCounts, totals };
  }, [completedTx, stats.completedTransactions, stats.completedOrders]);

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={loadDashboardData}>Refresh</Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Welcome back, {user?.name || 'Vendor'}! Here's your business overview.
        </p>

  {/* Onboarding Checklist (derived from backend) */}
  <OnboardingChecklist />

  {/* Share your bot link (customers use bot, vendors share link) */}
        {botLink && (
          <Card>
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
              <div className="flex gap-2">
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
                >Copy</Button>
                <a href={botLink} target="_blank" rel="noreferrer">
                  <Button variant="default">Open in Telegram</Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}

  {/* (Legacy inline checklist removed in favour of server-derived OnboardingChecklist component) */}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Orders Received</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
        <div className="text-2xl font-bold">{stats.totalOrdersReceived}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingOrders} pending
              </p>
            </CardContent>
          </Card>

      <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue (₦)</CardTitle>
        <span className="sr-only">NGN</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                From {stats.completedOrders} completed orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Transactions</CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedTransactions}</div>
              <p className="text-xs text-muted-foreground">
                {completedTx.length} in last fetch
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Queries</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingQueries}</div>
              <p className="text-xs text-muted-foreground">
                Require your attention
              </p>
            </CardContent>
          </Card>
        </div>

  {/* Recent Activity */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Recent Pending Orders</span>
              </CardTitle>
              <CardDescription>
                Orders awaiting your response
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.orders.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{order.asset}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.amount} {order.asset} @ {order.rate}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
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
                <div className="text-center py-6 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No pending orders</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latest Uncompleted Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ArrowLeftRight className="h-5 w-5" />
                <span>Latest Uncompleted Transactions</span>
              </CardTitle>
              <CardDescription>
                Waiting on your completion
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.transactions.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.transactions.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{tx.order_asset} • {tx.order_type?.toUpperCase()}</p>
                        <p className="text-sm text-muted-foreground">₦{Number(tx.order_total_value || 0).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center space-x-2">
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
                <div className="text-center py-6 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No uncompleted transactions</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Queries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>Recent Queries</span>
              </CardTitle>
              <CardDescription>
                Customer questions and support requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.queries.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.queries.map((query) => (
                    <div key={query.id} className="p-3 border rounded-lg">
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
                <div className="text-center py-6 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No pending queries</p>
                </div>
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
                      {broadcast.content.substring(0, 100)}...
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