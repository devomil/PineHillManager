import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, ShoppingCart, TrendingUp, Users, Search, Edit2, History, FileText, Download, ChevronDown, ChevronRight } from "lucide-react";
import UserAvatar from "@/components/user-avatar";

export default function AdminEmployeePurchases() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  
  // Get current month in YYYY-MM format
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  // Fetch all users with purchase data
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['/api/admin/employee-purchases/users', currentMonth],
    queryFn: async () => {
      const res = await fetch(`/api/admin/employee-purchases/users?periodMonth=${currentMonth}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    }
  });

  // Fetch purchase history for selected user
  const { data: purchaseHistory } = useQuery({
    queryKey: ['/api/admin/employee-purchases/users', selectedUser?.id, 'purchases'],
    queryFn: async () => {
      if (!selectedUser) return [];
      const res = await fetch(`/api/admin/employee-purchases/users/${selectedUser.id}/purchases`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch purchase history');
      return res.json();
    },
    enabled: !!selectedUser && isHistoryDialogOpen
  });

  // Update employee purchase settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { userId: string; settings: any }) => {
      return await apiRequest('PUT', `/api/admin/employee-purchases/users/${data.userId}`, data.settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employee-purchases/users'] });
      toast({
        title: "Settings updated",
        description: "Employee purchase settings have been updated successfully"
      });
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update employee purchase settings",
        variant: "destructive"
      });
    }
  });

  const users = usersData?.users || [];
  const filteredUsers = users.filter((user: any) =>
    `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate summary stats
  const enabledCount = users.filter((u: any) => u.employeePurchaseEnabled).length;
  const totalSpent = users.reduce((sum: number, u: any) => sum + parseFloat(u.monthlySpent || '0'), 0);
  const totalAllowance = users.filter((u: any) => u.employeePurchaseEnabled).reduce((sum: number, u: any) => sum + parseFloat(u.employeePurchaseCap || '0'), 0);
  const totalPurchases = users.reduce((sum: number, u: any) => sum + parseInt(u.totalPurchases || '0'), 0);

  const handleUpdateSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const settings: any = {
      employeePurchaseEnabled: formData.get('enabled') === 'on',
      employeePurchaseCap: formData.get('cap')
    };
    
    // Only include cost markup for managers/admins
    if (selectedUser?.role === 'manager' || selectedUser?.role === 'admin') {
      settings.employeePurchaseCostMarkup = formData.get('costMarkup') || '0';
    }
    
    updateSettingsMutation.mutate({
      userId: selectedUser.id,
      settings
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Purchase Management</h1>
          <p className="text-gray-600">Manage employee purchase allowances, discounts, and monitor spending</p>
        </div>

        <Tabs defaultValue="management" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="management" data-testid="tab-management">
              <Users className="h-4 w-4 mr-2" />
              Employee Management
            </TabsTrigger>
            <TabsTrigger value="reporting" data-testid="tab-reporting">
              <FileText className="h-4 w-4 mr-2" />
              Detailed Reporting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="management">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Enabled Employees</CardDescription>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enabledCount}</div>
              <p className="text-xs text-gray-500">out of {users.length} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Spent (This Month)</CardDescription>
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
              <p className="text-xs text-gray-500">of ${totalAllowance.toFixed(2)} allowance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Purchases</CardDescription>
                <ShoppingCart className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPurchases}</div>
              <p className="text-xs text-gray-500">this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Utilization Rate</CardDescription>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalAllowance > 0 ? ((totalSpent / totalAllowance) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-xs text-gray-500">of allowance used</p>
            </CardContent>
          </Card>
        </div>

        {/* User List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Employee List</CardTitle>
                <CardDescription>Manage purchase settings and view spending for each employee</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                    data-testid="input-search-employees"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading employees...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Monthly Allowance</TableHead>
                    <TableHead className="text-right">After-Cap Pricing</TableHead>
                    <TableHead className="text-right">Spent This Month</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => {
                    const spent = parseFloat(user.monthlySpent || '0');
                    const cap = parseFloat(user.employeePurchaseCap || '0');
                    const remaining = cap - spent;
                    const costMarkup = parseFloat(user.employeePurchaseCostMarkup || '0');
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <UserAvatar user={user} size="sm" />
                            <div>
                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.department || '-'}</TableCell>
                        <TableCell>
                          {user.employeePurchaseEnabled ? (
                            <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                          ) : (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">${cap.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {user.role === 'manager' || user.role === 'admin' ? (
                            <span className="text-green-600 font-medium">
                              {costMarkup > 0 ? `COG + ${costMarkup}%` : 'COG Only'}
                            </span>
                          ) : (
                            <span className="text-blue-600">25% Off Retail</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">${spent.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <span className={remaining < 0 ? 'text-red-600 font-medium' : ''}>
                            ${remaining.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsEditDialogOpen(true);
                              }}
                              data-testid={`button-edit-${user.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsHistoryDialogOpen(true);
                              }}
                              data-testid={`button-history-${user.id}`}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Settings Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Purchase Settings</DialogTitle>
              <DialogDescription>
                Update employee purchase allowance and discount settings for {selectedUser?.firstName} {selectedUser?.lastName}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateSettings} className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Enable Employee Purchases</Label>
                <Switch
                  id="enabled"
                  name="enabled"
                  defaultChecked={selectedUser?.employeePurchaseEnabled}
                  data-testid="switch-enabled"
                />
              </div>
              
              <div>
                <Label htmlFor="cap">Monthly Allowance ($)</Label>
                <Input
                  id="cap"
                  name="cap"
                  type="number"
                  step="0.01"
                  defaultValue={selectedUser?.employeePurchaseCap || '0'}
                  data-testid="input-cap"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {selectedUser?.role === 'manager' || selectedUser?.role === 'admin' 
                    ? 'Free monthly allowance - 100% discount (no charge)'
                    : 'Free monthly allowance charged at retail price'}
                </p>
              </div>

              {(selectedUser?.role === 'manager' || selectedUser?.role === 'admin') && (
                <div>
                  <Label htmlFor="costMarkup">Cost Markup % (After Cap)</Label>
                  <Input
                    id="costMarkup"
                    name="costMarkup"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    defaultValue={selectedUser?.employeePurchaseCostMarkup || '0'}
                    data-testid="input-cost-markup"
                  />
                  <p className="text-sm text-gray-500 mt-1">Markup % added to COGS for purchases after allowance exceeded</p>
                </div>
              )}

              <div className={`${selectedUser?.role === 'manager' || selectedUser?.role === 'admin' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}>
                <h4 className={`font-medium mb-2 ${selectedUser?.role === 'manager' || selectedUser?.role === 'admin' ? 'text-green-900' : 'text-blue-900'}`}>Pricing Model</h4>
                <div className={`space-y-2 text-sm ${selectedUser?.role === 'manager' || selectedUser?.role === 'admin' ? 'text-green-800' : 'text-blue-800'}`}>
                  {selectedUser?.role === 'manager' || selectedUser?.role === 'admin' ? (
                    <>
                      <p><strong>Before Cap:</strong> 100% discount (no charge until allowance used)</p>
                      <p><strong>After Cap:</strong> COGS + markup % (employee pays cost + markup)</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Before Cap:</strong> Full retail price (free allowance)</p>
                      <p><strong>After Cap:</strong> 25% off retail price (employee discount)</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateSettingsMutation.isPending} data-testid="button-save">
                  {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Purchase History Dialog */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Purchase History</DialogTitle>
              <DialogDescription>
                Purchase history for {selectedUser?.firstName} {selectedUser?.lastName}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {purchaseHistory && purchaseHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseHistory.map((purchase: any) => (
                      <TableRow key={purchase.id}>
                        <TableCell>{new Date(purchase.purchaseDate).toLocaleDateString()}</TableCell>
                        <TableCell>{purchase.itemName}</TableCell>
                        <TableCell className="text-right">{purchase.quantity}</TableCell>
                        <TableCell className="text-right">${parseFloat(purchase.unitPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${parseFloat(purchase.totalAmount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">No purchase history available</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
          </TabsContent>

          <TabsContent value="reporting">
            <PurchaseReportingTab currentMonth={currentMonth} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PurchaseReportingTab({ currentMonth }: { currentMonth: string }) {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['/api/admin/employee-purchases/report', selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/admin/employee-purchases/report?periodMonth=${selectedMonth}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch report');
      return res.json();
    }
  });

  const handleExportCSV = () => {
    if (!reportData) return;

    const csvRows = [];
    csvRows.push(['Employee Name', 'Role', 'Department', 'Item Name', 'Quantity', 'Retail Price', 'Charged Price', 'COGS Price', 'Retail Value', 'Charged Amount', 'COGS Value', 'Discount Given', 'Free Item', 'Purchase Date']);

    reportData.employees.forEach((employee: any) => {
      employee.purchases.forEach((purchase: any) => {
        csvRows.push([
          employee.employeeName,
          employee.employeeRole,
          employee.department || 'N/A',
          purchase.itemName,
          purchase.quantity,
          purchase.retailPrice.toFixed(2),
          purchase.chargedPrice.toFixed(2),
          purchase.cogsPrice.toFixed(2),
          purchase.retailValue.toFixed(2),
          purchase.chargedAmount.toFixed(2),
          purchase.cogsValue.toFixed(2),
          purchase.discountGiven.toFixed(2),
          purchase.isFreeItem ? 'Yes' : 'No',
          new Date(purchase.purchaseDate).toLocaleDateString()
        ]);
      });
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-purchases-report-${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Report exported",
      description: "CSV file has been downloaded successfully"
    });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading report...</div>;
  }

  if (!reportData || reportData.employees.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No purchase data available</p>
            <p className="text-sm">No employee purchases found for this period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { employees, grandTotals } = reportData;

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>QuickBooks Purchase Report</CardTitle>
              <CardDescription>
                Detailed employee purchase data with COGS tracking for period {selectedMonth}
              </CardDescription>
            </div>
            <Button onClick={handleExportCSV} data-testid="button-export-csv">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Retail Value</p>
              <p className="text-2xl font-bold text-blue-900">${grandTotals.totalRetailValue.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Amount Charged</p>
              <p className="text-2xl font-bold text-green-900">${grandTotals.totalAmountCharged.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Total COGS</p>
              <p className="text-2xl font-bold text-purple-900">${grandTotals.totalCogsValue.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-600 font-medium">Free Items COGS</p>
              <p className="text-2xl font-bold text-orange-900">${grandTotals.totalFreeItemsCogs.toFixed(2)}</p>
              <p className="text-xs text-orange-600 mt-1">100% discounted items</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600 font-medium">Total Discount</p>
              <p className="text-2xl font-bold text-red-900">${grandTotals.totalDiscountGiven.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Details - Collapsible Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Purchase Details</CardTitle>
          <CardDescription>Click on any employee to expand and view their detailed purchase history</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Retail Value</TableHead>
                <TableHead className="text-right">Amount Charged</TableHead>
                <TableHead className="text-right">COGS</TableHead>
                <TableHead className="text-right">Free Items COGS</TableHead>
                <TableHead className="text-right">Discount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee: any) => (
                <EmployeeRow key={employee.employeeId} employee={employee} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function EmployeeRow({ employee }: { employee: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible asChild open={isOpen} onOpenChange={setIsOpen}>
      <>
        {/* Main Employee Row */}
        <TableRow className="hover:bg-gray-50 cursor-pointer" data-testid={`employee-row-${employee.employeeId}`}>
          <TableCell>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </TableCell>
          <TableCell>
            <div>
              <div className="font-medium">{employee.employeeName}</div>
              <div className="text-xs text-gray-500">
                {employee.department && `${employee.department} - `}
                Cap: ${employee.monthlyCap.toFixed(2)}
                {(employee.employeeRole === 'manager' || employee.employeeRole === 'admin') && employee.costMarkup > 0 && ` | Markup: ${employee.costMarkup}%`}
              </div>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant={employee.employeeRole === 'manager' || employee.employeeRole === 'admin' ? 'default' : 'secondary'}>
              {employee.employeeRole}
            </Badge>
          </TableCell>
          <TableCell className="text-right font-medium">${employee.totals.totalRetailValue.toFixed(2)}</TableCell>
          <TableCell className="text-right font-medium text-green-600">${employee.totals.totalAmountCharged.toFixed(2)}</TableCell>
          <TableCell className="text-right font-medium text-purple-600">${employee.totals.totalCogsValue.toFixed(2)}</TableCell>
          <TableCell className="text-right font-medium text-orange-600">${employee.totals.totalFreeItemsCogs.toFixed(2)}</TableCell>
          <TableCell className="text-right font-medium text-red-600">${(employee.totals.totalRetailValue - employee.totals.totalAmountCharged).toFixed(2)}</TableCell>
        </TableRow>

        {/* Expanded Purchase Details */}
        <CollapsibleContent asChild>
          <TableRow>
            <TableCell colSpan={8} className="p-0 bg-gray-50">
              <div className="p-6">
                <h4 className="text-sm font-semibold mb-4">Purchase Details</h4>
                <div className="bg-white rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Retail</TableHead>
                        <TableHead className="text-right">Charged</TableHead>
                        <TableHead className="text-right">COGS</TableHead>
                        <TableHead className="text-right">Retail Value</TableHead>
                        <TableHead className="text-right">Charged Amt</TableHead>
                        <TableHead className="text-right">COGS Value</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.purchases.map((purchase: any) => (
                        <TableRow key={purchase.purchaseId} className={purchase.isFreeItem ? 'bg-orange-50' : ''}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{purchase.itemName}</div>
                              {purchase.barcode && <div className="text-xs text-gray-500">{purchase.barcode}</div>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{purchase.quantity}</TableCell>
                          <TableCell className="text-right">${purchase.retailPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {purchase.isFreeItem ? (
                              <span className="text-orange-600 font-medium">$0.00 (Free)</span>
                            ) : (
                              `$${purchase.chargedPrice.toFixed(2)}`
                            )}
                          </TableCell>
                          <TableCell className="text-right text-purple-600 font-medium">
                            ${purchase.cogsPrice.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">${purchase.retailValue.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {purchase.isFreeItem ? (
                              <span className="text-orange-600 font-medium">$0.00</span>
                            ) : (
                              `$${purchase.chargedAmount.toFixed(2)}`
                            )}
                          </TableCell>
                          <TableCell className="text-right text-purple-600 font-medium">
                            ${purchase.cogsValue.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            ${purchase.discountGiven.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {new Date(purchase.purchaseDate).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      </>
    </Collapsible>
  );
}
