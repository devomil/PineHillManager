import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Search, RefreshCw, User, ClipboardList, Pencil, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PBProfile {
  firstName: string;
  lastName: string;
  emailAddress?: string;
  phoneNumber?: string;
  patientAccountNumber?: string;
}

interface ClientRecord {
  id: string;
  profile: PBProfile;
  isActive?: boolean;
  dateCreated?: string;
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
  const searchStr = useSearch();
  const urlRecordId = new URLSearchParams(searchStr).get("recordId");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<ClientRecord | null>(
    urlRecordId ? { id: urlRecordId, profile: { firstName: "Loading", lastName: "..." } } : null
  );
  const [editOpen, setEditOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editSymptoms, setEditSymptoms] = useState("");

  const { data: recordsData, isLoading: recordsLoading, refetch } = useQuery<{ items: ClientRecord[]; hasMore: boolean }>({
    queryKey: ["/api/practicebetter/client-records", "medical-list"],
    queryFn: async () => {
      const res = await fetch("/api/practicebetter/client-records?details=false");
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  // When client list loads, replace placeholder with the real record name
  useEffect(() => {
    if (!urlRecordId || !recordsData?.items) return;
    const match = recordsData.items.find((r) => r.id === urlRecordId);
    if (match) setSelectedRecord(match);
  }, [recordsData, urlRecordId]);

  const { data: history, isLoading: historyLoading, error: historyError } = useQuery<MedicalHistory>({
    queryKey: ["/api/practicebetter/medical-history", selectedRecord?.id],
    queryFn: async () => {
      const res = await fetch(`/api/practicebetter/medical-history/${selectedRecord!.id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!selectedRecord,
  });

  const patchMutation = useMutation({
    mutationFn: async ({ recordId, data }: { recordId: string; data: Partial<MedicalHistory> }) => {
      return apiRequest("PATCH", `/api/practicebetter/medical-history/${recordId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practicebetter/medical-history"] });
      toast({ title: "Saved", description: "Medical history updated successfully." });
      setEditOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update medical history.", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ recordId }: { recordId: string }) => {
      return apiRequest("POST", `/api/practicebetter/medical-history/${recordId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practicebetter/medical-history"] });
      toast({ title: "Created", description: "Medical history profile created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create medical history.", variant: "destructive" });
    },
  });

  const records: ClientRecord[] = recordsData?.items ?? [];
  const filtered = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${r.profile?.firstName ?? ""} ${r.profile?.lastName ?? ""}`.toLowerCase();
    return name.includes(q) || (r.profile?.emailAddress ?? "").toLowerCase().includes(q);
  });

  const openEdit = () => {
    setEditNotes(history?.notes ?? "");
    setEditSymptoms(history?.current_symptoms ?? "");
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!selectedRecord) return;
    patchMutation.mutate({
      recordId: selectedRecord.id,
      data: { notes: editNotes, current_symptoms: editSymptoms },
    });
  };

  const renderList = (items: any[] | undefined, fields: string[]) => {
    if (!items?.length) return <p className="text-sm text-muted-foreground italic">None recorded</p>;
    return (
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="p-3 rounded-md border bg-muted/30 text-sm">
            {fields.map((f) =>
              item[f] ? (
                <div key={f}>
                  <span className="font-medium capitalize">{f.replace(/_/g, " ")}: </span>
                  {item[f]}
                </div>
              ) : null
            )}
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
          <div>
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
                            <div className="text-sm font-medium">{r.profile?.firstName} {r.profile?.lastName}</div>
                            {r.profile?.emailAddress && <div className="text-xs text-muted-foreground">{r.profile.emailAddress}</div>}
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
                <CardContent className="py-12 text-center text-sm space-y-4">
                  <p className="text-muted-foreground">No medical history found for this client.</p>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => createMutation.mutate({ recordId: selectedRecord.id })}
                    disabled={createMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {createMutation.isPending ? "Creating..." : "Create Medical Profile"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedRecord.profile?.firstName} {selectedRecord.profile?.lastName}</CardTitle>
                      <CardDescription>Medical History Profile</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={openEdit}>
                      <Pencil className="h-4 w-4 mr-2" /> Edit Notes
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="conditions">
                    <TabsList className="mb-4 flex-wrap h-auto">
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

                  {history?.current_symptoms && (
                    <div className="mt-4 p-3 rounded-md border bg-yellow-50 dark:bg-yellow-900/10">
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Current Symptoms</div>
                      <p className="text-sm">{history.current_symptoms}</p>
                    </div>
                  )}

                  {history?.notes && (
                    <div className="mt-3 p-3 rounded-md border bg-muted/30">
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

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit Medical Profile — {selectedRecord?.profile?.firstName} {selectedRecord?.profile?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Current Symptoms</label>
              <Textarea
                placeholder="Describe current symptoms..."
                rows={3}
                value={editSymptoms}
                onChange={(e) => setEditSymptoms(e.target.value)}
                className="resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Clinical Notes</label>
              <Textarea
                placeholder="Add clinical notes..."
                rows={4}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={patchMutation.isPending}>
              {patchMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
