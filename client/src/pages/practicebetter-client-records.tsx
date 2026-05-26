import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Search, RefreshCw, User, ChevronRight, AlertCircle, Database, Cloud, ExternalLink, Clock, Hourglass, Dna, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────

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
  assignedPractitionerId?: string | null;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
}

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

// ── Status badge — matches practitioner-dashboard exactly ─────────────────────
type IconComponent = (props: { className?: string }) => JSX.Element;
const STATUS_CONFIG: Record<string, { className: string; icon: IconComponent; label: string }> = {
  pending:              { className: "bg-amber-100 text-amber-800 border border-amber-300",    icon: Clock,       label: "Pending" },
  pending_awaiting_dna: { className: "bg-orange-100 text-orange-800 border border-orange-300", icon: Hourglass,   label: "Pending + Awaiting DNA" },
  pending_dna_received: { className: "bg-green-100 text-green-800 border border-green-300",   icon: Dna,         label: "Pending + DNA Received" },
  in_progress:          { className: "bg-blue-100 text-blue-800 border border-blue-300",       icon: AlertCircle, label: "In Progress" },
  completed:            { className: "bg-purple-100 text-purple-800 border border-purple-300",  icon: CheckCircle, label: "Completed" },
  cancelled:            { className: "bg-gray-100 text-gray-700 border border-gray-300",       icon: XCircle,     label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <Badge className={`flex items-center gap-1 font-medium whitespace-nowrap ${cfg.className}`}>
      <Icon className="h-3 w-3 shrink-0" />
      {cfg.label}
    </Badge>
  );
}

// ── Program type (scan type) badges — matches practitioner-dashboard exactly ───
const SCAN_TYPE_STYLES: Record<string, string> = {
  'Remote Initial Scan': 'bg-blue-100 text-blue-700 border-blue-200',
  'Follow-Up Scan':      'bg-purple-100 text-purple-700 border-purple-200',
  'Pet Scan':            'bg-teal-100 text-teal-700 border-teal-200',
  'Quick Calls':         'bg-orange-100 text-orange-700 border-orange-200',
};

const SERVICE_ID_TO_LABEL: Record<string, string> = {
  remote_initial_scan: 'Remote Initial Scan',
  follow_up_scan:      'Follow-Up Scan',
  pet_scan:            'Pet Scan',
  quick_calls:         'Quick Calls',
};

