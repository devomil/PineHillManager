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
  FileText, Download, ChevronRight, ExternalLink, Paperclip, Stethoscope,
  Building2, X,
} from "lucide-react";
import { format, parseISO } from "date-fns";

// ── Real PB Lab Request shape (from /consultant/labrequests) ──────────────────

interface PBLabTest {
  testId: string;
  labTest?: {
    labTestId?: string;
    name?: string;
    labCompanyName?: string;
    url?: string;
    details?: string;
  };
  status?: string;
  result?: string;
}

interface PBArtifact {
  id: string;
  name?: string;
  fileName?: string;
  mimeType?: string;
  fileType?: string;
  url?: string;
  [key: string]: unknown;
}

interface PBLabRequest {
  id: string;
  name?: string;
  // Rupa patient fields (primary client source)
  rupaPatientFirstName?: string;
  rupaPatientLastName?: string;
  rupaPatientEmail?: string;
  rupaOrderId?: string;
  rupaStatus?: string;
  rupaPractitionerName?: string;
  rupaClinicId?: string;
  // Tests
  orderedTests?: PBLabTest[];
  // Dates
  dateCreated?: string;
  dateModified?: string;
  dateOrdered?: string;
  // Consultant
  consultant?: { profile?: { firstName?: string; lastName?: string } };
  // Status
  requestStatus?: string;
  publishStatus?: string;
  // Attachments / result files
  artifacts?: PBArtifact[];
  notesHistory?: { note?: string; createdAt?: string }[];
  // Fallback fields (older records or different integrations)
  clientRecord?: { profile?: { firstName?: string; lastName?: string; emailAddress?: string; email?: string } };
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
  // Rupa integration fields come first
  const first = lab.rupaPatientFirstName;
  const last = lab.rupaPatientLastName;
  if (first || last) return [first, last].filter(Boolean).join(" ");
  // Fallback to clientRecord
  const prof = lab.clientRecord?.profile;
  if (prof) return [prof.firstName, prof.lastName].filter(Boolean).join(" ") || null;
  return null;
}

function getClientEmail(lab: PBLabRequest): string | null {
  return lab.rupaPatientEmail
    ?? lab.clientRecord?.profile?.emailAddress
    ?? lab.clientRecord?.profile?.email
    ?? null;
}

function getLabName(lab: PBLabRequest): string {
  return lab.name ?? "Lab Order";
}

function getPrimaryStatus(lab: PBLabRequest): string {
  // rupaStatus comes in human-readable form e.g. "Pending Payment", "Results Received"
  // requestStatus is lowercase e.g. "inprogress", "complete"
  return lab.rupaStatus ?? lab.requestStatus ?? "ordered";
}

function getLabCompany(lab: PBLabRequest): string | null {
  const tests = lab.orderedTests;
  if (!tests || tests.length === 0) return null;
  const company = tests[0]?.labTest?.labCompanyName;
  return company ?? null;
}

// Map PB status strings to badge colors
function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("results") || s.includes("received") || s.includes("complete")) return "bg-green-100 text-green-700 border-green-200";
  if (s.includes("abnormal")) return "bg-red-100 text-red-700 border-red-200";
  if (s.includes("pending") || s.includes("inprogress") || s.includes("in progress")) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (s.includes("ordered") || s.includes("draft")) return "bg-gray-100 text-gray-600 border-gray-200";
  if (s.includes("cancel")) return "bg-gray-100 text-gray-400 border-gray-200";
  if (s.includes("reviewed")) return "bg-purple-100 text-purple-700 border-purple-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`text-xs border font-medium ${statusBadgeClass(status)}`}>
      {status}
    </Badge>
  );
}

// ── Attachment Viewer Dialog ───────────────────────────────────────────────────

