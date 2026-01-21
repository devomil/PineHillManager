import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, Phone, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Filter, RefreshCw } from "lucide-react";
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

  const { data: contacts = [], isLoading: contactsLoading, refetch } = useQuery<PractitionerContact[]>({
    queryKey: ['/api/practitioner-contacts', { status: statusFilter, serviceType: serviceFilter, assignedTo: practitionerFilter }],
  });

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
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>All Client Contacts</CardTitle>
                <CardDescription>Complete list of service requests and client information</CardDescription>
              </CardHeader>
              <CardContent>
                {contactsLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading contacts...</div>
                ) : contacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No contacts found. Use the Quick Contact button to add new contacts.
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
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
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
        </Tabs>
      </div>
    </AdminLayout>
  );
}
