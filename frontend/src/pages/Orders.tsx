import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  Filter,
  Plus
} from "lucide-react";
import { listOrders, acceptOrder, declineOrder, Order } from "@/lib/orders";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { connectSSE } from "@/lib/sse";

const Orders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isActingId, setIsActingId] = useState<number | null>(null);

  useEffect(() => {
    loadOrders();
    const sub = connectSSE('/api/v1/stream/', {
      onMessage: (ev) => {
        if (ev.type === 'snapshot') {
          // Re-fetch first page to show newest pending
          setPage(1);
          loadOrders();
        }
      },
    });
    return () => sub.close();
  }, [page]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
  const response = await listOrders(page, 'pending');
      
      if (page === 1) {
        setOrders(response.results);
      } else {
        setOrders(prev => [...prev, ...response.results]);
      }
      
      setHasMore(!!response.next);
  } catch (error: any) {
      toast({
        title: "Error",
    description: getErrorMessage(error, "Failed to load orders"),
        className: "bg-destructive text-destructive-foreground"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Apply status filter
  // We always load pending; keep filter UI but default pending
  if (statusFilter !== "all") filtered = filtered.filter(order => order.status === statusFilter);

    // Apply search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        (order.asset && order.asset.toLowerCase().includes(q)) ||
        (order.type && order.type.toLowerCase().includes(q)) ||
        String(order.amount).toLowerCase().includes(q) ||
        (order.rate !== undefined && String(order.rate).toLowerCase().includes(q))
      );
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; icon: any; text: string } } = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, text: "Pending" },
      accepted: { color: "bg-blue-100 text-blue-800", icon: CheckCircle, text: "Accepted" },
      declined: { color: "bg-red-100 text-red-800", icon: XCircle, text: "Declined" },
      expired: { color: "bg-gray-100 text-gray-800", icon: AlertCircle, text: "Expired" },
      completed: { color: "bg-green-100 text-green-800", icon: CheckCircle, text: "Completed" }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getOrderTypeIcon = (type: string) => {
    return type === 'buy' ? (
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
        <span className="text-green-600 font-semibold text-sm">B</span>
      </div>
    ) : (
      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
        <span className="text-red-600 font-semibold text-sm">S</span>
      </div>
    );
  };

  const handleRefresh = () => {
    setPage(1);
    setSearchTerm("");
  setStatusFilter("pending");
    loadOrders();
  };

  const handleAccept = async (order: Order) => {
    try {
      setIsActingId(order.id);
      const updated = await acceptOrder(order.id, {});
      // Remove from current pending list to avoid confusion; it moves to Transactions
      setOrders(prev => prev.filter(o => o.id !== order.id));
      toast({ title: "Accepted", description: "Order accepted and customer notified." });
    } catch (e: any) {
      toast({ title: "Accept failed", description: getErrorMessage(e, "Could not accept order"), variant: "destructive" });
    } finally {
      setIsActingId(null);
    }
  };

  const handleDecline = async (order: Order) => {
    try {
      setIsActingId(order.id);
      const reason = window.prompt("Enter reason for declining:") || "No reason provided";
      const updated = await declineOrder(order.id, { rejection_reason: reason });
      setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
      toast({ title: "Declined", description: "Customer notified of decline." });
    } catch (e: any) {
      toast({ title: "Decline failed", description: getErrorMessage(e, "Could not decline order"), variant: "destructive" });
    } finally {
      setIsActingId(null);
    }
  };

  if (isLoading && page === 1) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-muted-foreground">
              Manage customer orders and track their status
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Results</label>
                <div className="text-sm text-muted-foreground pt-2">
                  {filteredOrders.length} of {orders.length} orders
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length > 0 ? (
    filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
          {getOrderTypeIcon(order.type)}
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-lg">
            {order.asset} {order.type.toUpperCase()}
                          </h3>
                          {getStatusBadge(order.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Amount:</span>
            <p className="font-medium">{order.amount} {order.asset}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rate:</span>
            <p className="font-medium">₦{Number(order.rate || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Value:</span>
            <p className="font-medium">{order.total_value != null ? `₦${Number(order.total_value || 0).toLocaleString()}` : '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Created:</span>
                            <p className="font-medium">{formatDate(order.created_at)}</p>
                          </div>
                        </div>
                        
                        {order.rejection_reason && (
                          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">
                              <strong>Rejection Reason:</strong> {order.rejection_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      <Link to={`/orders/${order.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      
            {order.status === 'pending' && (
                        <div className="flex space-x-2">
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAccept(order)} disabled={isActingId === order.id}>
                            Accept
                          </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDecline(order)} disabled={isActingId === order.id}>
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No orders found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all" 
                    ? "Try adjusting your filters or search terms"
                    : "Orders will appear here when customers place them"
                  }
                </p>
                {(searchTerm || statusFilter !== "all") && (
                  <Button onClick={handleRefresh} variant="outline">
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center">
            <Button 
              onClick={() => setPage(prev => prev + 1)}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? "Loading..." : "Load More Orders"}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Orders;