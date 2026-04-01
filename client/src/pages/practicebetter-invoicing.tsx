import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, RefreshCw, Search, Receipt, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface Invoice {
  id: string;
  invoice_number?: string;
  client_name?: string;
  client_id?: string;
  amount?: number;
  amount_paid?: number;
  balance_due?: number;
  status?: string;
  invoice_date?: string;
  due_date?: string;
  currency?: string;
  line_items?: Array<{
    description?: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
  }>;
  notes?: string;
}

interface PBListResponse {
  data: Invoice[];
  has_more?: boolean;
}

export default function PBInvoicingPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [afterId, setAfterId] = useState<string | undefined>();
  const [history, setHistory] = useState<string[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data, isLoading, error, refetch } = useQuery<PBListResponse>({
    queryKey: ["/api/practicebetter/invoices", afterId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (afterId) params.set("after_id", afterId);
      const res = await fetch(`/api/practicebetter/invoices?${params}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const { data: invoiceDetail, isLoading: detailLoading } = useQuery<Invoice>({
    queryKey: ["/api/practicebetter/invoices", selectedInvoice?.id, "detail"],
    queryFn: async () => {
      const res = await fetch(`/api/practicebetter/invoices/${selectedInvoice!.id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!selectedInvoice,
  });

  const invoices: Invoice[] = data?.data ?? [];

  const filtered = invoices.filter((inv) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (inv.client_name ?? "").toLowerCase().includes(q) ||
      (inv.invoice_number ?? "").toLowerCase().includes(q)
    );
  });

  const goNext = () => {
    if (data?.data?.length) {
      const lastId = data.data[data.data.length - 1].id;
      setHistory((h) => [...h, afterId ?? ""]);
      setAfterId(lastId);
    }
  };

  const goPrev = () => {
    const prev = [...history];
    const prevId = prev.pop() || undefined;
    setHistory(prev);
    setAfterId(prevId);
  };

  const formatDate = (s?: string) => {
    if (!s) return "—";
    try { return format(new Date(s), "MMM d, yyyy"); } catch { return s; }
  };

  const formatCurrency = (amount?: number, currency = "USD") => {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  };

  const getStatusStyle = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "paid": return "bg-green-100 text-green-700 border-green-200";
      case "unpaid": case "overdue": return "bg-red-100 text-red-700 border-red-200";
      case "partial": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "draft": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  const totals = {
    paid: invoices.filter(i => i.status?.toLowerCase() === "paid").length,
    unpaid: invoices.filter(i => i.status?.toLowerCase() === "unpaid" || i.status?.toLowerCase() === "overdue").length,
    totalAmount: invoices.reduce((s, i) => s + (i.amount ?? 0), 0),
  };

  return (
    <AdminLayout currentTab="practitioner">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/practitioner")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Invoicing</h1>
              <p className="text-muted-foreground text-sm">Client invoices from PracticeBetter</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-500" /> {invoices.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totals.paid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-500">Unpaid / Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{totals.unpaid}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Invoices</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client or invoice #..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading invoices...</div>
            ) : error ? (
              <div className="py-12 text-center text-red-500 text-sm">
                Failed to load invoices. Check PracticeBetter connection.
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No invoices found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Balance Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">{inv.invoice_number ?? inv.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium">{inv.client_name ?? "—"}</TableCell>
                      <TableCell>{formatCurrency(inv.amount, inv.currency)}</TableCell>
                      <TableCell>{formatCurrency(inv.balance_due, inv.currency)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(inv.status)}`}>
                          {inv.status ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(inv.invoice_date)}</TableCell>
                      <TableCell className="text-sm">{formatDate(inv.due_date)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(inv)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={goPrev} disabled={history.length === 0}>
            ← Previous
          </Button>
          <span className="text-sm text-muted-foreground">{filtered.length} invoices shown</span>
          <Button variant="outline" size="sm" onClick={goNext} disabled={!data?.has_more}>
            Next →
          </Button>
        </div>

        {/* Invoice detail dialog */}
        <Dialog open={!!selectedInvoice} onOpenChange={(o) => !o && setSelectedInvoice(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Invoice Detail</DialogTitle>
            </DialogHeader>
            {detailLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Detail label="Invoice #" value={invoiceDetail?.invoice_number ?? selectedInvoice?.invoice_number} mono />
                  <Detail label="Client" value={invoiceDetail?.client_name ?? selectedInvoice?.client_name} />
                  <Detail label="Amount" value={formatCurrency(invoiceDetail?.amount ?? selectedInvoice?.amount)} />
                  <Detail label="Balance Due" value={formatCurrency(invoiceDetail?.balance_due ?? selectedInvoice?.balance_due)} />
                  <Detail label="Status" value={invoiceDetail?.status ?? selectedInvoice?.status} />
                  <Detail label="Invoice Date" value={formatDate(invoiceDetail?.invoice_date ?? selectedInvoice?.invoice_date)} />
                  <Detail label="Due Date" value={formatDate(invoiceDetail?.due_date ?? selectedInvoice?.due_date)} />
                </div>

                {(invoiceDetail?.line_items?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Line Items</div>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="py-2">Description</TableHead>
                            <TableHead className="py-2">Qty</TableHead>
                            <TableHead className="py-2">Unit Price</TableHead>
                            <TableHead className="py-2">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoiceDetail?.line_items?.map((li, i) => (
                            <TableRow key={i}>
                              <TableCell className="py-2 text-sm">{li.description ?? "—"}</TableCell>
                              <TableCell className="py-2 text-sm">{li.quantity ?? "—"}</TableCell>
                              <TableCell className="py-2 text-sm">{formatCurrency(li.unit_price)}</TableCell>
                              <TableCell className="py-2 text-sm">{formatCurrency(li.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {invoiceDetail?.notes && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</div>
                    <p className="text-sm">{invoiceDetail.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

function Detail({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-sm mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value ?? "—"}</div>
    </div>
  );
}
