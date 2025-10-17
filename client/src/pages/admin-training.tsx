import { useState } from "react";
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
import { queryClient } from "@/lib/queryClient";
import { BookOpen, Plus, Users, Award, TrendingUp } from "lucide-react";
import AdminLayout from "@/components/admin-layout";

export default function AdminTraining() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showCreateModule, setShowCreateModule] = useState(false);
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

  const handleCreateModule = () => {
    createModuleMutation.mutate(newModule);
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
        <Button onClick={() => setShowCreateModule(true)} data-testid="button-create-module">
          <Plus className="w-4 h-4 mr-2" />
          Create Module
        </Button>
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
    </div>
    </AdminLayout>
  );
}
