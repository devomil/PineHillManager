import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Users, Mail, Calendar } from "lucide-react";

export default function Employees() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/employees"],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-green"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Access Denied
            </h2>
            <p className="text-slate-500">
              This page is only accessible to administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Employee Directory</h1>
        <p className="text-slate-500 mt-1">
          Manage employee information and roles
        </p>
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-farm-green" />
            All Employees
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employeesLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/6"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : employees && employees.length > 0 ? (
            <div className="space-y-4">
              {employees.map((employee: any) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage 
                        src={employee.profileImageUrl} 
                        alt={`${employee.firstName} ${employee.lastName}`}
                        className="object-cover"
                      />
                      <AvatarFallback>
                        {employee.firstName?.[0]}{employee.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium text-slate-900">
                        {employee.firstName} {employee.lastName}
                      </h4>
                      <div className="flex items-center space-x-4 mt-1">
                        {employee.email && (
                          <div className="flex items-center text-sm text-slate-500">
                            <Mail className="w-3 h-3 mr-1" />
                            {employee.email}
                          </div>
                        )}
                        {employee.hireDate && (
                          <div className="flex items-center text-sm text-slate-500">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(employee.hireDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant={employee.role === 'admin' ? 'default' : 'secondary'}
                      className={employee.role === 'admin' ? 'bg-farm-green' : ''}
                    >
                      {employee.role}
                    </Badge>
                    {employee.department && (
                      <Badge variant="outline">
                        {employee.department}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No employees found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
