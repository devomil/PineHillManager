import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Download, Loader2, Database, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { format } from "date-fns";

type BackupRow = {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  triggeredBy: string;
  objectPath: string | null;
  sizeBytes: number | null;
  durationMs: number | null;
  error: string | null;
  environment: string;
};

function formatBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)} min`;
}

function StatusBadge({ status }: { status: string }) {
  const variant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    completed: "default",
    running: "secondary",
    failed: "destructive",
    pruned: "outline",
  };
  return <Badge variant={variant[status] ?? "outline"}>{status}</Badge>;
}

function BackupsContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: backups = [], isLoading } = useQuery<BackupRow[]>({
    queryKey: ["/api/admin/backups"],
    refetchInterval: (query) => {
      const data = query.state.data as BackupRow[] | undefined;
      const hasRunning = data?.some((b) => b.status === "running");
      return hasRunning ? 3000 : 30000;
    },
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/backups/run");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Backup started",
        description: "The snapshot is being uploaded to Object Storage. Refresh in a moment.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backups"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not start backup", description: err.message, variant: "destructive" });
    },
  });

  const handleDownload = (id: number) => {
    window.open(`/api/admin/backups/${id}/download`, "_blank");
  };

  const completed = backups.filter((b) => b.status === "completed");
  const latest = completed[0];
  const lastSuccessAgeHours = latest
    ? (Date.now() - new Date(latest.startedAt).getTime()) / (1000 * 60 * 60)
    : null;
  const isStale = lastSuccessAgeHours !== null && lastSuccessAgeHours > 36;
  const isFresh = lastSuccessAgeHours !== null && lastSuccessAgeHours <= 30;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-7 w-7" /> Database Backups
          </h1>
          <p className="text-muted-foreground mt-1">
            Nightly snapshots of the production database, stored in Object Storage for 30 days.
          </p>
        </div>
        <Button
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
          data-testid="button-run-backup-now"
        >
          {runMutation.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting…</>
          ) : (
            <><RefreshCw className="h-4 w-4 mr-2" /> Run backup now</>
          )}
        </Button>
      </div>

      {!latest && !isLoading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No backups yet</AlertTitle>
          <AlertDescription>
            Run a backup now before your next publish so production data is protected.
          </AlertDescription>
        </Alert>
      )}

      {isStale && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Last backup is over 36 hours old</AlertTitle>
          <AlertDescription>
            The nightly job may not be running. Run a backup now and check the server logs.
          </AlertDescription>
        </Alert>
      )}

      {isFresh && latest && (
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Production data is protected</AlertTitle>
          <AlertDescription>
            Most recent backup: <strong>{format(new Date(latest.startedAt), "PPp")}</strong>
            {" · "}{formatBytes(latest.sizeBytes)}.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent backups</CardTitle>
          <CardDescription>
            Backups older than 30 days are automatically removed from Object Storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No backup runs recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Env</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((b) => (
                  <TableRow key={b.id} data-testid={`row-backup-${b.id}`}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(b.startedAt), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={b.status} />
                        {b.error && (
                          <span className="text-xs text-destructive max-w-xs truncate" title={b.error}>
                            {b.error}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{b.triggeredBy}</TableCell>
                    <TableCell>{b.environment}</TableCell>
                    <TableCell>{formatBytes(b.sizeBytes)}</TableCell>
                    <TableCell>{formatDuration(b.durationMs)}</TableCell>
                    <TableCell className="text-right">
                      {b.status === "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(b.id)}
                          data-testid={`button-download-backup-${b.id}`}
                        >
                          <Download className="h-4 w-4 mr-1" /> Download
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How recovery works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Each backup is a gzipped <code>pg_dump</code> of the production database (schema + data,
            excluding session data) uploaded to Replit Object Storage.
          </p>
          <p>
            To restore: download the most recent <code>.sql.gz</code> file, gunzip it, and load it
            into a fresh database with <code>psql $DATABASE_URL &lt; backup.sql</code>. Always
            restore into a staging database first to verify.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BackupsPage() {
  return (
    <AdminLayout>
      <BackupsContent />
    </AdminLayout>
  );
}
