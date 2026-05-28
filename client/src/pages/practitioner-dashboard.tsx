import { useState, Fragment, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, Phone, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Filter, RefreshCw, Eye, Mail, StickyNote, MessageSquare, Edit2, Save, X, Pencil, Search, Dna, Hourglass, ChevronRight, FileText, ClipboardList, ShoppingBag, Receipt, CheckSquare, BookOpen, FlaskConical } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import type { PractitionerContact, User } from "@shared/schema";

type StatusType = {
  value: string;
  label: string;
  color: string;
};

const SCAN_TYPE_STYLES: Record<string, string> = {
  'Remote Initial Scan': 'bg-blue-100 text-blue-700 border-blue-200',
  'Follow-Up Scan':      'bg-purple-100 text-purple-700 border-purple-200',
  'Pet Scan':            'bg-teal-100 text-teal-700 border-teal-200',
  'Quick Calls':         'bg-orange-100 text-orange-700 border-orange-200',
};

const SCAN_TYPE_OPTIONS = Object.keys(SCAN_TYPE_STYLES);

function getScanTypePill(value: string | null | undefined) {
  if (!value) return <span className="text-xs text-muted-foreground italic">— None —</span>;
  const cls = SCAN_TYPE_STYLES[value];
  return cls
    ? <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>{value}</span>
    : <span className="text-xs text-gray-600">{value}</span>;
}

const SERVICE_ID_TO_LABEL: Record<string, string> = {
  remote_initial_scan: 'Remote Initial Scan',
  follow_up_scan: 'Follow-Up Scan',
  pet_scan: 'Pet Scan',
  quick_calls: 'Quick Calls',
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
    .map(s => {
      if (SERVICE_ID_TO_LABEL[s]) return SERVICE_ID_TO_LABEL[s];
      if (s.startsWith('Programs:')) return s;
      if (s.startsWith('Labs:')) return s;
      // Convert snake_case to Title Case as fallback
      return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    })
    .join(', ');
}

