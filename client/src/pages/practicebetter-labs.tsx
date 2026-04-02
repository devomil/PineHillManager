import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, RefreshCw, Search, FlaskConical, Calendar, User, AlertCircle, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";

interface PBLab {
  id: string;
  name?: string;
  title?: string;
  testName?: string;
  clientName?: string;
  client?: { profile?: { firstName?: string; lastName?: string } };
  clientRecord?: { profile?: { firstName?: string; lastName?: string } };
  status?: string;
  result?: string;
  resultStatus?: string;
  orderedDate?: string;
  dateOrdered?: string;
  resultDate?: string;
  dateResult?: string;
  dateCreated?: string;
  createdAt?: string;
  labName?: string;
  panelName?: string;
  notes?: string;
  [key: string]: unknown;
}

interface PBListResponse {
  count?: number;
  hasMore?: boolean;
  items: PBLab[];
}

const fmtDate = (s?: string) => {
  if (!s) return "—";
  try { return format(parseISO(s), "MMM d, yyyy"); } catch { return s; }
};

const resultColor: Record<string, string> = {
  normal:    "bg-green-100 text-green-700 border-green-200",
  abnormal:  "bg-red-100 text-red-700 border-red-200",
  pending:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  received:  "bg-blue-100 text-blue-700 border-blue-200",
  ordered:   "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-gray-100 text-gray-400 border-gray-200",
};

export default function PBLabsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [afterId, setAfterId] = useState<string | undefined>();
  const [history, setHistory] = useState<string[]>([]);

  const { data, isLoading, error, refetch } = useQuery<PBListResponse>({
    queryKey: ["/api/practicebetter/labs", afterId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (afterId) params.set("after_id", afterId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const r = await fetch(`/api/practicebetter/labs?${params}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.items ?? [];
  const filtered = items.filter((l) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const name = (l.name ?? l.title ?? l.testName ?? l.panelName ?? "").toLowerCase();
    const client = (l.clientName ?? "").toLowerCase();
    const prof = l.client?.profile ?? l.clientRecord?.profile;
    const clientFull = prof ? `${prof.firstName ?? ""} ${prof.lastName ?? ""}`.toLowerCase() : "";
    return name.includes(q) || client.includes(q) || clientFull.includes(q);
  });

  const goNext = () => {
    if (items.length > 0) {
      setHistory((h) => [...h, afterId ?? ""]);
      setAfterId(items[items.length - 1].id);
    }
  };
  const goPrev = () => {
    const p = [...history];
    setHistory(p);
    setAfterId(p.pop() || undefined);
  };

  const getClientName = (l: PBLab) => {
    const prof = l.client?.profile ?? l.clientRecord?.profile;
    if (prof) return [prof.firstName, prof.lastName].filter(Boolean).join(" ");
    return l.clientName ?? null;
  };

  return (
    <AdminLayout currentTab="practitioner">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/practitioner")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Labs</h1>
              <p className="text-sm text-muted-foreground">Lab orders, results & panels</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search labs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="abnormal">Abnormal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                  <div className="h-5 w-20 bg-muted rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
              <p className="font-semibold text-red-700">Failed to load lab results</p>
              <p className="text-sm text-red-600">{String(error)}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-3">
              <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="font-semibold text-muted-foreground">
                {search || statusFilter !== "all" ? "No labs match your filters" : "No lab records found"}
              </p>
              <p className="text-sm text-muted-foreground">Lab orders and results from PracticeBetter will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((lab) => {
              const name = lab.name ?? lab.title ?? lab.testName ?? lab.panelName ?? "Lab Order";
              const status = (lab.status ?? lab.resultStatus ?? "ordered").toLowerCase();
              const clientDisplay = getClientName(lab);
              const orderedDate = lab.orderedDate ?? lab.dateOrdered ?? lab.dateCreated ?? lab.createdAt;
              const resultDate = lab.resultDate ?? lab.dateResult;

              return (
                <Card key={lab.id} className="hover:shadow-md transition-shadow border-cyan-100 hover:border-cyan-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-9 w-9 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                        <FlaskConical className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-semibold text-sm">{name}</p>
                          <Badge className={`text-xs ${resultColor[status] ?? "bg-gray-100 text-gray-600"}`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                        </div>
                        {lab.labName && (
                          <p className="text-xs text-muted-foreground mt-0.5">{String(lab.labName)}</p>
                        )}
                        {lab.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">{String(lab.notes)}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                          {clientDisplay && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" /> {clientDisplay}
                            </span>
                          )}
                          {orderedDate && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" /> Ordered {fmtDate(orderedDate)}
                            </span>
                          )}
                          {resultDate && (
                            <span className="flex items-center gap-1 text-xs text-cyan-700 font-medium">
                              <FileText className="h-3 w-3" /> Result {fmtDate(resultDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !error && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filtered.length} record{filtered.length !== 1 ? "s" : ""} shown</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goPrev} disabled={history.length === 0}>← Prev</Button>
              <Button variant="outline" size="sm" onClick={goNext} disabled={!data?.hasMore}>Next →</Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
