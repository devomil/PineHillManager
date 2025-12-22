import { useState, useEffect } from "react";
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
import UserAvatar from "@/components/user-avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  User,
  Clock,
  Download,
  Eye,
  FileText,
  LogOut,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { format } from "date-fns";
import type { User as UserType } from "@shared/schema";
import AdminEmployeePurchases from "@/pages/admin/admin-employee-purchases";

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

// Scheduled vs Actual Hours Report Component
function ScheduledVsActualReport() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  
  const { data: employees } = useQuery<any[]>({
    queryKey: ['/api/employees'],
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['/api/admin/time-clock/scheduled-vs-actual', dateRange.startDate, dateRange.endDate, selectedEmployee],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      if (selectedEmployee && selectedEmployee !== 'all') {
        params.append('employeeId', selectedEmployee);
      }
      const response = await apiRequest('GET', `/api/admin/time-clock/scheduled-vs-actual?${params.toString()}`);
      return response.json();
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00');
    return format(date, 'MMM d, yyyy');
  };

  const totalScheduledHours = reportData?.reduce((sum: number, item: any) => sum + item.scheduledHours, 0) || 0;
  const totalActualHours = reportData?.reduce((sum: number, item: any) => sum + item.actualHours, 0) || 0;
  const totalScheduledCost = reportData?.reduce((sum: number, item: any) => sum + item.scheduledCost, 0) || 0;
  const totalActualCost = reportData?.reduce((sum: number, item: any) => sum + item.actualCost, 0) || 0;
  const totalVarianceHours = totalActualHours - totalScheduledHours;
  const totalVarianceCost = totalActualCost - totalScheduledCost;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>From Date</Label>
          <Input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            data-testid="input-start-date"
          />
        </div>
        <div>
          <Label>To Date</Label>
          <Input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            data-testid="input-end-date"
          />
        </div>
        <div>
          <Label>Employee</Label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger data-testid="select-employee">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees?.map((emp: UserType) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Scheduled Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScheduledHours.toFixed(2)}h</div>
            <div className="text-sm text-gray-500">${totalScheduledCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Actual Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActualHours.toFixed(2)}h</div>
            <div className="text-sm text-gray-500">${totalActualCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Variance Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-1 ${totalVarianceHours > 0 ? 'text-orange-600' : totalVarianceHours < 0 ? 'text-green-600' : 'text-gray-900'}`}>
              {totalVarianceHours > 0 && <TrendingUp className="w-5 h-5" />}
              {totalVarianceHours < 0 && <TrendingDown className="w-5 h-5" />}
              {totalVarianceHours === 0 && <Minus className="w-5 h-5" />}
              {Math.abs(totalVarianceHours).toFixed(2)}h
            </div>
            <div className="text-sm text-gray-500">{totalVarianceHours > 0 ? 'Over' : totalVarianceHours < 0 ? 'Under' : 'On Target'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Cost Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalVarianceCost > 0 ? 'text-orange-600' : totalVarianceCost < 0 ? 'text-green-600' : 'text-gray-900'}`}>
              {totalVarianceCost > 0 ? '+' : ''} ${totalVarianceCost.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">{totalVarianceCost > 0 ? 'Over Budget' : totalVarianceCost < 0 ? 'Under Budget' : 'On Budget'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : reportData && reportData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Scheduled</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actual</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Variance</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Scheduled Cost</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actual Cost</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Cost Variance</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row: any, index: number) => (
                <tr key={`${row.userId}-${row.date}`} className="border-b border-gray-200 hover:bg-gray-50 transition-colors" data-testid={`report-row-${index}`}>
                  <td className="py-3 px-4 text-sm">{formatDate(row.date)}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{row.employeeName}</div>
                  </td>
                  <td className="py-3 px-4 text-sm font-mono">{row.scheduledHours.toFixed(2)}h</td>
                  <td className="py-3 px-4 text-sm font-mono">{row.actualHours.toFixed(2)}h</td>
                  <td className="py-3 px-4">
                    <div className={`flex items-center gap-1 text-sm font-mono ${row.varianceHours > 0 ? 'text-orange-600' : row.varianceHours < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      {row.varianceHours > 0 && <TrendingUp className="w-4 h-4" />}
                      {row.varianceHours < 0 && <TrendingDown className="w-4 h-4" />}
                      {row.varianceHours === 0 && <Minus className="w-4 h-4" />}
                      {row.varianceHours > 0 ? '+' : ''}{row.varianceHours.toFixed(2)}h ({row.variancePercentage}%)
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm font-mono">${row.scheduledCost.toFixed(2)}</td>
                  <td className="py-3 px-4 text-sm font-mono">${row.actualCost.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <div className={`text-sm font-mono ${row.varianceCost > 0 ? 'text-orange-600' : row.varianceCost < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      {row.varianceCost > 0 ? '+' : ''}${row.varianceCost.toFixed(2)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No data found</h3>
          <p className="text-slate-500">
            No scheduled shifts or time entries found for the selected date range.
          </p>
        </div>
      )}
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
  hourlyRate: z.string().optional(),
  defaultEntryCost: z.string().optional(),
  employeePurchaseEnabled: z.boolean().default(false),
  employeePurchaseCap: z.string().optional(),
  employeePurchaseCostMarkup: z.string().optional(),
  employeePurchaseRetailDiscount: z.string().optional(),
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
  smsConsent: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  smsNotificationTypes: z.array(z.string()).optional(),
});

// Financial form schema to handle decimal inputs and benefits
const financialFormSchema = z.object({
  hourlyRate: z.string().optional(),
  defaultEntryCost: z.string().optional(),
  ymcaBenefitEnabled: z.boolean().default(false),
  ymcaAmount: z.string().optional(),
  employeePurchaseEnabled: z.boolean().default(false),
  employeePurchaseCap: z.string().optional(),
  employeePurchaseCostMarkup: z.string().optional(),
  employeePurchaseRetailDiscount: z.string().optional(),
});

type AddEmployeeFormData = z.infer<typeof addEmployeeSchema>;
type EditEmployeeFormData = z.infer<typeof editEmployeeSchema>;
type FinancialFormData = z.infer<typeof financialFormSchema>;

export default function AdminEmployeeManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<UserType | null>(null);
  const [financialUpdateTrigger, setFinancialUpdateTrigger] = useState(0);
  const [keepDialogOpen, setKeepDialogOpen] = useState(false);
  const [autoIncrement, setAutoIncrement] = useState(false);
  const [baseEmployeeId, setBaseEmployeeId] = useState("");
  const [bulkTemplate, setBulkTemplate] = useState({
    department: "",
    position: "",
    hireDate: "",
    role: "employee" as const,
  });

  // Time Clock specific state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState("employees");
  const [editTimeEntryDialogOpen, setEditTimeEntryDialogOpen] = useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = useState<any>(null);

  // Reactivate employee state
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [employeeToReactivate, setEmployeeToReactivate] = useState<{ id: string; name: string } | null>(null);

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

  // Financial data query - fetch when employee is selected for editing
  const { data: financialData, isLoading: financialDataLoading, refetch: refetchFinancialData } = useQuery({
    queryKey: ['/api/employees', selectedEmployee?.id, 'financials'],
    queryFn: async () => {
      if (!selectedEmployee?.id) return null;
      const response = await apiRequest('GET', `/api/employees/${selectedEmployee.id}/financials`);
      return response.json();
    },
    enabled: !!selectedEmployee?.id && editDialogOpen,
    staleTime: 30000,
  });

  // Time Clock queries
  const { data: timeEntries = [], isLoading: timeEntriesLoading } = useQuery({
    queryKey: ['/api/admin/time-clock/entries', selectedEmployeeId, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: fromDate,
        endDate: toDate,
      });
      if (selectedEmployeeId !== 'all') {
        params.set('employeeId', selectedEmployeeId);
      }
      const response = await apiRequest('GET', `/api/admin/time-clock/entries?${params}`);
      return response.json();
    },
    enabled: activeTab === 'time-clock',
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: checkedInEmployees = [], isLoading: checkedInLoading } = useQuery({
    queryKey: ['/api/admin/time-clock/who-checked-in'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/time-clock/who-checked-in');
      return response.json();
    },
    enabled: activeTab === 'time-clock',
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });


  // Time Clock mutations
  const exportTimeEntriesMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        startDate: fromDate,
        endDate: toDate,
        format: 'csv'
      });
      if (selectedEmployeeId !== 'all') {
        params.set('employeeId', selectedEmployeeId);
      }
      
      const response = await fetch(`/api/admin/time-clock/export?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to export time entries');
      }
      
      const csvData = await response.text();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timesheet-${fromDate}-${toDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Export Successful",
        description: "Time entries have been exported to CSV",
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Failed to export time entries",
        variant: "destructive",
      });
    },
  });

  // Admin Clock-Out mutation
  const adminClockOutMutation = useMutation({
    mutationFn: async ({ userId, employeeName }: { userId: string; employeeName: string }) => {
      const response = await apiRequest("POST", `/api/admin/time-clock/clock-out/${userId}`, {
        notes: `Clocked out by admin via employee management panel`
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/admin/time-clock/who-checked-in'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/time-clock/entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/presence'] });
      
      toast({
        title: "Employee Clocked Out",
        description: `${variables.employeeName} has been successfully clocked out.`,
      });
    },
    onError: (error: any) => {
      console.error('Admin clock-out error:', error);
      toast({
        title: "Clock-Out Failed",
        description: error.message || "Failed to clock out employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Time Entry edit/delete mutations
  const deleteTimeEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/time-clock/entries/${entryId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/time-clock/entries'] });
      toast({
        title: "Time Entry Deleted",
        description: "Time entry has been successfully deleted.",
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
        description: "Failed to delete time entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTimeEntryMutation = useMutation({
    mutationFn: async ({ entryId, data }: { entryId: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/time-clock/entries/${entryId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/time-clock/entries'] });
      setEditTimeEntryDialogOpen(false);
      setSelectedTimeEntry(null);
      toast({
        title: "Time Entry Updated",
        description: "Time entry has been successfully updated.",
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
        description: "Failed to update time entry. Please try again.",
        variant: "destructive",
      });
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
      hourlyRate: "",
      defaultEntryCost: "",
      employeePurchaseEnabled: false,
      employeePurchaseCap: "75.00",
      employeePurchaseCostMarkup: "0.00",
      employeePurchaseRetailDiscount: "0.00",
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

  const financialForm = useForm<FinancialFormData>({
    resolver: zodResolver(financialFormSchema),
    defaultValues: {
      hourlyRate: "",
      defaultEntryCost: "",
      ymcaBenefitEnabled: false,
      ymcaAmount: "",
      employeePurchaseEnabled: false,
      employeePurchaseCap: "75.00",
      employeePurchaseCostMarkup: "0.00",
      employeePurchaseRetailDiscount: "0.00",
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
    onError: async (error: any) => {
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
      
      // Try to extract the error message from the server response
      let errorMessage = "Failed to add employee. Please try again.";
      let canReactivate = false;
      let existingEmployeeId = "";
      let employeeName = "";
      
      if (error?.message) {
        // Check if it contains a server message (e.g., "409: Employee ID belongs to inactive...")
        const match = error.message.match(/^(\d+):\s*(.*)/);
        if (match) {
          const statusCode = match[1];
          errorMessage = match[2];
          
          // Check for reactivation option (409 status with specific message)
          if (statusCode === "409") {
            // Try to parse JSON from the error to get the existingEmployeeId
            try {
              // The error object might have additional data
              const nameMatch = errorMessage.match(/inactive employee \(([^)]+)\)/);
              if (nameMatch) {
                employeeName = nameMatch[1];
                canReactivate = true;
                // Find the employee from the employees list
                const inactiveEmployee = employees?.find(e => 
                  e.employeeId === addForm.getValues("employeeId") && !e.isActive
                );
                if (inactiveEmployee) {
                  existingEmployeeId = inactiveEmployee.id;
                }
              }
            } catch {
              // Continue with regular error handling
            }
          }
        } else {
          errorMessage = error.message;
        }
      }
      
      if (canReactivate && existingEmployeeId) {
        setEmployeeToReactivate({ id: existingEmployeeId, name: employeeName });
        setReactivateDialogOpen(true);
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
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
      financialForm.reset();
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

  // Update financial data mutation
  const updateFinancialMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/employees/${id}/financials`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", selectedEmployee?.id, "financials"] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/time-clock/entries'] });
      toast({
        title: "Financial Information Updated",
        description: "Employee financial information has been successfully updated.",
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
        description: "Failed to update financial information. Please try again.",
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

  // Reactivate employee mutation
  const reactivateEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await apiRequest("POST", `/api/employees/${employeeId}/reactivate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setReactivateDialogOpen(false);
      setAddDialogOpen(false);
      setEmployeeToReactivate(null);
      addForm.reset();
      toast({
        title: "Employee Reactivated",
        description: "The employee has been reactivated successfully.",
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
        description: "Failed to reactivate employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle edit time entry
  const handleEditTimeEntry = (entry: any) => {
    setSelectedTimeEntry(entry);
    setEditTimeEntryDialogOpen(true);
  };

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
          smsConsentDate: variables.consentValue ? new Date() : prev?.smsConsentDate || null,
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

  // Initialize financial form data when financial data is loaded
  useEffect(() => {
    if (financialData && selectedEmployee) {
      // Extract benefits data
      const benefits = financialData.benefits || [];
      const ymcaBenefit = benefits.find((b: any) => b.type === 'ymca');
      const purchaseBenefit = benefits.find((b: any) => b.type === 'employee_purchase');
      
      // Helper function to format decimal values for form display
      const formatForDisplay = (value: number | string | null | undefined): string => {
        if (value === null || value === undefined || value === '') return '';
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(num) ? '' : num.toFixed(2);
      };
      
      financialForm.reset({
        hourlyRate: formatForDisplay(financialData.hourlyRate),
        defaultEntryCost: formatForDisplay(financialData.defaultEntryCost),
        ymcaBenefitEnabled: ymcaBenefit?.active || false,
        ymcaAmount: formatForDisplay(ymcaBenefit?.amount),
        employeePurchaseEnabled: financialData.employeePurchaseEnabled || false,
        employeePurchaseCap: formatForDisplay(financialData.employeePurchaseCap) || "75.00",
        employeePurchaseCostMarkup: formatForDisplay(financialData.employeePurchaseCostMarkup) || "0.00",
        employeePurchaseRetailDiscount: formatForDisplay(financialData.employeePurchaseRetailDiscount) || "0.00",
      });
    }
  }, [financialData, selectedEmployee, financialForm]);

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
      smsConsent: employee.smsConsent || false,
      smsEnabled: employee.smsEnabled || true,
      smsNotificationTypes: employee.smsNotificationTypes || ['emergency'],
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

  const onFinancialSubmit = (data: FinancialFormData) => {
    if (!selectedEmployee) return;
    
    // Helper function to safely parse and format decimal values
    const formatDecimal = (value: string | undefined): number | undefined => {
      if (!value || value === '') return undefined;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    };
    
    // Transform form data to match backend schema with proper decimal formatting
    const benefits: any[] = [];
    
    // Add YMCA benefit if enabled
    if (data.ymcaBenefitEnabled && data.ymcaAmount) {
      const ymcaAmountNum = formatDecimal(data.ymcaAmount);
      if (ymcaAmountNum !== undefined) {
        benefits.push({
          id: `ymca-${selectedEmployee.id}`,
          type: 'ymca',
          name: 'YMCA Stipend',
          cadence: 'monthly',
          amount: ymcaAmountNum,
          active: true,
        });
      }
    }
    
    // Add employee purchase benefit if enabled
    if (data.employeePurchaseEnabled && data.employeePurchaseCap) {
      const purchaseCapNum = formatDecimal(data.employeePurchaseCap);
      if (purchaseCapNum !== undefined) {
        benefits.push({
          id: `purchase-${selectedEmployee.id}`,
          type: 'employee_purchase',
          name: 'Employee Purchase Allowance',
          cadence: 'monthly',
          cap: purchaseCapNum,
          active: true,
        });
      }
    }
    
    const financialData = {
      hourlyRate: formatDecimal(data.hourlyRate),
      defaultEntryCost: formatDecimal(data.defaultEntryCost),
      benefits: benefits,
      employeePurchaseEnabled: data.employeePurchaseEnabled,
      employeePurchaseCap: data.employeePurchaseCap,
      employeePurchaseCostMarkup: data.employeePurchaseCostMarkup,
      employeePurchaseRetailDiscount: data.employeePurchaseRetailDiscount,
    };
    
    updateFinancialMutation.mutate({ id: selectedEmployee.id, data: financialData });
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

  // Helper functions for Time Clock calculations
  const formatTime = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const calculateHours = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const decimal = (totalMinutes / 60).toFixed(2);
    return { hours, minutes, decimal };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
          <p className="text-slate-500 mt-1">
            Manage employee information, roles, permissions, and time clock monitoring
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="employees" data-testid="tab-employees">
            <Users className="w-4 h-4 mr-2" />
            Employee Management
          </TabsTrigger>
          <TabsTrigger value="employee-purchase" data-testid="tab-employee-purchase">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Employee Purchase
          </TabsTrigger>
          <TabsTrigger value="time-clock" data-testid="tab-time-clock">
            <Clock className="w-4 h-4 mr-2" />
            Time Clock
          </TabsTrigger>
          <TabsTrigger value="reporting" data-testid="tab-reporting">
            <FileText className="w-4 h-4 mr-2" />
            Reporting
          </TabsTrigger>
        </TabsList>

        {/* Employee Management Tab */}
        <TabsContent value="employees" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-employee">
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
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="work">Work Details</TabsTrigger>
                  <TabsTrigger value="contact">Contact Info</TabsTrigger>
                  <TabsTrigger value="compensation">Compensation</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
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

                <TabsContent value="compensation" className="space-y-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-slate-900 mb-4">Financial Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="add-hourlyRate">Hourly Rate ($)</Label>
                          <Input
                            id="add-hourlyRate"
                            type="number"
                            step="0.01"
                            placeholder="15.00"
                            {...addForm.register("hourlyRate")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="add-defaultEntryCost">Default Entry Cost ($)</Label>
                          <Input
                            id="add-defaultEntryCost"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...addForm.register("defaultEntryCost")}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-slate-900 mb-4">Employee Purchase Allowance</h3>
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <Switch
                            id="add-purchase-allowance"
                            checked={addForm.watch("employeePurchaseEnabled")}
                            onCheckedChange={(checked) => addForm.setValue("employeePurchaseEnabled", checked)}
                          />
                          <Label htmlFor="add-purchase-allowance" className="font-medium">Enable Employee Purchase Allowance</Label>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="add-purchase-cap">Monthly Cap ($)</Label>
                            <Input
                              id="add-purchase-cap"
                              type="number"
                              step="0.01"
                              placeholder="75.00"
                              {...addForm.register("employeePurchaseCap")}
                              disabled={!addForm.watch("employeePurchaseEnabled")}
                            />
                          </div>
                          <div>
                            <Label htmlFor="add-cost-markup" className="text-sm">
                              Cost Markup % <span className="text-xs text-slate-500">(before cap)</span>
                            </Label>
                            <Input
                              id="add-cost-markup"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...addForm.register("employeePurchaseCostMarkup")}
                              disabled={!addForm.watch("employeePurchaseEnabled")}
                            />
                          </div>
                          <div>
                            <Label htmlFor="add-retail-discount" className="text-sm">
                              Retail Discount % <span className="text-xs text-slate-500">(after cap)</span>
                            </Label>
                            <Input
                              id="add-retail-discount"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...addForm.register("employeePurchaseRetailDiscount")}
                              disabled={!addForm.watch("employeePurchaseEnabled")}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="add-isActive"
                        checked={addForm.watch("isActive")}
                        onCheckedChange={(checked) => addForm.setValue("isActive", checked)}
                      />
                      <Label htmlFor="add-isActive">Active Employee</Label>
                    </div>

                    <div>
                      <Label htmlFor="add-timeOffBalance">Time Off Balance (days)</Label>
                      <Input
                        id="add-timeOffBalance"
                        type="number"
                        {...addForm.register("timeOffBalance", { valueAsNumber: true })}
                        placeholder="24"
                      />
                    </div>
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
                  <UserAvatar user={{
                    ...employee,
                    firstName: employee.firstName ?? undefined,
                    lastName: employee.lastName ?? undefined,
                  }} size="lg" />
                  
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
            
    {/* Employee List and Filters */}
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>All Employees ({filteredEmployees?.length || 0})</CardTitle>
            <CardDescription>
              Manage and monitor all employee accounts
            </CardDescription>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 min-w-[200px]"
                data-testid="input-employee-search"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-role-filter">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredEmployees?.map((employee) => (
            <div
              key={employee.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
              data-testid={`employee-card-${employee.id}`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                  {employee.firstName?.[0]}{employee.lastName?.[0]}
                </div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-slate-900">
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
                  data-testid={`button-edit-${employee.id}`}
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
                    data-testid={`button-deactivate-${employee.id}`}
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
  </TabsContent>

  {/* Employee Purchase Tab */}
  <TabsContent value="employee-purchase" className="space-y-6">
    <AdminEmployeePurchases />
  </TabsContent>

  {/* Time Clock Tab */}
  <TabsContent value="time-clock" className="space-y-6">
    {/* Time Clock Controls */}
    <Card>
      <CardHeader>
        <CardTitle>Time Clock Administration</CardTitle>
        <CardDescription>
          Monitor employee time entries and export payroll data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="employee-select">Employee</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger data-testid="select-employee">
                <SelectValue placeholder="Select employee..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees?.filter(emp => emp.isActive).map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="from-date">From Date</Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              data-testid="input-from-date"
            />
          </div>
          
          <div>
            <Label htmlFor="to-date">To Date</Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              data-testid="input-to-date"
            />
          </div>
          
          <Button
            onClick={() => exportTimeEntriesMutation.mutate()}
            disabled={exportTimeEntriesMutation.isPending}
            data-testid="button-export-timesheet"
          >
            <Download className="w-4 h-4 mr-2" />
            {exportTimeEntriesMutation.isPending ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Who's Checked In Card */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Eye className="w-5 h-5 mr-2" />
          Who's Checked In Right Now
        </CardTitle>
      </CardHeader>
      <CardContent>
        {checkedInLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : checkedInEmployees.length > 0 ? (
          <div className="space-y-2">
            {checkedInEmployees.map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium">
                    {entry.firstName?.[0]}{entry.lastName?.[0]}
                  </div>
                  <div>
                    <p className="font-medium">{entry.firstName} {entry.lastName}</p>
                    <p className="text-sm text-slate-500">
                      Checked in at {formatTime(entry.clockInTime)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    Currently Working
                  </Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        data-testid={`button-clockout-${entry.userId}`}
                        disabled={adminClockOutMutation.isPending}
                      >
                        <LogOut className="w-3 h-3 mr-1" />
                        Clock Out
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clock Out Employee</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to clock out <strong>{entry.firstName} {entry.lastName}</strong>? 
                          This will end their current work session and cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => adminClockOutMutation.mutate({ 
                            userId: entry.userId, 
                            employeeName: `${entry.firstName} ${entry.lastName}` 
                          })}
                          className="bg-red-600 hover:bg-red-700"
                          disabled={adminClockOutMutation.isPending}
                        >
                          {adminClockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p>No employees are currently checked in</p>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Time Entries Table */}
    <Card>
      <CardHeader>
        <CardTitle>Time Entries</CardTitle>
        <CardDescription>
          Detailed view of employee time clock entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        {timeEntriesLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : timeEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Entry Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Clock In</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Clock Out</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Total Hours</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Break Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Cost</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Notes</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {timeEntries.map((entry: any, index: number) => {
                  const { decimal: totalHours } = calculateHours(entry.totalWorkedMinutes || 0);
                  const { decimal: breakHours } = calculateHours(entry.totalBreakMinutes || 0);
                  const isManual = entry.isManualEntry === true;
                  const isClockedOut = entry.clockOutTime !== null;
                  
                  return (
                    <tr key={entry.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors" data-testid={`time-entry-${entry.id}`}>
                      <td className="py-3 px-4 text-sm">{formatDate(entry.clockInTime)}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">
                          {entry.firstName} {entry.lastName}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isClockedOut ? (
                          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                            Clocked Out
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            Clocked In
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isManual ? (
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                            Manual
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                            Automatic
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono">{formatTime(entry.clockInTime)}</td>
                      <td className="py-3 px-4 text-sm font-mono">
                        {entry.clockOutTime ? formatTime(entry.clockOutTime) : "—"}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono font-medium">{totalHours}h</td>
                      <td className="py-3 px-4 text-sm font-mono">{breakHours}h</td>
                      <td className="py-3 px-4 text-sm font-mono font-medium">
                        {(() => {
                          const hourlyRateValue = entry.hourlyRate;
                          if (!hourlyRateValue || hourlyRateValue === null || hourlyRateValue === undefined) {
                            return "—";
                          }
                          const hourlyRate = parseFloat(hourlyRateValue.toString());
                          if (isNaN(hourlyRate) || hourlyRate <= 0) {
                            return "—";
                          }
                          const totalHoursNum = parseFloat(totalHours);
                          if (isNaN(totalHoursNum)) {
                            return "—";
                          }
                          const cost = hourlyRate * totalHoursNum;
                          return `$${cost.toFixed(2)}`;
                        })()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                        {entry.notes || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditTimeEntry(entry)}
                            data-testid={`button-edit-${entry.id}`}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteTimeEntryMutation.mutate(entry.id)}
                            disabled={deleteTimeEntryMutation.isPending}
                            data-testid={`button-delete-${entry.id}`}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No time entries found</h3>
            <p className="text-slate-500">
              No time entries found for the selected criteria. Try adjusting the date range or employee selection.
            </p>
          </div>
        )}
        
        {/* Total Hours Summary */}
        {timeEntries.length > 0 && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-slate-900">Total Hours & Cost Summary</h4>
              <div className="flex space-x-8 text-sm">
                <div>
                  <span className="text-slate-500">Decimal Hours: </span>
                  <span className="font-mono font-medium">
                    {(() => {
                      const totalMinutes = timeEntries.reduce((sum: number, entry: any) => 
                        sum + (entry.totalWorkedMinutes || 0), 0);
                      return (totalMinutes / 60).toFixed(2);
                    })()}h
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Hours & Minutes: </span>
                  <span className="font-mono font-medium">
                    {(() => {
                      const totalMinutes = timeEntries.reduce((sum: number, entry: any) => 
                        sum + (entry.totalWorkedMinutes || 0), 0);
                      const hours = Math.floor(totalMinutes / 60);
                      const minutes = totalMinutes % 60;
                      return `${hours}h ${minutes}m`;
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Total Cost: </span>
                  <span className="font-mono font-medium text-green-700">
                    {(() => {
                      const totalCost = timeEntries.reduce((sum: number, entry: any) => {
                        const hourlyRateValue = entry.hourlyRate;
                        if (!hourlyRateValue || hourlyRateValue === null || hourlyRateValue === undefined) {
                          return sum;
                        }
                        const hourlyRate = parseFloat(hourlyRateValue.toString());
                        if (isNaN(hourlyRate) || hourlyRate <= 0) {
                          return sum;
                        }
                        const totalMinutes = entry.totalWorkedMinutes || 0;
                        const hours = totalMinutes / 60;
                        return sum + (hourlyRate * hours);
                      }, 0);
                      return `$${totalCost.toFixed(2)}`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  </TabsContent>

  {/* Reporting Tab - Scheduled vs Actual */}
  <TabsContent value="reporting" className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Scheduled vs Actual Hours Report</CardTitle>
        <CardDescription>
          Compare scheduled shifts against actual time clock entries (automatic & manual)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScheduledVsActualReport />
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>

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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="work">Work Details</TabsTrigger>
            <TabsTrigger value="contact">Contact Info</TabsTrigger>
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
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
                {editForm.formState.errors.employeeId && (
                  <p className="text-sm text-red-500 mt-1">
                    {editForm.formState.errors.employeeId.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="edit-email">Email Address *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  {...editForm.register("email")}
                  placeholder="employee@pinehill.com"
                />
                {editForm.formState.errors.email && (
                  <p className="text-sm text-red-500 mt-1">
                    {editForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              
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
                <Select value={editForm.watch("role")} onValueChange={(value) => editForm.setValue("role", value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {editForm.formState.errors.role && (
                  <p className="text-sm text-red-500 mt-1">
                    {editForm.formState.errors.role.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  {...editForm.register("department")}
                  placeholder="e.g., Operations"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-position">Position</Label>
                <Input
                  id="edit-position"
                  {...editForm.register("position")}
                  placeholder="e.g., Store Manager"
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
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  {...editForm.register("phone")}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-emergencyContact">Emergency Contact</Label>
                <Input
                  id="edit-emergencyContact"
                  {...editForm.register("emergencyContact")}
                  placeholder="Full name"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-emergencyPhone">Emergency Phone</Label>
                <Input
                  id="edit-emergencyPhone"
                  type="tel"
                  {...editForm.register("emergencyPhone")}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  {...editForm.register("address")}
                  placeholder="Street address"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  {...editForm.register("city")}
                  placeholder="City"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-state">State</Label>
                <Input
                  id="edit-state"
                  {...editForm.register("state")}
                  placeholder="State"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-zipCode">ZIP Code</Label>
                <Input
                  id="edit-zipCode"
                  {...editForm.register("zipCode")}
                  placeholder="ZIP code"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="compensation" className="space-y-4">
            <div className="space-y-6">
              {/* Financial Information - Integrated into Main Form */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Financial Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-hourlyRate">Hourly Rate ($)</Label>
                      <Input
                        id="edit-hourlyRate"
                        type="number"
                        step="0.01"
                        placeholder="15.00"
                        {...financialForm.register("hourlyRate")}
                        data-testid="input-hourly-rate"
                      />
                      {financialForm.formState.errors.hourlyRate && (
                        <p className="text-sm text-red-500 mt-1">
                          {financialForm.formState.errors.hourlyRate.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-defaultEntryCost">Default Entry Cost ($)</Label>
                      <Input
                        id="edit-defaultEntryCost"
                        type="number"
                        step="0.01"
                        placeholder="5.00"
                        {...financialForm.register("defaultEntryCost")}
                        data-testid="input-entry-cost"
                      />
                      {financialForm.formState.errors.defaultEntryCost && (
                        <p className="text-sm text-red-500 mt-1">
                          {financialForm.formState.errors.defaultEntryCost.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Employee Benefits</h3>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="ymca-benefit"
                            checked={financialForm.watch("ymcaBenefitEnabled")}
                            onCheckedChange={(checked) => financialForm.setValue("ymcaBenefitEnabled", checked)}
                            data-testid="switch-ymca-benefit"
                          />
                          <Label htmlFor="ymca-benefit" className="font-medium">YMCA Stipend</Label>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="ymca-amount">Monthly Amount ($)</Label>
                          <Input
                            id="ymca-amount"
                            type="number"
                            step="0.01"
                            placeholder="50.00"
                            {...financialForm.register("ymcaAmount")}
                            disabled={!financialForm.watch("ymcaBenefitEnabled")}
                            data-testid="input-ymca-amount"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="purchase-allowance"
                            checked={financialForm.watch("employeePurchaseEnabled")}
                            onCheckedChange={(checked) => financialForm.setValue("employeePurchaseEnabled", checked)}
                            data-testid="switch-purchase-allowance"
                          />
                          <Label htmlFor="purchase-allowance" className="font-medium">Employee Purchase Allowance</Label>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="purchase-cap">Monthly Cap ($)</Label>
                          <Input
                            id="purchase-cap"
                            type="number"
                            step="0.01"
                            placeholder="75.00"
                            {...financialForm.register("employeePurchaseCap")}
                            disabled={!financialForm.watch("employeePurchaseEnabled")}
                            data-testid="input-purchase-cap"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cost-markup" className="text-sm">
                            Cost Markup % <span className="text-xs text-slate-500">(before cap)</span>
                          </Label>
                          <Input
                            id="cost-markup"
                            type="number"
                            step="0.01"
                            placeholder="20.00"
                            {...financialForm.register("employeePurchaseCostMarkup")}
                            disabled={!financialForm.watch("employeePurchaseEnabled")}
                            data-testid="input-cost-markup"
                          />
                        </div>
                        <div>
                          <Label htmlFor="retail-discount" className="text-sm">
                            Retail Discount % <span className="text-xs text-slate-500">(after cap)</span>
                          </Label>
                          <Input
                            id="retail-discount"
                            type="number"
                            step="0.01"
                            placeholder="10.00"
                            {...financialForm.register("employeePurchaseRetailDiscount")}
                            disabled={!financialForm.watch("employeePurchaseEnabled")}
                            data-testid="input-retail-discount"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="font-medium">Custom Benefits</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-testid="button-add-custom-benefit"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Benefit
                        </Button>
                      </div>
                      <div className="space-y-2" data-testid="custom-benefits-list">
                        <p className="text-sm text-slate-500">No custom benefits added yet.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Financial Changes Button */}
                <div className="flex justify-end">
                  <Button 
                    type="button" 
                    disabled={updateFinancialMutation.isPending || financialDataLoading}
                    data-testid="button-save-financial"
                    onClick={financialForm.handleSubmit(onFinancialSubmit)}
                  >
                    {updateFinancialMutation.isPending ? "Saving..." : "Save Financial Changes"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={editForm.watch("isActive")}
                  onCheckedChange={(checked) => editForm.setValue("isActive", checked)}
                  data-testid="switch-active-employee"
                />
                <Label htmlFor="edit-isActive">Active Employee</Label>
              </div>

              
              <div>
                <Label htmlFor="edit-timeOffBalance">Time Off Balance (days)</Label>
                <Input
                  id="edit-timeOffBalance"
                  type="number"
                  {...editForm.register("timeOffBalance", { valueAsNumber: true })}
                  data-testid="input-time-off-balance"
                />
              </div>
            </div>

            {/* SMS Notification Settings */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">SMS Notifications</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Manage employee's SMS consent and notification preferences
                </p>
              </div>

              <div className="space-y-4">
                {/* SMS Consent Toggle */}
                <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                  <Switch
                    id="edit-smsConsent"
                    checked={editForm.watch("smsConsent") || false}
                    onCheckedChange={(checked) => {
                      editForm.setValue("smsConsent", checked);
                      if (!checked) {
                        editForm.setValue("smsEnabled", false);
                      }
                    }}
                    data-testid="switch-sms-consent"
                  />
                  <div className="flex-1">
                    <Label htmlFor="edit-smsConsent" className="font-medium cursor-pointer">
                      SMS Consent
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">
                      Employee has agreed to receive SMS messages (TCPA compliant)
                    </p>
                  </div>
                </div>

                {/* SMS Enabled Toggle - only available if consent is given */}
                {editForm.watch("smsConsent") && (
                  <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                    <Switch
                      id="edit-smsEnabled"
                      checked={editForm.watch("smsEnabled") || false}
                      onCheckedChange={(checked) => editForm.setValue("smsEnabled", checked)}
                      data-testid="switch-sms-enabled"
                    />
                    <div className="flex-1">
                      <Label htmlFor="edit-smsEnabled" className="font-medium cursor-pointer">
                        SMS Notifications Enabled
                      </Label>
                      <p className="text-xs text-slate-500 mt-1">
                        Employee will receive SMS notifications for selected types
                      </p>
                    </div>
                  </div>
                )}

                {/* Notification Types - only available if SMS is enabled */}
                {editForm.watch("smsConsent") && editForm.watch("smsEnabled") && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <Label className="text-sm font-medium mb-3 block">Notification Types</Label>
                    <div className="space-y-2">
                      {[
                        { value: 'emergency', label: 'Emergency Alerts', description: 'Critical and urgent notifications' },
                        { value: 'direct_messages', label: 'Direct Messages', description: 'One-on-one messages from team members' },
                        { value: 'schedule', label: 'Schedule Changes', description: 'Shift updates and schedule modifications' },
                        { value: 'announcements', label: 'Announcements', description: 'Team announcements and updates' },
                        { value: 'reminders', label: 'Reminders', description: 'Task and appointment reminders' },
                      ].map((type) => (
                        <div key={type.value} className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            id={`sms-type-${type.value}`}
                            checked={(editForm.watch("smsNotificationTypes") || []).includes(type.value)}
                            onChange={(e) => {
                              const currentTypes = editForm.watch("smsNotificationTypes") || [];
                              if (e.target.checked) {
                                editForm.setValue("smsNotificationTypes", [...currentTypes, type.value]);
                              } else {
                                editForm.setValue("smsNotificationTypes", currentTypes.filter(t => t !== type.value));
                              }
                            }}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            data-testid={`checkbox-sms-${type.value}`}
                          />
                          <div className="flex-1">
                            <Label htmlFor={`sms-type-${type.value}`} className="text-sm font-normal cursor-pointer">
                              {type.label}
                            </Label>
                            <p className="text-xs text-slate-500">{type.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!editForm.watch("smsConsent") && (
                  <div className="text-xs text-slate-500 italic p-3 bg-amber-50 border border-amber-200 rounded">
                    ⚠️ SMS consent must be enabled before employee can receive notifications
                  </div>
                )}
              </div>

              {/* SMS Consent History */}
              {selectedEmployee && (
                <SMSConsentHistoryComponent employeeId={selectedEmployee.id} />
              )}
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

{/* Edit Time Entry Dialog */}
<Dialog open={editTimeEntryDialogOpen} onOpenChange={setEditTimeEntryDialogOpen}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Edit Time Entry</DialogTitle>
      <DialogDescription>
        Update clock times, breaks, and notes for this time entry.
      </DialogDescription>
    </DialogHeader>
    {selectedTimeEntry && (
      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const clockInTime = formData.get('clockInTime') as string;
        const clockOutTime = formData.get('clockOutTime') as string;
        const breakMinutes = parseInt(formData.get('breakMinutes') as string || '0');
        const notes = formData.get('notes') as string;
        
        updateTimeEntryMutation.mutate({
          entryId: selectedTimeEntry.id,
          data: {
            clockInTime: new Date(clockInTime).toISOString(),
            clockOutTime: clockOutTime ? new Date(clockOutTime).toISOString() : null,
            breakMinutes,
            notes
          }
        });
      }} className="space-y-4">
        <div>
          <Label htmlFor="edit-clockInTime">Clock In Time *</Label>
          <Input
            id="edit-clockInTime"
            name="clockInTime"
            type="datetime-local"
            defaultValue={selectedTimeEntry.clockInTime ? 
              new Date(selectedTimeEntry.clockInTime).toISOString().slice(0, 16) : ''}
            required
            data-testid="input-edit-clock-in-time"
          />
        </div>
        
        <div>
          <Label htmlFor="edit-clockOutTime">Clock Out Time</Label>
          <Input
            id="edit-clockOutTime"
            name="clockOutTime"
            type="datetime-local"
            defaultValue={selectedTimeEntry.clockOutTime ? 
              new Date(selectedTimeEntry.clockOutTime).toISOString().slice(0, 16) : ''}
            data-testid="input-edit-clock-out-time"
          />
        </div>
        
        <div>
          <Label htmlFor="edit-breakMinutes">Break Time (minutes)</Label>
          <Input
            id="edit-breakMinutes"
            name="breakMinutes"
            type="number"
            min="0"
            defaultValue={selectedTimeEntry.breakMinutes || 0}
            data-testid="input-edit-break-minutes"
          />
        </div>
        
        <div>
          <Label htmlFor="edit-notes">Notes</Label>
          <Textarea
            id="edit-notes"
            name="notes"
            placeholder="Optional notes about this time entry..."
            defaultValue={selectedTimeEntry.notes || ''}
            data-testid="textarea-edit-notes"
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditTimeEntryDialogOpen(false)}
            data-testid="button-cancel-edit-time-entry"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={updateTimeEntryMutation.isPending}
            data-testid="button-save-time-entry"
          >
            {updateTimeEntryMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    )}
  </DialogContent>
</Dialog>

{/* Reactivate Employee Dialog */}
<AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Reactivate Employee?</AlertDialogTitle>
      <AlertDialogDescription>
        This Employee ID belongs to {employeeToReactivate?.name}, who is currently inactive. 
        Would you like to reactivate them instead of creating a new employee?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => {
        setReactivateDialogOpen(false);
        setEmployeeToReactivate(null);
      }}>
        Cancel
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={() => {
          if (employeeToReactivate?.id) {
            reactivateEmployeeMutation.mutate(employeeToReactivate.id);
          }
        }}
        disabled={reactivateEmployeeMutation.isPending}
      >
        {reactivateEmployeeMutation.isPending ? "Reactivating..." : "Yes, Reactivate"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
</div>
);
}