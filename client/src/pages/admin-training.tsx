import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { BookOpen, Plus, Users, Award, TrendingUp, Upload, ShoppingCart, Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin-layout";

export default function AdminTraining() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showCreateModule, setShowCreateModule] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importMethod, setImportMethod] = useState<'csv' | 'bigcommerce' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newModule, setNewModule] = useState({
    title: "",
    description: "",
    category: "",
    duration: 0,
    isMandatory: false,
  });

  const { data: modules } = useQuery<any[]>({
    queryKey: ["/api/training/modules"],
  });

  const { data: enrollments } = useQuery<any[]>({
    queryKey: ["/api/training/enrollments"],
  });

  const { data: skills } = useQuery<any[]>({
    queryKey: ["/api/training/skills"],
  });

  const createModuleMutation = useMutation({
    mutationFn: async (moduleData: any) => {
      const response = await fetch("/api/training/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(moduleData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create module");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
      setShowCreateModule(false);
      setNewModule({
        title: "",
        description: "",
        category: "",
        duration: 0,
        isMandatory: false,
      });
      toast({
        title: "Module Created",
        description: "Training module has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // CSV Import mutation
  const importCSVMutation = useMutation({
    mutationFn: async (products: any[]) => {
      return apiRequest('/api/training/import/csv', 'POST', { products });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
      toast({
        title: "Import Complete",
        description: `Successfully created ${data.created} training modules. ${data.failed > 0 ? `Failed: ${data.failed}` : ''}`,
      });
      setShowImportDialog(false);
      setImportMethod(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // BigCommerce Import mutation
  const importBigCommerceMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/training/import/bigcommerce', 'POST', {});
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
      toast({
        title: "Import Complete",
        description: `Created ${data.created} modules. Skipped ${data.skipped} existing. ${data.failed > 0 ? `Failed: ${data.failed}` : ''}`,
      });
      setShowImportDialog(false);
      setImportMethod(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateModule = () => {
    createModuleMutation.mutate(newModule);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        
        const products = lines.slice(1).map(line => {
          const values = line.split(',');
          const row: any = {};
          headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
          });
          return row;
        }).filter(row => row.Item); // Filter out empty rows

        importCSVMutation.mutate(products);
      } catch (error) {
        toast({
          title: "File Error",
          description: "Failed to parse CSV file",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImportFromBigCommerce = () => {
    importBigCommerceMutation.mutate();
  };

  const totalEnrollments = enrollments?.length || 0;
  const completedEnrollments = enrollments?.filter((e) => e.status === "completed").length || 0;
  const completionRate = totalEnrollments ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

  if (user?.role !== "admin" && user?.role !== "manager") {
    return (
      <AdminLayout currentTab="training">
        <div className="text-center py-12">
          <p className="text-slate-500">Access denied. Admin or manager role required.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentTab="training">
      <div className="space-y-6" data-testid="admin-training-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Training Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage training modules, enrollments, and employee progress
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)} data-testid="button-import">
            <Upload className="w-4 h-4 mr-2" />
            Import Training
          </Button>
          <Button onClick={() => setShowCreateModule(true)} data-testid="button-create-module">
            <Plus className="w-4 h-4 mr-2" />
            Create Module
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Modules</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-total-modules">
                  {modules?.length || 0}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-farm-green" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Enrollments</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-total-enrollments">
                  {totalEnrollments}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Completion Rate</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-completion-rate">
                  {completionRate}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Skills</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-total-skills">
                  {skills?.length || 0}
                </p>
              </div>
              <Award className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Modules List */}
      <Card>
        <CardHeader>
          <CardTitle>Training Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {modules && modules.length > 0 ? (
              modules.map((module: any) => (
                <div
                  key={module.id}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  data-testid={`module-item-${module.id}`}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{module.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{module.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {module.category && (
                        <Badge variant="outline">{module.category}</Badge>
                      )}
                      {module.isMandatory && (
                        <Badge variant="destructive">Required</Badge>
                      )}
                      {!module.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {module.duration} minutes
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No training modules yet</p>
                <Button onClick={() => setShowCreateModule(true)} className="mt-4">
                  Create Your First Module
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Enrollments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Enrollments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {enrollments && enrollments.slice(0, 10).map((enrollment: any) => (
              <div
                key={enrollment.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                data-testid={`enrollment-item-${enrollment.id}`}
              >
                <div>
                  <p className="font-medium">Module ID: {enrollment.moduleId}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    User: {enrollment.userId}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={
                    enrollment.status === "completed" ? "bg-green-500" :
                    enrollment.status === "in_progress" ? "bg-blue-500" : "bg-slate-500"
                  }>
                    {enrollment.status}
                  </Badge>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {enrollment.progress}% complete
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Module Dialog */}
      <Dialog open={showCreateModule} onOpenChange={setShowCreateModule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Training Module</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newModule.title}
                onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                placeholder="Enter module title"
                data-testid="input-module-title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newModule.description}
                onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                placeholder="Enter module description"
                data-testid="input-module-description"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={newModule.category}
                onChange={(e) => setNewModule({ ...newModule, category: e.target.value })}
                placeholder="e.g., Safety, Operations"
                data-testid="input-module-category"
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={newModule.duration}
                onChange={(e) => setNewModule({ ...newModule, duration: parseInt(e.target.value) || 0 })}
                placeholder="30"
                data-testid="input-module-duration"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="mandatory"
                checked={newModule.isMandatory}
                onChange={(e) => setNewModule({ ...newModule, isMandatory: e.target.checked })}
                data-testid="checkbox-module-mandatory"
              />
              <Label htmlFor="mandatory">Mandatory Training</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModule(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateModule}
                disabled={!newModule.title || !newModule.description || createModuleMutation.isPending}
                data-testid="button-submit-module"
              >
                Create Module
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Training Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Product Training</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Choose how you want to import product training modules:
            </p>

            {/* Import Method Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setImportMethod('csv')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  importMethod === 'csv'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                }`}
                data-testid="button-import-csv"
              >
                <Upload className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                <h3 className="font-semibold text-lg mb-2">Upload CSV File</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Upload a product list exported from BigCommerce
                </p>
              </button>

              <button
                onClick={() => setImportMethod('bigcommerce')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  importMethod === 'bigcommerce'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                }`}
                data-testid="button-import-bigcommerce"
              >
                <ShoppingCart className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                <h3 className="font-semibold text-lg mb-2">Sync from BigCommerce</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Automatically import products from your store
                </p>
              </button>
            </div>

            {/* CSV Upload Section */}
            {importMethod === 'csv' && (
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-csv-file"
                />
                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-lg font-medium mb-2">Drag and drop your CSV file here</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  or click the button below to browse
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importCSVMutation.isPending}
                  data-testid="button-browse-file"
                >
                  {importCSVMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Browse Files'
                  )}
                </Button>
              </div>
            )}

            {/* BigCommerce Sync Section */}
            {importMethod === 'bigcommerce' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Note:</strong> This will import up to 100 products from your BigCommerce store. 
                    Existing modules with the same name will be skipped.
                  </p>
                </div>
                <Button
                  onClick={handleImportFromBigCommerce}
                  disabled={importBigCommerceMutation.isPending}
                  className="w-full"
                  data-testid="button-start-bigcommerce-sync"
                >
                  {importBigCommerceMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing from BigCommerce...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Start Import from BigCommerce
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportDialog(false);
                  setImportMethod(null);
                }}
                disabled={importCSVMutation.isPending || importBigCommerceMutation.isPending}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}
