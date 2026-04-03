import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, RefreshCw, Search, BookOpen, Calendar, Users, Clock,
  AlertCircle, UserPlus, UserMinus, ChevronRight, Loader2, ExternalLink,
  Info, Hash,
} from "lucide-react";
import { format, parseISO } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PBProgram {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  isActive?: boolean;
  duration?: number | string;
  enrollmentCount?: number;
  clientCount?: number;
  startDate?: string;
  endDate?: string;
  dateCreated?: string;
  createdAt?: string;
  category?: string;
  modules?: any[];
  [key: string]: unknown;
}

interface PBEnrollment {
  id: string;
  clientRecord?: {
    id: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      emailAddress?: string;
    };
  };
  status?: string;
  dateCreated?: string;
  createdAt?: string;
  completedAt?: string;
  progress?: number;
  [key: string]: unknown;
}

interface PBClient {
  id: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    emailAddress?: string;
  };
}

interface PBListResponse<T> {
  count?: number;
  hasMore?: boolean;
  items: T[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (s?: string) => {
  if (!s) return "—";
  try { return format(parseISO(s), "MMM d, yyyy"); } catch { return s; }
};

const getClientName = (enrollment: PBEnrollment) => {
  const p = enrollment.clientRecord?.profile;
  if (!p) return "Unknown Client";
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || "Unknown Client";
};

// ── Enrollment Detail Modal ───────────────────────────────────────────────────

function ProgramDetailModal({
  program,
  onClose,
}: {
  program: PBProgram;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showEnrollSearch, setShowEnrollSearch] = useState(false);
  const programName = program.name ?? program.title ?? "Untitled Program";

  // Debounce client search by 400 ms to avoid hammering PB on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(clientSearch), 400);
    return () => clearTimeout(id);
  }, [clientSearch]);

