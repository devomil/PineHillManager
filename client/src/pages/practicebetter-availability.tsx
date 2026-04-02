import { useState, useMemo } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
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
  ArrowLeft, RefreshCw, Calendar, Clock, ChevronLeft, ChevronRight,
  Plus, Search, X, CalendarDays, LayoutGrid,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  format, addDays, subDays, parseISO, isValid,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks,
  addMonths, subMonths, eachDayOfInterval, isSameDay, isSameMonth,
  getHours, getMinutes,
} from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AvailabilitySlot {
  start_time: string | null;
  end_time: string | null;
  consultant_id?: string;
  consultant_name?: string;
  service_id?: string;
  duration?: number;
}

interface Session {
  id: string;
  clientRecord?: { profile?: { firstName?: string; lastName?: string } };
  consultant?: { id?: string; profile?: { firstName?: string; lastName?: string } };
  service?: { id?: string; name?: string };
  sessionDate?: string;
  endDate?: string;
  cancelled?: boolean;
  upcoming?: boolean;
  confirmationStatus?: string;
  [key: string]: unknown;
}

interface PBService { id: string; name: string; duration?: number }
interface PBListResponse<T> { count?: number; hasMore?: boolean; items: T[] }

interface BookSessionForm {
  client_id: string; service_id: string; start_time: string; consultant_id: string; notes: string;
}

