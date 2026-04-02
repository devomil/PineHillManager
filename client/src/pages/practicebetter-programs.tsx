import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, Search, BookOpen, Calendar, Users, Clock, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

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
  [key: string]: unknown;
}

interface PBListResponse {
  count?: number;
  hasMore?: boolean;
  items: PBProgram[];
}

const fmtDate = (s?: string) => {
  if (!s) return "—";
  try { return format(parseISO(s), "MMM d, yyyy"); } catch { return s; }
};

export default function PBProgramsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [afterId, setAfterId] = useState<string | undefined>();
  const [history, setHistory] = useState<string[]>([]);

  const { data, isLoading, error, refetch } = useQuery<PBListResponse>({
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
    return name.includes(q) || type.includes(q);
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
          <Input placeholder="Search programs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                <Card key={prog.id} className="hover:shadow-md transition-shadow border-pink-100 hover:border-pink-200">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-tight">{name}</p>
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
    </AdminLayout>
  );
}
