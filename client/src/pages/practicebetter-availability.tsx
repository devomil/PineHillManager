import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, RefreshCw, Calendar, Clock, ChevronLeft, ChevronRight, Plus, Search, X,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  format, addDays, subDays, parseISO,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isWithinInterval, isValid,
} from "date-fns";

interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  consultant_id?: string;
  consultant_name?: string;
  service_id?: string;
}

// Exact PracticeBetter session shape from live API
interface Session {
  id: string;
  clientRecord?: {
    id?: string;
    profile?: { firstName?: string; lastName?: string; emailAddress?: string };
    isActive?: boolean;
  };
  clientConfirmationStatus?: string;
  consultant?: {
    id?: string;
    profile?: { firstName?: string; lastName?: string };
  };
  service?: { id?: string; name?: string };
  sessionDate?: string;
  endDate?: string;
  cancelled?: boolean;
  upcoming?: boolean;
  confirmationStatus?: string;
  serviceType?: string;
  duration?: number;
  [key: string]: unknown;
}

interface PBService {
  id: string;
  name: string;
  duration?: number;
}

interface BookSessionForm {
  client_id: string;
  service_id: string;
  start_time: string;
  consultant_id: string;
  notes: string;
}

interface PBListResponse<T> {
  count?: number;
  hasMore?: boolean;
  items: T[];
}

const ALL = "__all__";

