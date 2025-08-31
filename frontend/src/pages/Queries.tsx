import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MessageCircle, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { http } from "@/lib/http";

const Queries = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await http.get<{results: any[]}>("/api/v1/queries/");
        setItems(res.data.results || []);
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-warning/20 text-warning";
      case "replied": return "bg-primary/20 text-primary";
      case "resolved": return "bg-crypto-green/20 text-crypto-green";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <AlertCircle className="h-4 w-4" />;
      case "replied": return <Clock className="h-4 w-4" />;
      case "resolved": return <CheckCircle2 className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  // No priority on backend model currently

  const filteredQueries = items.filter((q) => {
    const status = q.reply && String(q.reply).trim().length > 0 ? "replied" : "pending";
    const matchesSearch = (q.message || "").toLowerCase().includes(searchTerm.toLowerCase()) || String(q.id).includes(searchTerm);
    const matchesStatus = statusFilter === "all" || status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Customer Queries</h1>
          <p className="text-muted-foreground">Manage and respond to customer inquiries</p>
        </div>

        {/* Filters */}
  <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter queries by search term and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      const filteredQueries = items.filter((q) => {
        const status = q.reply && String(q.reply).trim().length > 0 ? "replied" : "pending";
        const matchesSearch = (q.message || "").toLowerCase().includes(searchTerm.toLowerCase()) || String(q.id).includes(searchTerm);
        const matchesStatus = statusFilter === "all" || status === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
      });
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background border-border"
                />
              </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="replied">Replied</SelectItem>
                  {/* <SelectItem value="resolved">Resolved</SelectItem> */}
                </SelectContent>
              </Select>
        <div />
            </div>
          </CardContent>
        </Card>

        {/* Queries List */}
        <div className="space-y-4">
          {loading ? (
            <Card className="bg-gradient-card border-border">
              <CardContent className="text-center py-12 text-muted-foreground">Loading queries…</CardContent>
            </Card>
          ) : filteredQueries.length > 0 ? (
            filteredQueries.map((query) => (
            <Card key={query.id} className="bg-gradient-card border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">Customer Query</h3>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Query ID: {query.id}</span>
                        {query.order && <span>Order: {query.order}</span>}
                    </div>
                  </div>
                  {(() => {
                    const status = query.reply && String(query.reply).trim().length > 0 ? "replied" : "pending";
                    return (
                      <Badge className={getStatusColor(status)}>
                        {getStatusIcon(status)}
                        <span className="ml-1">{status}</span>
                      </Badge>
                    );
                  })()}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm">{query.message}</p>
                  <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Created: {new Date(query.created_at || query.timestamp || Date.now()).toLocaleString()}</span>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm" className="border-border">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                      {/* Optionally implement a reply dialog and PATCH /queries/:id to set reply */}
                    </div>
                        {(() => {
                          const status = query.reply && String(query.reply).trim().length > 0 ? "replied" : "pending";
                          return (
                            <Badge className={getStatusColor(status)}>
                              {getStatusIcon(status)}
                              <span className="ml-1">{status}</span>
                            </Badge>
                          );
                        })()}
            ))) : (
            <Card className="bg-gradient-card border-border">
              <CardContent className="text-center py-12">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No queries found</h3>
                <p className="text-muted-foreground">{searchTerm || statusFilter !== "all" ? "Try adjusting your filters." : "No customer queries available."}</p>
              </CardContent>
            </Card>
          )}
        </div>

  {/* No Results handled above */}
      </div>
    </Layout>
  );
};

export default Queries;