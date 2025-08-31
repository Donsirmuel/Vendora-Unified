import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, Upload, Download, Clock, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TransactionDetails = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);

  // Mock data - different transactions based on ID
  const mockTransactions = {
    "TX001": {
      id: "TX001",
      date: "2024-01-14 16:45:30",
      asset: "BTC",
      amount: "0.3",
      value: "₦14,100,000",
      status: "Uncompleted",
      type: "Buy",
      customerDetails: "First Bank Account: 1234567890, John Doe",
      remarks: "Please send payment to the provided account details. I will confirm within 30 minutes.",
      createdAt: "2024-01-14 16:45:30",
      acceptedAt: "2024-01-14 16:46:15",
      completedAt: null,
      declinedAt: null,
      vendorAccount: "GTBank - 0123456789 - Vendora Trading Ltd"
    },
    "TX002": {
      id: "TX002",
      date: "2024-01-13 12:20:15",
      asset: "ETH",
      amount: "1.5",
      value: "₦6,300,000",
      status: "Declined",
      type: "Sell",
      customerDetails: "0x742d35Cc6e5f3e1234567890abcdef1234567890",
      remarks: "Send ETH to my wallet address. Will confirm payment immediately.",
      createdAt: "2024-01-13 12:20:15",
      acceptedAt: null,
      completedAt: null,
      declinedAt: "2024-01-13 12:25:30",
      vendorAccount: null
    }
  };

  const transaction = mockTransactions[id as keyof typeof mockTransactions] || mockTransactions["TX001"];

  const proofImages = [
    { id: 1, name: "payment_receipt_1.jpg", url: "/api/proof/1", uploadedBy: "vendor" },
    { id: 2, name: "bank_confirmation.png", url: "/api/proof/2", uploadedBy: "customer" }
  ];

  const handleMarkComplete = async () => {
    setIsMarkingComplete(true);
    // Simulate API call
    setTimeout(() => {
      setIsMarkingComplete(false);
      toast({
        title: "Transaction Completed",
        description: "The transaction has been marked as completed successfully.",
        className: "bg-success text-success-foreground"
      });
    }, 2000);
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    // Simulate file upload
    setTimeout(() => {
      setIsUploading(false);
      toast({
        title: "Proof Uploaded",
        description: "Your proof image has been uploaded successfully.",
        className: "bg-success text-success-foreground"
      });
    }, 2000);
  };

  const handleDownloadPDF = () => {
    toast({
      title: "Downloading PDF",
      description: "Transaction details are being prepared for download.",
      className: "bg-primary text-primary-foreground"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-crypto-green/20 text-crypto-green";
      case "Uncompleted": return "bg-warning/20 text-warning";
      case "Declined": return "bg-destructive/20 text-destructive";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed": return <CheckCircle2 className="h-4 w-4" />;
      case "Uncompleted": return <Clock className="h-4 w-4" />;
      case "Declined": return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    return type === "Buy" ? "bg-crypto-green/20 text-crypto-green" : "bg-crypto-red/20 text-crypto-red";
  };

  const getAssetColor = (asset: string) => {
    switch (asset) {
      case "BTC": return "bg-crypto-gold/20 text-crypto-gold";
      case "ETH": return "bg-crypto-blue/20 text-crypto-blue";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

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
                <p className="font-semibold">{transaction.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-semibold">{transaction.date}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Asset</p>
                <Badge className={getAssetColor(transaction.asset)}>{transaction.asset}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-semibold">{transaction.amount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Value</p>
                <p className="font-semibold text-lg">{transaction.value}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge className={getTypeColor(transaction.type)}>{transaction.type}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={getStatusColor(transaction.status)}>
                  {getStatusIcon(transaction.status)}
                  <span className="ml-1">{transaction.status}</span>
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendor Account</p>
                <p className="text-sm">{transaction.vendorAccount}</p>
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
              <p className="text-sm text-muted-foreground mb-2">
                {transaction.type === "Buy" ? "Customer Bank Details" : "Customer Wallet Address"}
              </p>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm">{transaction.customerDetails}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Customer Remarks</p>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm">{transaction.remarks}</p>
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
            {proofImages.filter(proof => proof.uploadedBy === "customer").length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {proofImages.filter(proof => proof.uploadedBy === "customer").map((proof) => (
                  <div key={proof.id} className="p-4 border border-border rounded-lg bg-secondary/30">
                    <div className="flex items-center space-x-3 mb-2">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">{proof.name}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full border-border">
                      View Image
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No customer proof uploaded yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {transaction.status !== "Declined" && (
          /* Vendor Actions */
          <Card className="bg-gradient-card border-border mb-6">
            <CardHeader>
              <CardTitle>Vendor Actions</CardTitle>
              <CardDescription>Available actions for this transaction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {transaction.status === "Uncompleted" && (
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

              {transaction.status === "Completed" && (
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
                <p className="font-medium">{transaction.createdAt}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="font-medium">{transaction.acceptedAt || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-medium">{transaction.completedAt || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Declined</p>
                <p className="font-medium">{transaction.declinedAt || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Proof of Completion */}
        {transaction.status !== "Declined" && (
          <Card className="bg-gradient-card border-border">
            <CardHeader>
              <CardTitle>Vendor Proof of Completion</CardTitle>
              <CardDescription>Proof images uploaded by you</CardDescription>
            </CardHeader>
            <CardContent>
              {proofImages.filter(proof => proof.uploadedBy === "vendor").length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {proofImages.filter(proof => proof.uploadedBy === "vendor").map((proof) => (
                    <div key={proof.id} className="p-4 border border-border rounded-lg bg-secondary/30">
                      <div className="flex items-center space-x-3 mb-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{proof.name}</span>
                      </div>
                      <Button variant="outline" size="sm" className="w-full border-border">
                        View Image
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No vendor proof uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default TransactionDetails;