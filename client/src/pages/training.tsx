import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Play, CheckCircle, Clock } from "lucide-react";

export default function Training() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ["/api/training-modules"],
    enabled: isAuthenticated,
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["/api/training-progress"],
    enabled: isAuthenticated,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Training Portal</h1>
        <p className="text-slate-500 mt-1">
          Access training modules and track your progress
        </p>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-farm-green" />
            Training Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {progressLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-slate-200 rounded w-full"></div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-slate-500">
                  {progress?.filter((p: any) => p.status === 'completed').length || 0} / {progress?.length || 0} completed
                </span>
              </div>
              <Progress 
                value={progress?.length ? (progress.filter((p: any) => p.status === 'completed').length / progress.length) * 100 : 0}
                className="h-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modulesLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="animate-pulse">
                  <div className="h-3 bg-slate-200 rounded w-full mb-4"></div>
                  <div className="h-8 bg-slate-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : modules && modules.length > 0 ? (
          modules.map((module: any) => {
            const moduleProgress = getProgressForModule(module.id);
            const isCompleted = moduleProgress?.status === 'completed';
            const isInProgress = moduleProgress?.status === 'in_progress';
            
            return (
              <Card key={module.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      {isCompleted && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {module.duration && (
                        <div className="flex items-center text-sm text-slate-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {module.duration}m
                        </div>
                      )}
                    </div>
                  </div>
                  {module.category && (
                    <Badge variant="outline" className="w-fit">
                      {module.category}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600">
                    {module.description}
                  </p>
                  
                  {moduleProgress && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">Progress</span>
                        <span className="text-xs text-slate-500">
                          {moduleProgress.progress}%
                        </span>
                      </div>
                      <Progress value={moduleProgress.progress} className="h-1.5" />
                    </div>
                  )}

                  <Button 
                    className={`w-full ${
                      isCompleted 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-farm-green hover:bg-green-600'
                    }`}
                    disabled={!module.isActive}
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
                  </Button>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No training modules available</p>
          </div>
        )}
      </div>
    </div>
  );
}
