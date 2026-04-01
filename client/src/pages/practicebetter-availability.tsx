import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, subDays, parseISO } from "date-fns";

interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  consultant_id?: string;
  consultant_name?: string;
  service_id?: string;
}

interface Session {
  id: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  client_name?: string;
  consultant_name?: string;
  service_name?: string;
  notes?: string;
}

interface PBListResponse<T> {
  data: T[];
  has_more?: boolean;
}

export default function PBAvailabilityPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [sessionAfter, setSessionAfter] = useState<string | undefined>();
  const [sessionHistory, setSessionHistory] = useState<string[]>([]);

  const {
    data: slotsData,
    isLoading: slotsLoading,
    error: slotsError,
    refetch: refetchSlots,
  } = useQuery<AvailabilitySlot[]>({
    queryKey: ["/api/practicebetter/availability/slots", selectedDay],
    queryFn: async () => {
      const params = new URLSearchParams({ day: selectedDay });
      const res = await fetch(`/api/practicebetter/availability/slots?${params}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

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

  const slots: AvailabilitySlot[] = Array.isArray(slotsData) ? slotsData : [];
  const sessions: Session[] = sessionsData?.data ?? [];

  const formatTime = (s?: string) => {
    if (!s) return "—";
    try { return format(parseISO(s), "h:mm a"); } catch { return s; }
  };

  const formatDateTime = (s?: string) => {
    if (!s) return "—";
    try { return format(parseISO(s), "MMM d, yyyy h:mm a"); } catch { return s; }
  };

  const sessionNext = () => {
    if (sessionsData?.data?.length) {
      const lastId = sessionsData.data[sessionsData.data.length - 1].id;
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

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "booked": case "confirmed": return "bg-green-100 text-green-700 border-green-200";
      case "cancelled": return "bg-red-100 text-red-700 border-red-200";
      case "pending": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
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
              <h1 className="text-2xl font-bold">Consultant Availability</h1>
              <p className="text-muted-foreground text-sm">View slots and manage sessions</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetchSlots(); refetchSessions(); }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        <Tabs defaultValue="slots">
          <TabsList>
            <TabsTrigger value="slots">
              <Clock className="h-4 w-4 mr-2" /> Available Slots
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <Calendar className="h-4 w-4 mr-2" /> Sessions
            </TabsTrigger>
          </TabsList>

          {/* Availability Slots */}
          <TabsContent value="slots" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Available Slots</CardTitle>
                    <CardDescription>Open appointment slots from PracticeBetter</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
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
              </CardHeader>
              <CardContent>
                {slotsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading availability slots...</div>
                ) : slotsError ? (
                  <div className="py-8 text-center text-red-500 text-sm">Failed to load slots. Check PracticeBetter connection.</div>
                ) : slots.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No available slots for {format(new Date(selectedDay), "MMMM d, yyyy")}.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {slots.map((slot, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg border-2 border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 text-center"
                      >
                        <div className="text-sm font-semibold text-green-700 dark:text-green-400">
                          {formatTime(slot.start_time)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          to {formatTime(slot.end_time)}
                        </div>
                        {slot.consultant_name && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">{slot.consultant_name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions list */}
          <TabsContent value="sessions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Sessions</CardTitle>
                <CardDescription>All scheduled and past sessions</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {sessionsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading sessions...</div>
                ) : sessions.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No sessions found.</div>
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
                      {sessions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.client_name ?? "—"}</TableCell>
                          <TableCell>{s.consultant_name ?? "—"}</TableCell>
                          <TableCell>{s.service_name ?? "—"}</TableCell>
                          <TableCell className="text-sm">{formatDateTime(s.start_time)}</TableCell>
                          <TableCell className="text-sm">{formatDateTime(s.end_time)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(s.status)}`}>
                              {s.status ?? "—"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <div className="flex items-center justify-between mt-4">
              <Button variant="outline" size="sm" onClick={sessionPrev} disabled={sessionHistory.length === 0}>
                ← Previous
              </Button>
              <span className="text-sm text-muted-foreground">{sessions.length} sessions</span>
              <Button variant="outline" size="sm" onClick={sessionNext} disabled={!sessionsData?.has_more}>
                Next →
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
