import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Calendar, 
  Search,
  MoreHorizontal,
  Settings,
  Key,
  Users,
  User
} from "lucide-react";
import { format } from "date-fns";
import type { User as UserType } from "@shared/schema";

// SMS Consent History Component
function SMSConsentHistoryComponent({ employeeId }: { employeeId: string }) {
  const { data: consentHistory, isLoading } = useQuery({
    queryKey: ['/api/employees', employeeId, 'sms-consent-history'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/employees/${employeeId}/sms-consent-history`);
      return response.json();
    },
    enabled: !!employeeId,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="mt-3 text-sm text-slate-500">
        Loading consent history...
      </div>
    );
  }

  if (!consentHistory || consentHistory.length === 0) {
    return (
      <div className="mt-3 text-sm text-slate-500">
        No consent history available
      </div>
    );
  }

  return (
    <div className="mt-3">
      <details className="text-sm">
        <summary className="cursor-pointer text-slate-700 hover:text-slate-900 mb-2">
          View Consent History ({consentHistory.length} records)
        </summary>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {consentHistory.map((record: any, index: number) => (
            <div key={record.id} className="flex justify-between items-start p-2 bg-slate-50 rounded text-xs">
              <div className="flex-1">
                <div className="font-medium">
                  {record.consentGiven ? "✅ Opted In" : "❌ Opted Out"}
                </div>
                <div className="text-slate-500">
                  {record.changeReason.replace(/_/g, ' ')} • {record.changeMethod.replace(/_/g, ' ')}
                </div>
                {record.notes && (
                  <div className="text-slate-600 mt-1 italic">
                    {record.notes}
                  </div>
                )}
              </div>
              <div className="text-slate-500 text-right ml-2">
                {new Date(record.createdAt).toLocaleDateString()}
                <br />
                {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

// Helper function to generate next employee ID
const generateNextEmployeeId = (baseId: string, currentCount: number): string => {
  const number = parseInt(baseId) || 1000;
  return (number + currentCount + 1).toString();
};

const addEmployeeSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  email: z.string().email("Valid email is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["employee", "manager", "admin"]),
  department: z.string().optional(),
  position: z.string().optional(),
  hireDate: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  timeOffBalance: z.number().default(24),
});

const editEmployeeSchema = z.object({
  employeeId: z.string().optional(),
  email: z.string().email("Valid email is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["employee", "manager", "admin"]),
  department: z.string().optional(),
  position: z.string().optional(),
  hireDate: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean(),
  timeOffBalance: z.number().optional(),
});

type AddEmployeeFormData = z.infer<typeof addEmployeeSchema>;
type EditEmployeeFormData = z.infer<typeof editEmployeeSchema>;

export default function AdminEmployeeManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<UserType | null>(null);
  const [keepDialogOpen, setKeepDialogOpen] = useState(false);
  const [autoIncrement, setAutoIncrement] = useState(false);
  const [baseEmployeeId, setBaseEmployeeId] = useState("");
  const [bulkTemplate, setBulkTemplate] = useState({
    department: "",
    position: "",
    hireDate: "",
    role: "employee" as const,
  });
  const { toast } = useToast();

  const { data: employees, isLoading, error } = useQuery<UserType[]>({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/employees");
      return response.json();
    },
    retry: (failureCount, error) => {
      // Don't retry on 401 Unauthorized errors
      if (error.message?.includes('401')) {
        return false;
      }
      return failureCount < 3;
    },
  });


  const addForm = useForm<AddEmployeeFormData>({
    resolver: zodResolver(addEmployeeSchema),
    defaultValues: {
      role: "employee",
      isActive: true,
      timeOffBalance: 24,
      employeeId: "",
      email: "",
      firstName: "",
      lastName: "",
    },
  });

  const editForm = useForm<EditEmployeeFormData>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      role: "employee",
      isActive: true,
      timeOffBalance: 24,
    },
  });

  // Add new employee mutation
  const addEmployeeMutation = useMutation({
    mutationFn: async (data: AddEmployeeFormData) => {
      const response = await apiRequest("POST", "/api/employees", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      
      // Only close dialog if not in continuous add mode
      if (!keepDialogOpen) {
        setAddDialogOpen(false);
      }
      
      // Reset form for next employee
      const nextEmployeeId = autoIncrement && baseEmployeeId 
        ? generateNextEmployeeId(baseEmployeeId, employees?.length || 0)
        : "";
        
      addForm.reset({
        role: keepDialogOpen ? bulkTemplate.role : "employee",
        isActive: true,
        timeOffBalance: 24,
        employeeId: nextEmployeeId,
        email: "",
        firstName: "",
        lastName: "",
        department: keepDialogOpen ? bulkTemplate.department : "",
        position: keepDialogOpen ? bulkTemplate.position : "",
        hireDate: keepDialogOpen ? bulkTemplate.hireDate : "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        emergencyContact: "",
        emergencyPhone: "",
        notes: "",
      });
      
      toast({
        title: "Employee Added",
        description: keepDialogOpen 
          ? "Employee added successfully. Ready for next employee." 
          : "New employee has been successfully added to the system.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditEmployeeFormData }) => {
      const response = await apiRequest("PATCH", `/api/employees/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setEditDialogOpen(false);
      setSelectedEmployee(null);
      editForm.reset();
      toast({
        title: "Employee Updated",
        description: "Employee information has been successfully updated.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Deactivate employee mutation
  const deactivateEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await apiRequest("PATCH", `/api/employees/${employeeId}`, { isActive: false });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Employee Deactivated",
        description: "Employee has been deactivated successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to deactivate employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  // SMS consent toggle mutation
  const smsConsentMutation = useMutation({
    mutationFn: async (data: { employeeId: string; consentValue: boolean }) => {
      const response = await apiRequest("PUT", `/api/employees/${data.employeeId}/sms-consent`, {
        consentValue: data.consentValue,
        notificationTypes: data.consentValue 
          ? ['emergency', 'schedule', 'announcements', 'reminders'] 
          : [],
        notes: `Admin ${data.consentValue ? 'enabled' : 'disabled'} SMS consent`
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${variables.employeeId}/sms-consent-history`] });
      
      // Update the selected employee data
      if (selectedEmployee && selectedEmployee.id === variables.employeeId) {
        setSelectedEmployee(prev => prev ? {
          ...prev,
          smsConsent: variables.consentValue,
          smsConsentDate: variables.consentValue ? new Date().toISOString() : prev.smsConsentDate,
          smsNotificationTypes: variables.consentValue 
            ? ['emergency', 'schedule', 'announcements', 'reminders'] 
            : []
        } : null);
      }
      
      toast({
        title: "SMS Consent Updated",
        description: `SMS consent ${variables.consentValue ? 'enabled' : 'disabled'} for ${data.user?.firstName} ${data.user?.lastName}`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized", 
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      toast({
        title: "Error",
        description: "Failed to toggle SMS consent. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSmsConsentToggle = async (employeeId: string, consentValue: boolean) => {
    try {
      await smsConsentMutation.mutateAsync({ employeeId, consentValue });
    } catch (error) {
      console.error('Error toggling SMS consent:', error);
    }
  };

  const handleEditEmployee = (employee: UserType) => {
    setSelectedEmployee(employee);
    editForm.reset({
      employeeId: employee.employeeId || "",
      email: employee.email || "",
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      role: employee.role as "employee" | "manager" | "admin",
      department: employee.department || "",
      position: employee.position || "",
      hireDate: employee.hireDate || "",
      phone: employee.phone || "",
      address: employee.address || "",
      city: employee.city || "",
      state: employee.state || "",
      zipCode: employee.zipCode || "",
      emergencyContact: employee.emergencyContact || "",
      emergencyPhone: employee.emergencyPhone || "",
      notes: employee.notes || "",
      isActive: employee.isActive ?? true,
      timeOffBalance: employee.timeOffBalance || 24,
    });
    setEditDialogOpen(true);
  };

  const onAddSubmit = (data: AddEmployeeFormData) => {
    addEmployeeMutation.mutate(data);
  };

  const onEditSubmit = (data: EditEmployeeFormData) => {
    if (!selectedEmployee) return;
    updateEmployeeMutation.mutate({ id: selectedEmployee.id, data });
  };

  const filteredEmployees = employees?.filter((employee) => {
    const matchesSearch = 
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || employee.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && employee.isActive) ||
      (statusFilter === "inactive" && !employee.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800";
      case "manager": return "bg-blue-100 text-blue-800";
      default: return "bg-green-100 text-green-800";
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-slate-200 rounded mb-4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error && !employees) {
    console.error('Error loading employees:', error);
    
    // Check if it's an auth error
    if (isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return <div>Redirecting to login...</div>;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Employees</CardTitle>
          <CardDescription>
            {error.message || 'Failed to load employee data'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
          <p className="text-slate-500 mt-1">
            Manage employee information, roles, and permissions
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Enter the employee's information to add them to the system.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="work">Work Details</TabsTrigger>
                  <TabsTrigger value="contact">Contact Info</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="add-employeeId">Employee ID *</Label>
                      <Input
                        id="add-employeeId"
                        {...addForm.register("employeeId")}
                        placeholder="EMP001"
                      />
                      {addForm.formState.errors.employeeId && (
                        <p className="text-sm text-red-500 mt-1">
                          {addForm.formState.errors.employeeId.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="add-email">Email Address *</Label>
                      <Input
                        id="add-email"
                        type="email"
                        {...addForm.register("email")}
                        placeholder="employee@pinehill.com"
                      />
                      {addForm.formState.errors.email && (
                        <p className="text-sm text-red-500 mt-1">
                          {addForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="add-firstName">First Name *</Label>
                      <Input
                        id="add-firstName"
                        {...addForm.register("firstName")}
                        placeholder="John"
                      />
                      {addForm.formState.errors.firstName && (
                        <p className="text-sm text-red-500 mt-1">
                          {addForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="add-lastName">Last Name *</Label>
                      <Input
                        id="add-lastName"
                        {...addForm.register("lastName")}
                        placeholder="Doe"
                      />
                      {addForm.formState.errors.lastName && (
                        <p className="text-sm text-red-500 mt-1">
                          {addForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="work" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="add-role">Role *</Label>
                      <Select onValueChange={(value) => addForm.setValue("role", value as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                      {addForm.formState.errors.role && (
                        <p className="text-sm text-red-500 mt-1">
                          {addForm.formState.errors.role.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="add-department">Department</Label>
                      <Input
                        id="add-department"
                        {...addForm.register("department")}
                        placeholder="Operations"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="add-position">Position</Label>
                      <Input
                        id="add-position"
                        {...addForm.register("position")}
                        placeholder="Farm Manager"
                      />
                    </div>
                    <div>
                      <Label htmlFor="add-hireDate">Hire Date</Label>
                      <Input
                        id="add-hireDate"
                        type="date"
                        {...addForm.register("hireDate")}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="add-phone">Phone Number</Label>
                      <Input
                        id="add-phone"
                        {...addForm.register("phone")}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="add-emergencyContact">Emergency Contact</Label>
                      <Input
                        id="add-emergencyContact"
                        {...addForm.register("emergencyContact")}
                        placeholder="Emergency contact name"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="add-address">Address</Label>
                      <Input
                        id="add-address"
                        {...addForm.register("address")}
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div>
                      <Label htmlFor="add-emergencyPhone">Emergency Phone</Label>
                      <Input
                        id="add-emergencyPhone"
                        {...addForm.register("emergencyPhone")}
                        placeholder="(555) 987-6543"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="add-city">City</Label>
                      <Input
                        id="add-city"
                        {...addForm.register("city")}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label htmlFor="add-state">State</Label>
                      <Input
                        id="add-state"
                        {...addForm.register("state")}
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <Label htmlFor="add-zipCode">ZIP Code</Label>
                      <Input
                        id="add-zipCode"
                        {...addForm.register("zipCode")}
                        placeholder="12345"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="add-notes">Notes</Label>
                    <Textarea
                      id="add-notes"
                      {...addForm.register("notes")}
                      placeholder="Additional notes about the employee"
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* Bulk Addition Controls */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="keep-open"
                      checked={keepDialogOpen}
                      onCheckedChange={setKeepDialogOpen}
                    />
                    <Label htmlFor="keep-open" className="text-sm font-medium">
                      Keep form open for multiple additions
                    </Label>
                  </div>
                  <div className="text-xs text-slate-500">
                    {keepDialogOpen ? "Form will stay open after adding each employee" : "Form will close after adding employee"}
                  </div>
                </div>
                
                {keepDialogOpen && (
                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <Switch
                          id="auto-increment"
                          checked={autoIncrement}
                          onCheckedChange={setAutoIncrement}
                        />
                        <Label htmlFor="auto-increment" className="text-sm font-medium">
                          Auto-increment Employee IDs
                        </Label>
                      </div>
                      {autoIncrement && (
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="base-id" className="text-xs text-slate-600">
                            Starting ID:
                          </Label>
                          <Input
                            id="base-id"
                            type="number"
                            value={baseEmployeeId}
                            onChange={(e) => setBaseEmployeeId(e.target.value)}
                            placeholder="1000"
                            className="w-20 h-8 text-xs"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                      <div className="col-span-4 text-xs font-medium text-slate-600 mb-1">
                        Default values for all new employees:
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Department</Label>
                        <Input
                          value={bulkTemplate.department}
                          onChange={(e) => setBulkTemplate(prev => ({ ...prev, department: e.target.value }))}
                          placeholder="Operations"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Position</Label>
                        <Input
                          value={bulkTemplate.position}
                          onChange={(e) => setBulkTemplate(prev => ({ ...prev, position: e.target.value }))}
                          placeholder="Farm Worker"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Hire Date</Label>
                        <Input
                          type="date"
                          value={bulkTemplate.hireDate}
                          onChange={(e) => setBulkTemplate(prev => ({ ...prev, hireDate: e.target.value }))}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Role</Label>
                        <Select onValueChange={(value) => setBulkTemplate(prev => ({ ...prev, role: value as any }))}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Employee" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddDialogOpen(false);
                    setKeepDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addEmployeeMutation.isPending}>
                  {addEmployeeMutation.isPending ? "Adding..." : keepDialogOpen ? "Add & Continue" : "Add Employee"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-farm-green" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500">Total Employees</p>
                <p className="text-2xl font-bold text-slate-900">
                  {employees?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500">Administrators</p>
                <p className="text-2xl font-bold text-slate-900">
                  {employees?.filter(emp => emp.role === 'admin').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500">Managers</p>
                <p className="text-2xl font-bold text-slate-900">
                  {employees?.filter(emp => emp.role === 'manager').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-500">Employees</p>
                <p className="text-2xl font-bold text-slate-900">
                  {employees?.filter(emp => emp.role === 'employee').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search employees by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Administrators</SelectItem>
                <SelectItem value="manager">Managers</SelectItem>
                <SelectItem value="employee">Employees</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
          <CardDescription>
            Manage employee information, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEmployees?.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={employee.profileImageUrl || ""} />
                    <AvatarFallback>
                      {employee.firstName?.[0]}{employee.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-slate-900">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      <Badge className={getRoleBadgeColor(employee.role)}>
                        {employee.role}
                      </Badge>
                      {!employee.isActive && (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-500 mt-1">
                      {employee.employeeId && (
                        <span>ID: {employee.employeeId}</span>
                      )}
                      {employee.email && (
                        <span className="flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {employee.email}
                        </span>
                      )}
                      {employee.department && (
                        <span className="flex items-center">
                          <Building className="w-3 h-3 mr-1" />
                          {employee.department}
                        </span>
                      )}
                      {employee.phone && (
                        <span className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {employee.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditEmployee(employee)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  {employee.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deactivateEmployeeMutation.mutate(employee.id)}
                      disabled={deactivateEmployeeMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {filteredEmployees?.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No employees found</h3>
                <p className="text-slate-500 mb-4">
                  {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your search criteria"
                    : "Get started by adding your first employee"}
                </p>
                {!searchTerm && roleFilter === "all" && statusFilter === "all" && (
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add First Employee
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information and settings.
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="work">Work Details</TabsTrigger>
                  <TabsTrigger value="contact">Contact Info</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-employeeId">Employee ID</Label>
                      <Input
                        id="edit-employeeId"
                        {...editForm.register("employeeId")}
                        placeholder="EMP001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-email">Email Address *</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        {...editForm.register("email")}
                      />
                      {editForm.formState.errors.email && (
                        <p className="text-sm text-red-500 mt-1">
                          {editForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-firstName">First Name *</Label>
                      <Input
                        id="edit-firstName"
                        {...editForm.register("firstName")}
                      />
                      {editForm.formState.errors.firstName && (
                        <p className="text-sm text-red-500 mt-1">
                          {editForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="edit-lastName">Last Name *</Label>
                      <Input
                        id="edit-lastName"
                        {...editForm.register("lastName")}
                      />
                      {editForm.formState.errors.lastName && (
                        <p className="text-sm text-red-500 mt-1">
                          {editForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="work" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-role">Role *</Label>
                      <Select 
                        value={editForm.watch("role")}
                        onValueChange={(value) => editForm.setValue("role", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-department">Department</Label>
                      <Input
                        id="edit-department"
                        {...editForm.register("department")}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-position">Position</Label>
                      <Input
                        id="edit-position"
                        {...editForm.register("position")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-hireDate">Hire Date</Label>
                      <Input
                        id="edit-hireDate"
                        type="date"
                        {...editForm.register("hireDate")}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-phone">Phone Number</Label>
                      <Input
                        id="edit-phone"
                        {...editForm.register("phone")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-emergencyContact">Emergency Contact</Label>
                      <Input
                        id="edit-emergencyContact"
                        {...editForm.register("emergencyContact")}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-address">Address</Label>
                      <Input
                        id="edit-address"
                        {...editForm.register("address")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-emergencyPhone">Emergency Phone</Label>
                      <Input
                        id="edit-emergencyPhone"
                        {...editForm.register("emergencyPhone")}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-city">City</Label>
                      <Input
                        id="edit-city"
                        {...editForm.register("city")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-state">State</Label>
                      <Input
                        id="edit-state"
                        {...editForm.register("state")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-zipCode">ZIP Code</Label>
                      <Input
                        id="edit-zipCode"
                        {...editForm.register("zipCode")}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Textarea
                      id="edit-notes"
                      {...editForm.register("notes")}
                      rows={3}
                    />
                  </div>

                  {/* SMS Consent History Section */}
                  {selectedEmployee && (
                    <div className="border-t-2 border-blue-200 pt-6 mt-6 bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-base font-semibold text-slate-900">📱 SMS Consent History</h4>
                        <Badge variant={selectedEmployee.smsConsent ? "default" : "secondary"} className="text-sm px-3 py-1">
                          {selectedEmployee.smsConsent ? "✅ Consented" : "❌ No Consent"}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">SMS Enabled:</span>
                          <span>{selectedEmployee.smsEnabled ? "Yes" : "No"}</span>
                        </div>
                        {selectedEmployee.smsConsentDate && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Consent Date:</span>
                            <span>{new Date(selectedEmployee.smsConsentDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Notification Types:</span>
                          <span className="text-right">
                            {selectedEmployee.smsNotificationTypes?.join(", ") || "None"}
                          </span>
                        </div>
                      </div>

                      <SMSConsentHistoryComponent employeeId={selectedEmployee.id} />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="edit-isActive">Account Status</Label>
                        <p className="text-sm text-slate-500">
                          Deactivated employees cannot access the system
                        </p>
                      </div>
                      <Switch
                        id="edit-isActive"
                        checked={editForm.watch("isActive")}
                        onCheckedChange={(checked) => editForm.setValue("isActive", checked)}
                      />
                    </div>

                    {selectedEmployee && (
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="sms-consent-toggle">SMS Consent</Label>
                          <p className="text-sm text-slate-500">
                            Allow this employee to receive SMS notifications
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={selectedEmployee.smsConsent ? "default" : "secondary"} className="text-xs">
                            {selectedEmployee.smsConsent ? "✅ Enabled" : "❌ Disabled"}
                          </Badge>
                          <Switch
                            id="sms-consent-toggle"
                            checked={selectedEmployee.smsConsent || false}
                            onCheckedChange={async (checked) => {
                              await handleSmsConsentToggle(selectedEmployee.id, checked);
                            }}
                            disabled={smsConsentMutation.isPending}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="edit-timeOffBalance">Time Off Balance (days)</Label>
                      <Input
                        id="edit-timeOffBalance"
                        type="number"
                        {...editForm.register("timeOffBalance", { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateEmployeeMutation.isPending}>
                  {updateEmployeeMutation.isPending ? "Updating..." : "Update Employee"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}