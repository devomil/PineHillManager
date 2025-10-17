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
import { BookOpen, Plus, Users, Award, TrendingUp, Upload, ShoppingCart, Loader2, Eye, Sparkles, CheckCircle, XCircle, Clock } from "lucide-react";
import AdminLayout from "@/components/admin-layout";

// Helper function to strip HTML tags from description for preview
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export default function AdminTraining() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showCreateModule, setShowCreateModule] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showModuleDetail, setShowModuleDetail] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [importMethod, setImportMethod] = useState<'csv' | 'bigcommerce' | null>(null);
  const [showAIJobs, setShowAIJobs] = useState(false);
  const [selectedModuleForAI, setSelectedModuleForAI] = useState<any>(null);
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

  const { data: moduleDetails } = useQuery<any>({
    queryKey: ["/api/training/modules", selectedModule?.id],
    enabled: !!selectedModule?.id,
  });

  const createModuleMutation = useMutation({
    mutationFn: async (moduleData: any) => {
      const response = await fetch("/api/training/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(moduleData),
      });
      if (!response.ok) {
        throw new Error("Failed to create module");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
      toast({
        title: "Success",
        description: "Training module created successfully",
      });
      setShowCreateModule(false);
      setNewModule({
        title: "",
        description: "",
        category: "",
        duration: 0,
        isMandatory: false,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create training module",
        variant: "destructive",
      });
    },
  });

  const importCSVMutation = useMutation({
    mutationFn: async (products: any[]) => {
      return await apiRequest('POST', '/api/training/import/csv', { products });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
      toast({
        title: "Success",
        description: `Successfully imported ${(data as any).created || 0} product training modules`,
      });
      setShowImportDialog(false);
      setImportMethod(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import products from CSV",
        variant: "destructive",
      });
    },
  });

  const importBigCommerceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/training/import/bigcommerce', {});
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
      toast({
        title: "Success",
        description: `Successfully imported ${(data as any).created || 0} product training modules from BigCommerce`,
      });
      setShowImportDialog(false);
      setImportMethod(null);
    },
    onError: (error: any) => {
      toast({
        title: "BigCommerce Sync Failed",
        description: error.message || "Failed to import products from BigCommerce",
        variant: "destructive",
      });
    },
  });

  // AI Generation Jobs Query - Always enabled for badge counter
  const { data: generationJobs, refetch: refetchJobs } = useQuery<any[]>({
    queryKey: ["/api/training/generation-jobs"],
    enabled: true, // Always enabled so badge counter works
    refetchInterval: showAIJobs ? 5000 : 30000, // Poll every 5s when dialog open, 30s when closed
  });

  // Generate AI Training Mutation
  const generateAIMutation = useMutation({
    mutationFn: async (data: { moduleId: number; productInfo: any }) => {
      return await apiRequest('POST', '/api/training/generate-ai', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/generation-jobs"] });
      toast({
        title: "AI Generation Started",
        description: "Your training content is being generated. Check the AI Jobs dialog for progress.",
      });
      refetchJobs();
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to start AI generation",
        variant: "destructive",
      });
    },
  });

  // Approve AI Content Mutation
  const approveAIMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return await apiRequest('POST', `/api/training/generation-jobs/${jobId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/generation-jobs"] });
      toast({
        title: "Content Published",
        description: "AI-generated training content has been published to the module",
      });
      refetchJobs();
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve AI content",
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
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',');
        
        const allRows = lines.slice(1).map(line => {
          const values = line.split(',');
          const row: any = {};
          headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
          });
          return row;
        });

        // Keep all rows (products and images) - backend will parse them correctly
        importCSVMutation.mutate(allRows);
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

  const handleViewModule = (module: any) => {
    setSelectedModule(module);
    setShowModuleDetail(true);
  };

  const totalEnrollments = enrollments?.length || 0;
  const completedEnrollments = enrollments?.filter((e) => e.status === "completed").length || 0;
  const completionRate = totalEnrollments ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

  if (user?.role !== "admin" && user?.role !== "manager") {
    return (
      <AdminLayout currentTab="training">
        <div className="flex items-center justify-center h-full">
          <Card className="w-96">
            <CardContent className="p-6 text-center">
              <p className="text-red-500">Access denied. Admin privileges required.</p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentTab="training">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold font-poppins text-slate-900 dark:text-white">
            Training Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Manage employee training modules, track progress, and build skills
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowImportDialog(true)} variant="outline" data-testid="button-import-training">
            <Upload className="w-4 h-4 mr-2" />
            Import Training
          </Button>
          <Button onClick={() => setShowAIJobs(true)} variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950" data-testid="button-ai-jobs">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Jobs
            {generationJobs && generationJobs.filter(j => j.status === 'processing' || j.status === 'pending').length > 0 && (
              <Badge className="ml-2 bg-purple-500">{generationJobs.filter(j => j.status === 'processing' || j.status === 'pending').length}</Badge>
            )}
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
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Active Modules</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-active-modules">
                  {modules?.filter((m) => m.isActive).length || 0}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Enrollments</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-total-enrollments">
                  {totalEnrollments}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Completion Rate</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-completion-rate">
                  {completionRate}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
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
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stripHtml(module.description || '')}</p>
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
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {module.duration} minutes
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Generate AI content for this module
                        generateAIMutation.mutate({
                          moduleId: module.id,
                          productInfo: {
                            name: module.title,
                            description: module.description,
                            category: module.category || 'Product',
                            images: module.thumbnailUrl ? [module.thumbnailUrl] : [],
                          }
                        });
                      }}
                      disabled={generateAIMutation.isPending}
                      className="border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950"
                      data-testid={`button-generate-ai-${module.id}`}
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      Generate AI
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewModule(module)}
                      data-testid={`button-view-module-${module.id}`}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
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
                placeholder="Module title"
                data-testid="input-module-title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newModule.description}
                onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                placeholder="Module description"
                data-testid="input-module-description"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={newModule.category}
                onChange={(e) => setNewModule({ ...newModule, category: e.target.value })}
                placeholder="e.g., Product Training"
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
                placeholder="0"
                data-testid="input-module-duration"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModule(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateModule} 
                disabled={createModuleMutation.isPending}
                data-testid="button-submit-module"
              >
                {createModuleMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Module'
                )}
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
          <div className="space-y-4">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Choose an import method to create training modules from your products:
            </p>

            {/* Import Method Selection */}
            {!importMethod && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setImportMethod('csv')}
                  className="p-6 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left"
                  data-testid="button-select-csv-import"
                >
                  <Upload className="w-8 h-8 text-blue-500 mb-2" />
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">CSV Upload</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Upload a CSV file exported from BigCommerce
                  </p>
                </button>

                <button
                  onClick={() => setImportMethod('bigcommerce')}
                  className="p-6 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left"
                  data-testid="button-select-bigcommerce-import"
                >
                  <ShoppingCart className="w-8 h-8 text-green-500 mb-2" />
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">BigCommerce API</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Sync directly from your BigCommerce store
                  </p>
                </button>
              </div>
            )}

            {/* CSV Upload Section */}
            {importMethod === 'csv' && (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => setImportMethod(null)}
                  className="mb-2"
                >
                  ← Back to Selection
                </Button>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Upload a CSV file exported from BigCommerce (with products and images)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
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
              </div>
            )}

            {/* BigCommerce Sync Section */}
            {importMethod === 'bigcommerce' && (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => setImportMethod(null)}
                  className="mb-2"
                >
                  ← Back to Selection
                </Button>
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

      {/* Module Detail Dialog */}
      <Dialog open={showModuleDetail} onOpenChange={setShowModuleDetail}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedModule?.title}</DialogTitle>
          </DialogHeader>
          {moduleDetails ? (
            <div className="space-y-6">
              {/* Module Info */}
              <div>
                <div 
                  className="text-slate-600 dark:text-slate-400 mb-4 prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: moduleDetails.description || '' }}
                />
                <div className="flex gap-2 flex-wrap">
                  {moduleDetails.category && (
                    <Badge variant="outline">{moduleDetails.category}</Badge>
                  )}
                  <Badge variant="outline">{moduleDetails.duration} minutes</Badge>
                  {moduleDetails.difficulty && (
                    <Badge variant="outline">{moduleDetails.difficulty}</Badge>
                  )}
                </div>
              </div>

              {/* Full Content */}
              {moduleDetails.content && (
                <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
                  <h3 className="font-semibold mb-2">Content</h3>
                  <div 
                    className="prose dark:prose-invert max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: moduleDetails.content }}
                  />
                </div>
              )}

              {/* Lessons */}
              {moduleDetails.lessons && moduleDetails.lessons.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Lessons ({moduleDetails.lessons.length})</h3>
                  <div className="space-y-3">
                    {moduleDetails.lessons.map((lesson: any) => (
                      <div
                        key={lesson.id}
                        className="border rounded-lg p-4 bg-white dark:bg-slate-900"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{lesson.title}</h4>
                          <Badge variant="secondary">{lesson.duration} min</Badge>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {lesson.contentType === 'markdown' ? (
                            <div className="whitespace-pre-wrap">{lesson.content}</div>
                          ) : (
                            <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {moduleDetails.skills && moduleDetails.skills.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Skills Earned</h3>
                  <div className="flex gap-2 flex-wrap">
                    {moduleDetails.skills.map((skill: any) => (
                      <Badge key={skill.id} className="bg-green-500">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowModuleDetail(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Jobs Dialog */}
      <Dialog open={showAIJobs} onOpenChange={setShowAIJobs}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI Training Generation Jobs
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {generationJobs && generationJobs.length > 0 ? (
              generationJobs.map((job: any) => (
                <Card key={job.id} className="border-2" data-testid={`job-${job.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">Module ID: {job.moduleId}</h3>
                          <Badge
                            className={
                              job.status === 'completed' ? 'bg-green-500' :
                              job.status === 'processing' ? 'bg-blue-500' :
                              job.status === 'failed' ? 'bg-red-500' :
                              job.status === 'approved' ? 'bg-purple-500' :
                              'bg-gray-500'
                            }
                          >
                            {job.status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />}
                            {job.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1 inline" />}
                            {job.status === 'failed' && <XCircle className="w-3 h-3 mr-1 inline" />}
                            {job.status === 'pending' && <Clock className="w-3 h-3 mr-1 inline" />}
                            {job.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          {job.productInfo?.name || 'No product info'}
                        </p>
                        {job.errorMessage && (
                          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-2 mb-2">
                            <p className="text-sm text-red-600 dark:text-red-400">
                              Error: {job.errorMessage}
                            </p>
                          </div>
                        )}
                        {job.generatedContent && (
                          <div className="mt-3 space-y-2">
                            <div className="text-sm">
                              <span className="font-medium">Generated:</span>
                              <ul className="ml-4 mt-1 text-slate-600 dark:text-slate-400">
                                <li>• {job.generatedContent.lessons?.length || 0} lessons</li>
                                <li>• {job.generatedContent.questions?.length || 0} quiz questions</li>
                                <li>• {job.generatedContent.skills?.length || 0} skills</li>
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {job.status === 'completed' && (
                          <Button
                            size="sm"
                            onClick={() => approveAIMutation.mutate(job.id)}
                            disabled={approveAIMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700"
                            data-testid={`button-approve-${job.id}`}
                          >
                            {approveAIMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve & Publish
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No AI generation jobs yet</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                  Use "Generate AI" on modules to create training content automatically
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAIJobs(false)}>
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
