import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search, RefreshCw, User, ShoppingBag } from "lucide-react";
import { format } from "date-fns";

interface ClientRecord {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface HealthProduct {
  id?: string;
  name?: string;
  brand?: string;
  dosage?: string;
  frequency?: string;
  notes?: string;
  created_at?: string;
}

export default function PBHealthProductsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<ClientRecord | null>(null);
  const [productSearch, setProductSearch] = useState("");

  const { data: recordsData, isLoading: recordsLoading, refetch } = useQuery<{ data: ClientRecord[] }>({
    queryKey: ["/api/practicebetter/client-records", "health-products-list"],
    queryFn: async () => {
      const res = await fetch("/api/practicebetter/client-records?details=false");
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const { data: products, isLoading: productsLoading, error: productsError } = useQuery<HealthProduct[]>({
    queryKey: ["/api/practicebetter/medical-history/health-products", selectedRecord?.id],
    queryFn: async () => {
      const res = await fetch(`/api/practicebetter/medical-history/${selectedRecord!.id}/health-products`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!selectedRecord,
  });

  const records: ClientRecord[] = recordsData?.data ?? [];

  const filteredClients = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q);
  });

  const filteredProducts = (products ?? []).filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (p.name ?? "").toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q);
  });

  const formatDate = (s?: string) => {
    if (!s) return "—";
    try { return format(new Date(s), "MMM d, yyyy"); } catch { return s; }
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
              <h1 className="text-2xl font-bold">Client Health Products</h1>
              <p className="text-muted-foreground text-sm">Supplements and health products from medical history</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client selector */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Select Client</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
                {recordsLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading clients...</div>
                ) : filteredClients.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No clients found.</div>
                ) : (
                  <div className="divide-y">
                    {filteredClients.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRecord(r)}
                        className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${selectedRecord?.id === r.id ? "bg-teal-50 dark:bg-teal-900/20 border-l-2 border-teal-500" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <div className="text-sm font-medium">{r.first_name} {r.last_name}</div>
                            {r.email && <div className="text-xs text-muted-foreground">{r.email}</div>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Products panel */}
          <div className="lg:col-span-2">
            {!selectedRecord ? (
              <Card className="border-dashed h-full">
                <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  <div className="text-center">
                    <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    Select a client to view their health products
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedRecord.first_name} {selectedRecord.last_name}</CardTitle>
                      <CardDescription>Health Products & Supplements</CardDescription>
                    </div>
                    <div className="relative w-56">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        className="pl-9"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {productsLoading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading health products...</div>
                  ) : productsError ? (
                    <div className="py-8 text-center text-red-500 text-sm">
                      Could not load health products for this client.
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      No health products recorded for this client.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Dosage</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Added</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((p, i) => (
                          <TableRow key={p.id ?? i}>
                            <TableCell className="font-medium">{p.name ?? "—"}</TableCell>
                            <TableCell className="text-sm">{p.brand ?? "—"}</TableCell>
                            <TableCell className="text-sm">{p.dosage ?? "—"}</TableCell>
                            <TableCell className="text-sm">{p.frequency ?? "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{p.notes ?? "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
