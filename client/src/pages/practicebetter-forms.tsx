import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, RefreshCw, Search, FileText, Send, Calendar, User, Clock,
  CheckCircle, AlertCircle, Loader2, ChevronRight, X, ExternalLink, MailOpen,
} from "lucide-react";
import { format, parseISO } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PBForm {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  isActive?: boolean;
  dateCreated?: string;
  createdAt?: string;
  formUrl?: string;
  [key: string]: unknown;
}

interface PBFormRequest {
  id: string;
  form?: { id?: string; name?: string; title?: string };
  formId?: string;
  form_id?: string;
  // clientRecord is enriched server-side with full record including profile
  clientRecord?: {
    id?: string;
    profile?: { firstName?: string; lastName?: string; email?: string; emailAddress?: string };
  };
  client?: { id?: string; profile?: { firstName?: string; lastName?: string; emailAddress?: string } };
  clientName?: string;
  // status is derived server-side from completed/started booleans
  status?: string;
  completed?: boolean;
  started?: boolean;
  dateCreated?: string;
  createdAt?: string;
  dateSent?: string;
  dateCompleted?: string;
  completedAt?: string;
  [key: string]: unknown;
}

interface PBClientRecord {
  id: string;
  profile?: { firstName?: string; lastName?: string; email?: string; emailAddress?: string };
}

