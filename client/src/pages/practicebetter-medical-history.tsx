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
import { ArrowLeft, Search, RefreshCw, User, ClipboardList } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ClientRecord {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface MedicalHistory {
  conditions?: Array<{ name?: string; description?: string }>;
  medications?: Array<{ name?: string; dosage?: string; frequency?: string }>;
  allergies?: Array<{ name?: string; reaction?: string }>;
  surgical_history?: Array<{ name?: string; year?: number }>;
  family_history?: Array<{ relationship?: string; condition?: string }>;
  current_symptoms?: string;
  notes?: string;
}

export default function PBMedicalHistoryPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<ClientRecord | null>(null);
  const [afterId, setAfterId] = useState<string | undefined>();

  const { data: recordsData, isLoading: recordsLoading, refetch } = useQuery<{ data: ClientRecord[] }>({
    queryKey: ["/api/practicebetter/client-records", afterId, "medical-list"],
    queryFn: async () => {
      const params = new URLSearchParams({ details: "false" });
      if (afterId) params.set("after_id", afterId);
      const res = await fetch(`/api/practicebetter/client-records?${params}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const { data: history, isLoading: historyLoading, error: historyError } = useQuery<MedicalHistory>({
    queryKey: ["/api/practicebetter/medical-history", selectedRecord?.id],
    queryFn: async () => {
      const res = await fetch(`/api/practicebetter/medical-history/${selectedRecord!.id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!selectedRecord,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ recordId, data }: { recordId: string; data: Partial<MedicalHistory> }) => {
      return apiRequest("PUT", `/api/practicebetter/medical-history/${recordId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practicebetter/medical-history"] });
      toast({ title: "Saved", description: "Medical history updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update medical history.", variant: "destructive" });
    },
  });

  const records: ClientRecord[] = recordsData?.data ?? [];
  const filtered = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q);
  });

  const renderList = (items: any[] | undefined, fields: string[]) => {
    if (!items?.length) return <p className="text-sm text-muted-foreground italic">None recorded</p>;
    return (
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="p-3 rounded-md border bg-muted/30 text-sm">
            {fields.map((f) => item[f] ? <div key={f}><span className="font-medium capitalize">{f.replace(/_/g, " ")}: </span>{item[f]}</div> : null)}
          </div>
        ))}
      </div>
    );
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
              <h1 className="text-2xl font-bold">Client Medical History</h1>
              <p className="text-muted-foreground text-sm">View and manage client medical profiles</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client list */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Select Client</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
                {recordsLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading clients...</div>
                ) : filtered.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No clients found.</div>
                ) : (
                  <div className="divide-y">
                    {filtered.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRecord(r)}
                        className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${selectedRecord?.id === r.id ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <div className="text-sm font-medium">{r.first_name} {r.last_name}</div>
                            {r.email && <div className="text-xs text-muted-foreground">{r.email}</div>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Medical history detail */}
          <div className="lg:col-span-2">
            {!selectedRecord ? (
              <Card className="border-dashed h-full">
                <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  <div className="text-center">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    Select a client to view their medical history
                  </div>
                </CardContent>
              </Card>
            ) : historyLoading ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">Loading medical history...</CardContent>
              </Card>
            ) : historyError ? (
              <Card>
                <CardContent className="py-12 text-center text-red-500 text-sm">
                  Could not load medical history. The client may not have a profile yet.
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 block mx-auto"
                    onClick={() =>
                      updateMutation.mutate({ recordId: selectedRecord.id, data: {} })
                    }
                  >
                    Create Profile
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedRecord.first_name} {selectedRecord.last_name}</CardTitle>
                  <CardDescription>Medical History Profile</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="conditions">
                    <TabsList className="mb-4">
                      <TabsTrigger value="conditions">Conditions</TabsTrigger>
                      <TabsTrigger value="medications">Medications</TabsTrigger>
                      <TabsTrigger value="allergies">Allergies</TabsTrigger>
                      <TabsTrigger value="surgical">Surgical</TabsTrigger>
                      <TabsTrigger value="family">Family</TabsTrigger>
                    </TabsList>
                    <TabsContent value="conditions">
                      <h3 className="font-semibold text-sm mb-3">Current Conditions</h3>
                      {renderList(history?.conditions, ["name", "description"])}
                    </TabsContent>
                    <TabsContent value="medications">
                      <h3 className="font-semibold text-sm mb-3">Medications</h3>
                      {renderList(history?.medications, ["name", "dosage", "frequency"])}
                    </TabsContent>
                    <TabsContent value="allergies">
                      <h3 className="font-semibold text-sm mb-3">Allergies</h3>
                      {renderList(history?.allergies, ["name", "reaction"])}
                    </TabsContent>
                    <TabsContent value="surgical">
                      <h3 className="font-semibold text-sm mb-3">Surgical History</h3>
                      {renderList(history?.surgical_history, ["name", "year"])}
                    </TabsContent>
                    <TabsContent value="family">
                      <h3 className="font-semibold text-sm mb-3">Family History</h3>
                      {renderList(history?.family_history, ["relationship", "condition"])}
                    </TabsContent>
                  </Tabs>

                  {history?.notes && (
                    <div className="mt-4 p-3 rounded-md border bg-muted/30">
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</div>
                      <p className="text-sm">{history.notes}</p>
                    </div>
                  )}

                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/practitioner/health-products?recordId=${selectedRecord.id}`)}
                    >
                      View Health Products →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
