import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check, X, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getOrder, acceptOrder, declineOrder, Order } from "@/lib/orders";
import { tokenStore } from "@/lib/http";

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [declineReason, setDeclineReason] = useState("");
  const [acceptNote, setAcceptNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) return;
        setLoading(true);
        const o = await getOrder(Number(id));
        setOrder(o);
      } catch (e: any) {
        toast({ title: "Load Error", description: e.message || "Failed to load order", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleAccept = async () => {
    try {
      if (!order) return;
      setIsProcessing(true);
      const updated = await acceptOrder(order.id, acceptNote ? { acceptance_note: acceptNote } : undefined);
      setOrder(updated);
      toast({ title: "Accepted", description: "Customer has been notified with payment details." });
    } catch (e: any) {
      toast({ title: "Accept Error", description: e.message || "Failed to accept order", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    try {
      if (!order) return;
      setIsProcessing(true);
      if (!declineReason.trim()) {
        toast({ title: "Reason required", description: "Provide a brief reason to decline." });
        setIsProcessing(false);
        return;
      }
      const updated = await declineOrder(order.id, { rejection_reason: declineReason.trim() });
      setOrder(updated);
      toast({ title: "Declined", description: "Customer has been notified." });
      navigate("/orders");
    } catch (e: any) {
      toast({ title: "Decline Error", description: e.message || "Failed to decline order", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
      className: "bg-success text-success-foreground"
    });
  };

  const getTypeColor = (type: string) => {
    return type === "buy" ? "bg-crypto-green/20 text-crypto-green" : "bg-crypto-red/20 text-crypto-red";
  };

  const getAssetColor = (asset: string) => {
    switch (asset) {
      case "BTC": return "bg-crypto-gold/20 text-crypto-gold";
      case "ETH": return "bg-crypto-blue/20 text-crypto-blue";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-blue-100 text-blue-800",
      declined: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800",
      completed: "bg-green-100 text-green-800",
    };
    const cls = map[status] || map.pending;
    return <Badge className={cls}>{status}</Badge>;
  };

  const handleDownloadPDF = async () => {
    try {
      if (!id) return;
      const base = (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:8000';
      const token = tokenStore.getAccessToken() || '';
      const resp = await fetch(`${base}/api/v1/orders/${id}/pdf/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Failed to generate PDF');
      }
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: 'PDF Error', description: e.message || 'Failed to download PDF', variant: 'destructive' });
    }
  };

  if (loading || !order) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">Loading order…</div>
      </Layout>
    );
  }

  const code = order.order_code || String(order.id);
  const value = order.total_value != null ? `₦${Number(order.total_value).toLocaleString()}` : "—";
  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link to="/orders">
            <Button variant="outline" size="sm" className="border-border">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Order Details</h1>
            <p className="text-muted-foreground">Review and respond to this order</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => id && getOrder(Number(id)).then(setOrder)} className="border-border">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF} className="border-border">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Order Overview */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
      <CardTitle>Transaction Overview</CardTitle>
            <CardDescription>Key details about this order</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Order ID</p>
        <p className="font-semibold">{code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
        <p className="font-semibold">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Asset</p>
        <Badge className={getAssetColor(order.asset)}>{order.asset}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
        <p className="font-semibold">{order.amount} {order.asset}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Value</p>
        <p className="font-semibold text-lg">{value}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
        <Badge className={getTypeColor(order.type)}>{order.type.toUpperCase()}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                {getStatusBadge(order.status)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card className="bg-gradient-card border-border mb-6">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.type === 'buy' ? (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Payment Instructions</p>
                {order.pay_instructions ? (
                  <div className="p-3 bg-secondary/50 rounded-lg whitespace-pre-wrap text-sm">
                    {order.pay_instructions}
                  </div>
                ) : (
                  <div className="p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground">
                    No instructions yet. Accept the order to send payment details to the customer.
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Send To (Contract/Address)</p>
                {order.send_instructions ? (
                  <div className="p-3 bg-secondary/50 rounded-lg whitespace-pre-wrap text-sm">
                    {order.send_instructions}
                  </div>
                ) : (
                  <div className="p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground">
                    No address yet. Accept the order to send the destination address to the customer.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendor Actions */}
        <Card className="bg-gradient-card border-border">
            <CardHeader>
              <CardTitle>Vendor Actions</CardTitle>
              <CardDescription>Choose your response to this order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Accept Section */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center space-x-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Accept Order</span>
                </h4>
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Optional: Acceptance Note (will be sent to customer)</p>
                  <Textarea value={acceptNote} onChange={(e) => setAcceptNote(e.target.value)} placeholder="Any note for the customer" />
                </div>
                <Button onClick={handleAccept} disabled={isProcessing} className="w-full bg-gradient-success hover:opacity-90">
                  {isProcessing ? "Processing..." : "Accept Order"}
                </Button>
              </div>

              <div className="border-t border-border pt-6">
                {/* Decline Section */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center space-x-2">
                    <X className="h-4 w-4 text-destructive" />
                    <span>Decline Order</span>
                  </h4>
                  <Textarea
                    placeholder="Optional: Reason for declining (will be sent to customer)"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="bg-background border-border"
                  />
                  <Button 
                    variant="destructive"
                    onClick={handleDecline}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? "Processing..." : "Decline Order"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </Layout>
  );
};

export default OrderDetails;