interface PBListResponse<T> {
  count?: number;
  hasMore?: boolean;
  items: T[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtDate = (s?: string) => {
  if (!s) return "—";
  try { return format(parseISO(s), "MMM d, yyyy"); } catch { return s; }
};

const fmtDateTime = (s?: string) => {
  if (!s) return "—";
  try { return format(parseISO(s), "MMM d, yyyy h:mm a"); } catch { return s; }
};

const statusStyle: Record<string, { cls: string; label: string }> = {
  pending:    { cls: "bg-yellow-100 text-yellow-700 border-yellow-200",   label: "Pending" },
  sent:       { cls: "bg-blue-100 text-blue-700 border-blue-200",         label: "Sent" },
  opened:     { cls: "bg-purple-100 text-purple-700 border-purple-200",   label: "Opened" },
  completed:  { cls: "bg-green-100 text-green-700 border-green-200",      label: "Completed" },
  complete:   { cls: "bg-green-100 text-green-700 border-green-200",      label: "Completed" },
  submitted:  { cls: "bg-green-100 text-green-700 border-green-200",      label: "Submitted" },
  expired:    { cls: "bg-red-100 text-red-700 border-red-200",            label: "Expired" },
  cancelled:  { cls: "bg-gray-100 text-gray-500 border-gray-200",        label: "Cancelled" },
};

const getClientName = (req: PBFormRequest): string => {
  const prof = req.clientRecord?.profile ?? req.client?.profile;
  if (prof?.firstName || prof?.lastName)
    return [prof.firstName, prof.lastName].filter(Boolean).join(" ");
  // Fall back to email from profile
  const email = prof?.emailAddress ?? prof?.email;
  if (email) return email;
  return req.clientName ?? "Unknown Client";
};

const getClientEmail = (req: PBFormRequest): string | undefined => {
  const prof = req.clientRecord?.profile ?? req.client?.profile;
  return prof?.emailAddress ?? prof?.email;
};

const getClientId = (req: PBFormRequest): string | undefined =>
  req.clientRecord?.id ?? req.client?.id;

// ── Sub-components ─────────────────────────────────────────────────────────────

function RequestStatusBadge({ status }: { status?: string }) {
  const s = (status ?? "pending").toLowerCase();
  const { cls, label } = statusStyle[s] ?? { cls: "bg-gray-100 text-gray-600 border-gray-200", label: s };
  return <Badge className={`text-xs border ${cls}`}>{label}</Badge>;
}

function FormRequestRow({ req, showForm = false }: { req: PBFormRequest; showForm?: boolean }) {
  const clientName = getClientName(req);
  const clientEmail = getClientEmail(req);
  const formName = req.form?.name ?? req.form?.title ?? "Form";
  const sentDate = req.dateSent ?? req.dateCreated ?? req.createdAt;
  const completedDate = req.dateCompleted ?? req.completedAt;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-orange-100 bg-orange-50/30 hover:bg-orange-50 transition-colors">
      <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
        <MailOpen className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="font-semibold text-sm">{clientName}</p>
            {clientEmail && clientName !== clientEmail && (
              <p className="text-xs text-muted-foreground">{clientEmail}</p>
            )}
            {showForm && <p className="text-xs text-orange-600 font-medium">{formName}</p>}
          </div>
          <RequestStatusBadge status={req.status} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          {sentDate && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Send className="h-3 w-3" /> Sent {fmtDateTime(sentDate)}
            </span>
          )}
          {completedDate && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle className="h-3 w-3" /> Completed {fmtDate(completedDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Send Form Dialog ───────────────────────────────────────────────────────────

function SendFormDialog({
  form,
  open,
  onOpenChange,
}: {
  form: PBForm | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<PBClientRecord | null>(null);

  const { data: clientsData, isLoading: clientsLoading } = useQuery<PBListResponse<PBClientRecord>>({
    queryKey: ["/api/practicebetter/client-records", clientSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientSearch) params.set("search", clientSearch);
      const r = await fetch(`/api/practicebetter/client-records?${params}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled: open,
    staleTime: 60_000,
  });

  const clients = useMemo(() => {
    const all = clientsData?.items ?? [];
    if (!clientSearch) return all.slice(0, 20);
    const q = clientSearch.toLowerCase();
    return all.filter((c) => {
      const n = [c.profile?.firstName, c.profile?.lastName].filter(Boolean).join(" ").toLowerCase();
      const e = (c.profile?.emailAddress ?? c.profile?.email ?? "").toLowerCase();
      return n.includes(q) || e.includes(q);
    }).slice(0, 20);
  }, [clientsData, clientSearch]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/practicebetter/formrequests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: form?.id, clientRecordId: selectedClient?.id }),
      });
      if (!r.ok) {
        const err = await r.json().catch(async () => ({ error: await r.text() }));
        throw new Error(err?.error ?? "Failed to send form");
      }
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Form sent!", description: `${form?.name ?? "Form"} has been sent to ${[selectedClient?.profile?.firstName, selectedClient?.profile?.lastName].filter(Boolean).join(" ")}.` });
      queryClient.invalidateQueries({ queryKey: ["/api/practicebetter/formrequests"] });
      onOpenChange(false);
      setSelectedClient(null);
      setClientSearch("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send form", description: err.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setSelectedClient(null);
    setClientSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-orange-600" /> Send Form to Client
          </DialogTitle>
          <DialogDescription>
            Sending: <span className="font-semibold text-foreground">{form?.name ?? form?.title}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client search */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Select Client <span className="text-red-500">*</span></label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(null); }}
                className="pl-9 border-2 border-gray-300"
              />
            </div>
            {selectedClient && (
              <div className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{[selectedClient.profile?.firstName, selectedClient.profile?.lastName].filter(Boolean).join(" ")}</p>
                    {(selectedClient.profile?.emailAddress ?? selectedClient.profile?.email) && (
                      <p className="text-xs text-muted-foreground">{selectedClient.profile?.emailAddress ?? selectedClient.profile?.email}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {!selectedClient && (
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                {clientsLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading clients...
                  </div>
                ) : clients.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No clients found</div>
                ) : clients.map((c) => {
                  const name = [c.profile?.firstName, c.profile?.lastName].filter(Boolean).join(" ") || "Unnamed";
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClient(c)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-orange-50 transition-colors text-left"
                    >
                      <div className="h-7 w-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{name}</p>
                        {(c.profile?.emailAddress ?? c.profile?.email) && (
                          <p className="text-xs text-muted-foreground">{c.profile?.emailAddress ?? c.profile?.email}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={!selectedClient || sendMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {sendMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Send Form</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Form Detail Dialog ─────────────────────────────────────────────────────────

function FormDetailDialog({
  form,
  open,
  onOpenChange,
  onSend,
}: {
  form: PBForm | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSend: () => void;
}) {
  const { data, isLoading, refetch } = useQuery<PBListResponse<PBFormRequest>>({
    queryKey: ["/api/practicebetter/formrequests", form?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (form?.id) params.set("form_id", form.id);
      const r = await fetch(`/api/practicebetter/formrequests?${params}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled: open && !!form?.id,
    staleTime: 2 * 60 * 1000,
  });

  const requests = data?.items ?? [];
  const isActive = form?.isActive !== false && form?.status !== "inactive";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold leading-tight">
                  {form?.name ?? form?.title ?? "Form"}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={isActive ? "bg-green-100 text-green-700 border-green-200 text-xs" : "bg-gray-100 text-gray-500 text-xs"}>
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                  {form?.type && (
                    <span className="text-xs text-muted-foreground capitalize">{form.type}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-2 pb-3 border-b">
          <Button
            onClick={onSend}
            className="bg-orange-600 hover:bg-orange-700 text-white"
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" /> Send to Client
          </Button>
          {form?.formUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={String(form.formUrl)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> Open Form
              </a>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-auto">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Description */}
        {form?.description && (
          <p className="shrink-0 text-sm text-muted-foreground px-0.5">{String(form.description)}</p>
        )}

        {/* Form Requests */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Sent Requests</h3>
            <span className="text-xs text-muted-foreground">{requests.length} total</span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <MailOpen className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No requests sent yet</p>
              <p className="text-xs text-muted-foreground">Click "Send to Client" to send this form.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => (
                <FormRequestRow key={req.id} req={req} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function PBFormsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Forms library state
  const [search, setSearch] = useState("");
  const [afterId, setAfterId] = useState<string | undefined>();
  const [history, setHistory] = useState<string[]>([]);

  // Form requests tab state
  const [reqSearch, setReqSearch] = useState("");
  const [reqStatus, setReqStatus] = useState("all");
  const [reqAfterId, setReqAfterId] = useState<string | undefined>();
  const [reqHistory, setReqHistory] = useState<string[]>([]);

  // Dialog state
  const [selectedForm, setSelectedForm] = useState<PBForm | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("forms");

  // ── Forms query ──
  const { data, isLoading, error, refetch } = useQuery<PBListResponse<PBForm>>({
    queryKey: ["/api/practicebetter/forms", afterId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (afterId) params.set("after_id", afterId);
      const r = await fetch(`/api/practicebetter/forms?${params}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Form requests query — status filter done client-side (PB uses booleans, not status strings) ──
  const { data: reqData, isLoading: reqLoading, error: reqError, refetch: reqRefetch } =
    useQuery<PBListResponse<PBFormRequest>>({
      queryKey: ["/api/practicebetter/formrequests", reqAfterId],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (reqAfterId) params.set("after_id", reqAfterId);
        const r = await fetch(`/api/practicebetter/formrequests?${params}`);
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      },
      staleTime: 2 * 60 * 1000,
    });

  const forms = data?.items ?? [];
  const filteredForms = forms.filter((f) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (f.name ?? f.title ?? "").toLowerCase().includes(q);
  });

  const allRequests = reqData?.items ?? [];
  const filteredRequests = allRequests.filter((r) => {
    // Status filter (client-side since PB uses booleans)
    if (reqStatus !== "all" && r.status !== reqStatus) return false;
    // Text search
    const q = reqSearch.toLowerCase();
    if (!q) return true;
    const client = getClientName(r).toLowerCase();
    const email = (getClientEmail(r) ?? "").toLowerCase();
    const formName = (r.form?.name ?? r.form?.title ?? "").toLowerCase();
    return client.includes(q) || email.includes(q) || formName.includes(q);
  });

  const openDetail = (form: PBForm) => {
    setSelectedForm(form);
    setDetailOpen(true);
  };

  const openSend = (form: PBForm) => {
    setSelectedForm(form);
    setSendOpen(true);
  };

  // Pagination helpers
  const goNext = () => {
    if (forms.length > 0) { setHistory((h) => [...h, afterId ?? ""]); setAfterId(forms[forms.length - 1].id); }
  };
  const goPrev = () => {
    const p = [...history]; setHistory(p); setAfterId(p.pop() || undefined);
  };
  const reqGoNext = () => {
    if (allRequests.length > 0) { setReqHistory((h) => [...h, reqAfterId ?? ""]); setReqAfterId(allRequests[allRequests.length - 1].id); }
  };
  const reqGoPrev = () => {
    const p = [...reqHistory]; setReqHistory(p); setReqAfterId(p.pop() || undefined);
  };

  return (
    <AdminLayout currentTab="practitioner">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/practitioner")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Forms</h1>
              <p className="text-sm text-muted-foreground">Client intake & assessment forms</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => activeTab === "forms" ? refetch() : reqRefetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border bg-white">
            <TabsTrigger value="forms" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Forms Library
              {forms.length > 0 && <Badge className="bg-orange-100 text-orange-700 text-xs ml-1">{forms.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <MailOpen className="h-4 w-4" /> Form Requests
              {allRequests.length > 0 && <Badge className="bg-orange-100 text-orange-700 text-xs ml-1">{allRequests.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* ── Forms Library Tab ── */}
          <TabsContent value="forms" className="mt-4 space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search forms..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6 text-center space-y-2">
                  <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
                  <p className="font-semibold text-red-700">Failed to load forms</p>
                  <p className="text-sm text-red-600">{String(error)}</p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
                </CardContent>
              </Card>
            ) : filteredForms.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center space-y-3">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/30" />
                  <p className="font-semibold text-muted-foreground">
                    {search ? "No forms match your search" : "No forms found"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredForms.map((form) => {
                  const name = form.name ?? form.title ?? "Untitled Form";
                  const isActive = form.isActive !== false && form.status !== "inactive";
                  return (
                    <button
                      key={form.id}
                      onClick={() => openDetail(form)}
                      className="group text-left p-4 bg-white border-2 border-orange-100 rounded-xl hover:border-orange-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <p className="font-semibold text-sm leading-tight text-gray-800 group-hover:text-orange-700 transition-colors">{name}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-orange-400 shrink-0 mt-0.5 transition-colors" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className={`text-xs border ${isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-xs text-orange-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <Send className="h-3 w-3" /> Click to manage
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {!isLoading && !error && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{filteredForms.length} form{filteredForms.length !== 1 ? "s" : ""}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={goPrev} disabled={history.length === 0}>← Prev</Button>
                  <Button variant="outline" size="sm" onClick={goNext} disabled={!data?.hasMore}>Next →</Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Form Requests Tab ── */}
          <TabsContent value="requests" className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by client or form name..." value={reqSearch} onChange={(e) => setReqSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={reqStatus} onValueChange={setReqStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="opened">Opened</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reqLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : reqError ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6 text-center space-y-2">
                  <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
                  <p className="font-semibold text-red-700">Failed to load form requests</p>
                  <p className="text-sm text-red-600">{String(reqError)}</p>
                  <Button variant="outline" size="sm" onClick={() => reqRefetch()}>Retry</Button>
                </CardContent>
              </Card>
            ) : filteredRequests.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center space-y-3">
                  <MailOpen className="h-12 w-12 mx-auto text-muted-foreground/30" />
                  <p className="font-semibold text-muted-foreground">
                    {reqSearch || reqStatus !== "all" ? "No requests match your filters" : "No form requests yet"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Send a form from the Forms Library tab to create a request.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredRequests.map((req) => (
                  <FormRequestRow key={req.id} req={req} showForm />
                ))}
              </div>
            )}

            {!reqLoading && !reqError && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={reqGoPrev} disabled={reqHistory.length === 0}>← Prev</Button>
                  <Button variant="outline" size="sm" onClick={reqGoNext} disabled={!reqData?.hasMore}>Next →</Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <FormDetailDialog
        form={selectedForm}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSend={() => { setDetailOpen(false); setSendOpen(true); }}
      />
      <SendFormDialog
        form={selectedForm}
        open={sendOpen}
        onOpenChange={setSendOpen}
      />
    </AdminLayout>
  );
}
