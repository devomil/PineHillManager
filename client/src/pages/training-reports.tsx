import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Download, Filter, Users, BookOpen, TrendingUp, Award } from "lucide-react";

interface TrainingReport {
  id: number;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeRole: string;
  moduleId: number;
  moduleTitle: string;
  moduleCategory: string;
  isMandatory: boolean;
  status: string;
  progress: number;
  enrolledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  dueDate: string | null;
  finalScore: number | null;
  attempts: number;
  assignedBy: string | null;
}

export default function TrainingReportsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  const { data: reports, isLoading } = useQuery<TrainingReport[]>({
    queryKey: ['/api/training/reports'],
    enabled: user?.role === 'admin' || user?.role === 'manager',
  });

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Access restricted to admins and managers</p>
      </div>
    );
  }

  // Filter reports
  const filteredReports = reports?.filter(report => {
    const matchesSearch = 
      report.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.moduleTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.employeeEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || report.moduleCategory === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  }) || [];

  // Calculate statistics
  const totalEnrollments = reports?.length || 0;
  const completedCount = reports?.filter(r => r.status === 'completed').length || 0;
  const inProgressCount = reports?.filter(r => r.status === 'in_progress').length || 0;
  const notStartedCount = reports?.filter(r => r.status === 'not_started').length || 0;
  const completionRate = totalEnrollments > 0 ? Math.round((completedCount / totalEnrollments) * 100) : 0;

  // Get unique categories
  const categories = Array.from(new Set(reports?.map(r => r.moduleCategory).filter(Boolean) || []));

  // Export to CSV
  const handleExport = () => {
    if (!filteredReports || filteredReports.length === 0) return;

    const headers = [
      'Employee Name',
      'Email',
      'Role',
      'Module Title',
      'Category',
      'Status',
      'Progress %',
      'Final Score',
      'Attempts',
      'Enrolled Date',
      'Started Date',
      'Completed Date',
      'Due Date',
      'Mandatory',
    ];

    const csvRows = [
      headers.join(','),
      ...filteredReports.map(report => [
        `"${report.employeeName}"`,
        `"${report.employeeEmail}"`,
        report.employeeRole,
        `"${report.moduleTitle}"`,
        report.moduleCategory || '',
        report.status,
        report.progress,
        report.finalScore || '',
        report.attempts,
        new Date(report.enrolledAt).toLocaleDateString(),
        report.startedAt ? new Date(report.startedAt).toLocaleDateString() : '',
        report.completedAt ? new Date(report.completedAt).toLocaleDateString() : '',
        report.dueDate ? new Date(report.dueDate).toLocaleDateString() : '',
        report.isMandatory ? 'Yes' : 'No',
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string }> = {
      'completed': { bg: '#607e66', text: 'white' },
      'in_progress': { bg: '#5b7c99', text: 'white' },
      'not_started': { bg: '#8c93ad', text: 'white' },
      'failed': { bg: '#dc2626', text: 'white' },
    };

    const variant = variants[status] || { bg: '#8c93ad', text: 'white' };
    
    return (
      <Badge 
        style={{ backgroundColor: variant.bg, color: variant.text }}
        data-testid={`badge-status-${status}`}
      >
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8" data-testid="training-reports-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2" style={{ color: '#5e637a' }}>
          Training Reports
        </h1>
        <p className="text-slate-600">Monitor employee training progress and completion across all modules</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#5e637a' }}>
              {totalEnrollments}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Award className="h-4 w-4" style={{ color: '#607e66' }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#607e66' }}>
              {completedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Finished training
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4" style={{ color: '#5b7c99' }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#5b7c99' }}>
              {inProgressCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently learning
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#6c97ab' }}>
              {completionRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by employee name, email, or module..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-category-filter">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleExport}
              variant="outline"
              disabled={filteredReports.length === 0}
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#607e66' }}></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No training reports found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Progress</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Attempts</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium" data-testid={`text-employee-name-${report.id}`}>
                            {report.employeeName}
                          </div>
                          <div className="text-sm text-slate-500">{report.employeeEmail}</div>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {report.employeeRole}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium" data-testid={`text-module-title-${report.id}`}>
                            {report.moduleTitle}
                          </div>
                          {report.isMandatory && (
                            <Badge className="mt-1 text-xs" style={{ backgroundColor: '#dc2626', color: 'white' }}>
                              Mandatory
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {report.moduleCategory && (
                          <Badge variant="outline">{report.moduleCategory}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div 
                            className="w-full max-w-[100px] h-2 bg-slate-200 rounded-full overflow-hidden"
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${report.progress}%`,
                                backgroundColor: '#607e66'
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium" data-testid={`text-progress-${report.id}`}>
                            {report.progress}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center" data-testid={`text-score-${report.id}`}>
                        {report.finalScore !== null ? `${report.finalScore}%` : '-'}
                      </TableCell>
                      <TableCell className="text-center" data-testid={`text-attempts-${report.id}`}>
                        {report.attempts}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(report.enrolledAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {report.dueDate ? (
                          <span className={
                            new Date(report.dueDate) < new Date() && report.status !== 'completed'
                              ? 'text-red-600 font-medium'
                              : ''
                          }>
                            {new Date(report.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Footer */}
      {filteredReports.length > 0 && (
        <div className="mt-4 text-sm text-slate-600">
          Showing {filteredReports.length} of {totalEnrollments} total enrollments
        </div>
      )}
    </div>
  );
}
