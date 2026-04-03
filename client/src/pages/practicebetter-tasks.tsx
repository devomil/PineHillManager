import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, RefreshCw, Search, CheckSquare, Calendar, User, Clock, AlertCircle, FileText, Tag, Hash, ExternalLink } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";

interface PBTask {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  notes?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  due_date?: string;
  dueAt?: string;
  assignedTo?: string;
  assigned_to?: string;
  consultant?: { id?: string; profile?: { firstName?: string; lastName?: string } };
  clientRecord?: { id?: string; profile?: { firstName?: string; lastName?: string; emailAddress?: string } };
  client?: { id?: string; firstName?: string; lastName?: string; email?: string };
  createdAt?: string;
  dateCreated?: string;
  completedAt?: string;
  updatedAt?: string;
  type?: string;
  category?: string;
  tags?: string[];
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

const fmtDateTime = (s?: string) => {
  if (!s) return "—";
  try { return format(parseISO(s), "MMM d, yyyy 'at' h:mm a"); } catch { return s; }
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

function getConsulantName(task: PBTask): string | null {
  if (task.consultant?.profile) {
    return [task.consultant.profile.firstName, task.consultant.profile.lastName].filter(Boolean).join(" ") || null;
  }
  return (task.assignedTo ?? task.assigned_to ?? null) as string | null;
}

function getClientName(task: PBTask): string | null {
  if (task.clientRecord?.profile) {
    return [task.clientRecord.profile.firstName, task.clientRecord.profile.lastName].filter(Boolean).join(" ") || null;
  }
  if (task.client) {
    return [task.client.firstName, task.client.lastName].filter(Boolean).join(" ") || null;
  }
  return null;
}

function getDueDate(task: PBTask): string | undefined {
  return task.dueDate ?? task.due_date ?? task.dueAt;
}

// ── Detail Modal ────────────────────────────────────────────────────────────

function TaskDetailModal({ task, onClose }: { task: PBTask; onClose: () => void }) {
  const title = task.title ?? task.name ?? "Untitled Task";
  const dueDate = getDueDate(task);
  const status = (task.status ?? "pending").toLowerCase();
  const priority = (task.priority ?? "").toLowerCase();
  const isOverdue = dueDate && !["completed", "complete", "cancelled"].includes(status) && isPast(parseISO(dueDate));
  const assignee = getConsulantName(task);
  const clientName = getClientName(task);
  const clientEmail = task.clientRecord?.profile?.emailAddress ?? (task.client as any)?.email ?? null;

  const DetailRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) =>
    value ? (
      <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{value}</p>
        </div>
      </div>
    ) : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-start gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isOverdue ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"}`}>
              <CheckSquare className="h-4 w-4" />
            </div>
            <span className="text-base font-bold leading-snug">{title}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">Task detail for {title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            <Badge className={`text-xs ${statusColor[status] ?? "bg-gray-100 text-gray-600"}`}>
              {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </Badge>
            {priority && (
              <Badge variant="outline" className={`text-xs ${priorityColor[priority] ?? ""}`}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
              </Badge>
            )}
            {isOverdue && (
              <Badge className="text-xs bg-red-100 text-red-700 border-red-200">Overdue</Badge>
            )}
            {task.type && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {String(task.type)}
              </Badge>
            )}
          </div>

          {/* Detail grid */}
          <div className="space-y-3">
            {assignee && <DetailRow icon={User} label="Assigned To" value={assignee} />}
            {clientName && (
              <DetailRow
                icon={User}
                label="Client"
                value={clientEmail ? `${clientName} — ${clientEmail}` : clientName}
              />
            )}
            {dueDate && (
              <DetailRow
                icon={Clock}
                label="Due Date"
                value={
                  <span className={isOverdue ? "text-red-600 font-semibold" : undefined}>
                    {fmtDate(dueDate)}{isOverdue ? " (overdue)" : ""}
                  </span>
                }
              />
            )}
            {(task.dateCreated ?? task.createdAt) && (
              <DetailRow icon={Calendar} label="Created" value={fmtDateTime((task.dateCreated ?? task.createdAt) as string)} />
            )}
            {task.completedAt && (
              <DetailRow icon={Calendar} label="Completed" value={fmtDateTime(task.completedAt)} />
            )}
            {task.category && (
              <DetailRow icon={Tag} label="Category" value={String(task.category)} />
            )}
            {task.id && (
              <DetailRow icon={Hash} label="Task ID" value={task.id} />
            )}
          </div>

          {/* Description / notes */}
          {(task.description || task.notes) && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes / Description</p>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-slate-800 border p-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {String(task.description ?? task.notes)}
              </div>
            </div>
          )}

          {/* Raw extra fields (collapsed) */}
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none">
              Show all fields
            </summary>
            <pre className="mt-2 text-xs bg-gray-50 dark:bg-slate-900 border rounded-lg p-3 overflow-auto max-h-48 text-gray-700 dark:text-gray-300">
              {JSON.stringify(task, null, 2)}
            </pre>
          </details>