export default function PBAvailabilityPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Slots tab state
  const [selectedDay, setSelectedDay] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [slotsConsultantId, setSlotsConsultantId] = useState<string>("");
  const [slotsServiceId, setSlotsServiceId] = useState<string>("");

  // Sessions pagination state
  const [sessionAfter, setSessionAfter] = useState<string | undefined>();
  const [sessionHistory, setSessionHistory] = useState<string[]>([]);

  // Sessions filter state
  const [filterClient, setFilterClient] = useState("");
  const [filterConsultant, setFilterConsultant] = useState(ALL);
  const [filterService, setFilterService] = useState(ALL);
  const [filterStatus, setFilterStatus] = useState(ALL);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Book dialog state
  const [bookOpen, setBookOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [bookForm, setBookForm] = useState<BookSessionForm>({
    client_id: "", service_id: "", start_time: "", consultant_id: "", notes: "",
  });

  // ─── Data fetching ───────────────────────────────────────────────────────────

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useQuery<PBListResponse<Session>>({
    queryKey: ["/api/practicebetter/sessions", sessionAfter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sessionAfter) params.set("after_id", sessionAfter);
      const res = await fetch(`/api/practicebetter/sessions?${params}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const { data: servicesData } = useQuery<PBListResponse<PBService>>({
    queryKey: ["/api/practicebetter/services"],
    queryFn: async () => {
      const res = await fetch("/api/practicebetter/services");
      if (!res.ok) return { items: [] };
      return res.json();
    },
  });

  const services: PBService[] = servicesData?.items ?? [];
  const sessions: Session[] = sessionsData?.items ?? [];

  // Unique consultants from loaded sessions
  const consultants = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sessions) {
      const id = s.consultant?.id;
      if (id) {
        const name = [s.consultant?.profile?.firstName, s.consultant?.profile?.lastName]
          .filter(Boolean).join(" ") || id;
        map.set(id, name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  // Unique services from loaded sessions (for the filter dropdown)
  const sessionServices = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sessions) {
      if (s.service?.id && s.service?.name) map.set(s.service.id, s.service.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  // ─── Availability slots ──────────────────────────────────────────────────────

  const slotsEnabled = Boolean(slotsConsultantId && slotsServiceId);
  const {
    data: slotsData,
    isLoading: slotsLoading,
    error: slotsError,
    refetch: refetchSlots,
  } = useQuery<AvailabilitySlot[]>({
    queryKey: ["/api/practicebetter/availability/slots", selectedDay, slotsConsultantId, slotsServiceId],
    enabled: slotsEnabled,
    queryFn: async () => {
      const params = new URLSearchParams({
        day: selectedDay,
        as_consultant: slotsConsultantId,
        serviceId: slotsServiceId,
      });
      const res = await fetch(`/api/practicebetter/availability/slots?${params}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const slots: AvailabilitySlot[] = Array.isArray(slotsData) ? slotsData : [];

  // ─── Book mutation ───────────────────────────────────────────────────────────

  const bookMutation = useMutation({
    mutationFn: async (payload: BookSessionForm) =>
      apiRequest("POST", "/api/practicebetter/sessions", {
        client_id: payload.client_id || undefined,
        service_id: payload.service_id || undefined,
        start_time: payload.start_time,
        consultant_id: payload.consultant_id || undefined,
        notes: payload.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practicebetter/sessions"] });
      toast({ title: "Session Booked", description: "The session has been successfully booked." });
      setBookOpen(false);
      setSelectedSlot(null);
      setBookForm({ client_id: "", service_id: "", start_time: "", consultant_id: "", notes: "" });
      refetchSessions();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to book session. Please try again.", variant: "destructive" });
    },
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const openBook = (slot?: AvailabilitySlot) => {
    setSelectedSlot(slot ?? null);
    setBookForm({
      client_id: "",
      service_id: slot?.service_id ?? slotsServiceId,
      start_time: slot?.start_time ?? "",
      consultant_id: slot?.consultant_id ?? slotsConsultantId,
      notes: "",
    });
    setBookOpen(true);
  };

  const formatTime = (s?: string) => {
    if (!s) return "—";
    try { return format(parseISO(s), "h:mm a"); } catch { return s; }
  };

  const formatDateTime = (s?: string) => {
    if (!s) return "—";
    try { return format(parseISO(s), "MMM d, yyyy h:mm a"); } catch { return s; }
  };

  const getSessionStatus = (s: Session): { label: string; color: string } => {
    if (s.cancelled) return { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200" };
    if (s.upcoming) return { label: "Upcoming", color: "bg-blue-100 text-blue-700 border-blue-200" };
    if (s.confirmationStatus === "confirmed") return { label: "Confirmed", color: "bg-green-100 text-green-700 border-green-200" };
    if (s.confirmationStatus === "unconfirmed") return { label: "Unconfirmed", color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    return { label: s.confirmationStatus ?? "—", color: "bg-gray-100 text-gray-700 border-gray-200" };
  };

  const clientName = (s: Session) => {
    const p = s.clientRecord?.profile;
    if (!p) return "—";
    return [p.firstName, p.lastName].filter(Boolean).join(" ") || "—";
  };

  const consultantName = (s: Session) => {
    const p = s.consultant?.profile;
    if (!p) return "—";
    return [p.firstName, p.lastName].filter(Boolean).join(" ") || "—";
  };

  // ─── Session filtering ────────────────────────────────────────────────────────

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Client search
      if (filterClient.trim()) {
        const name = clientName(s).toLowerCase();
        if (!name.includes(filterClient.toLowerCase())) return false;
      }
      // Consultant
      if (filterConsultant !== ALL && s.consultant?.id !== filterConsultant) return false;
      // Service
      if (filterService !== ALL && s.service?.id !== filterService) return false;
      // Status
      if (filterStatus !== ALL) {
        const status = getSessionStatus(s).label.toLowerCase();
        if (status !== filterStatus.toLowerCase()) return false;
      }
      // Date range
      if (filterDateFrom || filterDateTo) {
        if (!s.sessionDate) return false;
        try {
          const sessionDt = parseISO(s.sessionDate);
          if (filterDateFrom) {
            const from = parseISO(filterDateFrom);
            if (isValid(from) && sessionDt < from) return false;
          }
          if (filterDateTo) {
            const to = parseISO(filterDateTo + "T23:59:59");
            if (isValid(to) && sessionDt > to) return false;
          }
        } catch {
          return false;
        }
      }
      return true;
    });
  }, [sessions, filterClient, filterConsultant, filterService, filterStatus, filterDateFrom, filterDateTo]);

  const activeFilterCount = [
    filterClient.trim() !== "",
    filterConsultant !== ALL,
    filterService !== ALL,
    filterStatus !== ALL,
    filterDateFrom !== "",
    filterDateTo !== "",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterClient("");
    setFilterConsultant(ALL);
    setFilterService(ALL);
    setFilterStatus(ALL);
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const setThisWeek = () => {
    const now = new Date();
    setFilterDateFrom(format(startOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd"));
    setFilterDateTo(format(endOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd"));
  };

  const setThisMonth = () => {
    const now = new Date();
    setFilterDateFrom(format(startOfMonth(now), "yyyy-MM-dd"));
    setFilterDateTo(format(endOfMonth(now), "yyyy-MM-dd"));
  };

  // Pagination
  const sessionNext = () => {
    if (sessionsData?.items?.length) {
      const lastId = sessionsData.items[sessionsData.items.length - 1].id;
      setSessionHistory((h) => [...h, sessionAfter ?? ""]);
      setSessionAfter(lastId);
    }
  };

  const sessionPrev = () => {
    const prev = [...sessionHistory];
    const prevId = prev.pop() || undefined;
    setSessionHistory(prev);
    setSessionAfter(prevId);
  };

  const prevDay = () => setSelectedDay(format(subDays(new Date(selectedDay), 1), "yyyy-MM-dd"));
  const nextDay = () => setSelectedDay(format(addDays(new Date(selectedDay), 1), "yyyy-MM-dd"));

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <AdminLayout currentTab="practitioner">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/practitioner")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Consultant Availability</h1>
              <p className="text-muted-foreground text-sm">View slots and manage sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={() => openBook()}>
              <Plus className="h-4 w-4 mr-2" /> Book Session
            </Button>
            <Button variant="outline" size="sm" onClick={() => { refetchSlots(); refetchSessions(); }}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        <Tabs defaultValue="sessions">
          <TabsList>
            <TabsTrigger value="slots">
              <Clock className="h-4 w-4 mr-2" /> Available Slots
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <Calendar className="h-4 w-4 mr-2" /> Sessions
            </TabsTrigger>
          </TabsList>

          {/* ── Available Slots ── */}
          <TabsContent value="slots" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle>Available Slots</CardTitle>
                    <CardDescription>Select a consultant and service, then browse open slots</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={prevDay}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Input
                      type="date"
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="w-40"
                    />
                    <Button variant="outline" size="sm" onClick={nextDay}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Consultant</Label>
                    <Select value={slotsConsultantId} onValueChange={setSlotsConsultantId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a consultant…" />
                      </SelectTrigger>
                      <SelectContent>
                        {consultants.length === 0
                          ? <SelectItem value="__none__" disabled>No consultants loaded yet</SelectItem>
                          : consultants.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Service</Label>
                    <Select value={slotsServiceId} onValueChange={setSlotsServiceId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service…" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.length === 0
                          ? <SelectItem value="__none__" disabled>Loading services…</SelectItem>
                          : services.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!slotsEnabled ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    Select a consultant and service above to view available slots.
                  </div>
                ) : slotsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading availability slots…</div>
                ) : slotsError ? (
                  <div className="py-8 text-center text-red-500 text-sm">Failed to load slots. Check PracticeBetter connection.</div>
                ) : slots.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No available slots for {format(new Date(selectedDay), "MMMM d, yyyy")}.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {slots.map((slot, i) => (
                      <button
                        key={i}
                        onClick={() => openBook(slot)}
                        className="p-3 rounded-lg border-2 border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 text-center hover:border-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors group"
                      >
                        <div className="text-sm font-semibold text-green-700 dark:text-green-400">
                          {formatTime(slot.start_time)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">to {formatTime(slot.end_time)}</div>
                        {slot.consultant_name && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">{slot.consultant_name}</div>
                        )}
                        <div className="text-xs text-green-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to book</div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Sessions ── */}
          <TabsContent value="sessions" className="mt-4 space-y-4">

            {/* Filter bar */}
            <Card className="border-dashed">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap items-end gap-3">
                  {/* Client search */}
                  <div className="flex-1 min-w-[160px] space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search name…"
                        value={filterClient}
                        onChange={(e) => setFilterClient(e.target.value)}
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Consultant */}
                  <div className="min-w-[160px] space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Consultant</Label>
                    <Select value={filterConsultant} onValueChange={setFilterConsultant}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All consultants" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>All consultants</SelectItem>
                        {consultants.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Service */}
                  <div className="min-w-[180px] space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Service</Label>
                    <Select value={filterService} onValueChange={setFilterService}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All services" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>All services</SelectItem>
                        {sessionServices.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="min-w-[140px] space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>All statuses</SelectItem>
                        <SelectItem value="Upcoming">Upcoming</SelectItem>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                        <SelectItem value="Unconfirmed">Unconfirmed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date range */}
                  <div className="flex-1 min-w-[280px] space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date Range</Label>
                      <div className="flex gap-1">
                        <button
                          onClick={setThisWeek}
                          className="text-[11px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground font-medium transition-colors"
                        >
                          This week
                        </button>
                        <button
                          onClick={setThisMonth}
                          className="text-[11px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground font-medium transition-colors"
                        >
                          This month
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="h-9 text-sm"
                      />
                      <span className="text-muted-foreground text-xs">to</span>
                      <Input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Clear button */}
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                      Clear
                      <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px]">{activeFilterCount}</Badge>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sessions</CardTitle>
                    <CardDescription>
                      {activeFilterCount > 0
                        ? `${filteredSessions.length} of ${sessions.length} sessions match your filters`
                        : `${sessions.length} sessions`}
                    </CardDescription>
                  </div>
                  <Button variant="default" size="sm" onClick={() => openBook()}>
                    <Plus className="h-4 w-4 mr-2" /> Book Session
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {sessionsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading sessions…</div>
                ) : filteredSessions.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <p className="text-muted-foreground text-sm">
                      {activeFilterCount > 0 ? "No sessions match your filters." : "No sessions found."}
                    </p>
                    {activeFilterCount > 0 && (
                      <Button variant="link" size="sm" onClick={clearFilters} className="text-xs">
                        Clear all filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Consultant</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions.map((s) => {
                        const status = getSessionStatus(s);
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{clientName(s)}</TableCell>
                            <TableCell>{consultantName(s)}</TableCell>
                            <TableCell>{s.service?.name ?? "—"}</TableCell>
                            <TableCell className="text-sm">{formatDateTime(s.sessionDate)}</TableCell>
                            <TableCell className="text-sm">{formatDateTime(s.endDate)}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${status.color}`}>
                                {status.label}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={sessionPrev} disabled={sessionHistory.length === 0}>
                ← Previous page
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {sessionHistory.length + 1}
                {sessionsData?.hasMore ? "" : " (last page)"}
              </span>
              <Button variant="outline" size="sm" onClick={sessionNext} disabled={!sessionsData?.hasMore}>
                Next page →
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Book Session Dialog */}
      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book a Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedSlot && (
              <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm">
                <span className="font-semibold text-green-700 dark:text-green-400">Selected slot: </span>
                {formatTime(selectedSlot.start_time)} – {formatTime(selectedSlot.end_time)}
                {selectedSlot.consultant_name && ` with ${selectedSlot.consultant_name}`}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="book-start">Start Time</Label>
              <Input
                id="book-start"
                type="datetime-local"
                value={bookForm.start_time ? bookForm.start_time.slice(0, 16) : ""}
                onChange={(e) => setBookForm((f) => ({ ...f, start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="book-client">Client ID (optional)</Label>
              <Input
                id="book-client"
                placeholder="PracticeBetter client record ID"
                value={bookForm.client_id}
                onChange={(e) => setBookForm((f) => ({ ...f, client_id: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="book-service">Service ID (optional)</Label>
              <Input
                id="book-service"
                placeholder="PracticeBetter service ID"
                value={bookForm.service_id}
                onChange={(e) => setBookForm((f) => ({ ...f, service_id: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="book-consultant">Consultant ID (optional)</Label>
              <Input
                id="book-consultant"
                placeholder="PracticeBetter consultant ID"
                value={bookForm.consultant_id}
                onChange={(e) => setBookForm((f) => ({ ...f, consultant_id: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="book-notes">Notes</Label>
              <Input
                id="book-notes"
                placeholder="Optional session notes"
                value={bookForm.notes}
                onChange={(e) => setBookForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookOpen(false)}>Cancel</Button>
            <Button
              onClick={() => bookMutation.mutate(bookForm)}
              disabled={!bookForm.start_time || bookMutation.isPending}
            >
              {bookMutation.isPending ? "Booking…" : "Book Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
