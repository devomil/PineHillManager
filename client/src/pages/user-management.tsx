import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, UserPlus, Key, Users, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for password reset form
  const [passwordReset, setPasswordReset] = useState({
    userId: "",
    newPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Admin access required for user management.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch all users
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch("/api/employees", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    }
  });



  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (resetData: typeof passwordReset) => {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(resetData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset password");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Reset",
        description: "User password has been reset successfully.",
      });
      setPasswordReset({ userId: "", newPassword: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });



  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordReset.userId || !passwordReset.newPassword) {
      toast({
        title: "Error",
        description: "Please select a user and enter a new password.",
        variant: "destructive",
      });
      return;
    }
    resetPasswordMutation.mutate(passwordReset);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-brand brand-title" data-brand="pine-hill">
                Pine Hill Farm
              </h1>
              <p className="text-sm text-gray-500">Password & Authentication Management</p>
            </div>
            <Link href="/admin">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">User Overview</TabsTrigger>
            <TabsTrigger value="manage">Password Management</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>All Users</span>
                </CardTitle>
                <CardDescription>
                  Overview of all users in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-2 text-left">Name</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Email</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Role</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Department</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((employee: any) => (
                          <tr key={employee.id} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-2">
                              {employee.firstName} {employee.lastName}
                            </td>
                            <td className="border border-gray-200 px-4 py-2">{employee.email}</td>
                            <td className="border border-gray-200 px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                employee.role === 'admin' ? 'bg-red-100 text-red-800' :
                                employee.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {employee.role}
                              </span>
                            </td>
                            <td className="border border-gray-200 px-4 py-2">{employee.department || 'N/A'}</td>
                            <td className="border border-gray-200 px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                employee.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {employee.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>



          <TabsContent value="manage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="h-5 w-5" />
                  <span>Reset User Password</span>
                </CardTitle>
                <CardDescription>
                  Reset passwords for existing users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userSelect">Select User</Label>
                    <Select value={passwordReset.userId} onValueChange={(value) => setPasswordReset({ ...passwordReset, userId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee: any) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName} ({employee.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        value={passwordReset.newPassword}
                        onChange={(e) => setPasswordReset({ ...passwordReset, newPassword: e.target.value })}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}