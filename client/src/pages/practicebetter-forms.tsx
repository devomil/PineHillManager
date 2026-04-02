import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, Search, FileText, ExternalLink, Calendar, User } from "lucide-react";
import { format, parseISO } from "date-fns";

interface PBForm {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  createdAt?: string;
  dateCreated?: string;
  updatedAt?: string;
  dateModified?: string;
  clientCount?: number;
  isActive?: boolean;
  formUrl?: string;
  [key: string]: unknown;
}

interface PBListResponse {
  count?: number;
  hasMore?: boolean;
  items: PBForm[];
}

const fmtDate = (s?: string) => {
  if (!s) return "—";
  try { return format(parseISO(s), "MMM d, yyyy"); } catch { return s; }
};

export default function PBFormsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [afterId, setAfterId] = useState<string | undefined>();
  const [history, setHistory] = useState<string[]>([]);

  const { data, isLoading, error, refetch } = useQuery<PBListResponse>({
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

  const items = data?.items ?? [];
  const filtered = items.filter((f) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const name = (f.name ?? f.title ?? "").toLowerCase();
    const type = (f.type ?? "").toLowerCase();
    return name.includes(q) || type.includes(q);
  });

  const goNext = () => {
    if (items.length > 0) {
      const last = items[items.length - 1].id;
      setHistory((h) => [...h, afterId ?? ""]);
      setAfterId(last);
    }
  };
  const goPrev = () => {
    const p = [...history];
    const prev = p.pop() || undefined;
    setHistory(p);
    setAfterId(prev);
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
            <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Forms</h1>
              <p className="text-sm text-muted-foreground">Client intake & assessment forms</p>
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
            placeholder="Search forms..."
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
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center space-y-2">
              <FileText className="h-8 w-8 text-red-400 mx-auto" />
              <p className="font-semibold text-red-700">Failed to load forms</p>
              <p className="text-sm text-red-600">{String(error)}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-3">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="font-semibold text-muted-foreground">
                {search ? "No forms match your search" : "No forms found"}
              </p>
              <p className="text-sm text-muted-foreground">
                Forms created in PracticeBetter will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((form) => {
              const name = form.name ?? form.title ?? "Untitled Form";
              const date = form.dateCreated ?? form.createdAt;
              const isActive = form.isActive !== false && form.status !== "inactive";
              return (
                <Card key={form.id} className="hover:shadow-md transition-shadow border-orange-100 hover:border-orange-200">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-tight">{name}</p>
                          {form.type && (
                            <p className="text-xs text-muted-foreground capitalize">{String(form.type)}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-100 text-green-700 border-green-200" : ""}>
                        {isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {form.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{String(form.description)}</p>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-orange-50">
                      {date ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" /> {fmtDate(date)}
                        </span>
                      ) : <span />}
                      {form.formUrl && (
                        <a
                          href={String(form.formUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-medium"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
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
            <span>{filtered.length} form{filtered.length !== 1 ? "s" : ""} shown</span>
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
