import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
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
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalTransactions: number;
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
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    totalTransactions: 0,
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load orders
      const ordersResponse = await listOrders(1);
      const allOrders = ordersResponse.results;
      const pendingOrders = allOrders.filter((order: any) => order.status === 'pending');
      const completedOrders = allOrders.filter((order: any) => order.status === 'completed');
      
      // Load transactions (grab a few pages to have enough data for charts)
      const allTransactions: Transaction[] = [];
      // fetch up to 3 pages for a quick overview
      for (let page = 1; page <= 3; page++) {
        const res = await listTransactions(page);
        allTransactions.push(...res.results);
        if (!res.next) break;
      }
      const completedTransactions = allTransactions.filter((tx) => tx.status === 'completed');
      
      // Load queries
      const queriesResponse = await listQueries(1);
      const pendingQueries = queriesResponse.results.filter((query: any) => query.status === 'pending');
      
      // Load recent broadcasts
      const broadcastsResponse = await listBroadcasts(1);
      const recentBroadcasts = broadcastsResponse.results.slice(0, 2);
      
      // Calculate revenue from NGN totals exposed via order_total_value
      const totalRevenue = completedTransactions.reduce((sum: number, tx: any) => {
        const v = (tx as any).order_total_value;
        const n = v != null ? Number(v) : 0;
        return sum + (isFinite(n) ? n : 0);
      }, 0);
      
      setStats({
        totalOrders: allOrders.length,
        pendingOrders: pendingOrders.length,
        completedOrders: completedOrders.length,
        totalRevenue,
        totalTransactions: allTransactions.length,
        pendingQueries: pendingQueries.length
      });
  setCompletedTx(completedTransactions);
      
      setRecentActivity({
        orders: pendingOrders.slice(0, 3),
        transactions: allTransactions.filter((tx: any) => tx.status === 'pending').slice(0, 3),
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
    statusCounts.pending = Math.max(stats.totalTransactions - stats.completedOrders, 0);
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
  }, [completedTx, stats.totalTransactions, stats.completedOrders]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingOrders} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
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
              <CardTitle className="text-sm font-medium">Active Transactions</CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalTransactions - stats.completedOrders} in progress
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Insights: simple charts based on completed transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue (last 14 days)</CardTitle>
              <CardDescription>Sum of completed transactions per day</CardDescription>
            </CardHeader>
            <CardContent>
              {insights.series.length > 0 ? (
                <ChartContainer
                  config={{
                    revenue: { label: "Revenue", color: "hsl(var(--primary))" },
                    count: { label: "Completed", color: "hsl(var(--muted-foreground))" },
                  }}
                  className="w-full h-72"
                >
                  <LineChart data={insights.series} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={24}
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={1} dot={false} />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No data yet</p>
                </div>
              )}
              <div className="mt-4 text-sm text-muted-foreground">
                Total: {formatCurrency(insights.totals.revenue)} • {insights.totals.count} completed
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status breakdown</CardTitle>
              <CardDescription>Recent transactions by status</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  Completed: { label: "Completed", color: "#22c55e" },
                  Pending: { label: "Pending", color: "#eab308" },
                  Failed: { label: "Failed", color: "#ef4444" },
                }}
                className="w-full h-72"
              >
                <BarChart
                  data={[
                    { name: "Completed", value: insights.statusCounts.completed, fill: "var(--color-Completed)" },
                    { name: "Pending", value: insights.statusCounts.pending, fill: "var(--color-Pending)" },
                    { name: "Failed", value: insights.statusCounts.failed, fill: "var(--color-Failed)" },
                  ]}
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Bar dataKey="value" radius={4} />
                </BarChart>
              </ChartContainer>
              <div className="mt-4 text-xs text-muted-foreground">Approximate counts based on recent data</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;