function AttachmentViewerDialog({
  labId,
  artifact,
  open,
  onOpenChange,
}: {
  labId: string;
  artifact: PBArtifact | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: attachmentMeta, isLoading } = useQuery<PBArtifact>({
    queryKey: ["/api/practicebetter/labs", labId, "attachments", artifact?.id],
    queryFn: async () => {
      const r = await fetch(`/api/practicebetter/labs/${labId}/attachments/${artifact!.id}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled: open && !!artifact?.id && !!labId,
    staleTime: 10 * 60 * 1000,
  });

  if (!artifact) return null;

  const meta = attachmentMeta ?? artifact;
  const name = meta.name ?? meta.fileName ?? artifact.name ?? artifact.fileName ?? artifact.id;
  const mimeType = meta.mimeType ?? meta.fileType ?? "";
  const downloadUrl = `/api/practicebetter/labs/${labId}/attachments/${artifact.id}?alt=media`;

  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold truncate">{name}</DialogTitle>
                {mimeType && <p className="text-xs text-muted-foreground">{mimeType}</p>}
              </div>
            </div>
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download>
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
                <Download className="h-4 w-4" /> Download
              </Button>
            </a>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Loading attachment details...</p>
              </div>
            </div>
          ) : isImage ? (
            <div className="flex items-center justify-center p-4">
              <img
                src={downloadUrl}
                alt={name}
                className="max-w-full max-h-[60vh] rounded-lg shadow-md object-contain"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={`${downloadUrl}#view=FitH`}
              title={name}
              className="w-full h-[60vh] rounded-lg border"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
                <FileText className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-gray-800">{name}</p>
                {mimeType && <p className="text-sm text-muted-foreground">{mimeType}</p>}
              </div>
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download>
                <Button className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2">
                  <Download className="h-4 w-4" /> Download File
                </Button>
              </a>
              <p className="text-xs text-muted-foreground max-w-xs">
                This file type can't be previewed in the browser. Click Download to open it locally.
              </p>
            </div>
          )}
        </div>

        {/* Raw metadata */}
        {attachmentMeta && Object.keys(attachmentMeta).length > 0 && (
          <div className="shrink-0 border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Attachment Details</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              {Object.entries(attachmentMeta)
                .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
                .map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-muted-foreground font-medium shrink-0">{k}:</span>
                    <span className="text-gray-700 break-all">{String(v)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
  const [viewingArtifact, setViewingArtifact] = useState<PBArtifact | null>(null);

  const { data: detail, isLoading } = useQuery<PBLabRequest>({
    queryKey: ["/api/practicebetter/labs/detail", lab?.id],
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
  const labName = getLabName(item);
  const status = getPrimaryStatus(item);
  const orderedTests = item.orderedTests ?? [];
  const artifacts = (item.artifacts as PBArtifact[]) ?? [];
  const notes = (item.notesHistory as any[]) ?? [];
  const practitioner = (item.rupaPractitionerName
    ?? [item.consultant?.profile?.firstName, item.consultant?.profile?.lastName].filter(Boolean).join(" "))
    || null;

  return (
    <>
      <Dialog open={open && !viewingArtifact} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0 pb-3 border-b">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0 mt-0.5">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-bold leading-tight">{labName}</DialogTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <StatusBadge status={status} />
                  {item.publishStatus && item.publishStatus !== "draft" && (
                    <span className="text-xs text-muted-foreground capitalize">{item.publishStatus}</span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <a href="https://app.practicebetter.io" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" /> PracticeBetter
                </a>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-3">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <>
                {/* Client & Practitioner */}
                <div className="grid grid-cols-2 gap-3">
                  {(clientName || clientEmail) && (
                    <div className="rounded-xl border bg-cyan-50 p-4 space-y-1">
                      <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wide flex items-center gap-1">
                        <User className="h-3 w-3" /> Patient
                      </p>
                      {clientName && <p className="font-semibold text-gray-800">{clientName}</p>}
                      {clientEmail && <p className="text-xs text-muted-foreground break-all">{clientEmail}</p>}
                      {item.rupaOrderId && (
                        <p className="text-xs text-muted-foreground">Order: {item.rupaOrderId}</p>
                      )}
                    </div>
                  )}
                  {practitioner && (
                    <div className="rounded-xl border bg-purple-50 p-4 space-y-1">
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-1">
                        <Stethoscope className="h-3 w-3" /> Practitioner
                      </p>
                      <p className="font-semibold text-gray-800">{practitioner}</p>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-3 gap-3">
                  {item.dateOrdered && (
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <p className="text-xs text-muted-foreground">Ordered</p>
                      <p className="text-sm font-semibold text-gray-800">{fmtDate(item.dateOrdered)}</p>
                    </div>
                  )}
                  {item.dateCreated && (
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm font-semibold text-gray-800">{fmtDate(item.dateCreated)}</p>
                    </div>
                  )}
                  {item.dateModified && (
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                      <p className="text-sm font-semibold text-gray-800">{fmtDate(item.dateModified)}</p>
                    </div>
                  )}
                </div>

                {/* Ordered Tests */}
                {orderedTests.length > 0 && (
                  <div className="rounded-xl border p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <FlaskConical className="h-3 w-3" /> Ordered Tests ({orderedTests.length})
                    </p>
                    <div className="space-y-2">
                      {orderedTests.map((t, i) => {
                        const lt = t.labTest;
                        return (
                          <div key={t.testId ?? i} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{lt?.name ?? `Test ${i + 1}`}</p>
                                {lt?.labCompanyName && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Building2 className="h-3 w-3" /> {lt.labCompanyName}
                                  </p>
                                )}
                                {lt?.details && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lt.details}</p>
                                )}
                              </div>
                              <div className="shrink-0 flex gap-2 items-center">
                                {t.status && <StatusBadge status={t.status} />}
                                {lt?.url && (
                                  <a href={lt.url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                  </a>
                                )}
                              </div>
                            </div>
                            {t.result && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <span className="text-xs text-muted-foreground">Result: </span>
                                <span className="text-xs font-medium text-gray-800">{String(t.result)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Artifacts (Result Files / Attachments) */}
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Paperclip className="h-3 w-3" /> Result Files & Attachments
                    {artifacts.length > 0 && (
                      <span className="ml-1 bg-cyan-100 text-cyan-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                        {artifacts.length}
                      </span>
                    )}
                  </p>
                  {artifacts.length > 0 ? (
                    <div className="space-y-2">
                      {artifacts.map((art) => {
                        const artName = art.name ?? art.fileName ?? art.id;
                        return (
                          <div
                            key={art.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-cyan-200 hover:bg-cyan-50 transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{artName}</p>
                                {art.mimeType && (
                                  <p className="text-xs text-muted-foreground">{String(art.mimeType)}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1.5 border-cyan-300 text-cyan-700 hover:bg-cyan-100"
                                onClick={() => setViewingArtifact(art)}
                              >
                                View
                              </Button>
                              <a
                                href={`/api/practicebetter/labs/${item.id}/attachments/${art.id}?alt=media`}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                              >
                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                                  <Download className="h-3.5 w-3.5" /> Download
                                </Button>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                      <Paperclip className="h-8 w-8 text-muted-foreground/20" />
                      <p className="text-sm text-muted-foreground">No result files attached to this lab request</p>
                      <p className="text-xs text-muted-foreground">
                        Result files will appear here once the lab returns results.
      </p>
                    </div>
                  )}
                </div>

                {/* Notes history */}
                {notes.length > 0 && (
                  <div className="rounded-xl border p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Notes</p>
                    <div className="space-y-2">
                      {notes.map((n: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-gray-50 text-sm">
                          {n.note && <p className="text-gray-700">{String(n.note)}</p>}
                          {n.createdAt && (
                            <p className="text-xs text-muted-foreground mt-1">{fmtDate(n.createdAt)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Attachment Viewer — separate dialog layer */}
      <AttachmentViewerDialog
        labId={item.id}
        artifact={viewingArtifact}
        open={!!viewingArtifact}
        onOpenChange={v => { if (!v) setViewingArtifact(null); }}
      />
    </>
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
  const filtered = items.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = getLabName(l).toLowerCase();
    const client = (getClientName(l) ?? "").toLowerCase();
    const company = (getLabCompany(l) ?? "").toLowerCase();
    const practitioner = (l.rupaPractitionerName ?? "").toLowerCase();
    return name.includes(q) || client.includes(q) || company.includes(q) || practitioner.includes(q);
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
              <span className="text-sm text-muted-foreground font-medium">{data.count} total</span>
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
              placeholder="Search labs, clients, practitioners..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setAfterId(undefined); setHistory([]); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="received">Results Received</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
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
                  <div className="h-6 w-28 bg-muted rounded-full" />
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
                Lab orders synced from Rupa Health, Evexia, Fullscript, and other partners appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(lab => {
              const name = getLabName(lab);
              const status = getPrimaryStatus(lab);
              const clientName = getClientName(lab);
              const labCompany = getLabCompany(lab);
              const orderedDate = lab.dateOrdered;
              const hasArtifacts = Array.isArray(lab.artifacts) && lab.artifacts.length > 0;
              const testCount = lab.orderedTests?.length ?? 0;

              return (
                <Card
                  key={lab.id}
                  className="hover:shadow-md transition-all border-gray-200 hover:border-cyan-300 cursor-pointer group"
                  onClick={() => setSelectedLab(lab)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                        <FlaskConical className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm group-hover:text-cyan-700 transition-colors">{name}</p>
                            {labCompany && (
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Building2 className="h-3 w-3" /> {labCompany}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge status={status} />
                            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-cyan-500 transition-colors" />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                          {clientName && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" /> {clientName}
                            </span>
                          )}
                          {lab.rupaPractitionerName && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Stethoscope className="h-3 w-3" /> {lab.rupaPractitionerName}
                            </span>
                          )}
                          {orderedDate && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" /> {fmtDate(orderedDate)}
                            </span>
                          )}
                          {testCount > 1 && (
                            <span className="text-xs text-muted-foreground">{testCount} tests</span>
                          )}
                          {hasArtifacts && (
                            <span className="flex items-center gap-1 text-xs text-cyan-600 font-medium">
                              <Paperclip className="h-3 w-3" /> Results attached
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
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
            <span>
              {filtered.length} shown{data?.count ? ` of ${data.count} total` : ""}
            </span>
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
