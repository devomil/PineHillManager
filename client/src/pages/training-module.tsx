import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, BookOpen, CheckCircle, Clock, Award, PlayCircle, FileText } from "lucide-react";
import { useRoute, Link } from "wouter";
import type { 
  TrainingLesson, 
  TrainingAssessment, 
  TrainingQuestion, 
  TrainingProgress,
  TrainingAttempt,
  TrainingModule as BaseTrainingModule,
  TrainingSkill
} from "@shared/schema";

interface TrainingModuleWithRelations extends BaseTrainingModule {
  lessons?: TrainingLesson[];
  assessment?: TrainingAssessment;
  skills?: TrainingSkill[];
}

interface AssessmentAttemptResult {
  passed: boolean;
  score: number;
  attemptId: number;
}

export default function TrainingModulePage() {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [, params] = useRoute("/training/module/:id");
  const moduleId = parseInt(params?.id || "0");

  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string>>({});
  const [assessmentStartTime, setAssessmentStartTime] = useState<Date | null>(null);

  const { data: module, isLoading: moduleLoading } = useQuery<TrainingModuleWithRelations>({
    queryKey: ["/api/training/modules", moduleId],
    enabled: isAuthenticated && moduleId > 0,
  });

  const { data: moduleProgress } = useQuery<TrainingProgress>({
    queryKey: ["/api/training/progress", moduleId],
    enabled: isAuthenticated && moduleId > 0,
  });

  const { data: questions } = useQuery<TrainingQuestion[]>({
    queryKey: ["/api/training/assessments", module?.assessment?.id, "questions"],
    enabled: isAuthenticated && !!module?.assessment?.id,
  });

  const { data: attempts } = useQuery<TrainingAttempt[]>({
    queryKey: ["/api/training/assessments", module?.assessment?.id, "attempts"],
    enabled: isAuthenticated && !!module?.assessment?.id,
  });

  const completeLessonMutation = useMutation({
    mutationFn: async (data: { lessonId: number; timeSpent?: number }) => {
      const response = await apiRequest("POST", `/api/training/lessons/${data.lessonId}/complete`, { timeSpent: data.timeSpent });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/progress", moduleId] });
      toast({
        title: "Lesson Complete",
        description: "Great job! Moving to the next lesson.",
      });
      
      if (currentLessonIndex < (module?.lessons?.length || 0) - 1) {
        setCurrentLessonIndex(currentLessonIndex + 1);
      } else {
        setShowAssessment(true);
      }
    },
  });

  const submitAssessmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/training/assessments/${module?.assessment?.id}/attempt`, data);
      return response.json() as Promise<AssessmentAttemptResult>;
    },
    onSuccess: (result: AssessmentAttemptResult) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/progress", moduleId] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/assessments", module?.assessment?.id, "attempts"] });
      
      if (result.passed) {
        toast({
          title: "Congratulations!",
          description: `You passed with a score of ${result.score}%!`,
        });
        setTimeout(() => {
          window.location.href = "/training";
        }, 2000);
      } else {
        toast({
          title: "Assessment Failed",
          description: `You scored ${result.score}%. The passing score is ${module?.assessment?.passingScore}%. Please try again.`,
          variant: "destructive",
        });
        setShowAssessment(false);
        setAssessmentAnswers({});
      }
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      const response = await apiRequest("POST", "/api/training/enroll", { moduleId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/progress", moduleId] });
      toast({
        title: "Enrolled Successfully",
        description: "You can now start the training module",
      });
    },
  });

  useEffect(() => {
    if (module && !moduleProgress) {
      enrollMutation.mutate(moduleId);
    }
  }, [module, moduleProgress]);

  if (moduleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-green"></div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Module not found</p>
      </div>
    );
  }

  const currentLesson = module.lessons?.[currentLessonIndex];
  const progressPercentage = moduleProgress?.progress || 0;
  const isCompleted = moduleProgress?.status === "completed";
  const attemptsCount = attempts?.length || 0;
  const maxAttemptsReached = !!(module.assessment?.maxAttempts && attemptsCount >= module.assessment.maxAttempts);
  const latestAttempt = attempts?.[0];

  const handleCompleteLesson = () => {
    if (currentLesson) {
      completeLessonMutation.mutate({ lessonId: currentLesson.id });
    }
  };

  const handleStartAssessment = () => {
    setShowAssessment(true);
    setAssessmentStartTime(new Date());
  };

  const handleSubmitAssessment = () => {
    if (!assessmentStartTime) return;

    const timeSpent = Math.floor((new Date().getTime() - assessmentStartTime.getTime()) / 1000);
    
    submitAssessmentMutation.mutate({
      answers: assessmentAnswers,
      timeSpent,
      startedAt: assessmentStartTime.toISOString(),
    });
  };

  return (
    <div className="space-y-6" data-testid="training-module-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/training">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Training
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{module.title}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{module.description}</p>
          </div>
        </div>
        {isCompleted && (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="w-4 h-4 mr-1" />
            Completed
          </Badge>
        )}
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {progressPercentage}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Module Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-farm-green" />
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Lessons</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{module.lessons?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Duration</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{module.duration || 0} min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Skills Earned</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{module.skills?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lesson Content */}
      {!showAssessment && currentLesson && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-farm-green" />
                Lesson {currentLessonIndex + 1}: {currentLesson.title}
              </CardTitle>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {currentLessonIndex + 1} of {module.lessons?.length || 0}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose dark:prose-invert max-w-none" data-testid="lesson-content">
              {typeof currentLesson.content === 'string' 
                ? <div dangerouslySetInnerHTML={{ __html: currentLesson.content }} />
                : <div>{JSON.stringify(currentLesson.content)}</div>
              }
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentLessonIndex(Math.max(0, currentLessonIndex - 1))}
                disabled={currentLessonIndex === 0}
                data-testid="button-previous-lesson"
              >
                Previous
              </Button>
              
              {currentLessonIndex < (module.lessons?.length || 0) - 1 ? (
                <Button
                  onClick={handleCompleteLesson}
                  disabled={completeLessonMutation.isPending}
                  data-testid="button-next-lesson"
                >
                  Mark Complete & Continue
                </Button>
              ) : (
                <Button
                  onClick={handleCompleteLesson}
                  disabled={completeLessonMutation.isPending}
                  data-testid="button-finish-lessons"
                >
                  Finish Lessons
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment Section */}
      {(showAssessment || (isCompleted && module.assessment)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="w-5 h-5 mr-2 text-yellow-500" />
              Final Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showAssessment && !isCompleted && (
              <div className="text-center py-8">
                <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Ready for the Assessment?</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  You've completed all lessons. Take the final assessment to earn your certificate and skills.
                </p>
                <div className="flex flex-col items-center gap-2 mb-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Passing Score: {module.assessment?.passingScore}%
                  </p>
                  {module.assessment?.timeLimit && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Time Limit: {module.assessment.timeLimit} minutes
                    </p>
                  )}
                  {module.assessment?.maxAttempts && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Attempts: {attemptsCount} / {module.assessment.maxAttempts}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleStartAssessment}
                  disabled={maxAttemptsReached}
                  size="lg"
                  data-testid="button-start-assessment"
                >
                  <PlayCircle className="w-5 h-5 mr-2" />
                  {maxAttemptsReached ? "Max Attempts Reached" : "Start Assessment"}
                </Button>
              </div>
            )}

            {showAssessment && questions && (
              <div className="space-y-6">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Answer all questions to complete the assessment. You need {module.assessment?.passingScore}% to pass.
                  </p>
                </div>

                {questions.map((question, index) => (
                  <div key={question.id} className="space-y-3" data-testid={`question-${question.id}`}>
                    <p className="font-medium">
                      {index + 1}. {question.questionText}
                    </p>
                    <RadioGroup
                      value={assessmentAnswers[question.id.toString()]}
                      onValueChange={(value) =>
                        setAssessmentAnswers({ ...assessmentAnswers, [question.id.toString()]: value })
                      }
                    >
                      {Object.entries(question.options as Record<string, any>).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <RadioGroupItem value={key} id={`q${question.id}-${key}`} />
                          <Label htmlFor={`q${question.id}-${key}`}>
                            {typeof value === 'string' ? value : (value?.text || value?.label || JSON.stringify(value))}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}

                <Button
                  onClick={handleSubmitAssessment}
                  disabled={
                    Object.keys(assessmentAnswers).length < questions.length ||
                    submitAssessmentMutation.isPending
                  }
                  size="lg"
                  className="w-full"
                  data-testid="button-submit-assessment"
                >
                  Submit Assessment
                </Button>
              </div>
            )}

            {isCompleted && latestAttempt && (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Assessment Completed!</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  You scored {latestAttempt.score}% on {new Date(latestAttempt.completedAt).toLocaleDateString()}
                </p>
                {moduleProgress?.finalScore && (
                  <Badge className="text-lg px-4 py-2">
                    Final Score: {moduleProgress.finalScore}%
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attempts History */}
      {attempts && attempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attempts.map((attempt: TrainingAttempt, index: number) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  data-testid={`attempt-${index}`}
                >
                  <div>
                    <p className="font-medium">Attempt {attempts.length - index}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(attempt.completedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={attempt.passed ? "bg-green-500" : "bg-red-500"}>
                      {attempt.score}%
                    </Badge>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {attempt.passed ? "Passed" : "Failed"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
