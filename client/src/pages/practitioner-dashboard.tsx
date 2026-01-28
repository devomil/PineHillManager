import { useState } from "react";
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
import { Users, Phone, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Filter, RefreshCw, Eye, Mail, StickyNote, MessageSquare, Edit2, Save, X, Pencil } from "lucide-react";
import { format } from "date-fns";
import type { PractitionerContact, User } from "@shared/schema";

type StatusType = {
  value: string;
  label: string;
  color: string;
};

export default function PractitionerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [practitionerFilter, setPractitionerFilter] = useState<string>("all");
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
    queryKey: ['/api/practitioner-contacts', { status: statusFilter, serviceType: serviceFilter, assignedTo: practitionerFilter }],
  });

  // Filter contacts into active and archived
  const activeContacts = contacts.filter(c => c.status !== 'completed' && c.status !== 'cancelled');
  const archivedContacts = contacts.filter(c => c.status === 'completed' || c.status === 'cancelled');

  const { data: stats } = useQuery<{
    total: number;
    byStatus: Record<string, number>;
    byServiceType: Record<string, number>;
  }>({
    queryKey: ['/api/practitioner-contacts/stats'],
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
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      in_progress: { variant: "default", icon: AlertCircle },
      completed: { variant: "outline", icon: CheckCircle },
      cancelled: { variant: "destructive", icon: XCircle },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats?.byStatus?.pending || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats?.byStatus?.in_progress || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.byStatus?.completed || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="w-48">
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statusTypes.map(st => (
                      <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <label className="text-sm font-medium mb-1 block">Service Type</label>
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {serviceTypes.map(st => (
                      <SelectItem key={st} value={st}>{st}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <label className="text-sm font-medium mb-1 block">Assigned Practitioner</label>
                <Select value={practitionerFilter} onValueChange={setPractitionerFilter}>
                  <SelectTrigger>
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
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Contacts</TabsTrigger>
            <TabsTrigger value="service">By Service Type</TabsTrigger>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Service Type</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Comments</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeContacts.map((contact) => (
                        <TableRow key={contact.id}>
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
                            <Badge variant="outline">{contact.serviceType}</Badge>
                          </TableCell>
                          <TableCell className="max-w-48">
                            {contact.clientNotes ? (
                              <div className="flex items-start gap-1">
                                <StickyNote className="h-3 w-3 mt-1 text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                  {contact.clientNotes}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 italic">No notes</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-48">
                            <EditableComment 
                              contactId={contact.id} 
                              currentComment={contact.practitionerComments || ''} 
                              onSave={(comment) => {
                                updateContactMutation.mutate({
                                  id: contact.id,
                                  updates: { practitionerComments: comment || null },
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell>{getStatusBadge(contact.status)}</TableCell>
                          <TableCell>
                            <Select
                              value={contact.assignedPractitionerId || "unassigned"}
                              onValueChange={(value) => {
                                updateContactMutation.mutate({
                                  id: contact.id,
                                  updates: { assignedPractitionerId: value === "unassigned" ? null : value },
                                });
                              }}
                            >
                              <SelectTrigger className="w-40">
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
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {contact.createdAt && format(new Date(contact.createdAt), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
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
                              <Select
                                value={contact.status}
                                onValueChange={(value) => {
                                  updateContactMutation.mutate({
                                    id: contact.id,
                                    updates: { status: value },
                                  });
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {statusTypes.map(st => (
                                    <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="service" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Contacts by Service Type</CardTitle>
                <CardDescription>Grouped by type of service requested</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {serviceTypes.map(serviceType => {
                    const serviceContacts = contacts.filter(c => c.serviceType === serviceType);
                    return (
                      <Card key={serviceType}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{serviceType}</CardTitle>
                          <CardDescription>{serviceContacts.length} contact(s)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {serviceContacts.slice(0, 5).map(contact => (
                              <div key={contact.id} className="flex justify-between items-center text-sm">
                                <span>{contact.clientFirstName} {contact.clientLastName}</span>
                                {getStatusBadge(contact.status)}
                              </div>
                            ))}
                            {serviceContacts.length > 5 && (
                              <p className="text-sm text-gray-500">+{serviceContacts.length - 5} more</p>
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
                                <span className="text-gray-500 ml-2">({contact.serviceType})</span>
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
                <CardDescription>Grouped by assigned practitioner</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Unassigned
                      </CardTitle>
                      <CardDescription>
                        {contacts.filter(c => !c.assignedPractitionerId).length} contact(s)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {contacts.filter(c => !c.assignedPractitionerId).slice(0, 5).map(contact => (
                          <div key={contact.id} className="flex justify-between items-center text-sm">
                            <span>{contact.clientFirstName} {contact.clientLastName}</span>
                            {getStatusBadge(contact.status)}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  {employees.filter(e => e.isActive).map(emp => {
                    const practitionerContacts = contacts.filter(c => c.assignedPractitionerId === emp.id);
                    if (practitionerContacts.length === 0) return null;
                    return (
                      <Card key={emp.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {emp.firstName} {emp.lastName}
                          </CardTitle>
                          <CardDescription>{practitionerContacts.length} contact(s)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {practitionerContacts.slice(0, 5).map(contact => (
                              <div key={contact.id} className="flex justify-between items-center text-sm">
                                <span>{contact.clientFirstName} {contact.clientLastName}</span>
                                {getStatusBadge(contact.status)}
                              </div>
                            ))}
                            {practitionerContacts.length > 5 && (
                              <p className="text-sm text-gray-500">+{practitionerContacts.length - 5} more</p>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Service Type</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Comments</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Completed</TableHead>
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
                            <Badge variant="outline">{contact.serviceType}</Badge>
                          </TableCell>
                          <TableCell className="max-w-48">
                            {contact.clientNotes ? (
                              <div className="flex items-start gap-1">
                                <StickyNote className="h-3 w-3 mt-1 text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                  {contact.clientNotes}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 italic">No notes</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-48">
                            <EditableComment 
                              contactId={contact.id} 
                              currentComment={contact.practitionerComments || ''} 
                              onSave={(comment) => {
                                updateContactMutation.mutate({
                                  id: contact.id,
                                  updates: { practitionerComments: comment || null },
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell>{getStatusBadge(contact.status)}</TableCell>
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
                            <div className="flex items-center gap-2">
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
                              <Select
                                value={contact.status}
                                onValueChange={(value) => {
                                  updateContactMutation.mutate({
                                    id: contact.id,
                                    updates: { status: value },
                                  });
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {statusTypes.map(st => (
                                    <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
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
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl">
                    {isEditing ? 'Edit Contact' : 'Contact Details'}
                  </DialogTitle>
                  <DialogDescription>
                    {isEditing 
                      ? 'Update the contact information below'
                      : `Full information for ${selectedContact?.clientFirstName} ${selectedContact?.clientLastName}`
                    }
                  </DialogDescription>
                </div>
                {!isEditing && selectedContact && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Client Name</label>
                        <p className="text-lg font-semibold">
                          {selectedContact.clientFirstName} {selectedContact.clientLastName}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Service Type</label>
                        <Badge variant="outline" className="text-sm">
                          {selectedContact.serviceType}
                        </Badge>
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
  onSave: (comment: string) => void;
}

function EditableComment({ contactId, currentComment, onSave }: EditableCommentProps) {
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
          ) : (
            <div className="flex items-center gap-1 text-gray-400">
              <Edit2 className="h-3 w-3" />
              <span className="text-sm italic">Add comment</span>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Practitioner Comments</span>
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add comments like 'awaiting DNA', 'call scheduled', etc."
            className="min-h-[80px] text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
