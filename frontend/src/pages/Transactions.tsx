import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RefreshCw } from "lucide-react";
import { http } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type ApiTransaction = {
  id: number;
  order: number;
  order_code?: string;
  order_type?: string;
  order_asset?: string;
  order_amount?: number;
  order_total_value?: number | null;
  status: string;
  completed_at: string | null;
  proof?: string | null;
};

type ListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ApiTransaction[];
};

const Transactions = () => {
  const [items, setItems] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await http.get<ListResponse>("/api/v1/transactions/");
      setItems(res.data.results || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((t) => {
    const q = search.toLowerCase();
    return (
      String(t.id).includes(q) ||
      (t.order_code || String(t.order)).toLowerCase().includes(q) ||
      (t.status || "").toLowerCase().includes(q) ||
      (t.order_type || "").toLowerCase().includes(q) ||
      (t.order_asset || "").toLowerCase().includes(q)
    );
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      uncompleted: "bg-warning/20 text-warning",
      completed: "bg-crypto-green/20 text-crypto-green",
      declined: "bg-destructive/20 text-destructive",
  expired: "bg-gray-100 text-gray-800",
    };
    return <Badge className={map[status] || "bg-secondary text-secondary-foreground"}>{status}</Badge>;
  };

  return (
    <Layout title="Transactions">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Transactions</CardTitle>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="max-w-md relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by id, order, status"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Loading transactions…</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No transactions found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
          <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Order Code</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Amount</TableHead>
            <TableHead>Value (₦)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Completed At</TableHead>
                      <TableHead>Proof</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/40">
                        <TableCell>
                          <Link to={`/transactions/${t.id}`} className="text-primary underline">
                            {String(t.id).padStart(4, '0')}
                          </Link>
                        </TableCell>
                        <TableCell className="capitalize">{t.order_type || "—"}</TableCell>
                        <TableCell>{t.order_code || t.order}</TableCell>
                        <TableCell>{t.order_asset || "—"}</TableCell>
                        <TableCell>{t.order_amount ?? "—"}</TableCell>
                        <TableCell>
                          {t.order_total_value != null ? `₦${Number(t.order_total_value).toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell>{statusBadge(t.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.completed_at ? new Date(t.completed_at).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell>{t.proof ? "Yes" : "No"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Transactions;