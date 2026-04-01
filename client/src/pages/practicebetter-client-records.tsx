import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, RefreshCw, User, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface ClientRecord {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  date_of_birth?: string;
  created_at?: string;
  is_active?: boolean;
  gender?: string;
}

interface PBListResponse {
  data: ClientRecord[];
  has_more?: boolean;
}

export default function PBClientRecordsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [afterId, setAfterId] = useState<string | undefined>();
  const [history, setHistory] = useState<string[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ClientRecord | null>(null);

  const { data, isLoading, error, refetch } = useQuery<PBListResponse>({
    queryKey: ["/api/practicebetter/client-records", afterId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (afterId) params.set("after_id", afterId);
      params.set("details", "true");
      const res = await fetch(`/api/practicebetter/client-records?${params}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const { data: detailData, isLoading: detailLoading } = useQuery<ClientRecord>({
    queryKey: ["/api/practicebetter/client-records", selectedRecord?.id],
    queryFn: async () => {
      const res = await fetch(`/api/practicebetter/client-records/${selectedRecord!.id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!selectedRecord,
  });

  const records: ClientRecord[] = data?.data ?? [];

  const filtered = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.toLowerCase();
    return name.includes(q) || (r.email ?? "").toLowerCase().includes(q) || (r.phone_number ?? "").includes(q);
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

  return (
    <AdminLayout currentTab="practitioner">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/practitioner")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Client Records</h1>
              <p className="text-muted-foreground text-sm">PracticeBetter client directory</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List panel */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="py-12 text-center text-muted-foreground">Loading client records...</div>
                ) : error ? (
                  <div className="py-12 text-center text-red-500">
                    Failed to load records. Please check your PracticeBetter connection.
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">No records found.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>DOB</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((r) => (
                        <TableRow
                          key={r.id}
                          className={`cursor-pointer hover:bg-muted/50 ${selectedRecord?.id === r.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                          onClick={() => setSelectedRecord(r)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {r.first_name} {r.last_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.email ?? "—"}</TableCell>
                          <TableCell className="text-sm">{r.phone_number ?? "—"}</TableCell>
                          <TableCell className="text-sm">{formatDate(r.date_of_birth)}</TableCell>
                          <TableCell>
                            <Badge variant={r.is_active === false ? "secondary" : "default"} className="text-xs">
                              {r.is_active === false ? "Inactive" : "Active"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
              <span className="text-sm text-muted-foreground">{filtered.length} records shown</span>
              <Button variant="outline" size="sm" onClick={goNext} disabled={!data?.has_more}>
                Next →
              </Button>
            </div>
          </div>

          {/* Detail panel */}
          <div>
            {selectedRecord ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedRecord.first_name} {selectedRecord.last_name}
                  </CardTitle>
                  <CardDescription>Client Record Detail</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {detailLoading ? (
                    <div className="text-sm text-muted-foreground">Loading details...</div>
                  ) : (
                    <>
                      <Detail label="Record ID" value={detailData?.id ?? selectedRecord.id} mono />
                      <Detail label="Email" value={detailData?.email ?? selectedRecord.email} />
                      <Detail label="Phone" value={detailData?.phone_number ?? selectedRecord.phone_number} />
                      <Detail label="Date of Birth" value={formatDate(detailData?.date_of_birth ?? selectedRecord.date_of_birth)} />
                      <Detail label="Gender" value={detailData?.gender ?? selectedRecord.gender} />
                      <Detail label="Status" value={selectedRecord.is_active === false ? "Inactive" : "Active"} />
                      <Detail label="Created" value={formatDate(detailData?.created_at ?? selectedRecord.created_at)} />
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setLocation(`/practitioner/medical-history?recordId=${selectedRecord.id}`)}
                  >
                    View Medical History
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  Select a client to see their details
                </CardContent>
              </Card>
            )}
          </div>
        </div>
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
