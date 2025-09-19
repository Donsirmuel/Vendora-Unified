import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, Upload, Download, Clock, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { http, tokenStore } from "@/lib/http";
import { getErrorMessage } from "@/lib/errors";

const TransactionDetails = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [txn, setTxn] = useState<any | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const apiBase = (import.meta as any).env?.VITE_API_BASE || '';
  const toAbs = (u?: string | null) => {
    if (!u) return '';
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('/')) return `${apiBase}${u}`;
    return u;
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const res = await http.get(`/api/v1/transactions/${id}/`);
        setTxn(res.data);
        if (res.data?.order) {
          try {
            const o = await http.get(`/api/v1/orders/${res.data.order}/`);
            setOrder(o.data);
          } catch {}
        }
      } catch (e: any) {
        toast({ title: "Load failed", description: getErrorMessage(e, "Could not load transaction"), variant: "destructive" });
      }
    };
    load();
  }, [id]);

  const handleMarkComplete = async () => {
    setIsMarkingComplete(true);
    try {
      if (!id) return;
      const form = new FormData();
      form.append("status", "completed");
      // Optional vendor_proof is appended by input handler below
      const res = await http.post(`/api/v1/transactions/${id}/complete/`, form, { headers: { "Content-Type": "multipart/form-data" } });
      toast({ title: "Transaction Completed", description: "Marked as completed.", className: "bg-success text-success-foreground" });
      // Reload
      const fresh = await http.get(`/api/v1/transactions/${id}/`);
      setTxn(fresh.data);
    } catch (e: any) {
      toast({ title: "Complete failed", description: getErrorMessage(e, "Failed to complete"), variant: "destructive" });
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      if (!id) return;
      const form = new FormData();
      form.append("status", "completed");
      form.append("vendor_proof", files[0]);
      await http.post(`/api/v1/transactions/${id}/complete/`, form, { headers: { "Content-Type": "multipart/form-data" } });
      toast({ title: "Proof Uploaded", description: "Vendor proof uploaded and transaction completed.", className: "bg-success text-success-foreground" });
      const fresh = await http.get(`/api/v1/transactions/${id}/`);
      setTxn(fresh.data);
    } catch (e: any) {
      toast({ title: "Upload failed", description: getErrorMessage(e, "Failed to upload proof"), variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      if (!id) return;
      const base = (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:8000';
      const token = tokenStore.getAccessToken() || '';
      const resp = await fetch(`${base}/api/v1/transactions/${id}/pdf/`, {
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
      a.download = `transaction_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: 'PDF Error', description: getErrorMessage(e, 'Failed to download PDF'), variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-crypto-green/20 text-crypto-green";
      case "uncompleted": return "bg-warning/20 text-warning";
      case "declined": return "bg-destructive/20 text-destructive";
      case "expired": return "bg-gray-100 text-gray-800";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-4 w-4" />;
      case "uncompleted": return <Clock className="h-4 w-4" />;
      case "declined": return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
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

  if (!txn) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">Loading…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/transactions">
              <Button variant="outline" size="sm" className="border-border">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Transactions
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Transaction Details</h1>
              <p className="text-muted-foreground">Complete transaction information and actions</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleDownloadPDF} className="border-border">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Transaction Overview */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>Transaction Overview</CardTitle>
            <CardDescription>Complete details about this transaction</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="font-semibold">{txn.order_code || String(txn.order).padStart(4, '0')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-semibold">{
                  order?.created_at
                    ? new Date(order.created_at).toLocaleString()
                    : (txn.completed_at ? new Date(txn.completed_at).toLocaleString() : "-")
                }</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Asset</p>
                <Badge className={getAssetColor(txn.order_asset || "")}>{txn.order_asset || "-"}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-semibold">{txn.order_amount ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Value</p>
                <p className="font-semibold text-lg">{
                  (() => {
                    const v = (order?.total_value ?? txn.order_total_value);
                    const n = v != null ? Number(v) : NaN;
                    return isFinite(n) ? `₦${n.toLocaleString()}` : "-";
                  })()
                }</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge className={getTypeColor(txn.order_type || "")}>{(txn.order_type || "").toUpperCase()}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={getStatusColor(txn.status)}>
                  {getStatusIcon(txn.status)}
                  <span className="ml-1">{txn.status}</span>
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Details */}
        <Card className="bg-gradient-card border-border mb-6">
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Customer Receiving Details</p>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{txn.customer_receiving_details || "-"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Customer Note</p>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{txn.customer_note || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Proof of Transaction */}
        <Card className="bg-gradient-card border-border mb-6">
          <CardHeader>
            <CardTitle>Customer Proof of Transaction</CardTitle>
            <CardDescription>Payment proof uploaded by customer</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const url = toAbs((txn as any).proof || (txn as any).proof_of_payment || (txn as any).customer_proof || null);
              if (url) {
                return (
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg bg-secondary/30">
                      <img src={url} alt="Customer proof" className="max-h-96 object-contain mx-auto" />
                    </div>
                    <a href={url} target="_blank" rel="noreferrer" className="text-sm underline text-primary">Open original</a>
                  </div>
                );
              }
              return (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No customer proof uploaded yet</p>
                </div>
              );
            })()}
          </CardContent>
        </Card>

    {txn.status !== "declined" && (
          /* Vendor Actions */
          <Card className="bg-gradient-card border-border mb-6">
            <CardHeader>
              <CardTitle>Vendor Actions</CardTitle>
              <CardDescription>Available actions for this transaction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
      {txn.status === "uncompleted" && (
                <>
                  <Button 
                    onClick={handleMarkComplete}
                    disabled={isMarkingComplete}
                    className="w-full bg-gradient-success hover:opacity-90"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {isMarkingComplete ? "Processing..." : "Mark as Completed"}
                  </Button>

                  <div className="space-y-2">
                    <Label htmlFor="proof-upload" className="text-sm font-medium">
                      Upload Proof of Transaction
                    </Label>
                    <div className="relative">
                      <Input
                        id="proof-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleUploadProof}
                        disabled={isUploading}
                        className="bg-background border-border file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:opacity-90"
                      />
                      {isUploading && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
                          <div className="text-sm">Uploading...</div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {txn.status === "completed" && (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Transaction completed successfully</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>Transaction Timeline</CardTitle>
            <CardDescription>Key timestamps for this transaction</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{order?.created_at ? new Date(order.created_at).toLocaleString() : (txn.completed_at ? new Date(txn.completed_at).toLocaleString() : "-")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="font-medium">{
                  order?.accepted_at
                    ? new Date(order.accepted_at).toLocaleString()
                    : (order?.status === 'completed' && (txn.vendor_completed_at || txn.completed_at)
                        ? new Date((txn.vendor_completed_at || txn.completed_at) as string).toLocaleString()
                        : '-')
                }</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-medium">{txn.vendor_completed_at ? new Date(txn.vendor_completed_at).toLocaleString() : "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Declined</p>
                <p className="font-medium">{
                  order?.declined_at
                    ? new Date(order.declined_at).toLocaleString()
                    : (txn.status === 'declined' && (txn.completed_at || order?.updated_at)
                        ? new Date((txn.completed_at || order?.updated_at) as string).toLocaleString()
                        : '-')
                }</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Proof of Completion */}
        {txn.status !== "declined" && (
          <Card className="bg-gradient-card border-border">
            <CardHeader>
              <CardTitle>Vendor Proof of Completion</CardTitle>
              <CardDescription>Proof images uploaded by you</CardDescription>
            </CardHeader>
            <CardContent>
              {txn.vendor_proof ? (
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg bg-secondary/30">
                    <img src={toAbs(txn.vendor_proof)} alt="Vendor proof" className="max-h-96 object-contain mx-auto" />
                  </div>
                  <a href={toAbs(txn.vendor_proof)} target="_blank" rel="noreferrer" className="text-sm underline text-primary">Open original</a>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No vendor proof uploaded yet</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default TransactionDetails;