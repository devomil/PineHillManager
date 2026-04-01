import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, RefreshCw, User, ChevronRight, AlertCircle, Database, Cloud } from "lucide-react";
import { format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────

// Exact shape PracticeBetter sends — never translate field names so round-trip writes stay valid
interface PBProfile {
  firstName: string;
  lastName: string;
  emailAddress?: string;
  phoneNumber?: string;
  mobilePhone?: string;
  dateOfBirth?: string;
  gender?: string;
  timeZone?: string;
  patientAccountNumber?: string;
  secondaryContacts?: unknown[];
  emergencyContacts?: unknown[];
  healthcareProviders?: unknown[];
}

interface PBRecord {
  id: string;
  profile: PBProfile;
  isActive?: boolean;
  isChildRecord?: boolean;
  invitationSent?: boolean;
  status?: string;
  dateCreated?: string;
  dateModified?: string;
  relatedTags?: unknown[];
}

interface LocalContact {
  id: number;
  clientFirstName: string;
  clientLastName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientNotes?: string | null;
  serviceType: string;
  scanType?: string | null;
  status: string;
  paymentType?: string | null;
  priority?: string | null;
  practitionerComments?: string | null;
  createdAt?: string;
  assignedPractitioner?: { firstName?: string; lastName?: string } | null;
}

// PracticeBetter list envelope — exact field names from the API
interface PBListResponse {
  items: PBRecord[];
  hasMore?: boolean;
  count?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatDate = (s?: string | null) => {
  if (!s) return "—";
  try { return format(new Date(s), "MMM d, yyyy"); } catch { return s; }
};

const statusColor = (status: string) => {
  switch (status) {
    case "pending":     return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
    case "completed":   return "bg-green-100 text-green-800 border-green-200";
    case "cancelled":   return "bg-red-100 text-red-800 border-red-200";
    default:            return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

function DetailRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-sm mt-0.5 break-all ${mono ? "font-mono text-xs" : ""}`}>{value ?? "—"}</div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PBClientRecordsPage() {
  const [, setLocation] = useLocation();
  const [pbSearch, setPbSearch] = useState("");
  const [afterId, setAfterId] = useState<string | undefined>();
  const [pbHistory, setPbHistory] = useState<string[]>([]);
  const [selectedPB, setSelectedPB] = useState<PBRecord | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const [selectedLocal, setSelectedLocal] = useState<LocalContact | null>(null);

  // ── PracticeBetter query ──
  const { data: pbData, isLoading: pbLoading, error: pbError, refetch: pbRefetch } = useQuery<PBListResponse>({
    queryKey: ["/api/practicebetter/client-records", afterId],
    queryFn: async () => {
      const params = new URLSearchParams({ details: "true" });
      if (afterId) params.set("after_id", afterId);
      const res = await fetch(`/api/practicebetter/client-records?${params}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    retry: false,
  });

  const { data: pbDetail, isLoading: pbDetailLoading } = useQuery<PBRecord>({
    queryKey: ["/api/practicebetter/client-records/detail", selectedPB?.id],
    queryFn: async () => {
      const res = await fetch(`/api/practicebetter/client-records/${selectedPB!.id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!selectedPB,
    retry: false,
  });

  // ── Local contacts query ──
  const { data: localData = [], isLoading: localLoading, refetch: localRefetch } = useQuery<LocalContact[]>({
    queryKey: ["/api/practitioner-contacts"],
    queryFn: async () => {
      const res = await fetch("/api/practitioner-contacts");
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  // Filter to active (pending + in_progress) contacts only by default, but show all if search is active
  const activeContacts = localData.filter((c) =>
    localSearch.trim() ? true : ["pending", "in_progress"].includes(c.status)
  );

  const filteredLocal = activeContacts.filter((c) => {
    if (!localSearch.trim()) return true;
    const q = localSearch.toLowerCase();
    const name = `${c.clientFirstName} ${c.clientLastName}`.toLowerCase();
    return (
      name.includes(q) ||
      (c.clientEmail ?? "").toLowerCase().includes(q) ||
      (c.clientPhone ?? "").includes(q) ||
      (c.scanType ?? "").toLowerCase().includes(q)
    );
  });

  const pbRecords = pbData?.items ?? [];
  const filteredPB = pbRecords.filter((r) => {
    if (!pbSearch.trim()) return true;
    const q = pbSearch.toLowerCase();
    const name = `${r.profile?.firstName ?? ""} ${r.profile?.lastName ?? ""}`.toLowerCase();
    return (
      name.includes(q) ||
      (r.profile?.emailAddress ?? "").toLowerCase().includes(q) ||
      (r.profile?.phoneNumber ?? r.profile?.mobilePhone ?? "").includes(q)
    );
  });

  const pbGoNext = () => {
    if (pbData?.items?.length) {
      const lastId = pbData.items[pbData.items.length - 1].id;
      setPbHistory((h) => [...h, afterId ?? ""]);
      setAfterId(lastId);
    }
  };
  const pbGoPrev = () => {
    const prev = [...pbHistory];
    const prevId = prev.pop() || undefined;
    setPbHistory(prev);
    setAfterId(prevId);
  };

  return (
    <AdminLayout currentTab="practitioner">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/practitioner")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Client Records</h1>
              <p className="text-muted-foreground text-sm">PracticeBetter directory &amp; active contacts</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { pbRefetch(); localRefetch(); }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <Database className="h-4 w-4" />
              Active Contacts
              {activeContacts.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                  {activeContacts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pb" className="gap-2">
              <Cloud className="h-4 w-4" />
              PracticeBetter
              {pbError && <AlertCircle className="h-3.5 w-3.5 text-red-500 ml-1" />}
            </TabsTrigger>
          </TabsList>

          {/* ── Active Contacts tab ── */}
          <TabsContent value="active">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* List */}
              <div className="lg:col-span-2 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contacts by name, email, phone, or program..."
                    className="pl-9"
                    value={localSearch}
                    onChange={(e) => { setLocalSearch(e.target.value); setSelectedLocal(null); }}
                  />
                </div>
                <Card>
                  <CardContent className="p-0">
                    {localLoading ? (
                      <div className="py-12 text-center text-muted-foreground">Loading contacts...</div>
                    ) : filteredLocal.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        {localSearch ? "No contacts match your search." : "No active contacts found."}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Client Name</TableHead>
                            <TableHead>Contact Info</TableHead>
                            <TableHead>Program Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredLocal.map((c) => (
                            <TableRow
                              key={c.id}
                              className={`cursor-pointer hover:bg-muted/50 ${selectedLocal?.id === c.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                              onClick={() => setSelectedLocal(c)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                  {c.clientFirstName} {c.clientLastName}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                <div>{c.clientPhone ?? "—"}</div>
                                {c.clientEmail && <div className="text-xs truncate max-w-[140px]">{c.clientEmail}</div>}
                              </TableCell>
                              <TableCell>
                                {c.scanType ? (
                                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                                    {c.scanType.split(",")[0].trim()}
                                  </Badge>
                                ) : "—"}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor(c.status)}`}>
                                  {c.status.replace("_", " ")}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">
                                {c.assignedPractitioner
                                  ? `${c.assignedPractitioner.firstName ?? ""} ${c.assignedPractitioner.lastName ?? ""}`.trim()
                                  : <span className="text-muted-foreground italic text-xs">Unassigned</span>}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                              <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
                {!localSearch && (
                  <p className="text-xs text-muted-foreground px-1">
                    Showing pending &amp; in-progress contacts. Search to include all statuses.
                  </p>
                )}
              </div>

              {/* Detail panel */}
              <div>
                {selectedLocal ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-base">
                            {selectedLocal.clientFirstName} {selectedLocal.clientLastName}
                          </div>
                          <div className="text-xs text-muted-foreground">Contact #{selectedLocal.id}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusColor(selectedLocal.status)}`}>
                          {selectedLocal.status.replace("_", " ")}
                        </span>
                        {selectedLocal.priority && selectedLocal.priority !== "normal" && (
                          <Badge variant="destructive" className="text-xs">{selectedLocal.priority}</Badge>
                        )}
                      </div>

                      <DetailRow label="Email" value={selectedLocal.clientEmail} />
                      <DetailRow label="Phone" value={selectedLocal.clientPhone} />
                      <DetailRow label="Service Type" value={selectedLocal.serviceType} />
                      <DetailRow label="Program / Scan Type" value={selectedLocal.scanType} />
                      <DetailRow label="Payment" value={selectedLocal.paymentType} />
                      <DetailRow
                        label="Assigned To"
                        value={selectedLocal.assignedPractitioner
                          ? `${selectedLocal.assignedPractitioner.firstName ?? ""} ${selectedLocal.assignedPractitioner.lastName ?? ""}`.trim()
                          : "Unassigned"}
                      />
                      <DetailRow label="Created" value={formatDate(selectedLocal.createdAt)} />

                      {selectedLocal.clientNotes && (
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</div>
                          <p className="text-sm bg-muted/40 rounded-md p-2 whitespace-pre-wrap">{selectedLocal.clientNotes}</p>
                        </div>
                      )}

                      {selectedLocal.practitionerComments && (
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Comments</div>
                          <p className="text-sm bg-muted/40 rounded-md p-2 whitespace-pre-wrap">{selectedLocal.practitionerComments}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center text-muted-foreground text-sm">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Select a contact to see their details
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── PracticeBetter tab ── */}
          <TabsContent value="pb">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* List */}
              <div className="lg:col-span-2 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    className="pl-9"
                    value={pbSearch}
                    onChange={(e) => setPbSearch(e.target.value)}
                  />
                </div>
                <Card>
                  <CardContent className="p-0">
                    {pbLoading ? (
                      <div className="py-12 text-center text-muted-foreground">Connecting to PracticeBetter...</div>
                    ) : pbError ? (
                      <div className="py-10 text-center space-y-3 px-6">
                        <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
                        <div>
                          <p className="font-semibold text-red-600">PracticeBetter connection failed</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Unable to reach the PracticeBetter API. Check that your credentials
                            are configured correctly, or use the <strong>Active Contacts</strong> tab
                            to view your local client records.
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => pbRefetch()}>
                          <RefreshCw className="h-4 w-4 mr-2" /> Retry Connection
                        </Button>
                      </div>
                    ) : filteredPB.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">No PracticeBetter records found.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Date of Birth</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPB.map((r) => (
                            <TableRow
                              key={r.id}
                              className={`cursor-pointer hover:bg-muted/50 ${selectedPB?.id === r.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                              onClick={() => setSelectedPB(r)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  {r.profile?.firstName} {r.profile?.lastName}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{r.profile?.emailAddress ?? "—"}</TableCell>
                              <TableCell className="text-sm">{r.profile?.phoneNumber ?? r.profile?.mobilePhone ?? "—"}</TableCell>
                              <TableCell className="text-sm">{formatDate(r.profile?.dateOfBirth)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{formatDate(r.dateCreated)}</TableCell>
                              <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {!pbError && (
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={pbGoPrev} disabled={pbHistory.length === 0}>
                      ← Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">{filteredPB.length} records shown</span>
                    <Button variant="outline" size="sm" onClick={pbGoNext} disabled={!pbData?.hasMore}>
                      Next →
                    </Button>
                  </div>
                )}
              </div>

              {/* Detail panel */}
              <div>
                {selectedPB ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-base">
                            {selectedPB.profile?.firstName} {selectedPB.profile?.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">PracticeBetter Record</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {pbDetailLoading ? (
                        <p className="text-sm text-muted-foreground">Loading details...</p>
                      ) : (
                        <>
                          <DetailRow label="Record ID" value={pbDetail?.id ?? selectedPB.id} mono />
                          <DetailRow label="Patient #" value={pbDetail?.profile?.patientAccountNumber ?? selectedPB.profile?.patientAccountNumber} />
                          <DetailRow label="Email" value={pbDetail?.profile?.emailAddress ?? selectedPB.profile?.emailAddress} />
                          <DetailRow label="Phone" value={pbDetail?.profile?.phoneNumber ?? pbDetail?.profile?.mobilePhone ?? selectedPB.profile?.phoneNumber ?? selectedPB.profile?.mobilePhone} />
                          <DetailRow label="Date of Birth" value={formatDate(pbDetail?.profile?.dateOfBirth ?? selectedPB.profile?.dateOfBirth)} />
                          <DetailRow label="Gender" value={pbDetail?.profile?.gender ?? selectedPB.profile?.gender} />
                          <DetailRow label="Time Zone" value={pbDetail?.profile?.timeZone ?? selectedPB.profile?.timeZone} />
                          <DetailRow
                            label="Status"
                            value={selectedPB.isActive === false ? "Inactive" : "Active"}
                          />
                          <DetailRow label="Created" value={formatDate(pbDetail?.dateCreated ?? selectedPB.dateCreated)} />
                          <DetailRow label="Last Modified" value={formatDate(pbDetail?.dateModified ?? selectedPB.dateModified)} />
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setLocation(`/practitioner/medical-history?recordId=${selectedPB.id}`)}
                      >
                        View Medical History →
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center text-muted-foreground text-sm">
                      <Cloud className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Select a record to see their PracticeBetter details
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
