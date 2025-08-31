import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check, X, Building2, Wallet, Copy, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OrderDetails = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [selectedAccount, setSelectedAccount] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock data - different orders based on ID
  const mockOrders = {
    "ORD001": {
      id: "ORD001",
      date: "2024-01-15 14:30:25",
      asset: "BTC",
      amount: "0.5",
      value: "₦23,500,000",
      type: "Buy",
      customerDetails: "First Bank Account: 1234567890, John Doe",
      remarks: "Please confirm transaction within 30 minutes. I will send payment immediately after receiving your account details.",
      status: "Pending"
    },
    "ORD002": {
      id: "ORD002",
      date: "2024-01-15 15:20:10",
      asset: "ETH",
      amount: "2.0",
      value: "₦8,400,000",
      type: "Sell",
      customerDetails: "0x742d35Cc6e5f3e1234567890abcdef1234567890",
      remarks: "Please send ETH to my wallet address above. Will confirm payment within 15 minutes.",
      status: "Pending"
    }
  };

  const order = mockOrders[id as keyof typeof mockOrders] || mockOrders["ORD001"];

  // Mock vendor settings
  const bankAccounts = [
    { id: "acc1", name: "Business Account", bank: "GTBank", number: "0123456789", accountName: "Vendora Trading Ltd" },
    { id: "acc2", name: "Personal Account", bank: "Access Bank", number: "9876543210", accountName: "Alex Thompson" }
  ];

  const contractAddresses = [
    { id: "btc1", asset: "BTC", address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", network: "Bitcoin" },
    { id: "eth1", asset: "ETH", address: "0x742d35Cc6e5f3e1234567890abcdef1234567890", network: "Ethereum" }
  ];

  const handleAccept = async () => {
    if (!selectedAccount) {
      toast({
        title: "Selection Required",
        description: "Please select an account or contract address to proceed.",
        className: "bg-warning text-warning-foreground"
      });
      return;
    }

    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "Order Accepted",
        description: "Your payment details have been sent to the customer.",
        className: "bg-success text-success-foreground"
      });
    }, 2000);
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "Order Declined",
        description: "The customer has been notified of the decline.",
        className: "bg-destructive text-destructive-foreground"
      });
    }, 1500);
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
                <p className="font-semibold">{order.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-semibold">{order.date}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Asset</p>
                <Badge className={getAssetColor(order.asset)}>{order.asset}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-semibold">{order.amount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Value</p>
                <p className="font-semibold text-lg">{order.value}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge className={getTypeColor(order.type)}>{order.type}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className="bg-warning/20 text-warning">{order.status}</Badge>
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
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {order.type === "Buy" ? "Customer Bank Details" : "Customer Wallet Address"}
              </p>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm">{order.customerDetails}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Customer Remarks</p>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm">{order.remarks}</p>
              </div>
            </div>
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
                
                {order.type === "Buy" ? (
                  /* Bank Details for Buy Orders */
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Select Bank Account to Send to Customer:</p>
                    {bankAccounts.map((account) => (
                      <div 
                        key={account.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedAccount === account.id 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:bg-secondary/50'
                        }`}
                        onClick={() => setSelectedAccount(account.id)}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <Building2 className="h-4 w-4" />
                          <span className="font-medium">{account.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{account.bank} - {account.number}</p>
                        <p className="text-sm">{account.accountName}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Contract Address for Sell Orders */
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Select Contract Address to Send to Customer:</p>
                    {contractAddresses
                      .filter(contract => contract.asset === order.asset)
                      .map((contract) => (
                      <div 
                        key={contract.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedAccount === contract.id 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:bg-secondary/50'
                        }`}
                        onClick={() => setSelectedAccount(contract.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <Wallet className="h-4 w-4" />
                            <span className="font-medium">{contract.asset} - {contract.network}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(contract.address);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono break-all">{contract.address}</p>
                      </div>
                    ))}
                  </div>
                )}

                <Button 
                  onClick={handleAccept}
                  disabled={!selectedAccount || isProcessing}
                  className="w-full bg-gradient-success hover:opacity-90"
                >
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