          {/* PracticeBetter action footer */}
          <div className="pt-3 border-t flex flex-wrap items-center gap-2">
            {task.clientRecord?.id ? (
              <>
                <Button
                  asChild
                  className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  <a
                    href={`https://app.practicebetter.io/clients/${task.clientRecord.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Client in PracticeBetter
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <a
                    href="https://app.practicebetter.io/tasks"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    All Tasks in PB
                  </a>
                </Button>
              </>
            ) : (
              <Button
                asChild
                className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                <a
                  href="https://app.practicebetter.io/tasks"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in PracticeBetter
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PBTasksPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [practitionerFilter, setPractitionerFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<PBTask | null>(null);

  const { data, isLoading, error, refetch } = useQuery<PBListResponse>({
    queryKey: ["/api/practicebetter/tasks", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const r = await fetch(`/api/practicebetter/tasks?${params}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Also fetch the full consultant list (may include practitioners with 0 tasks)
  const { data: consultantsData } = useQuery<{ items: { id: string; name: string }[] }>({
    queryKey: ["/api/practicebetter/consultants"],
    staleTime: 10 * 60 * 1000,
  });

  const items = data?.items ?? [];

  // Derive unique practitioner names from tasks + the consultant list
  const practitionersFromTasks = Array.from(
    new Map(
      items
        .map((t) => {
          const id = t.consultant?.id ?? "";
          const name = getConsulantName(t) ?? "";
          return id && name ? [id, name] as [string, string] : null;
        })
        .filter((x): x is [string, string] => x !== null)
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  const consultantsFromAPI = consultantsData?.items ?? [];

  // Merge both, dedup by id
  const allPractitioners = Array.from(
    new Map([
      ...practitionersFromTasks.map(p => [p.id, p.name] as [string, string]),
      ...consultantsFromAPI.map(p => [p.id, p.name] as [string, string]),
    ]).entries()
  )
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filtered = items.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || (() => {
      const title = (t.title ?? t.name ?? "").toLowerCase();
      const desc = (t.description ?? t.notes ?? "").toLowerCase();
      const assignee = (getConsulantName(t) ?? "").toLowerCase();
      const client = (getClientName(t) ?? "").toLowerCase();
      return title.includes(q) || desc.includes(q) || assignee.includes(q) || client.includes(q);
    })();
    const matchesPractitioner = practitionerFilter === "all" ||
      (t.consultant?.id === practitionerFilter) ||
      (getConsulantName(t) === practitionerFilter);
    return matchesSearch && matchesPractitioner;
  });

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
              <p className="text-sm text-muted-foreground">Client &amp; practitioner task management</p>
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
            <Input
              placeholder="Search tasks, client, practitioner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* Practitioner filter — options derived from loaded tasks + consultants API */}
          <Select value={practitionerFilter} onValueChange={setPractitionerFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Practitioners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Practitioners</SelectItem>
              {allPractitioners.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {/* Task count summary */}
        {!isLoading && !error && items.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
            <span className="font-semibold text-foreground">{items.length}</span> task{items.length !== 1 ? "s" : ""}
            {practitionerFilter !== "all" && (
              <> for <span className="font-semibold text-foreground">
                {allPractitioners.find(p => p.id === practitionerFilter)?.name ?? practitionerFilter}
              </span></>
            )}
            {search ? " matching search" : ""}
          </p>
        )}

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
                {practitionerFilter !== "all"
                  ? `No tasks found for ${allPractitioners.find(p => p.id === practitionerFilter)?.name ?? "this practitioner"}`
                  : search || statusFilter !== "all"
                  ? "No tasks match your filters"
                  : "No tasks found"}
              </p>
              <p className="text-sm text-muted-foreground">
                {practitionerFilter !== "all"
                  ? "This practitioner may not have any tasks assigned in PracticeBetter yet."
                  : "Tasks from PracticeBetter will appear here."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => {
              const title = task.title ?? task.name ?? "Untitled Task";
              const dueDate = getDueDate(task);
              const status = (task.status ?? "pending").toLowerCase();
              const priority = (task.priority ?? "").toLowerCase();
              const isOverdue = dueDate && !["completed", "complete", "cancelled"].includes(status) && isPast(parseISO(dueDate));
              const assignee = getConsulantName(task);
              const clientName = getClientName(task);

              return (
                <Card
                  key={task.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    isOverdue
                      ? "border-red-200 bg-red-50/30 hover:border-red-300"
                      : "border-indigo-100 hover:border-indigo-300"
                  }`}
                  onClick={() => setSelectedTask(task)}
                >
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
                        {(task.description ?? task.notes) && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {String(task.description ?? task.notes)}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                          {assignee && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" /> {assignee}
                            </span>
                          )}
                          {clientName && (
                            <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                              <User className="h-3 w-3" /> {clientName}
                            </span>
                          )}
                          {dueDate && (
                            <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                              <Clock className="h-3 w-3" /> Due {fmtDate(dueDate)}
                              {isOverdue && " (overdue)"}
                            </span>
                          )}
                          {(task.createdAt ?? task.dateCreated) && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" /> Created {fmtDate((task.dateCreated ?? task.createdAt) as string)}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Click hint */}
                      <div className="text-xs text-muted-foreground/60 shrink-0 hidden sm:block">View →</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </AdminLayout>
  );
}
