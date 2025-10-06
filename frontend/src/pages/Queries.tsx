import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MessageCircle, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { http } from "@/lib/http";
import { getErrorMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { deleteQuery } from "@/lib/queries";

const Queries = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyOpenId, setReplyOpenId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [deletingAll, setDeletingAll] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await http.get<{results: any[]}>("/api/v1/queries/");
        setItems(res.data.results || []);
      } catch (e) {
        setItems([]);
        toast({ title: "Failed", description: getErrorMessage(e, "Failed to load queries"), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  async function handleDelete(id: number) {
    try {
      await deleteQuery(id);
      setItems((prev) => prev.filter((p) => p.id !== id));
      toast({ title: 'Deleted', description: `Query ${id} was deleted.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Delete failed', description: getErrorMessage(err, 'Failed to delete query'), variant: 'destructive' });
    } finally {
      setConfirmDeleteId(null);
    }
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    try {
      for (const q of items) {
        await deleteQuery(q.id);
      }
      setItems([]);
      toast({ title: 'Deleted', description: 'All queries were deleted.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Delete all failed', description: getErrorMessage(err, 'Failed to delete all queries'), variant: 'destructive' });
    } finally {
      setDeletingAll(false);
      setConfirmDeleteAllOpen(false);
    }
  }

  const sendReply = async (id: number) => {
    try {
      const res = await http.patch(`/api/v1/queries/${id}/`, { reply: replyText });
      const updated = res.data;
      setItems(prev => prev.map(q => q.id === id ? { ...q, ...updated } : q));
      setReplyOpenId(null);
      setReplyText("");
      toast({ title: "Reply sent", description: "Your response was saved." });
    } catch {}
  };

  const markDone = async (id: number) => {
    try {
      const res = await http.post(`/api/v1/queries/${id}/mark_done/`);
      const updated = res.data;
      setItems(prev => prev.map(q => q.id === id ? { ...q, ...updated } : q));
      toast({ title: "Marked as done", description: "Customer will be notified via Telegram." });
    } catch (e) {
      toast({ title: "Failed", description: getErrorMessage(e, "Could not mark as done"), variant: "destructive" });
    }
  };

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
    const status = String(q.status || (q.reply && String(q.reply).trim().length > 0 ? "replied" : "pending"));
    const matchesSearch = (q.message || "").toLowerCase().includes(searchTerm.toLowerCase()) || String(q.id).includes(searchTerm);
    const matchesStatus = statusFilter === "all" || status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
  <Layout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customer Queries</h1>
          <p className="text-muted-foreground">Manage and respond to customer inquiries</p>
        </div>
        <div className="ml-auto">
          <AlertDialog open={confirmDeleteAllOpen} onOpenChange={setConfirmDeleteAllOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deletingAll || items.length === 0}>
                {deletingAll ? 'Deleting...' : `Delete all (${items.length})`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all queries</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete all customer queries. This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll}>Delete all</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter queries by search term and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Input
                placeholder="Search queries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
        <SelectItem value="resolved">Resolved</SelectItem>
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
                    const status = String(query.status || (query.reply && String(query.reply).trim().length > 0 ? "replied" : "pending"));
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
                      {replyOpenId === query.id ? (
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                          <Textarea value={replyText} onChange={(e)=>setReplyText(e.target.value)} placeholder="Type your reply…" className="min-w-[240px]" />
                          <Button size="sm" onClick={()=>sendReply(query.id)}>Send</Button>
                          <Button size="sm" variant="outline" onClick={()=>{ setReplyOpenId(null); setReplyText(""); }}>Cancel</Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="border-border" onClick={()=>{ setReplyOpenId(query.id); setReplyText(query.reply || ""); }}>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Reply
                        </Button>
                      )}
                      <Button size="sm" onClick={()=>markDone(query.id)}>
                        Mark as done
                      </Button>
                      <AlertDialog open={confirmDeleteId === query.id} onOpenChange={(open)=>{ if (!open) setConfirmDeleteId(null); }}>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={()=>setConfirmDeleteId(query.id)}>🗑️</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete query {query.id}?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete the query. This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={()=>handleDelete(query.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
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