  // Fetch full program detail for Overview tab
  const { data: detail } = useQuery<PBProgram>({
    queryKey: ["/api/practicebetter/programs", program.id, "detail"],
    queryFn: async () => {
      const r = await fetch(`/api/practicebetter/programs/${program.id}`);
      const text = await r.text();
      if (!r.ok) throw new Error(text);
      try { return JSON.parse(text); } catch { throw new Error("Invalid response from server"); }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Merge list-level data with full detail (detail may have more fields)
  const fullProgram: PBProgram = { ...program, ...(detail ?? {}) };

  const { data: enrollData, isLoading: enrollLoading, error: enrollError, refetch: refetchEnroll } =
    useQuery<PBListResponse<PBEnrollment>>({
      queryKey: ["/api/practicebetter/programs", program.id, "enrollments"],
      queryFn: async () => {
        const r = await fetch(`/api/practicebetter/programs/${program.id}/enrollments`);
        const text = await r.text();
        if (!r.ok) throw new Error(text.startsWith("{") ? JSON.parse(text)?.error ?? text : text);
        try { return JSON.parse(text); } catch { throw new Error("Server returned invalid data"); }
      },
      staleTime: 2 * 60 * 1000,
      retry: 2,
    });

  const { data: clientData, isLoading: clientSearchLoading } =
    useQuery<PBListResponse<PBClient>>({
      queryKey: ["/api/practicebetter/clients", debouncedSearch],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        const r = await fetch(`/api/practicebetter/clients?${params}`);
        const text = await r.text();
        if (!r.ok) throw new Error(text);
        try { return JSON.parse(text); } catch { throw new Error("Invalid search response"); }
      },
      enabled: showEnrollSearch && debouncedSearch.length >= 2,
      staleTime: 60 * 1000,
    });

  const enrollMutation = useMutation({
    mutationFn: (clientRecordId: string) =>
      apiRequest("POST", `/api/practicebetter/programs/${program.id}/enrollments`, { clientRecordId }),
    onSuccess: () => {
      toast({ title: "Enrolled", description: "Client successfully enrolled in program." });
      refetchEnroll();
      queryClient.invalidateQueries({ queryKey: ["/api/practicebetter/programs"] });
      setShowEnrollSearch(false);
      setClientSearch("");
    },
    onError: (err: any) => {
      toast({ title: "Enroll failed", description: err.message ?? "Could not enroll client.", variant: "destructive" });
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: (clientRecordId: string) =>
      apiRequest("DELETE", `/api/practicebetter/programs/${program.id}/enrollments`, { clientRecordId }),
    onSuccess: () => {
      toast({ title: "Unenrolled", description: "Client removed from program." });
      refetchEnroll();
      queryClient.invalidateQueries({ queryKey: ["/api/practicebetter/programs"] });
    },
    onError: (err: any) => {
      toast({ title: "Unenroll failed", description: err.message ?? "Could not unenroll client.", variant: "destructive" });
    },
  });

  const enrollments = enrollData?.items ?? [];
  const clients = clientData?.items ?? [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="pr-8 shrink-0">
          <DialogTitle className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-base font-bold leading-snug">{programName}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">Program details for {programName}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1">
          <Tabs defaultValue="enrollments">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="enrollments">
                Enrollments
                {enrollments.length > 0 && (
                  <Badge className="ml-1.5 bg-pink-100 text-pink-700 border-pink-200 text-xs px-1.5">
                    {enrollments.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Overview Tab ── */}
            <TabsContent value="overview" className="space-y-4 mt-0">
              <div className="space-y-3">
                {fullProgram.description && (
                  <div className="rounded-lg bg-gray-50 dark:bg-slate-800 border p-3 text-sm text-gray-800 dark:text-gray-200">
                    {String(fullProgram.description)}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {(fullProgram.type ?? fullProgram.category) && (
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</p>
                        <p className="text-sm font-medium capitalize">{String(fullProgram.type ?? fullProgram.category)}</p>
                      </div>
                    </div>
                  )}
                  {fullProgram.duration !== undefined && (
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Duration</p>
                        <p className="text-sm font-medium">{String(fullProgram.duration)}</p>
                      </div>
                    </div>
                  )}
                  {(fullProgram.dateCreated ?? fullProgram.createdAt) && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created</p>
                        <p className="text-sm font-medium">{fmtDate((fullProgram.dateCreated ?? fullProgram.createdAt) as string)}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Course ID</p>
                      <p className="text-xs font-mono text-muted-foreground break-all">{fullProgram.id}</p>
                    </div>
                  </div>
                </div>
                {fullProgram.modules && Array.isArray(fullProgram.modules) && (fullProgram.modules as any[]).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Modules ({(fullProgram.modules as any[]).length})
                    </p>
                    <ul className="space-y-1">
                      {(fullProgram.modules as any[]).map((mod: any, i: number) => (
                        <li key={mod.id ?? i} className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-gray-50 dark:bg-slate-800">
                          <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                          <span className="font-medium truncate">{mod.name ?? mod.title ?? `Module ${i + 1}`}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t">
                <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <a href={`https://app.practicebetter.io/programs/${fullProgram.id}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in PracticeBetter
                  </a>
                </Button>
              </div>
            </TabsContent>

            {/* ── Enrollments Tab ── */}
            <TabsContent value="enrollments" className="mt-0 space-y-4">
              {/* Enroll new client */}
              <div className="border rounded-lg p-3 space-y-2 bg-pink-50 dark:bg-pink-950/20">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-pink-900 dark:text-pink-100">Enroll a Client</p>
                  <Button
                    size="sm"
                    variant={showEnrollSearch ? "outline" : "default"}
                    className={showEnrollSearch ? "" : "bg-pink-600 hover:bg-pink-700 text-white"}
                    onClick={() => {
                      setShowEnrollSearch((v) => !v);
                      setClientSearch("");
                    }}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                    {showEnrollSearch ? "Cancel" : "Search & Enroll"}
                  </Button>
                </div>

                {showEnrollSearch && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Type client name or email (min 2 chars)..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
                        autoFocus
                      />
                    </div>
                    {clientSearchLoading && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" /> Searching...
                      </p>
                    )}
                    {clients.length > 0 && (
                      <ul className="space-y-1 max-h-40 overflow-y-auto">
                        {clients.map((c) => {
                          const p = c.profile;
                          const name = [p?.firstName, p?.lastName].filter(Boolean).join(" ") || "Unknown";
                          return (
                            <li
                              key={c.id}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-md border bg-white dark:bg-slate-800 text-sm"
                            >
                              <span className="font-medium">{name}
                                {p?.emailAddress && <span className="text-xs text-muted-foreground ml-1.5">{p.emailAddress}</span>}
                              </span>
                              <Button
                                size="sm"
                                className="h-6 px-2 text-xs bg-pink-600 hover:bg-pink-700 text-white"
                                disabled={enrollMutation.isPending}
                                onClick={() => enrollMutation.mutate(c.id)}
                              >
                                {enrollMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enroll"}
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {debouncedSearch.length >= 2 && !clientSearchLoading && clients.length === 0 && (
                      <p className="text-xs text-muted-foreground">No clients found for "{debouncedSearch}"</p>
                    )}
                  </div>
                )}
              </div>

              {/* Enrollment list */}
              {enrollLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : enrollError ? (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4 text-center space-y-2">
                    <AlertCircle className="h-6 w-6 text-red-400 mx-auto" />
                    <p className="text-sm text-red-700">Failed to load enrollments</p>
                    <Button variant="outline" size="sm" onClick={() => refetchEnroll()}>Retry</Button>
                  </CardContent>
                </Card>
              ) : enrollments.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">No clients enrolled yet</p>
                  <p className="text-xs text-muted-foreground">Use "Search & Enroll" above to add clients.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">{enrollments.length} enrolled client{enrollments.length !== 1 ? "s" : ""}</p>
                  {enrollments.map((enr) => {
                    const clientName = getClientName(enr);
                    const email = enr.clientRecord?.profile?.emailAddress;
                    const enrolledDate = enr.dateCreated ?? enr.createdAt;
                    const isRemoving = unenrollMutation.isPending;
                    return (
                      <div
                        key={enr.id}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-white dark:bg-slate-800 gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{clientName}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
                            {enrolledDate && (
                              <p className="text-xs text-muted-foreground">Enrolled {fmtDate(enrolledDate)}</p>
                            )}
                            {enr.status && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {String(enr.status)}
                              </Badge>
                            )}
                            {enr.completedAt && (
                              <Badge className="text-xs px-1.5 py-0 bg-green-100 text-green-700 border-green-200">
                                Completed {fmtDate(enr.completedAt)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          disabled={isRemoving}
                          onClick={() => enr.clientRecord?.id && unenrollMutation.mutate(enr.clientRecord.id)}
                        >
                          {isRemoving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <><UserMinus className="h-3 w-3 mr-1" />Remove</>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                  {enrollData?.hasMore && (
                    <p className="text-xs text-center text-muted-foreground pt-1">More enrollments available — pagination coming soon.</p>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PBProgramsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [afterId, setAfterId] = useState<string | undefined>();
  const [history, setHistory] = useState<string[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<PBProgram | null>(null);

  const { data, isLoading, error, refetch } = useQuery<PBListResponse<PBProgram>>({
    queryKey: ["/api/practicebetter/programs", afterId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (afterId) params.set("after_id", afterId);
      const r = await fetch(`/api/practicebetter/programs?${params}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.items ?? [];
  const filtered = items.filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const name = (p.name ?? p.title ?? "").toLowerCase();
    const type = (p.type ?? p.category ?? "").toLowerCase();
    const desc = (p.description ?? "").toLowerCase();
    return name.includes(q) || type.includes(q) || desc.includes(q);
  });

  const goNext = useCallback(() => {
    if (items.length > 0) {
      setHistory((h) => [...h, afterId ?? ""]);
      setAfterId(items[items.length - 1].id);
    }
  }, [items, afterId]);

  const goPrev = useCallback(() => {
    const p = [...history];
    const prev = p.pop();
    setHistory(p);
    setAfterId(prev || undefined);
  }, [history]);

  return (
    <AdminLayout currentTab="practitioner">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/practitioner")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="h-10 w-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Programs & Courses</h1>
              <p className="text-sm text-muted-foreground">Client wellness programs and training courses</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search programs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
              <p className="font-semibold text-red-700">Failed to load programs</p>
              <p className="text-sm text-red-600">{String(error)}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-3">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="font-semibold text-muted-foreground">
                {search ? "No programs match your search" : "No programs found"}
              </p>
              <p className="text-sm text-muted-foreground">Programs and courses from PracticeBetter will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((prog) => {
              const name = prog.name ?? prog.title ?? "Untitled Program";
              const isActive = prog.isActive !== false && prog.status !== "inactive";
              const enrollCount = prog.enrollmentCount ?? prog.clientCount;
              const date = prog.dateCreated ?? prog.createdAt;

              return (
                <Card
                  key={prog.id}
                  className="hover:shadow-md transition-all border-pink-100 hover:border-pink-300 cursor-pointer group"
                  onClick={() => setSelectedProgram(prog)}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-tight group-hover:text-pink-700 transition-colors">{name}</p>
                          {(prog.type ?? prog.category) && (
                            <p className="text-xs text-muted-foreground capitalize">{String(prog.type ?? prog.category)}</p>
                          )}
                        </div>
                      </div>
                      <Badge className={isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}>
                        {isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {prog.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{String(prog.description)}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-pink-50">
                      {enrollCount !== undefined && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" /> {enrollCount} enrolled
                        </span>
                      )}
                      {prog.duration !== undefined && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {prog.duration}
                        </span>
                      )}
                      {date && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                          <Calendar className="h-3 w-3" /> {fmtDate(date)}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-pink-500 ml-auto font-medium group-hover:text-pink-700">
                        View <ChevronRight className="h-3 w-3" />
                      </span>
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
            <span>{filtered.length} program{filtered.length !== 1 ? "s" : ""} shown</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goPrev} disabled={history.length === 0}>← Prev</Button>
              <Button variant="outline" size="sm" onClick={goNext} disabled={!data?.hasMore}>Next →</Button>
            </div>
          </div>
        )}
      </div>

      {/* Program detail modal */}
      {selectedProgram && (
        <ProgramDetailModal
          program={selectedProgram}
          onClose={() => setSelectedProgram(null)}
        />
      )}
    </AdminLayout>
  );
}