function parseScanTypeFromNotes(clientNotes?: string | null): string | null {
  if (!clientNotes) return null;
  const match = clientNotes.match(/Services:\s*([^\n]+)/);
  if (!match) return null;
  const raw = match[1].trim();
  if (!raw || raw === 'None specified') return null;
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => SERVICE_ID_TO_LABEL[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
    .join(', ');
}

function ScanTypeBadges({ scanType, clientNotes }: { scanType?: string | null; clientNotes?: string | null }) {
  const resolved = scanType || parseScanTypeFromNotes(clientNotes);
  if (!resolved) return <span className="text-muted-foreground text-sm">—</span>;
  const parts = resolved.split(',').map(s => s.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((part, i) => {
        const style = SCAN_TYPE_STYLES[part];
        const miscStyle = part.startsWith('Programs:')
          ? 'bg-teal-100 text-teal-700 border-teal-200'
          : part.startsWith('Labs:')
            ? 'bg-rose-100 text-rose-700 border-rose-200'
            : 'bg-gray-100 text-gray-700 border-gray-200';
        return (
          <span key={i} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style ?? miscStyle}`}>
            {part}
          </span>
        );
      })}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="py-2 border-b border-muted/50 last:border-0">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-sm mt-0.5 break-all ${mono ? "font-mono text-xs" : ""}`}>{value ?? "—"}</div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PBClientRecordsPage() {
  const [, setLocation] = useLocation();

  // PracticeBetter state
  const [pbSearch, setPbSearch] = useState("");
  const [afterId, setAfterId] = useState<string | undefined>();
  const [pbHistory, setPbHistory] = useState<string[]>([]);
  const [selectedPB, setSelectedPB] = useState<PBRecord | null>(null);
  const [pbDialogOpen, setPbDialogOpen] = useState(false);

  // Local contacts state
  const [localSearch, setLocalSearch] = useState("");
  const [selectedLocal, setSelectedLocal] = useState<LocalContact | null>(null);
  const [localDialogOpen, setLocalDialogOpen] = useState(false);

  // ── PracticeBetter queries ──
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
    enabled: !!selectedPB && pbDialogOpen,
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

  // ── Employees (for resolving assignedPractitionerId → name) ──
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    staleTime: 5 * 60 * 1000,
  });

  const getPractitionerName = (id?: string | null): string => {
    if (!id) return "";
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}`.trim() : "";
  };

  // "Active" = anything that hasn't been completed, cancelled, or archived
  const ACTIVE_STATUSES = ["pending", "pending_awaiting_dna", "pending_dna_received", "in_progress"];
  const activeContacts = localData.filter((c) =>
    localSearch.trim() ? true : ACTIVE_STATUSES.includes(c.status)
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

  const openLocalDialog = (c: LocalContact) => {
    setSelectedLocal(c);
    setLocalDialogOpen(true);
  };

  const openPbDialog = (r: PBRecord) => {
    setSelectedPB(r);
    setPbDialogOpen(true);
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
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts by name, email, phone, or program..."
                  className="pl-9"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
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
                          <TableHead>Service Type</TableHead>
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
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => openLocalDialog(c)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                {c.clientFirstName} {c.clientLastName}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              <div>{c.clientPhone ?? "—"}</div>
                              {c.clientEmail && <div className="text-xs truncate max-w-[160px]">{c.clientEmail}</div>}
                            </TableCell>
                            <TableCell>
                              <ScanTypeBadges scanType={c.scanType} clientNotes={c.clientNotes} />
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={c.status} />
                            </TableCell>
                            <TableCell className="text-sm">
                              {getPractitionerName(c.assignedPractitionerId)
                                || <span className="text-muted-foreground italic text-xs">Unassigned</span>}
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
                  Showing all active contacts (pending, awaiting DNA, DNA received, in-progress). Search to include archived.
                </p>
              )}
            </div>
          </TabsContent>

          {/* ── PracticeBetter tab ── */}
          <TabsContent value="pb">
            <div className="space-y-3">
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
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => openPbDialog(r)}
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
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Active Contact detail dialog ── */}
      <Dialog open={localDialogOpen} onOpenChange={setLocalDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedLocal && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-bold text-lg leading-tight">
                      {selectedLocal.clientFirstName} {selectedLocal.clientLastName}
                    </div>
                    <div className="text-xs font-normal text-muted-foreground">Contact #{selectedLocal.id}</div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 py-2">
                  <StatusBadge status={selectedLocal.status} />
                  {selectedLocal.priority && selectedLocal.priority !== "normal" && (
                    <Badge variant="destructive" className="text-xs">{selectedLocal.priority}</Badge>
                  )}
                </div>

                <DetailRow label="Email" value={selectedLocal.clientEmail} />
                <DetailRow label="Phone" value={selectedLocal.clientPhone} />
                <DetailRow label="Service Type" value={selectedLocal.serviceType} />
                <div className="py-2 border-b border-muted/50">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Program / Scan Type</div>
                  <ScanTypeBadges scanType={selectedLocal.scanType} clientNotes={selectedLocal.clientNotes} />
                </div>
                <DetailRow label="Payment" value={selectedLocal.paymentType} />
                <DetailRow
                  label="Assigned To"
                  value={getPractitionerName(selectedLocal.assignedPractitionerId) || "Unassigned"}
                />
                <DetailRow label="Created" value={formatDate(selectedLocal.createdAt)} />

                {selectedLocal.clientNotes && (
                  <div className="py-2 border-b border-muted/50">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</div>
                    <p className="text-sm bg-muted/40 rounded-md p-2.5 whitespace-pre-wrap">{selectedLocal.clientNotes}</p>
                  </div>
                )}

                {selectedLocal.practitionerComments && (
                  <div className="py-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Practitioner Comments</div>
                    <p className="text-sm bg-muted/40 rounded-md p-2.5 whitespace-pre-wrap">{selectedLocal.practitionerComments}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── PracticeBetter record detail dialog ── */}
      <Dialog open={pbDialogOpen} onOpenChange={setPbDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedPB && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-bold text-lg leading-tight">
                      {selectedPB.profile?.firstName} {selectedPB.profile?.lastName}
                    </div>
                    <div className="text-xs font-normal text-muted-foreground">PracticeBetter Record</div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="mt-2 space-y-1">
                {pbDetailLoading ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Loading full details...</p>
                ) : (
                  <>
                    <DetailRow label="Record ID" value={pbDetail?.id ?? selectedPB.id} mono />
                    <DetailRow label="Patient #" value={pbDetail?.profile?.patientAccountNumber ?? selectedPB.profile?.patientAccountNumber} />
                    <DetailRow label="Email" value={pbDetail?.profile?.emailAddress ?? selectedPB.profile?.emailAddress} />
                    <DetailRow label="Phone" value={pbDetail?.profile?.phoneNumber ?? pbDetail?.profile?.mobilePhone ?? selectedPB.profile?.phoneNumber ?? selectedPB.profile?.mobilePhone} />
                    <DetailRow label="Date of Birth" value={formatDate(pbDetail?.profile?.dateOfBirth ?? selectedPB.profile?.dateOfBirth)} />
                    <DetailRow label="Gender" value={pbDetail?.profile?.gender ?? selectedPB.profile?.gender} />
                    <DetailRow label="Time Zone" value={pbDetail?.profile?.timeZone ?? selectedPB.profile?.timeZone} />
                    <DetailRow label="Status" value={selectedPB.isActive === false ? "Inactive" : "Active"} />
                    <DetailRow label="Created" value={formatDate(pbDetail?.dateCreated ?? selectedPB.dateCreated)} />
                    <DetailRow label="Last Modified" value={formatDate(pbDetail?.dateModified ?? selectedPB.dateModified)} />
                  </>
                )}

                <div className="pt-4">
                  <Button
                    className="w-full"
                    onClick={() => {
                      setPbDialogOpen(false);
                      setLocation(`/practitioner/medical-history?recordId=${selectedPB.id}`);
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Medical History
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
