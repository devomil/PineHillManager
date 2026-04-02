import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, RefreshCw, Search, CheckSquare, Calendar, User, Clock, AlertCircle } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";

interface PBTask {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  due_date?: string;
  assignedTo?: string;
  assigned_to?: string;
  consultant?: { profile?: { firstName?: string; lastName?: string } };
  createdAt?: string;
  dateCreated?: string;
  completedAt?: string;
  [key: string]: unknown;
}

interface PBListResponse {
  count?: number;
  hasMore?: boolean;
  items: PBTask[];
}

const fmtDate = (s?: string) => {
  if (!s) return "—";
  try { return format(parseISO(s), "MMM d, yyyy"); } catch { return s; }
};

const statusColor: Record<string, string> = {
  completed:   "bg-green-100 text-green-700 border-green-200",
  complete:    "bg-green-100 text-green-700 border-green-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  pending:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  overdue:     "bg-red-100 text-red-700 border-red-200",
  cancelled:   "bg-gray-100 text-gray-600 border-gray-200",
};

const priorityColor: Record<string, string> = {
  high:   "text-red-600",
  medium: "text-yellow-600",
  low:    "text-green-600",
  urgent: "text-red-700 font-bold",
};

export default function PBTasksPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [afterId, setAfterId] = useState<string | undefined>();
  const [history, setHistory] = useState<string[]>([]);

  const { data, isLoading, error, refetch } = useQuery<PBListResponse>({
    queryKey: ["/api/practicebetter/tasks", afterId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (afterId) params.set("after_id", afterId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const r = await fetch(`/api/practicebetter/tasks?${params}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.items ?? [];
  const filtered = items.filter((t) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const title = (t.title ?? t.name ?? "").toLowerCase();
    const desc = (t.description ?? "").toLowerCase();
    return title.includes(q) || desc.includes(q);
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

  return (
    <AdminLayout currentTab="practitioner">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/practitioner")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tasks</h1>
              <p className="text-sm text-muted-foreground">Client & practitioner task management</p>
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
            <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
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
              <p className="font-semibold text-red-700">Failed to load tasks</p>
              <p className="text-sm text-red-600">{String(error)}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-3">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="font-semibold text-muted-foreground">
                {search || statusFilter !== "all" ? "No tasks match your filters" : "No tasks found"}
              </p>
              <p className="text-sm text-muted-foreground">Tasks from PracticeBetter will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => {
              const title = task.title ?? task.name ?? "Untitled Task";
              const dueDate = task.dueDate ?? task.due_date;
              const status = (task.status ?? "pending").toLowerCase();
              const priority = (task.priority ?? "").toLowerCase();
              const isOverdue = dueDate && !["completed", "complete", "cancelled"].includes(status) && isPast(parseISO(dueDate));
              const assignee = task.consultant?.profile
                ? [task.consultant.profile.firstName, task.consultant.profile.lastName].filter(Boolean).join(" ")
                : (task.assignedTo ?? task.assigned_to ?? null);

              return (
                <Card key={task.id} className={`hover:shadow-md transition-shadow ${isOverdue ? "border-red-200 bg-red-50/30" : "border-indigo-100 hover:border-indigo-200"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isOverdue ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"}`}>
                        <CheckSquare className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-semibold text-sm">{title}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            {priority && (
                              <span className={`text-xs font-medium ${priorityColor[priority] ?? "text-muted-foreground"}`}>
                                {priority.charAt(0).toUpperCase() + priority.slice(1)}
                              </span>
                            )}
                            <Badge className={`text-xs ${statusColor[status] ?? "bg-gray-100 text-gray-600"}`}>
                              {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </Badge>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{String(task.description)}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                          {assignee && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" /> {assignee}
                            </span>
                          )}
                          {dueDate && (
                            <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                              <Clock className="h-3 w-3" /> Due {fmtDate(dueDate)}
                              {isOverdue && " (overdue)"}
                            </span>
                          )}
                          {task.createdAt || task.dateCreated ? (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" /> Created {fmtDate((task.dateCreated ?? task.createdAt) as string)}
                            </span>
                          ) : null}
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
            <span>{filtered.length} task{filtered.length !== 1 ? "s" : ""} shown</span>
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
