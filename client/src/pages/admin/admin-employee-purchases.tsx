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
import { useToast } from "@/hooks/use-toast";
import { DollarSign, ShoppingCart, TrendingUp, Users, Search, Edit2, History } from "lucide-react";
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
      </div>
    </div>
  );
}
