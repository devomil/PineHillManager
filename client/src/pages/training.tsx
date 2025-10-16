import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { BookOpen, Play, CheckCircle, Clock, Award, Target, AlertCircle, ChevronRight } from "lucide-react";
import { Link } from "wouter";

interface TrainingModule {
  id: number;
  title: string;
  description: string;
  category?: string;
  duration?: number;
  isActive: boolean;
  isMandatory: boolean;
  thumbnailUrl?: string;
}

interface TrainingProgress {
  id: number;
  userId: string;
  moduleId: number;
  status: string;
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  dueDate?: Date;
  finalScore?: number;
}

interface EmployeeSkill {
  id: number;
  skillId: number;
  skillName: string;
  proficiencyLevel: string;
  acquiredAt: Date;
}

export default function Training() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("all");

  const { data: modules, isLoading: modulesLoading } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/modules"],
    enabled: isAuthenticated,
  });

  const { data: progress, isLoading: progressLoading } = useQuery<TrainingProgress[]>({
    queryKey: ["/api/training/progress"],
    enabled: isAuthenticated,
  });

  const { data: skills } = useQuery<EmployeeSkill[]>({
    queryKey: ["/api/training/skills/employee"],
    enabled: isAuthenticated,
  });

  const { data: overdueTraining } = useQuery({
    queryKey: ["/api/training/overdue"],
    enabled: isAuthenticated,
  });

  const { data: mandatoryModules } = useQuery({
    queryKey: ["/api/training/mandatory"],
    enabled: isAuthenticated,
  });

  const enrollMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      const response = await fetch("/api/training/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to enroll in module");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/progress"] });
      toast({
        title: "Enrolled Successfully",
        description: "You've been enrolled in the training module",
      });
    },
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

  const getProgressForModule = (moduleId: number) => {
    return progress?.find((p: any) => p.moduleId === moduleId);
  };

  const completedCount = progress?.filter((p) => p.status === "completed").length || 0;
  const totalEnrolled = progress?.length || 0;
  const overdueCount = (overdueTraining as any[])?.length || 0;

  const filteredModules = modules?.filter((module) => {
    if (activeTab === "all") return true;
    if (activeTab === "mandatory") return module.isMandatory;
    if (activeTab === "in_progress") {
      const moduleProgress = getProgressForModule(module.id);
      return moduleProgress?.status === "in_progress";
    }
    if (activeTab === "completed") {
      const moduleProgress = getProgressForModule(module.id);
      return moduleProgress?.status === "completed";
    }
    return true;
  });

  const handleStartModule = (module: any) => {
    const moduleProgress = getProgressForModule(module.id);
    if (!moduleProgress) {
      enrollMutation.mutate(module.id);
    }
    // Navigate to module detail page
    window.location.href = `/training/module/${module.id}`;
  };

  return (
    <div className="space-y-6" data-testid="training-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Training Portal</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Access training modules and track your progress
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Completed</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-completed-count">
                  {completedCount}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">In Progress</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-in-progress-count">
                  {progress?.filter((p) => p.status === "in_progress").length || 0}
                </p>
              </div>
              <Play className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Skills Earned</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-skills-count">
                  {skills?.length || 0}
                </p>
              </div>
              <Award className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Overdue</p>
                <p className="text-2xl font-bold text-red-500" data-testid="text-overdue-count">
                  {overdueCount}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">Overdue Training</h3>
                <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                  You have {overdueCount} overdue training {overdueCount === 1 ? "module" : "modules"}. Please complete them as soon as possible.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2 text-farm-green" />
            Overall Training Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {progressLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {completedCount} / {totalEnrolled} completed
                </span>
              </div>
              <Progress 
                value={totalEnrolled ? (completedCount / totalEnrolled) * 100 : 0}
                className="h-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All Modules</TabsTrigger>
          <TabsTrigger value="mandatory" data-testid="tab-mandatory">
            Mandatory
            {(mandatoryModules as any[])?.length > 0 && (
              <Badge variant="secondary" className="ml-2">{(mandatoryModules as any[]).length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="in_progress" data-testid="tab-in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* Training Modules */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modulesLoading ? (
              [...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="animate-pulse">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="animate-pulse">
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full mb-4"></div>
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredModules && filteredModules.length > 0 ? (
              filteredModules.map((module: any) => {
                const moduleProgress = getProgressForModule(module.id);
                const isCompleted = moduleProgress?.status === "completed";
                const isInProgress = moduleProgress?.status === "in_progress";
                const isOverdue = (overdueTraining as any[])?.some((o: any) => o.moduleId === module.id);
                
                return (
                  <Card key={module.id} className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-red-300' : ''}`} data-testid={`card-module-${module.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{module.title}</CardTitle>
                        <div className="flex items-center space-x-2">
                          {isCompleted && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                          {module.duration && (
                            <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                              <Clock className="w-3 h-3 mr-1" />
                              {module.duration}m
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {module.category && (
                          <Badge variant="outline" className="w-fit">
                            {module.category}
                          </Badge>
                        )}
                        {module.isMandatory && (
                          <Badge variant="destructive" className="w-fit">
                            Required
                          </Badge>
                        )}
                        {isOverdue && (
                          <Badge variant="destructive" className="w-fit">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {module.description}
                      </p>
                      
                      {moduleProgress && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">Progress</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {moduleProgress.progress}%
                            </span>
                          </div>
                          <Progress value={moduleProgress.progress} className="h-1.5" />
                          {moduleProgress.dueDate && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                              Due: {new Date(moduleProgress.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}

                      <Button 
                        className={`w-full ${
                          isCompleted 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-farm-green hover:bg-green-600'
                        }`}
                        disabled={!module.isActive}
                        onClick={() => handleStartModule(module)}
                        data-testid={`button-start-module-${module.id}`}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Review
                          </>
                        ) : isInProgress ? (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Continue
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start
                          </>
                        )}
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No training modules available</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Skills Section */}
      {skills && skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="w-5 h-5 mr-2 text-yellow-500" />
              Your Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill: any) => (
                <Badge key={skill.id} variant="secondary" className="text-sm" data-testid={`badge-skill-${skill.id}`}>
                  {skill.skillName} - {skill.proficiencyLevel}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