function ScanTypeBadges({ scanType, serviceType, clientNotes }: { scanType?: string | null; serviceType?: string; clientNotes?: string | null }) {
  const resolved = scanType || parseScanTypeFromNotes(clientNotes);
  if (!resolved) {
    return <Badge variant="outline">{serviceType || '—'}</Badge>;
  }
  const parts = resolved.split(',').map(s => s.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((part, i) => {
        const style = SCAN_TYPE_STYLES[part];
        if (style) {
          return (
            <span key={i} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}>
              {part}
            </span>
          );
        }
        const isProgram = part.startsWith('Programs:');
        const isLab = part.startsWith('Labs:');
        const miscStyle = isProgram
          ? 'bg-teal-100 text-teal-700 border-teal-200'
          : isLab
            ? 'bg-rose-100 text-rose-700 border-rose-200'
            : 'bg-gray-100 text-gray-700 border-gray-200';
        return (
          <span key={i} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${miscStyle}`}>
            {part}
          </span>
        );
      })}
    </div>
  );
}

export default function PractitionerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [programTypeFilter, setProgramTypeFilter] = useState<string>("all");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [practitionerFilter, setPractitionerFilter] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    const params = new URLSearchParams(window.location.search);
    return params.get("source") === "notification" && user?.id ? user.id : "all";
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [highlightContactId, setHighlightContactId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") === "notification") {
      if (user?.id && practitionerFilter !== user.id) {
        setPractitionerFilter(user.id);
      }
      const cid = params.get("contactId");
      if (cid) setHighlightContactId(parseInt(cid, 10));
      // Clear params from URL so refresh doesn't re-apply
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const [selectedContact, setSelectedContact] = useState<PractitionerContact | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    clientFirstName: '',
    clientLastName: '',
    clientEmail: '',
    clientPhone: '',
    clientNotes: '',
  });

  const { data: contacts = [], isLoading: contactsLoading, refetch } = useQuery<PractitionerContact[]>({
    queryKey: ['/api/practitioner-contacts', { status: statusFilter, serviceType: serviceFilter, programType: programTypeFilter, paymentType: paymentTypeFilter, assignedTo: practitionerFilter }],
  });

  useEffect(() => {
    if (!highlightContactId || contactsLoading) return;
    const el = document.getElementById(`contact-row-${highlightContactId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-blue-500", "ring-offset-2");
    const timer = setTimeout(() => {
      el.classList.remove("ring-2", "ring-blue-500", "ring-offset-2");
      setHighlightContactId(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [highlightContactId, contactsLoading, contacts.length]);

  const matchesSearch = (c: PractitionerContact) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const fullName = `${c.clientFirstName || ''} ${c.clientLastName || ''}`.toLowerCase();
    const phone = (c.clientPhone || '').toLowerCase();
    const email = (c.clientEmail || '').toLowerCase();
    return fullName.includes(q) || phone.includes(q) || email.includes(q);
  };

  const activeContacts = contacts.filter(c => c.status !== 'completed' && c.status !== 'cancelled').filter(matchesSearch);
  const archivedContacts = contacts.filter(c => c.status === 'completed' || c.status === 'cancelled').filter(matchesSearch);

  const { data: stats } = useQuery<{
    total: number;
    byStatus: Record<string, number>;
    byServiceType: Record<string, number>;
  }>({
    queryKey: ['/api/practitioner-contacts/stats'],
  });

  // PracticeBetter total client count — cached 10 min on server, so this is cheap
  const { data: pbCountData } = useQuery<{ count: number }>({
    queryKey: ['/api/practicebetter/client-records/count'],
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { data: serviceTypes = [] } = useQuery<string[]>({
    queryKey: ['/api/practitioner-contacts/service-types'],
  });

  const { data: statusTypes = [] } = useQuery<StatusType[]>({
    queryKey: ['/api/practitioner-contacts/status-types'],
  });

  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const updateContactMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<PractitionerContact> }) => {
      return apiRequest('PATCH', `/api/practitioner-contacts/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/practitioner-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/practitioner-contacts/stats'] });
      toast({ title: "Success", description: "Contact updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update contact", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; icon: any; label: string }> = {
      pending:              { className: "bg-amber-100 text-amber-800 border border-amber-300",    icon: Clock,       label: "Pending" },
      pending_awaiting_dna: { className: "bg-orange-100 text-orange-800 border border-orange-300", icon: Hourglass,   label: "Pending - Awaiting DNA" },
      pending_dna_received: { className: "bg-green-100 text-green-800 border border-green-300",   icon: Dna,         label: "Pending - DNA Received" },
      in_progress:          { className: "bg-blue-100 text-blue-800 border border-blue-300",       icon: AlertCircle, label: "In Progress" },
      completed:            { className: "bg-purple-100 text-purple-800 border border-purple-300",  icon: CheckCircle, label: "Completed" },
      cancelled:            { className: "bg-gray-100 text-gray-700 border border-gray-300",       icon: XCircle,     label: "Cancelled" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={`flex items-center gap-1 font-medium ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getStatusChip = (status: string) => {
    const config: Record<string, { dot: string; label: string }> = {
      pending:              { dot: 'bg-amber-400',  label: 'Pending' },
      pending_awaiting_dna: { dot: 'bg-orange-500', label: 'Awaiting DNA' },
      pending_dna_received: { dot: 'bg-green-500',  label: 'DNA Received' },
      in_progress:          { dot: 'bg-blue-500',   label: 'In Progress' },
      completed:            { dot: 'bg-purple-500', label: 'Completed' },
      cancelled:            { dot: 'bg-gray-400',   label: 'Cancelled' },
    };
    const c = config[status] || config.pending;
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
        <span className={`h-2 w-2 rounded-full ${c.dot} shrink-0`} />
        {c.label}
      </span>
    );
  };

  const getScanTypeChip = (value: string | null | undefined) => {
    if (!value) {
      return <span className="text-xs text-muted-foreground italic">— None —</span>;
    }
    const dots: Record<string, string> = {
      'Remote Initial Scan': 'bg-blue-500',
      'Follow-Up Scan':      'bg-purple-500',
      'Pet Scan':            'bg-teal-500',
      'Quick Calls':         'bg-orange-500',
    };
    const dot = dots[value] || 'bg-gray-400';
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
        <span className={`h-2 w-2 rounded-full ${dot} shrink-0`} />
        {value}
      </span>
    );
  };

  const getPaymentChip = (value: string | null | undefined) => {
    const config: Record<string, { dot: string; label: string }> = {
      'Paid Online - Received':                       { dot: 'bg-green-500',   label: 'Online · Received' },
      'Paid Online - Waiting Payment Confirmation':   { dot: 'bg-yellow-500',  label: 'Online · Waiting' },
      'Paid In-Store - Received':                     { dot: 'bg-emerald-600', label: 'In-Store · Received' },
      'Paid In-Store - Waiting Payment Confirmation': { dot: 'bg-amber-500',   label: 'In-Store · Waiting' },
    };
    if (!value || !config[value]) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 whitespace-nowrap">
          <span className="h-2 w-2 rounded-full bg-gray-300 shrink-0" />
          Not set
        </span>
      );
    }
    const c = config[value];
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
        <span className={`h-2 w-2 rounded-full ${c.dot} shrink-0`} />
        {c.label}
      </span>
    );
  };

  const PAYMENT_TYPE_LABELS: Record<string, string> = {
    "Paid Online - Received": "Online · Received",
    "Paid Online - Waiting Payment Confirmation": "Online · Waiting",
    "Paid In-Store - Received": "In-Store · Received",
    "Paid In-Store - Waiting Payment Confirmation": "In-Store · Waiting",
  };
  const getPaymentTypeShort = (value: string | null) =>
    value ? (PAYMENT_TYPE_LABELS[value] ?? value) : "— Not set —";

  const getPractitionerName = (id: string | null) => {
    if (!id) return "Unassigned";
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
  };

  const getCreatedByName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
  };

  return (
    <AdminLayout currentTab="practitioner">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practitioner Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage client contacts and service requests</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Quick Links — temporarily hidden from all users (revisit later) */}
        {false && (user?.role === 'admin' || user?.role === 'manager') && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Links</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Client Records", icon: <Users className="h-5 w-5" />, colorCls: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400", path: "/practitioner/client-records" },
              { label: "Medical History", icon: <ClipboardList className="h-5 w-5" />, colorCls: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400", path: "/practitioner/medical-history" },
              { label: "Availability", icon: <Calendar className="h-5 w-5" />, colorCls: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400", path: "/practitioner/availability" },
              { label: "Health Products", icon: <ShoppingBag className="h-5 w-5" />, colorCls: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400", path: "/practitioner/health-products" },
              { label: "Invoicing", icon: <Receipt className="h-5 w-5" />, colorCls: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400", path: "/practitioner/invoicing" },
              { label: "Forms", icon: <FileText className="h-5 w-5" />, colorCls: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", path: "/practitioner/forms" },
              { label: "Tasks", icon: <CheckSquare className="h-5 w-5" />, colorCls: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400", path: "/practitioner/tasks" },
              { label: "Programs & Courses", icon: <BookOpen className="h-5 w-5" />, colorCls: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400", path: "/practitioner/programs-courses" },
              { label: "Labs", icon: <FlaskConical className="h-5 w-5" />, colorCls: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400", path: "/practitioner/labs" },
            ].map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all group text-left"
              >
                <div className={`p-2 rounded-lg shrink-0 ${link.colorCls}`}>{link.icon}</div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex-1 leading-tight">{link.label}</span>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>
        )}

        <div className="flex flex-wrap items-center gap-y-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 pr-4 border-r border-gray-200 dark:border-gray-700 mr-4">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</span>
            <span className="font-bold text-gray-900 dark:text-white text-xl leading-none">
              {(stats?.total ?? 0) + (pbCountData?.count ?? 0)}
            </span>
            <span className="text-xs text-muted-foreground">
              ({stats?.total ?? 0} intake · {pbCountData?.count ?? '…'} PB)
            </span>
          </div>
          {[
            { label: "Pending",      value: stats?.byStatus?.pending ?? 0,              color: "text-amber-600" },
            { label: "Awaiting DNA", value: stats?.byStatus?.pending_awaiting_dna ?? 0, color: "text-orange-500" },
            { label: "DNA Received", value: stats?.byStatus?.pending_dna_received ?? 0,  color: "text-green-600" },
            { label: "In Progress",  value: stats?.byStatus?.in_progress ?? 0,           color: "text-blue-600" },
            { label: "Completed",    value: stats?.byStatus?.completed ?? 0,             color: "text-purple-600" },
          ].map((stat, i, arr) => (
            <div
              key={stat.label}
              className={`flex items-center gap-2 px-4 ${i < arr.length - 1 ? 'border-r border-gray-200 dark:border-gray-700' : ''}`}
            >
              <span className="text-xs text-gray-500 whitespace-nowrap">{stat.label}</span>
              <span className={`font-bold text-lg leading-none ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 shadow-sm">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search name, phone, email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm w-52"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-sm w-36">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusTypes.map(st => (
                <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={programTypeFilter} onValueChange={setProgramTypeFilter}>
            <SelectTrigger className="h-8 text-sm w-36">
              <SelectValue placeholder="All Services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="Remote Initial Scan">Remote Initial Scan</SelectItem>
              <SelectItem value="Follow-Up Scan">Follow-Up Scan</SelectItem>
              <SelectItem value="Pet Scan">Pet Scan</SelectItem>
              <SelectItem value="Quick Calls">Quick Calls</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
            <SelectTrigger className="h-8 text-sm w-36">
              <SelectValue placeholder="All Payments" />
            </SelectTrigger>
            <SelectContent className="w-72">
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="Paid Online - Received">Paid Online - Received</SelectItem>
              <SelectItem value="Paid Online - Waiting Payment Confirmation">Paid Online - Waiting Payment Confirmation</SelectItem>
              <SelectItem value="Paid In-Store - Received">Paid In-Store - Received</SelectItem>
              <SelectItem value="Paid In-Store - Waiting Payment Confirmation">Paid In-Store - Waiting Payment Confirmation</SelectItem>
              <SelectItem value="none">— Not set —</SelectItem>
            </SelectContent>
          </Select>
          <Select value={practitionerFilter} onValueChange={setPractitionerFilter}>
            <SelectTrigger className="h-8 text-sm w-40">
              <SelectValue placeholder="All Practitioners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Practitioners</SelectItem>
              {employees.filter(e => e.isActive).map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(statusFilter !== 'all' || programTypeFilter !== 'all' || paymentTypeFilter !== 'all' || practitionerFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => { setStatusFilter('all'); setProgramTypeFilter('all'); setPaymentTypeFilter('all'); setPractitionerFilter('all'); setSearchQuery(''); }}
              className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2 ml-1"
            >
              Clear all
            </button>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Contacts</TabsTrigger>
            <TabsTrigger value="status">By Status</TabsTrigger>
            <TabsTrigger value="practitioner">By Practitioner</TabsTrigger>
            <TabsTrigger value="archive">
              Archive
              {archivedContacts.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {archivedContacts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Contacts</CardTitle>
                <CardDescription>Active service requests (pending and in progress)</CardDescription>
              </CardHeader>
              <CardContent>
                {contactsLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading contacts...</div>
                ) : activeContacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No active contacts. All contacts are archived or use the Quick Contact button to add new contacts.
                  </div>
                ) : (
                  <Table wrapperClassName="max-h-[62vh] rounded-md border">
                      <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-950 shadow-sm">
                        <TableRow>
                          <TableHead className="pl-5 w-[210px]">Client</TableHead>
                          <TableHead className="w-[160px]">Service Type</TableHead>
                          <TableHead className="w-[170px]">Status / Assigned To</TableHead>
                          <TableHead className="w-[180px]">Comments</TableHead>
                          <TableHead className="w-[148px]">Payment</TableHead>
                          <TableHead className="w-[76px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                      {activeContacts.map((contact) => {
                        const borderColorMap: Record<string, string> = {
                          pending:              '#F59E0B',
                          pending_awaiting_dna: '#F97316',
                          pending_dna_received: '#22C55E',
                          in_progress:          '#3B82F6',
                          completed:            '#A855F7',
                          cancelled:            '#9CA3AF',
                        };
                        const borderColor = borderColorMap[contact.status] || '#E5E7EB';
                        return (
                          <TableRow id={`contact-row-${contact.id}`} key={contact.id} style={{ borderLeft: `4px solid ${borderColor}` }}>
                            <TableCell className="py-2 pl-3">
                              <div className="font-medium text-sm leading-tight">
                                {contact.clientFirstName} {contact.clientLastName}
                              </div>
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                {contact.clientPhone && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Phone className="h-3 w-3 shrink-0" />{contact.clientPhone}
                                  </span>
                                )}
                                {contact.clientEmail && (
                                  <span className="text-xs text-gray-400 truncate max-w-[185px]">
                                    {contact.clientEmail}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <Select
                                value={(contact as any).scanType || "__none__"}
                                onValueChange={(value) => {
                                  updateContactMutation.mutate({
                                    id: contact.id,
                                    updates: { scanType: value === "__none__" ? null : value } as any,
                                  });
                                }}
                              >
                                <SelectTrigger className="w-44 h-7 px-2 text-xs border-transparent shadow-none hover:border-gray-200 focus:ring-0">
                                  <SelectValue>{getScanTypeChip((contact as any).scanType || parseScanTypeFromNotes(contact.clientNotes)?.split(',')[0]?.trim())}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    <span className="text-xs text-muted-foreground italic">— None —</span>
                                  </SelectItem>
                                  {SCAN_TYPE_OPTIONS.map(opt => (
                                    <SelectItem key={opt} value={opt}>
                                      {getScanTypeChip(opt)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="py-1.5">
                              <div className="flex flex-col gap-1">
                                <Select
                                  value={contact.status}
                                  onValueChange={(value) => {
                                    updateContactMutation.mutate({
                                      id: contact.id,
                                      updates: { status: value },
                                    });
                                  }}
                                >
                                  <SelectTrigger className="w-36 h-7 px-2 text-xs">
                                    <SelectValue>{getStatusChip(contact.status)}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="w-48">
                                    {statusTypes.map(st => (
                                      <SelectItem key={st.value} value={st.value}>
                                        <span className="flex items-center gap-2">{getStatusChip(st.value)}</span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={contact.assignedPractitionerId || "unassigned"}
                                  onValueChange={(value) => {
                                    updateContactMutation.mutate({
                                      id: contact.id,
                                      updates: { assignedPractitionerId: value === "unassigned" ? null : value },
                                    });
                                  }}
                                >
                                  <SelectTrigger className="w-36 h-6 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {employees.filter(e => e.isActive).map(emp => (
                                      <SelectItem key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 max-w-44">
                              <EditableComment
                                contactId={contact.id}
                                currentComment={contact.practitionerComments || ''}
                                clientNotes={contact.clientNotes}
                                onSave={(comment) => {
                                  updateContactMutation.mutate({
                                    id: contact.id,
                                    updates: { practitionerComments: comment || null },
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Select
                                value={(contact as any).paymentType || "none"}
                                onValueChange={(value) => {
                                  updateContactMutation.mutate({
                                    id: contact.id,
                                    updates: { paymentType: value === "none" ? null : value },
                                  });
                                }}
                              >
                                <SelectTrigger className="w-44 h-7 px-2 text-xs border-transparent shadow-none hover:border-gray-200 focus:ring-0">
                                  <SelectValue>{getPaymentChip((contact as any).paymentType)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent className="w-72">
                                  <SelectItem value="none">— Not set —</SelectItem>
                                  <SelectItem value="Paid Online - Received">Paid Online - Received</SelectItem>
                                  <SelectItem value="Paid Online - Waiting Payment Confirmation">Paid Online - Waiting Payment Confirmation</SelectItem>
                                  <SelectItem value="Paid In-Store - Received">Paid In-Store - Received</SelectItem>
                                  <SelectItem value="Paid In-Store - Waiting Payment Confirmation">Paid In-Store - Waiting Payment Confirmation</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="View/Edit details"
                                aria-label="View or edit contact details"
                                onClick={() => {
                                  setSelectedContact(contact);
                                  setEditFormData({
                                    clientFirstName: contact.clientFirstName || '',
                                    clientLastName: contact.clientLastName || '',
                                    clientEmail: contact.clientEmail || '',
                                    clientPhone: contact.clientPhone || '',
                                    clientNotes: contact.clientNotes || '',
                                  });
                                  setIsEditing(false);
                                  setViewDialogOpen(true);
                                }}
                                className="text-xs"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      </TableBody>
                    </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="status" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Contacts by Status</CardTitle>
                <CardDescription>Grouped by current status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {statusTypes.map(statusType => {
                    const statusContacts = contacts.filter(c => c.status === statusType.value);
                    return (
                      <Card key={statusType.value}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {getStatusBadge(statusType.value)}
                          </CardTitle>
                          <CardDescription>{statusContacts.length} contact(s)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {statusContacts.slice(0, 5).map(contact => (
                              <div key={contact.id} className="text-sm">
                                <span className="font-medium">{contact.clientFirstName} {contact.clientLastName}</span>
                              </div>
                            ))}
                            {statusContacts.length > 5 && (
                              <p className="text-sm text-gray-500">+{statusContacts.length - 5} more</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="practitioner" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Contacts by Practitioner</CardTitle>
                <CardDescription>All contacts grouped by assigned practitioner</CardDescription>
              </CardHeader>
              <CardContent>
                {contactsLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading contacts...</div>
                ) : contacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No contacts found.</div>
                ) : (
                  <Table wrapperClassName="max-h-[62vh] rounded-md border">
                      <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-950 shadow-sm">
                        <TableRow>
                          <TableHead className="pl-5 w-[210px]">Client</TableHead>
                          <TableHead className="w-[160px]">Service Type</TableHead>
                          <TableHead className="w-[170px]">Status / Assigned To</TableHead>
                          <TableHead className="w-[180px]">Comments</TableHead>
                          <TableHead className="w-[148px]">Payment</TableHead>
                          <TableHead className="w-[76px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const borderColorMap: Record<string, string> = {
                            pending:              '#F59E0B',
                            pending_awaiting_dna: '#F97316',
                            pending_dna_received: '#22C55E',
                            in_progress:          '#3B82F6',
                            completed:            '#A855F7',
                            cancelled:            '#9CA3AF',
                          };
                          const renderContactRow = (contact: PractitionerContact) => {
                            const borderColor = borderColorMap[contact.status] || '#E5E7EB';
                            return (
                              <TableRow id={`contact-row-${contact.id}`} key={contact.id} style={{ borderLeft: `4px solid ${borderColor}` }}>
                                <TableCell className="py-2 pl-3">
                                  <div className="font-medium text-sm leading-tight">
                                    {contact.clientFirstName} {contact.clientLastName}
                                  </div>
                                  <div className="flex flex-col gap-0.5 mt-0.5">
                                    {contact.clientPhone && (
                                      <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <Phone className="h-3 w-3 shrink-0" />{contact.clientPhone}
                                      </span>
                                    )}
                                    {contact.clientEmail && (
                                      <span className="text-xs text-gray-400 truncate max-w-[185px]">
                                        {contact.clientEmail}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-2">
                                  <Select
                                    value={(contact as any).scanType || "__none__"}
                                    onValueChange={(value) => {
                                      updateContactMutation.mutate({
                                        id: contact.id,
                                        updates: { scanType: value === "__none__" ? null : value } as any,
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="w-44 h-7 px-2 text-xs border-transparent shadow-none hover:border-gray-200 focus:ring-0">
                                      <SelectValue>{getScanTypeChip((contact as any).scanType || parseScanTypeFromNotes(contact.clientNotes)?.split(',')[0]?.trim())}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">
                                        <span className="text-xs text-muted-foreground italic">— None —</span>
                                      </SelectItem>
                                      {SCAN_TYPE_OPTIONS.map(opt => (
                                        <SelectItem key={opt} value={opt}>{getScanTypeChip(opt)}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="py-1.5">
                                  <div className="flex flex-col gap-1">
                                    <Select
                                      value={contact.status}
                                      onValueChange={(value) => {
                                        updateContactMutation.mutate({ id: contact.id, updates: { status: value } });
                                      }}
                                    >
                                      <SelectTrigger className="w-36 h-7 px-2 text-xs">
                                        <SelectValue>{getStatusChip(contact.status)}</SelectValue>
                                      </SelectTrigger>
                                      <SelectContent className="w-48">
                                        {statusTypes.map(st => (
                                          <SelectItem key={st.value} value={st.value}>
                                            <span className="flex items-center gap-2">{getStatusChip(st.value)}</span>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select
                                      value={contact.assignedPractitionerId || "unassigned"}
                                      onValueChange={(value) => {
                                        updateContactMutation.mutate({
                                          id: contact.id,
                                          updates: { assignedPractitionerId: value === "unassigned" ? null : value },
                                        });
                                      }}
                                    >
                                      <SelectTrigger className="w-36 h-6 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {employees.filter(e => e.isActive).map(emp => (
                                          <SelectItem key={emp.id} value={emp.id}>
                                            {emp.firstName} {emp.lastName}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2 max-w-44">
                                  <EditableComment
                                    contactId={contact.id}
                                    currentComment={contact.practitionerComments || ''}
                                    clientNotes={contact.clientNotes}
                                    onSave={(comment) => {
                                      updateContactMutation.mutate({
                                        id: contact.id,
                                        updates: { practitionerComments: comment || null },
                                      });
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="py-2">
                                  <Select
                                    value={(contact as any).paymentType || "none"}
                                    onValueChange={(value) => {
                                      updateContactMutation.mutate({
                                        id: contact.id,
                                        updates: { paymentType: value === "none" ? null : value },
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="w-44 h-7 px-2 text-xs border-transparent shadow-none hover:border-gray-200 focus:ring-0">
                                      <SelectValue>{getPaymentChip((contact as any).paymentType)}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="w-72">
                                      <SelectItem value="none">— Not set —</SelectItem>
                                      <SelectItem value="Paid Online - Received">Paid Online - Received</SelectItem>
                                      <SelectItem value="Paid Online - Waiting Payment Confirmation">Paid Online - Waiting Payment Confirmation</SelectItem>
                                      <SelectItem value="Paid In-Store - Received">Paid In-Store - Received</SelectItem>
                                      <SelectItem value="Paid In-Store - Waiting Payment Confirmation">Paid In-Store - Waiting Payment Confirmation</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="py-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedContact(contact);
                                      setEditFormData({
                                        clientFirstName: contact.clientFirstName || '',
                                        clientLastName: contact.clientLastName || '',
                                        clientEmail: contact.clientEmail || '',
                                        clientPhone: contact.clientPhone || '',
                                        clientNotes: contact.clientNotes || '',
                                      });
                                      setIsEditing(false);
                                      setViewDialogOpen(true);
                                    }}
                                    className="text-xs"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          };

                          const unassigned = contacts.filter(c => !c.assignedPractitionerId);
                          const groups: JSX.Element[] = [];

                          if (unassigned.length > 0) {
                            groups.push(
                              <Fragment key="unassigned">
                                <TableRow className="bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                  <TableCell colSpan={6} className="py-1.5 pl-4">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      <Users className="h-3.5 w-3.5" />
                                      Unassigned
                                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 font-medium">
                                        {unassigned.length}
                                      </Badge>
                                    </div>
                                  </TableCell>
                                </TableRow>
                                {unassigned.map(renderContactRow)}
                              </Fragment>
                            );
                          }

                          employees.filter(e => e.isActive).forEach(emp => {
                            const empContacts = contacts.filter(c => c.assignedPractitionerId === emp.id);
                            if (empContacts.length === 0) return;
                            groups.push(
                              <Fragment key={emp.id}>
                                <TableRow className="bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                  <TableCell colSpan={6} className="py-1.5 pl-4">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      <Users className="h-3.5 w-3.5" />
                                      {emp.firstName} {emp.lastName}
                                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 font-medium">
                                        {empContacts.length}
                                      </Badge>
                                    </div>
                                  </TableCell>
                                </TableRow>
                                {empContacts.map(renderContactRow)}
                              </Fragment>
                            );
                          });

                          return groups;
                        })()}
                      </TableBody>
                    </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="archive" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Archived Contacts</CardTitle>
                <CardDescription>Completed and cancelled service requests</CardDescription>
              </CardHeader>
              <CardContent>
                {contactsLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading contacts...</div>
                ) : archivedContacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No archived contacts. Contacts with status "Completed" or "Cancelled" will appear here.
                  </div>
                ) : (
                  <Table wrapperClassName="max-h-[62vh] rounded-md border">
                    <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-950 shadow-sm">
                      <TableRow>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Service Type</TableHead>

                        <TableHead>Comments</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Payment Type</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archivedContacts.map((contact) => (
                        <TableRow key={contact.id} className="opacity-75">
                          <TableCell className="font-medium">
                            {contact.clientFirstName} {contact.clientLastName}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              {contact.clientPhone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {contact.clientPhone}
                                </span>
                              )}
                              {contact.clientEmail && (
                                <span className="text-gray-500">{contact.clientEmail}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={(contact as any).scanType || "__none__"}
                              onValueChange={(value) => {
                                updateContactMutation.mutate({
                                  id: contact.id,
                                  updates: { scanType: value === "__none__" ? null : value } as any,
                                });
                              }}
                            >
                              <SelectTrigger className="w-44 h-7 px-2 text-xs border-transparent shadow-none hover:border-gray-200 focus:ring-0">
                                <SelectValue>{getScanTypeChip((contact as any).scanType || parseScanTypeFromNotes(contact.clientNotes)?.split(',')[0]?.trim())}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">
                                  <span className="text-xs text-muted-foreground italic">— None —</span>
                                </SelectItem>
                                {SCAN_TYPE_OPTIONS.map(opt => (
                                  <SelectItem key={opt} value={opt}>
                                    {getScanTypeChip(opt)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="max-w-48">
                            <EditableComment 
                              contactId={contact.id} 
                              currentComment={contact.practitionerComments || ''} 
                              clientNotes={contact.clientNotes}
                              onSave={(comment) => {
                                updateContactMutation.mutate({
                                  id: contact.id,
                                  updates: { practitionerComments: comment || null },
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={contact.status}
                              onValueChange={(value) => {
                                updateContactMutation.mutate({
                                  id: contact.id,
                                  updates: { status: value },
                                });
                              }}
                            >
                              <SelectTrigger className="w-36 h-7 px-2 text-xs border-transparent shadow-none hover:border-gray-200 focus:ring-0">
                                <SelectValue>{getStatusChip(contact.status)}</SelectValue>
                              </SelectTrigger>
                              <SelectContent className="w-48">
                                {statusTypes.map(st => (
                                  <SelectItem key={st.value} value={st.value}>
                                    <span className="flex items-center gap-2">{getStatusChip(st.value)}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-500">
                              {employees.find(e => e.id === contact.assignedPractitionerId)
                                ? `${employees.find(e => e.id === contact.assignedPractitionerId)!.firstName} ${employees.find(e => e.id === contact.assignedPractitionerId)!.lastName}`
                                : 'Unassigned'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {contact.completedAt 
                              ? format(new Date(contact.completedAt), 'MMM d, yyyy')
                              : contact.createdAt && format(new Date(contact.createdAt), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={(contact as any).paymentType || "none"}
                              onValueChange={(value) => {
                                updateContactMutation.mutate({
                                  id: contact.id,
                                  updates: { paymentType: value === "none" ? null : value },
                                });
                              }}
                            >
                              <SelectTrigger className="w-44 h-7 px-2 text-xs border-transparent shadow-none hover:border-gray-200 focus:ring-0">
                                <SelectValue>{getPaymentChip((contact as any).paymentType)}</SelectValue>
                              </SelectTrigger>
                              <SelectContent className="w-72">
                                <SelectItem value="none">— Not set —</SelectItem>
                                <SelectItem value="Paid Online - Received">Paid Online - Received</SelectItem>
                                <SelectItem value="Paid Online - Waiting Payment Confirmation">Paid Online - Waiting Payment Confirmation</SelectItem>
                                <SelectItem value="Paid In-Store - Received">Paid In-Store - Received</SelectItem>
                                <SelectItem value="Paid In-Store - Waiting Payment Confirmation">Paid In-Store - Waiting Payment Confirmation</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View/Edit details"
                              aria-label="View or edit contact details"
                              onClick={() => {
                                setSelectedContact(contact);
                                setEditFormData({
                                  clientFirstName: contact.clientFirstName || '',
                                  clientLastName: contact.clientLastName || '',
                                  clientEmail: contact.clientEmail || '',
                                  clientPhone: contact.clientPhone || '',
                                  clientNotes: contact.clientNotes || '',
                                });
                                setIsEditing(false);
                                setViewDialogOpen(true);
                              }}
                              className="text-xs"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View/Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={viewDialogOpen} onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) {
            setSelectedContact(null);
            setIsEditing(false);
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {isEditing ? 'Edit Contact' : 'Contact Details'}
              </DialogTitle>
              <DialogDescription>
                {isEditing 
                  ? 'Update the contact information below'
                  : `Full information for ${selectedContact?.clientFirstName} ${selectedContact?.clientLastName}`
                }
              </DialogDescription>
            </DialogHeader>
            {selectedContact && (
              <div className="space-y-6 mt-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="editFirstName">First Name *</Label>
                        <Input
                          id="editFirstName"
                          value={editFormData.clientFirstName}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, clientFirstName: e.target.value }))}
                          placeholder="First name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editLastName">Last Name</Label>
                        <Input
                          id="editLastName"
                          value={editFormData.clientLastName}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, clientLastName: e.target.value }))}
                          placeholder="Last name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="editPhone" className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Phone
                        </Label>
                        <Input
                          id="editPhone"
                          type="tel"
                          value={editFormData.clientPhone}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                          placeholder="Phone number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editEmail" className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> Email
                        </Label>
                        <Input
                          id="editEmail"
                          type="email"
                          value={editFormData.clientEmail}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                          placeholder="Email address"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editNotes" className="flex items-center gap-1">
                        <StickyNote className="h-3 w-3" /> Notes
                      </Label>
                      <Textarea
                        id="editNotes"
                        value={editFormData.clientNotes}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, clientNotes: e.target.value }))}
                        placeholder="Add notes about this contact..."
                        className="min-h-32"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsEditing(false);
                          setEditFormData({
                            clientFirstName: selectedContact.clientFirstName || '',
                            clientLastName: selectedContact.clientLastName || '',
                            clientEmail: selectedContact.clientEmail || '',
                            clientPhone: selectedContact.clientPhone || '',
                            clientNotes: selectedContact.clientNotes || '',
                          });
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => {
                          updateContactMutation.mutate({
                            id: selectedContact.id,
                            updates: {
                              clientFirstName: editFormData.clientFirstName,
                              clientLastName: editFormData.clientLastName || undefined,
                              clientEmail: editFormData.clientEmail || undefined,
                              clientPhone: editFormData.clientPhone || undefined,
                              clientNotes: editFormData.clientNotes || undefined,
                            },
                          });
                          setIsEditing(false);
                          setViewDialogOpen(false);
                        }}
                        disabled={!editFormData.clientFirstName.trim()}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save Changes
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Client Name</label>
                        <p className="text-lg font-semibold">
                          {selectedContact.clientFirstName} {selectedContact.clientLastName}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Service Type</label>
                        <ScanTypeBadges scanType={(selectedContact as any).scanType} serviceType={undefined} clientNotes={selectedContact.clientNotes} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Phone
                        </label>
                        <p>{selectedContact.clientPhone || 'Not provided'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> Email
                        </label>
                        <p>{selectedContact.clientEmail || 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Preferred Contact Method</label>
                        <p className="capitalize">{selectedContact.preferredContactMethod || 'Phone'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Priority</label>
                        <Badge 
                          variant={
                            selectedContact.priority === 'urgent' ? 'destructive' : 
                            selectedContact.priority === 'high' ? 'default' : 'secondary'
                          }
                          className="capitalize"
                        >
                          {selectedContact.priority || 'Normal'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        {getStatusBadge(selectedContact.status)}
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Assigned Practitioner</label>
                        <p>{getPractitionerName(selectedContact.assignedPractitionerId)}</p>
                      </div>
                    </div>

                    {selectedContact.preferredDateTime && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Preferred Date/Time
                        </label>
                        <p>{format(new Date(selectedContact.preferredDateTime), 'PPP p')}</p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <StickyNote className="h-3 w-3" /> Notes
                      </label>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg min-h-24">
                        {selectedContact.clientNotes ? (
                          <p className="whitespace-pre-wrap">{selectedContact.clientNotes}</p>
                        ) : (
                          <p className="text-gray-400 italic">No notes provided</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Created</label>
                        <p className="text-sm">
                          {selectedContact.createdAt && format(new Date(selectedContact.createdAt), 'PPP p')}
                        </p>
                        <p className="text-xs text-gray-400">by {getCreatedByName(selectedContact.createdBy)}</p>
                      </div>
                      {selectedContact.completedAt && (
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-500">Completed</label>
                          <p className="text-sm">{format(new Date(selectedContact.completedAt), 'PPP p')}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                      <Button 
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit Contact
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

interface EditableCommentProps {
  contactId: number;
  currentComment: string;
  clientNotes?: string | null;
  onSave: (comment: string) => void;
}

function EditableComment({ contactId, currentComment, clientNotes, onSave }: EditableCommentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState(currentComment);

  const handleSave = () => {
    onSave(comment);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setComment(currentComment);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) setComment(currentComment);
    }}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-auto p-1 w-full justify-start text-left hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {currentComment ? (
            <div className="flex items-start gap-1 max-w-44">
              <MessageSquare className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                {currentComment}
              </span>
            </div>
          ) : clientNotes ? (
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3 text-emerald-500 flex-shrink-0" />
              <span className="text-sm text-gray-900 dark:text-gray-100">Form notes</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-gray-400">
              <Edit2 className="h-3 w-3" />
              <span className="text-sm italic">Add comment</span>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[680px] p-5" align="start">
        <div className="space-y-4">
          {clientNotes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b pb-3">
                <MessageSquare className="h-5 w-5 text-emerald-500" />
                <span className="text-base font-semibold">Connect Form Comments</span>
              </div>
              <Textarea
                value={clientNotes}
                readOnly
                className="min-h-[140px] text-sm leading-relaxed resize-y bg-muted/50 text-muted-foreground cursor-default"
              />
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center gap-2 border-b pb-3">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <span className="text-base font-semibold">Practitioner Comments</span>
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add comments like 'awaiting DNA', 'call scheduled', 'health form done', etc."
              className="min-h-[140px] text-sm leading-relaxed resize-y"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" size="sm" onClick={handleCancel} className="px-5">
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="px-5 bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="h-4 w-4 mr-1.5" />
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
