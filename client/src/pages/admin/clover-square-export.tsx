import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Download, Loader2, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

type MerchantProgress = {
  merchantId: string;
  merchantName: string;
  customersFetched: number;
  loyaltyFetched: number;
  loyaltyErrors: number;
  loyaltySource: "live" | "reconstructed" | "unavailable" | "pending";
  ordersScanned: number;
  rewardOrders: number;
  done: boolean;
};

type ExportJob = {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  finishedAt?: string;
  error?: string;
  merchants: MerchantProgress[];
  totalCustomers: number;
  totalWithLoyalty: number;
  loyaltyEndpointAvailable: boolean | null;
  loyaltyWarning?: string;
  hasCustomersCsv: boolean;
  hasLoyaltyCsv: boolean;
};

function CloverSquareExportContent() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: job } = useQuery<ExportJob>({
    queryKey: ["/api/admin/clover-export/status", activeJobId],
    enabled: !!activeJobId,
    queryFn: async () => {
      const res = await fetch(`/api/admin/clover-export/status/${activeJobId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Status request failed: ${res.status}`);
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data as ExportJob | undefined;
      if (!data) return 2000;
      return data.status === "running" || data.status === "pending" ? 2000 : false;
    },
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/clover-export/start");
      return (await res.json()) as { jobId: string };
    },
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      toast({
        title: "Export started",
        description: "Pulling customers and loyalty balances from Clover. This may take several minutes.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clover-export/status"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not start export", description: err.message, variant: "destructive" });
    },
  });

  const handleDownload = (type: "customers" | "loyalty") => {
    if (!activeJobId) return;
    window.open(`/api/admin/clover-export/download/${activeJobId}/${type}`, "_blank");
  };

  const isRunning = job?.status === "pending" || job?.status === "running";
  const isCompleted = job?.status === "completed";
  const isFailed = job?.status === "failed";

  // Aggregate progress: rough completion percentage
  const aggregateProgress = (() => {
    if (!job || job.merchants.length === 0) return 0;
    const totalCustomers = job.merchants.reduce((sum, m) => sum + m.customersFetched, 0);
    const totalLoyalty = job.merchants.reduce((sum, m) => sum + m.loyaltyFetched + m.loyaltyErrors, 0);
    if (totalCustomers === 0) return 5;
    if (isCompleted) return 100;
    // crude: 50% for fetching customers, 50% for loyalty
    const loyaltyPct = totalCustomers > 0 ? Math.min(50, (totalLoyalty / totalCustomers) * 50) : 0;
    return Math.min(95, 50 + loyaltyPct);
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clover → Square Export</h1>
        <p className="text-muted-foreground">
          One-time export of customer profiles and current loyalty point balances from both Clover
          merchants (Watertown and Lake Geneva) for import into Square.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate export</CardTitle>
          <CardDescription>
            This pulls every customer from both Clover locations along with their current rewards
            balance, then produces two CSV files formatted for Square's customer and loyalty
            importers. The pull can take several minutes if there are thousands of customers — leave
            this page open until it finishes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => startMutation.mutate()}
            disabled={isRunning || startMutation.isPending}
            size="lg"
            data-testid="button-start-clover-export"
          >
            {isRunning || startMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Export in progress…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate Export
              </>
            )}
          </Button>

          {job && (
            <div className="space-y-3 pt-2">
              <Progress value={aggregateProgress} className="h-2" />
              <div className="text-xs text-muted-foreground">
                Status: <span className="font-medium capitalize">{job.status}</span>
                {job.status === "completed" && (
                  <>
                    {" "}— {job.totalCustomers} customers exported,{" "}
                    {job.totalWithLoyalty} with loyalty balance
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {job && job.merchants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Per-location progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {job.merchants.map((m) => {
                const sourceLabel =
                  m.loyaltySource === "live"
                    ? "Live API"
                    : m.loyaltySource === "reconstructed"
                    ? "Reconstructed from orders"
                    : m.loyaltySource === "unavailable"
                    ? "Unavailable"
                    : "Pending";
                const sourceVariant: "default" | "secondary" | "destructive" | "outline" =
                  m.loyaltySource === "live"
                    ? "default"
                    : m.loyaltySource === "reconstructed"
                    ? "secondary"
                    : m.loyaltySource === "unavailable"
                    ? "destructive"
                    : "outline";
                return (
                  <div
                    key={m.merchantId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{m.merchantName}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.customersFetched.toLocaleString()} customers fetched
                        {" · "}
                        {m.loyaltyFetched.toLocaleString()} customers with a balance
                        {m.loyaltySource === "reconstructed" && m.ordersScanned > 0 && (
                          <>
                            {" · "}
                            {m.ordersScanned.toLocaleString()} orders scanned
                            {m.rewardOrders > 0 && <> · {m.rewardOrders.toLocaleString()} with redemptions</>}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={sourceVariant}>{sourceLabel}</Badge>
                      <Badge variant={m.done ? "default" : "secondary"}>
                        {m.done ? "Done" : "Working…"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {isFailed && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Export failed</AlertTitle>
          <AlertDescription>{job?.error ?? "Unknown error"}</AlertDescription>
        </Alert>
      )}

      {isCompleted && job?.loyaltyWarning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Loyalty data note</AlertTitle>
          <AlertDescription className="text-sm">{job.loyaltyWarning}</AlertDescription>
        </Alert>
      )}

      {isCompleted && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Download files
            </CardTitle>
            <CardDescription>
              Two CSVs are ready. Import the customer file first into Square, then the loyalty file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              onClick={() => handleDownload("customers")}
              disabled={!job?.hasCustomersCsv}
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Download customers.csv ({job?.totalCustomers.toLocaleString()} rows)
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownload("loyalty")}
              disabled={!job?.hasLoyaltyCsv}
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Download loyalty.csv ({job?.totalWithLoyalty.toLocaleString()} rows)
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CloverSquareExportPage() {
  return (
    <AdminLayout currentTab="clover-square-export">
      <CloverSquareExportContent />
    </AdminLayout>
  );
}
