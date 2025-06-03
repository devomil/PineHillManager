import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Users, UserPlus, Search, Shield, User } from "lucide-react";

interface Employee {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  profileImageUrl: string | null;
  createdAt: string;
}

export default function EmployeeRoster() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ["/api/employees"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ employeeId, role }: { employeeId: string; role: string }) => {
      await apiRequest("PATCH", `/api/employees/${employeeId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Success",
        description: "Employee role updated successfully",
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
        description: "Failed to update employee role",
        variant: "destructive",
      });
    },
  });

  const filteredEmployees = (employees || []).filter((employee: Employee) => {
    const matchesSearch = 
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || employee.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'employee':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'manager':
        return <Users className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const handleRoleChange = (employeeId: string, newRole: string) => {
    updateRoleMutation.mutate({ employeeId, role: newRole });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Employee Roster
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
            <p className="text-slate-500 mt-2">Loading employees...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Employee Roster
          </CardTitle>
          <Badge variant="secondary">
            {employees?.length || 0} employees
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Role Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <Shield className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-900">
              {employees?.filter((emp: Employee) => emp.role === 'admin').length || 0}
            </div>
            <div className="text-sm text-red-600">Admins</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-900">
              {employees?.filter((emp: Employee) => emp.role === 'manager').length || 0}
            </div>
            <div className="text-sm text-blue-600">Managers</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <User className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-900">
              {employees?.filter((emp: Employee) => emp.role === 'employee').length || 0}
            </div>
            <div className="text-sm text-green-600">Employees</div>
          </div>
        </div>

        {/* Employee List */}
        {filteredEmployees && filteredEmployees.length > 0 ? (
          <div className="space-y-4">
            {filteredEmployees.map((employee: Employee) => (
              <div
                key={employee.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
              >
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={employee.profileImageUrl || undefined} />
                    <AvatarFallback>
                      {employee.firstName?.[0] || employee.email[0].toUpperCase()}
                      {employee.lastName?.[0] || ''}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {employee.firstName && employee.lastName
                        ? `${employee.firstName} ${employee.lastName}`
                        : employee.email}
                    </div>
                    <div className="text-sm text-slate-500">{employee.email}</div>
                    <div className="text-xs text-slate-400">
                      Joined {new Date(employee.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={getRoleBadgeColor(employee.role)}>
                    <div className="flex items-center space-x-1">
                      {getRoleIcon(employee.role)}
                      <span className="capitalize">{employee.role}</span>
                    </div>
                  </Badge>
                  <Select
                    value={employee.role}
                    onValueChange={(value) => handleRoleChange(employee.id, value)}
                    disabled={updateRoleMutation.isPending}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {searchTerm || roleFilter !== 'all' 
                ? 'No employees match your search criteria' 
                : 'No employees found'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}