type SlotView = "day" | "week" | "month";
const ALL = "__all__";

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtTime = (s?: string | null) => {
  if (!s) return null;
  try { const d = parseISO(s); return isValid(d) ? format(d, "h:mm a") : null; } catch { return null; }
};
const fmtDateTime = (s?: string) => {
  if (!s) return "—";
  try { return format(parseISO(s), "MMM d, yyyy h:mm a"); } catch { return s; }
};
const safeDate = (s?: string | null) => {
  if (!s) return null;
  try { const d = parseISO(s); return isValid(d) ? d : null; } catch { return null; }
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function PBAvailabilityPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Slots state
  const [slotView, setSlotView] = useState<SlotView>("week");
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [slotsConsultantId, setSlotsConsultantId] = useState<string>("");
  const [slotsServiceId, setSlotsServiceId] = useState<string>("");
  const [selectedMonthDay, setSelectedMonthDay] = useState<Date | null>(null);

  // ── Sessions state
  const [sessionAfter, setSessionAfter] = useState<string | undefined>();
  const [sessionHistory, setSessionHistory] = useState<string[]>([]);
  const [filterClient, setFilterClient] = useState("");
  const [filterConsultant, setFilterConsultant] = useState(ALL);
  const [filterService, setFilterService] = useState(ALL);
  const [filterStatus, setFilterStatus] = useState(ALL);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // ── Book state
  const [bookOpen, setBookOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [bookForm, setBookForm] = useState<BookSessionForm>({
    client_id: "", service_id: "", start_time: "", consultant_id: "", notes: "",
  });

  // ── Data fetching ─────────────────────────────────────────────────────────────

  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } =
    useQuery<PBListResponse<Session>>({
      queryKey: ["/api/practicebetter/sessions", sessionAfter],
      queryFn: async () => {
        const p = new URLSearchParams();
        if (sessionAfter) p.set("after_id", sessionAfter);
        const r = await fetch(`/api/practicebetter/sessions?${p}`);
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      },
    });

  const { data: servicesData } = useQuery<PBListResponse<PBService>>({
    queryKey: ["/api/practicebetter/services"],
    queryFn: async () => {
      const r = await fetch("/api/practicebetter/services");
      if (!r.ok) return { items: [] };
      return r.json();
    },
  });

  const services: PBService[] = servicesData?.items ?? [];
  const sessions: Session[] = sessionsData?.items ?? [];

  const consultants = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sessions) {
      const id = s.consultant?.id;
      if (id) m.set(id, [s.consultant?.profile?.firstName, s.consultant?.profile?.lastName].filter(Boolean).join(" ") || id);
    }
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  const sessionServices = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sessions) { if (s.service?.id && s.service?.name) m.set(s.service.id, s.service.name); }
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  // Days to fetch for the current view
  const fetchDays = useMemo<Date[]>(() => {
    if (slotView === "day") return [anchorDate];
    if (slotView === "week") {
      const start = startOfWeek(anchorDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    }
    // month: all days in month
    return eachDayOfInterval({ start: startOfMonth(anchorDate), end: endOfMonth(anchorDate) });
  }, [slotView, anchorDate]);

  // Parallel slot queries — one per day in the view
  const slotsEnabled = Boolean(slotsConsultantId && slotsServiceId);
  const slotQueries = useQueries({
    queries: fetchDays.map((day) => ({
      queryKey: ["/api/practicebetter/availability/slots", format(day, "yyyy-MM-dd"), slotsConsultantId, slotsServiceId],
      enabled: slotsEnabled,
      queryFn: async () => {
        const p = new URLSearchParams({
          day: format(day, "yyyy-MM-dd"),
          as_consultant: slotsConsultantId,
          serviceId: slotsServiceId,
        });
        const r = await fetch(`/api/practicebetter/availability/slots?${p}`);
        if (!r.ok) return [];
        return r.json() as Promise<AvailabilitySlot[]>;
      },
      staleTime: 5 * 60 * 1000,
    })),
  });

  // Map: dateStr -> slot[]
  const slotsByDay = useMemo<Record<string, AvailabilitySlot[]>>(() => {
    const m: Record<string, AvailabilitySlot[]> = {};
    fetchDays.forEach((day, i) => {
      const key = format(day, "yyyy-MM-dd");
      const data = slotQueries[i]?.data;
      m[key] = Array.isArray(data) ? data : [];
    });
    return m;
  }, [fetchDays, slotQueries]);

  const slotsLoading = slotsEnabled && slotQueries.some((q) => q.isLoading);
  const totalSlots = Object.values(slotsByDay).flat().length;

  // ── Book mutation ──────────────────────────────────────────────────────────────

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
      toast({ title: "Session Booked", description: "Successfully booked." });
      setBookOpen(false);
      setSelectedSlot(null);
      setBookForm({ client_id: "", service_id: "", start_time: "", consultant_id: "", notes: "" });
      refetchSessions();
    },
    onError: () => toast({ title: "Error", description: "Failed to book session.", variant: "destructive" }),
  });

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

  // ── Navigation ────────────────────────────────────────────────────────────────

  const navigatePrev = () => {
    if (slotView === "day") setAnchorDate((d) => subDays(d, 1));
    else if (slotView === "week") setAnchorDate((d) => subWeeks(d, 1));
    else setAnchorDate((d) => subMonths(d, 1));
  };
  const navigateNext = () => {
    if (slotView === "day") setAnchorDate((d) => addDays(d, 1));
    else if (slotView === "week") setAnchorDate((d) => addWeeks(d, 1));
    else setAnchorDate((d) => addMonths(d, 1));
  };
  const navigateToday = () => setAnchorDate(new Date());

  const viewLabel = useMemo(() => {
    if (slotView === "day") return format(anchorDate, "MMMM d, yyyy");
    if (slotView === "week") {
      const start = startOfWeek(anchorDate, { weekStartsOn: 0 });
      const end = addDays(start, 6);
      return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    return format(anchorDate, "MMMM yyyy");
  }, [slotView, anchorDate]);

  // ── Session status/name helpers ───────────────────────────────────────────────

  const getStatus = (s: Session) => {
    if (s.cancelled) return { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200" };
    if (s.upcoming) return { label: "Upcoming", color: "bg-blue-100 text-blue-700 border-blue-200" };
    if (s.confirmationStatus === "confirmed") return { label: "Confirmed", color: "bg-green-100 text-green-700 border-green-200" };
    if (s.confirmationStatus === "unconfirmed") return { label: "Unconfirmed", color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    return { label: s.confirmationStatus ?? "—", color: "bg-gray-100 text-gray-700 border-gray-200" };
  };
  const clientName = (s: Session) => [s.clientRecord?.profile?.firstName, s.clientRecord?.profile?.lastName].filter(Boolean).join(" ") || "—";
  const consultantName = (s: Session) => [s.consultant?.profile?.firstName, s.consultant?.profile?.lastName].filter(Boolean).join(" ") || "—";

  // ── Session filtering ─────────────────────────────────────────────────────────

  const filteredSessions = useMemo(() => sessions.filter((s) => {
    if (filterClient.trim() && !clientName(s).toLowerCase().includes(filterClient.toLowerCase())) return false;
    if (filterConsultant !== ALL && s.consultant?.id !== filterConsultant) return false;
    if (filterService !== ALL && s.service?.id !== filterService) return false;
    if (filterStatus !== ALL && getStatus(s).label.toLowerCase() !== filterStatus.toLowerCase()) return false;
    if (filterDateFrom || filterDateTo) {
      if (!s.sessionDate) return false;
      try {
        const dt = parseISO(s.sessionDate);
        if (filterDateFrom && dt < parseISO(filterDateFrom)) return false;
        if (filterDateTo && dt > parseISO(filterDateTo + "T23:59:59")) return false;
      } catch { return false; }
    }
    return true;
  }), [sessions, filterClient, filterConsultant, filterService, filterStatus, filterDateFrom, filterDateTo]);

  const activeFilterCount = [filterClient.trim(), filterConsultant !== ALL, filterService !== ALL, filterStatus !== ALL, filterDateFrom, filterDateTo].filter(Boolean).length;
  const clearFilters = () => { setFilterClient(""); setFilterConsultant(ALL); setFilterService(ALL); setFilterStatus(ALL); setFilterDateFrom(""); setFilterDateTo(""); };
  const setThisWeek = () => { const n = new Date(); setFilterDateFrom(format(startOfWeek(n, { weekStartsOn: 0 }), "yyyy-MM-dd")); setFilterDateTo(format(endOfWeek(n, { weekStartsOn: 0 }), "yyyy-MM-dd")); };
  const setThisMonth = () => { const n = new Date(); setFilterDateFrom(format(startOfMonth(n), "yyyy-MM-dd")); setFilterDateTo(format(endOfMonth(n), "yyyy-MM-dd")); };

  // Session pagination
  const sessionNext = () => { if (sessionsData?.items?.length) { const lid = sessionsData.items.at(-1)!.id; setSessionHistory((h) => [...h, sessionAfter ?? ""]); setSessionAfter(lid); } };
  const sessionPrev = () => { const p = [...sessionHistory]; const pid = p.pop() || undefined; setSessionHistory(p); setSessionAfter(pid); };

  // ── Slot tile ──────────────────────────────────────────────────────────────────

  const SlotTile = ({ slot }: { slot: AvailabilitySlot }) => {
    const start = fmtTime(slot.start_time);
    const end = fmtTime(slot.end_time);
    if (!start) return null;
    return (
      <button
        onClick={() => openBook(slot)}
        className="w-full p-2 rounded-lg border-2 border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 text-left hover:border-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors group"
      >
        <div className="text-xs font-bold text-green-800 dark:text-green-300">{start}</div>
        {end && <div className="text-[11px] text-green-600 dark:text-green-500">to {end}</div>}
        {slot.duration && <div className="text-[11px] text-muted-foreground">{slot.duration} min</div>}
        <div className="text-[10px] text-green-500 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Book →</div>
      </button>
    );
  };

  // ── Day view ───────────────────────────────────────────────────────────────────

  const DayView = () => {
    const key = format(anchorDate, "yyyy-MM-dd");
    const slots = slotsByDay[key] ?? [];
    const loading = slotsEnabled && slotQueries[0]?.isLoading;
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">{format(anchorDate, "EEEE, MMMM d, yyyy")}</h3>
        {loading ? (
          <div className="py-6 text-center text-muted-foreground text-sm">Loading…</div>
        ) : slots.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No available slots on this day.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {slots.map((slot, i) => <SlotTile key={i} slot={slot} />)}
          </div>
        )}
      </div>
    );
  };

  // ── Week view ──────────────────────────────────────────────────────────────────

  const WeekView = () => {
    const weekStart = startOfWeek(anchorDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    const today = new Date();
    return (
      <div className="grid grid-cols-7 gap-1.5 min-w-[700px]">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const slots = slotsByDay[key] ?? [];
          const isToday = isSameDay(day, today);
          const qIdx = days.findIndex((d) => isSameDay(d, day));
          const loading = slotsEnabled && slotQueries[qIdx]?.isLoading;
          return (
            <div key={key} className={`flex flex-col rounded-xl border ${isToday ? "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20" : "border-border bg-muted/20"}`}>
              {/* Day header */}
              <div className={`px-2 py-2 text-center rounded-t-xl ${isToday ? "bg-blue-500 text-white" : "bg-muted/50"}`}>
                <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{format(day, "EEE")}</div>
                <div className={`text-lg font-bold leading-none mt-0.5 ${isToday ? "text-white" : ""}`}>{format(day, "d")}</div>
              </div>
              {/* Slots */}
              <div className="flex-1 p-1.5 space-y-1 min-h-[80px]">
                {loading ? (
                  <div className="text-[10px] text-center text-muted-foreground pt-2">…</div>
                ) : slots.length === 0 ? (
                  <div className="text-[10px] text-center text-muted-foreground pt-3 opacity-60">No slots</div>
                ) : slots.map((slot, i) => <SlotTile key={i} slot={slot} />)}
              </div>
              {slots.length > 0 && (
                <div className="px-2 pb-1.5 text-center">
                  <span className="text-[10px] font-medium text-green-600">{slots.length} slot{slots.length !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Month view ─────────────────────────────────────────────────────────────────

  const MonthView = () => {
    const monthStart = startOfMonth(anchorDate);
    const monthEnd = endOfMonth(anchorDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const calDays = eachDayOfInterval({ start: calStart, end: calEnd });
    const today = new Date();
    const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <div className="space-y-1">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1">
          {dayHeaders.map((h) => (
            <div key={h} className="text-center text-xs font-semibold text-muted-foreground py-1">{h}</div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const slots = slotsByDay[key] ?? [];
            const isToday = isSameDay(day, today);
            const inMonth = isSameMonth(day, anchorDate);
            const isSelected = selectedMonthDay && isSameDay(day, selectedMonthDay);
            const qIdx = fetchDays.findIndex((d) => isSameDay(d, day));
            const loading = slotsEnabled && qIdx >= 0 && slotQueries[qIdx]?.isLoading;
            // Sessions on this day
            const daySessions = sessions.filter((s) => s.sessionDate && isSameDay(parseISO(s.sessionDate), day));
            return (
              <button
                key={key}
                onClick={() => { setSelectedMonthDay(day); setAnchorDate(day); }}
                className={`
                  relative rounded-lg border p-1.5 min-h-[72px] text-left transition-colors
                  ${isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : isToday ? "border-blue-300 bg-blue-50/40" : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"}
                  ${!inMonth ? "opacity-40" : ""}
                `}
              >
                <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-blue-500 text-white" : ""}`}>
                  {format(day, "d")}
                </div>
                {loading && <div className="text-[9px] text-muted-foreground">…</div>}
                {!loading && slots.length > 0 && (
                  <div className="flex items-center gap-0.5 flex-wrap">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span className="text-[9px] text-green-700 font-semibold">{slots.length} open</span>
                  </div>
                )}
                {daySessions.length > 0 && (
                  <div className="flex items-center gap-0.5 flex-wrap mt-0.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    <span className="text-[9px] text-blue-600 font-semibold">{daySessions.length} session{daySessions.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {/* Selected day slot detail */}
        {selectedMonthDay && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{format(selectedMonthDay, "EEEE, MMMM d")}</h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedMonthDay(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {(() => {
              const key = format(selectedMonthDay, "yyyy-MM-dd");
              const slots = slotsByDay[key] ?? [];
              const qIdx = fetchDays.findIndex((d) => isSameDay(d, selectedMonthDay));
              const loading = slotsEnabled && qIdx >= 0 && slotQueries[qIdx]?.isLoading;
              return loading ? (
                <div className="text-sm text-muted-foreground">Loading slots…</div>
              ) : slots.length === 0 ? (
                <div className="text-sm text-muted-foreground">No available slots on this day.</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
                  {slots.map((slot, i) => <SlotTile key={i} slot={slot} />)}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <AdminLayout currentTab="practitioner">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
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
            <Button variant="outline" size="sm" onClick={() => { slotQueries.forEach((q) => q.refetch()); refetchSessions(); }}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        <Tabs defaultValue="slots">
          <TabsList>
            <TabsTrigger value="slots"><Clock className="h-4 w-4 mr-2" /> Available Slots</TabsTrigger>
            <TabsTrigger value="sessions"><Calendar className="h-4 w-4 mr-2" /> Sessions</TabsTrigger>
          </TabsList>

          {/* ── Available Slots Tab ── */}
          <TabsContent value="slots" className="mt-4 space-y-4">

            {/* Controls row */}
            <div className="flex flex-wrap items-end gap-3">
              {/* Consultant */}
              <div className="flex-1 min-w-[180px] space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Consultant</Label>
                <Select value={slotsConsultantId} onValueChange={setSlotsConsultantId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select consultant…" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultants.length === 0
                      ? <SelectItem value="__none__" disabled>Load sessions first</SelectItem>
                      : consultants.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Service */}
              <div className="flex-1 min-w-[200px] space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Service</Label>
                <Select value={slotsServiceId} onValueChange={setSlotsServiceId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select service…" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.length === 0
                      ? <SelectItem value="__none__" disabled>Loading…</SelectItem>
                      : services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Separator */}
              <div className="h-9 w-px bg-border hidden sm:block" />
              {/* View toggle */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">View</Label>
                <div className="flex rounded-md border overflow-hidden h-9">
                  {(["day", "week", "month"] as SlotView[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setSlotView(v)}
                      className={`px-3 text-sm font-medium capitalize transition-colors ${slotView === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              {/* Navigation */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Period</Label>
                <div className="flex items-center gap-1 h-9">
                  <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={navigatePrev}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 px-3 text-sm" onClick={navigateToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={navigateNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Period label + slot summary */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{viewLabel}</h2>
              {slotsEnabled && !slotsLoading && (
                <span className="text-sm text-muted-foreground">
                  {totalSlots > 0 ? `${totalSlots} available slot${totalSlots !== 1 ? "s" : ""}` : "No available slots"}
                </span>
              )}
            </div>

            {/* Calendar */}
            <Card>
              <CardContent className="pt-5 pb-5">
                {!slotsEnabled ? (
                  <div className="py-12 text-center space-y-2">
                    <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm">Select a consultant and service above to view available slots.</p>
                  </div>
                ) : (
                  <div className={slotView === "week" ? "overflow-x-auto" : ""}>
                    {slotView === "day" && <DayView />}
                    {slotView === "week" && <WeekView />}
                    {slotView === "month" && <MonthView />}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            {slotsEnabled && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-200 border border-green-400 inline-block" /> Available slot</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-green-500 inline-block" /> Open slots</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-blue-400 inline-block" /> Sessions booked</span>
              </div>
            )}
          </TabsContent>

          {/* ── Sessions Tab ── */}
          <TabsContent value="sessions" className="mt-4 space-y-4">
            {/* Filter bar */}
            <Card className="border-dashed">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[160px] space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input placeholder="Search name…" value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="pl-8 h-9 text-sm" />
                    </div>
                  </div>
                  <div className="min-w-[160px] space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Consultant</Label>
                    <Select value={filterConsultant} onValueChange={setFilterConsultant}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>All consultants</SelectItem>
                        {consultants.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-[180px] space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Service</Label>
                    <Select value={filterService} onValueChange={setFilterService}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>All services</SelectItem>
                        {sessionServices.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-[130px] space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>All statuses</SelectItem>
                        <SelectItem value="Upcoming">Upcoming</SelectItem>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                        <SelectItem value="Unconfirmed">Unconfirmed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[280px] space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date Range</Label>
                      <div className="flex gap-1">
                        <button onClick={setThisWeek} className="text-[11px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground font-medium">This week</button>
                        <button onClick={setThisMonth} className="text-[11px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground font-medium">This month</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="h-9 text-sm" />
                      <span className="text-muted-foreground text-xs">to</span>
                      <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-muted-foreground">
                      <X className="h-3.5 w-3.5" /> Clear
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{activeFilterCount}</Badge>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sessions table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sessions</CardTitle>
                    <CardDescription>
                      {activeFilterCount > 0 ? `${filteredSessions.length} of ${sessions.length} sessions match your filters` : `${sessions.length} sessions`}
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
                    <p className="text-muted-foreground text-sm">{activeFilterCount > 0 ? "No sessions match your filters." : "No sessions found."}</p>
                    {activeFilterCount > 0 && <Button variant="link" size="sm" className="text-xs" onClick={clearFilters}>Clear all filters</Button>}
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
                        const st = getStatus(s);
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{clientName(s)}</TableCell>
                            <TableCell>{consultantName(s)}</TableCell>
                            <TableCell>{s.service?.name ?? "—"}</TableCell>
                            <TableCell className="text-sm">{fmtDateTime(s.sessionDate)}</TableCell>
                            <TableCell className="text-sm">{fmtDateTime(s.endDate)}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${st.color}`}>{st.label}</span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={sessionPrev} disabled={sessionHistory.length === 0}>← Previous page</Button>
              <span className="text-sm text-muted-foreground">Page {sessionHistory.length + 1}{sessionsData?.hasMore ? "" : " (last page)"}</span>
              <Button variant="outline" size="sm" onClick={sessionNext} disabled={!sessionsData?.hasMore}>Next page →</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Book Session Dialog */}
      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Book a Session</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {selectedSlot && (
              <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 text-sm">
                <span className="font-semibold text-green-700">Selected slot: </span>
                {fmtTime(selectedSlot.start_time)} – {fmtTime(selectedSlot.end_time)}
                {selectedSlot.consultant_name && ` with ${selectedSlot.consultant_name}`}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="datetime-local" value={bookForm.start_time?.slice(0, 16) ?? ""} onChange={(e) => setBookForm((f) => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Client ID (optional)</Label>
              <Input placeholder="PracticeBetter client record ID" value={bookForm.client_id} onChange={(e) => setBookForm((f) => ({ ...f, client_id: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Service ID (optional)</Label>
              <Input placeholder="PracticeBetter service ID" value={bookForm.service_id} onChange={(e) => setBookForm((f) => ({ ...f, service_id: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Consultant ID (optional)</Label>
              <Input placeholder="PracticeBetter consultant ID" value={bookForm.consultant_id} onChange={(e) => setBookForm((f) => ({ ...f, consultant_id: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes" value={bookForm.notes} onChange={(e) => setBookForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookOpen(false)}>Cancel</Button>
            <Button onClick={() => bookMutation.mutate(bookForm)} disabled={!bookForm.start_time || bookMutation.isPending}>
              {bookMutation.isPending ? "Booking…" : "Book Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
