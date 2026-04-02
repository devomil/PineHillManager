import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, RefreshCw, Search, FlaskConical, Calendar, User, AlertCircle,
  FileText, Download, ChevronRight, ExternalLink, Hash, Paperclip,
} from "lucide-react";
import { format, parseISO } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PBLabRequest {
  id: string;
  status?: string;
  resultStatus?: string;
  type?: string;
  labType?: string;
  name?: string;
  title?: string;
  testName?: string;
  panelName?: string;
  labName?: string;
  labCompany?: string;
  orderedDate?: string;
  dateOrdered?: string;
  orderDate?: string;
  dateCreated?: string;
  resultDate?: string;
  dateResult?: string;
  notes?: string;
  consultant?: { id?: string; name?: string; firstName?: string; lastName?: string };
  clientRecord?: {
    id?: string;
    profile?: { firstName?: string; lastName?: string; emailAddress?: string; email?: string; phone?: string };
  };
  attachments?: { id: string; name?: string; fileName?: string; mimeType?: string }[];
  items?: { id: string; name?: string; testName?: string; status?: string; result?: string }[];
  [key: string]: unknown;
}

interface PBListResponse {
  count?: number;
  hasMore?: boolean;
  items: PBLabRequest[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtDate = (s?: string) => {
  if (!s) return null;
  try { return format(parseISO(s), "MMM d, yyyy"); } catch { return s; }
};

function getClientName(lab: PBLabRequest): string | null {
  const prof = lab.clientRecord?.profile;
  if (prof) return [prof.firstName, prof.lastName].filter(Boolean).join(" ") || null;
  return null;
}

function getClientEmail(lab: PBLabRequest): string | null {
  const prof = lab.clientRecord?.profile;
  return prof?.emailAddress ?? prof?.email ?? null;
}

function getLabName(lab: PBLabRequest): string {
  return lab.name ?? lab.title ?? lab.testName ?? lab.panelName ?? "Lab Order";
}

function getOrderedDate(lab: PBLabRequest): string | undefined {
  return lab.orderedDate ?? lab.dateOrdered ?? lab.orderDate ?? lab.dateCreated;
}

function getResultDate(lab: PBLabRequest): string | undefined {
  return lab.resultDate ?? lab.dateResult;
}

function getStatus(lab: PBLabRequest): string {
  return (lab.status ?? lab.resultStatus ?? "ordered").toLowerCase();
}

const STATUS_COLOR: Record<string, string> = {
  normal:    "bg-green-100 text-green-700 border-green-200",
  abnormal:  "bg-red-100 text-red-700 border-red-200",
  pending:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  received:  "bg-blue-100 text-blue-700 border-blue-200",
  ordered:   "bg-gray-100 text-gray-600 border-gray-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-gray-100 text-gray-400 border-gray-200",
  reviewed:  "bg-purple-100 text-purple-700 border-purple-200",
};

function statusBadge(status: string) {
  const cls = STATUS_COLOR[status] ?? "bg-gray-100 text-gray-600";
  return (
    <Badge className={`text-xs border ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// ── Lab Detail Dialog ──────────────────────────────────────────────────────────

function LabDetailDialog({
  lab,
  open,
  onOpenChange,
}: {
  lab: PBLabRequest | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: detail, isLoading } = useQuery<PBLabRequest>({
    queryKey: ["/api/practicebetter/labs", lab?.id],
    queryFn: async () => {
      const r = await fetch(`/api/practicebetter/labs/${lab!.id}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled: open && !!lab?.id,
    staleTime: 5 * 60 * 1000,
  });

  const item = detail ?? lab;
  if (!item) return null;

  const clientName = getClientName(item);
  const clientEmail = getClientEmail(item);
  const status = getStatus(item);
  const orderedDate = getOrderedDate(item);
  const resultDate = getResultDate(item);
  const attachments = (item.attachments as any[]) ?? [];
  const lineItems = (item.items as any[]) ?? [];
  const labName = getLabName(item);

  const fields: { label: string; value: string | null | undefined }[] = [
    { label: "Lab / Company", value: item.labName as string ?? item.labCompany as string },
    { label: "Type", value: item.type as string ?? item.labType as string },
    { label: "Ordered Date", value: fmtDate(orderedDate) },
    { label: "Result Date", value: fmtDate(resultDate) },
    { label: "Notes", value: item.notes as string },
  ].filter(f => f.value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0 mt-0.5">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold leading-tight">{labName}</DialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {statusBadge(status)}
                {item.type && <span className="text-xs text-muted-foreground capitalize">{String(item.type)}</span>}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-2">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Client */}
              {(clientName || clientEmail) && (
                <div className="rounded-xl border bg-cyan-50 p-4 space-y-1">
                  <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wide flex items-center gap-1">
                    <User className="h-3 w-3" /> Client
                  </p>
                  {clientName && <p className="font-semibold text-gray-800">{clientName}</p>}
                  {clientEmail && <p className="text-sm text-muted-foreground">{clientEmail}</p>}
                  {item.clientRecord?.profile?.phone && (
                    <p className="text-sm text-muted-foreground">{String(item.clientRecord.profile.phone)}</p>
                  )}
                </div>
              )}

              {/* Key fields */}
              {fields.length > 0 && (
                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Details</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {fields.map(f => (
                      <div key={f.label}>
                        <p className="text-xs text-muted-foreground">{f.label}</p>
                        <p className="text-sm font-medium text-gray-800">{f.value}</p>
                      </div>
                    ))}
                    <div>
                      <p className="text-xs text-muted-foreground">Lab Request ID</p>
                      <p className="text-xs font-mono text-gray-500 break-all">{item.id}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Line items / panel tests */}
              {lineItems.length > 0 && (
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                    <Hash className="h-3 w-3" /> Tests ({lineItems.length})
                  </p>
                  <div className="space-y-2">
                    {lineItems.map((item: any, i: number) => (
                      <div key={item.id ?? i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 gap-2">
                        <span className="text-sm font-medium text-gray-800">{item.name ?? item.testName ?? `Test ${i + 1}`}</span>
                        {item.status && statusBadge(String(item.status).toLowerCase())}
                        {item.result && (
                          <span className="text-xs text-muted-foreground">{String(item.result)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> Attachments ({attachments.length})
                  </p>
                  <div className="space-y-2">
                    {attachments.map((att: any) => (
                      <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-cyan-600 shrink-0" />
                          <span className="text-sm text-gray-700 truncate">{att.name ?? att.fileName ?? att.id}</span>
                        </div>
                        <a
                          href={`/api/practicebetter/labs/${item.id}/attachments/${att.id}?alt=media`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                        >
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <Download className="h-3 w-3" /> Download
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty attachment note */}
              {attachments.length === 0 && (
                <div className="rounded-xl border border-dashed bg-gray-50 p-4 text-center">
                  <Paperclip className="h-6 w-6 mx-auto text-muted-foreground/30 mb-1" />
                  <p className="text-xs text-muted-foreground">No attachments on this lab request</p>
                </div>
              )}

              {/* PB Portal link */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://app.practicebetter.io" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> Open in PracticeBetter
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function PBLabsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [afterId, setAfterId] = useState<string | undefined>();
  const [history, setHistory] = useState<string[]>([]);
  const [selectedLab, setSelectedLab] = useState<PBLabRequest | null>(null);

  const { data, isLoading, error, refetch } = useQuery<PBListResponse>({
    queryKey: ["/api/practicebetter/labs", afterId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (afterId) params.set("after_id", afterId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const r = await fetch(`/api/practicebetter/labs?${params}`);
      const text = await r.text();
      try { return JSON.parse(text); }
      catch { throw new Error(text.slice(0, 200)); }
    },
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.items ?? [];
  const filtered = items.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = getLabName(l).toLowerCase();
    const client = (getClientName(l) ?? "").toLowerCase();
    const lab = (l.labName as string ?? "").toLowerCase();
    return name.includes(q) || client.includes(q) || lab.includes(q);
  });

  const goNext = () => {
    if (items.length > 0) {
      setHistory(h => [...h, afterId ?? ""]);
      setAfterId(items[items.length - 1].id);
    }
  };
  const goPrev = () => {
    const p = [...history];
    setHistory(p);
    setAfterId(p.pop() || undefined);
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
          <div className="flex items-center gap-2">
            {data?.count !== undefined && (
              <span className="text-sm text-muted-foreground">{data.count} total</span>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by lab name, client..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setAfterId(undefined); setHistory([]); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="abnormal">Abnormal</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                  <div className="h-6 w-20 bg-muted rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-8 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
              <p className="font-semibold text-red-700">Failed to load lab results</p>
              <p className="text-sm text-red-600 font-mono">{String(error)}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-16 text-center space-y-3">
              <FlaskConical className="h-14 w-14 mx-auto text-muted-foreground/20" />
              <p className="font-semibold text-muted-foreground text-lg">
                {search || statusFilter !== "all" ? "No labs match your filters" : "No lab records found"}
              </p>
              <p className="text-sm text-muted-foreground">
                Lab orders and results synced from Evexia, Fullscript, and other partners will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(lab => {
              const name = getLabName(lab);
              const status = getStatus(lab);
              const clientDisplay = getClientName(lab);
              const orderedDate = getOrderedDate(lab);
              const resultDate = getResultDate(lab);
              const hasAttachments = Array.isArray(lab.attachments) && (lab.attachments as any[]).length > 0;

              return (
                <Card
                  key={lab.id}
                  className="hover:shadow-md transition-all border-cyan-100 hover:border-cyan-300 cursor-pointer group"
                  onClick={() => setSelectedLab(lab)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                        <FlaskConical className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm group-hover:text-cyan-700 transition-colors">{name}</p>
                            {lab.labName && (
                              <p className="text-xs text-muted-foreground mt-0.5">{String(lab.labName)}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {statusBadge(status)}
                            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-cyan-500 transition-colors" />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
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
                          {hasAttachments && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Paperclip className="h-3 w-3" /> Has attachments
                            </span>
                          )}
                        </div>
                        {lab.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">{String(lab.notes)}</p>
                        )}
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
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
            <span>{filtered.length} record{filtered.length !== 1 ? "s" : ""} shown{data?.count ? ` of ${data.count} total` : ""}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goPrev} disabled={history.length === 0}>
                ← Prev
              </Button>
              <Button variant="outline" size="sm" onClick={goNext} disabled={!data?.hasMore}>
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <LabDetailDialog
        lab={selectedLab}
        open={!!selectedLab}
        onOpenChange={v => { if (!v) setSelectedLab(null); }}
      />
    </AdminLayout>
  );
}
