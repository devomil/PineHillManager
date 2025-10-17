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
import { ArrowLeft, BookOpen, CheckCircle, Clock, Award, PlayCircle, ChevronRight, ChevronLeft } from "lucide-react";
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
    queryKey: [`/api/training/modules/${moduleId}`],
    enabled: isAuthenticated && moduleId > 0,
  });

  const { data: moduleProgress } = useQuery<TrainingProgress>({
    queryKey: [`/api/training/progress/${moduleId}`],
    enabled: isAuthenticated && moduleId > 0,
  });

  const { data: questions } = useQuery<TrainingQuestion[]>({
    queryKey: [`/api/training/assessments/${module?.assessment?.id}/questions`],
    enabled: isAuthenticated && !!module?.assessment?.id,
  });

  const { data: attempts } = useQuery<TrainingAttempt[]>({
    queryKey: [`/api/training/assessments/${module?.assessment?.id}/attempts`],
    enabled: isAuthenticated && !!module?.assessment?.id,
  });

  const completeLessonMutation = useMutation({
    mutationFn: async (data: { lessonId: number; timeSpent?: number }) => {
      const response = await apiRequest("POST", `/api/training/lessons/${data.lessonId}/complete`, { timeSpent: data.timeSpent });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/training/progress/${moduleId}`] });
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
      queryClient.invalidateQueries({ queryKey: [`/api/training/progress/${moduleId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/progress"] });
      queryClient.invalidateQueries({ queryKey: [`/api/training/assessments/${module?.assessment?.id}/attempts`] });
      
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
      queryClient.invalidateQueries({ queryKey: [`/api/training/progress/${moduleId}`] });
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

  // Helper function to extract image URL from lesson content
  const getProductImage = () => {
    if (!module?.lessons) return null;
    
    for (const lesson of module.lessons) {
      if (typeof lesson.content === 'string') {
        const imgMatch = lesson.content.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch && imgMatch[1]) {
          return imgMatch[1];
        }
      }
    }
    return module.thumbnailUrl || null;
  };

  // Helper function to format lesson content (convert plain text with newlines to HTML)
  const formatLessonContent = (content: string) => {
    // If content already has HTML tags, return as is
    if (content.includes('<p>') || content.includes('<div>')) {
      return content;
    }
    
    // Split by double newlines for paragraphs
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map(para => {
      const lines = para.split('\n').filter(l => l.trim());
      
      // Check if it's a Q&A format (bullet Q: followed by A:)
      if (lines.length === 2 && lines[0].includes('• Q:') && lines[1].startsWith('A:')) {
        const question = lines[0].replace('•', '').replace('Q:', '').trim();
        const answer = lines[1].replace('A:', '').trim();
        return `
          <div class="mb-4">
            <p class="text-slate-600 dark:text-slate-400 mb-2">
              <span class="font-medium">Q:</span> ${question}
            </p>
            <p class="font-semibold text-slate-900 dark:text-slate-100">
              A: ${answer}
            </p>
          </div>
        `;
      }
      
      // If it's a heading (single line, no bullet, short text)
      if (lines.length === 1 && !lines[0].includes('•') && lines[0].length < 100) {
        return `<h3 class="font-semibold text-lg mt-6 mb-3">${lines[0]}</h3>`;
      }
      
      // Check if it's a regular list (has bullet points but not Q&A)
      const hasBullets = lines.some(l => l.trim().startsWith('•'));
      
      if (hasBullets && !lines.some(l => l.includes('Q:'))) {
        const listItems = lines
          .filter(l => l.trim().startsWith('•'))
          .map(l => `<li>${l.replace('•', '').trim()}</li>`)
          .join('');
        const heading = lines.find(l => !l.trim().startsWith('•'));
        return (heading ? `<h3 class="font-semibold text-lg mt-6 mb-3">${heading}</h3>` : '') + 
               `<ul class="list-disc list-inside space-y-2 mb-4">${listItems}</ul>`;
      }
      
      // Regular paragraph
      return `<p class="mb-4">${para.replace(/\n/g, '<br>')}</p>`;
    }).join('');
  };

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
  const productImage = getProductImage();

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" data-testid="training-module-page">
      {/* Header */}
      <div className="bg-white shadow-sm border-b-4" style={{ borderBottomColor: '#607e66' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-semibold" style={{ color: '#5e637a' }}>
                  Pine Hill Farm
                </h1>
                <p className="text-sm" style={{ color: '#8c93ad' }}>Training Portal</p>
              </div>
            </div>
            
            <Link href="/training">
              <Button 
                variant="ghost" 
                className="hover:bg-slate-100"
                style={{ color: '#5e637a' }}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Training
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">

          {/* Module Header with Image */}
          <Card className="overflow-hidden">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Product Image */}
              <div className="md:col-span-1">
                {productImage ? (
                  <img 
                    src={productImage} 
                    alt={module.title}
                    className="w-full h-64 md:h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-64 md:h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #607e66 0%, #5b7c99 100%)' }}>
                    <BookOpen className="w-24 h-24 text-white opacity-50" />
                  </div>
                )}
              </div>

              {/* Module Info */}
              <div className="md:col-span-2 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-3xl font-bold" style={{ color: '#5e637a' }}>{module.title}</h2>
                      {isCompleted && (
                        <Badge className="text-white" style={{ backgroundColor: '#607e66' }}>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                    {module.category && (
                      <Badge variant="outline" style={{ borderColor: '#607e66', color: '#607e66' }} className="mb-3">
                        {module.category}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: '#5e637a' }}>Overall Progress</span>
                    <span className="text-sm font-bold" style={{ color: '#607e66' }}>
                      {progressPercentage}%
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#f8f8f3' }}>
                    <BookOpen className="w-6 h-6 mx-auto mb-1" style={{ color: '#607e66' }} />
                    <p className="text-2xl font-bold" style={{ color: '#5e637a' }}>{module.lessons?.length || 0}</p>
                    <p className="text-xs" style={{ color: '#8c93ad' }}>Lessons</p>
                  </div>
                  
                  <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#f8f8f3' }}>
                    <Clock className="w-6 h-6 mx-auto mb-1" style={{ color: '#5b7c99' }} />
                    <p className="text-2xl font-bold" style={{ color: '#5e637a' }}>{module.duration || 0}</p>
                    <p className="text-xs" style={{ color: '#8c93ad' }}>Minutes</p>
                  </div>
                  
                  <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#f8f8f3' }}>
                    <Award className="w-6 h-6 mx-auto mb-1" style={{ color: '#6c97ab' }} />
                    <p className="text-2xl font-bold" style={{ color: '#5e637a' }}>{module.skills?.length || 0}</p>
                    <p className="text-xs" style={{ color: '#8c93ad' }}>Skills</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Lesson Navigation */}
          {!showAssessment && module.lessons && module.lessons.length > 0 && (
            <Card className="bg-white shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: '#5e637a' }}>
                    Lesson {currentLessonIndex + 1} of {module.lessons.length}
                  </h3>
                  <div className="flex items-center gap-2">
                    {module.lessons.map((_, index) => (
                      <div
                        key={index}
                        className="h-2 w-12 rounded-full transition-colors"
                        style={{
                          backgroundColor: index === currentLessonIndex
                            ? '#607e66'
                            : index < currentLessonIndex
                            ? '#8c93ad'
                            : '#e5e7eb'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lesson Content */}
          {!showAssessment && currentLesson && (
            <Card>
              <CardHeader className="text-white" style={{ background: 'linear-gradient(135deg, #607e66 0%, #5b7c99 100%)' }}>
                <CardTitle className="flex items-center text-xl">
                  <PlayCircle className="w-6 h-6 mr-3" />
                  {currentLesson.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div 
                  className="prose prose-lg dark:prose-invert max-w-none"
                  data-testid="lesson-content"
                  style={{
                    fontSize: '16px',
                    lineHeight: '1.8',
                  }}
                >
                  {typeof currentLesson.content === 'string' 
                    ? <div dangerouslySetInnerHTML={{ __html: formatLessonContent(currentLesson.content) }} />
                    : <div>{JSON.stringify(currentLesson.content)}</div>
                  }
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-8 mt-8 border-t">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCurrentLessonIndex(Math.max(0, currentLessonIndex - 1))}
                    disabled={currentLessonIndex === 0}
                    data-testid="button-previous-lesson"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  {currentLessonIndex < (module.lessons?.length || 0) - 1 ? (
                    <Button
                      size="lg"
                      className="text-white hover:opacity-90"
                      style={{ backgroundColor: '#607e66' }}
                      onClick={handleCompleteLesson}
                      disabled={completeLessonMutation.isPending}
                      data-testid="button-next-lesson"
                    >
                      {completeLessonMutation.isPending ? "Saving..." : "Mark Complete & Continue"}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="text-white hover:opacity-90"
                      style={{ backgroundColor: '#607e66' }}
                      onClick={handleCompleteLesson}
                      disabled={completeLessonMutation.isPending}
                      data-testid="button-finish-lessons"
                    >
                      {completeLessonMutation.isPending ? "Saving..." : "Complete Training"}
                      <CheckCircle className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assessment Section */}
          {(showAssessment || (isCompleted && module.assessment)) && (
            <Card>
              <CardHeader className="text-white" style={{ background: 'linear-gradient(135deg, #6c97ab 0%, #5b7c99 100%)' }}>
                <CardTitle className="flex items-center text-xl">
                  <Award className="w-6 h-6 mr-3" />
                  Final Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {!showAssessment && !isCompleted && (
                  <div className="text-center py-12">
                    <Award className="w-16 h-16 mx-auto mb-4" style={{ color: '#6c97ab' }} />
                    <h3 className="text-xl font-semibold mb-2" style={{ color: '#5e637a' }}>Ready for Assessment?</h3>
                    <p className="mb-6" style={{ color: '#8c93ad' }}>
                      Complete all lessons to unlock the final assessment
                    </p>
                    <Button
                      size="lg"
                      onClick={handleStartAssessment}
                      disabled={!isCompleted}
                      className="text-white hover:opacity-90"
                      style={{ backgroundColor: '#6c97ab' }}
                      data-testid="button-start-assessment"
                    >
                      Start Assessment
                    </Button>
                  </div>
                )}

                {showAssessment && questions && questions.length > 0 && (
                  <div className="space-y-6">
                    <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: '#f8f8f3' }}>
                      <p className="text-sm" style={{ color: '#5e637a' }}>
                        <strong>Passing Score:</strong> {module.assessment?.passingScore}% | 
                        <strong className="ml-3">Time Limit:</strong> {module.assessment?.timeLimit ? `${module.assessment.timeLimit} minutes` : 'No limit'} |
                        <strong className="ml-3">Attempts:</strong> {attemptsCount} / {module.assessment?.maxAttempts || '∞'}
                      </p>
                    </div>

                    {questions.map((question, index) => (
                      <div key={question.id} className="border-b pb-6">
                        <h4 className="font-semibold text-lg mb-4">
                          {index + 1}. {question.questionText}
                        </h4>
                        <RadioGroup
                          value={assessmentAnswers[question.id.toString()]}
                          onValueChange={(value) =>
                            setAssessmentAnswers((prev) => ({
                              ...prev,
                              [question.id.toString()]: value,
                            }))
                          }
                        >
                          {question.options?.map((option: any, optionIndex: number) => {
                            const optionText = typeof option === 'string' ? option : option.text;
                            const optionId = typeof option === 'string' ? optionText : option.id;
                            return (
                              <div key={optionIndex} className="flex items-center space-x-2 mb-2">
                                <RadioGroupItem value={optionText} id={`q${question.id}-${optionIndex}`} />
                                <Label htmlFor={`q${question.id}-${optionIndex}`} className="cursor-pointer">
                                  {optionText}
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </div>
                    ))}

                    <Button
                      size="lg"
                      onClick={handleSubmitAssessment}
                      disabled={
                        submitAssessmentMutation.isPending ||
                        Object.keys(assessmentAnswers).length < questions.length ||
                        maxAttemptsReached
                      }
                      className="w-full text-white hover:opacity-90"
                      style={{ backgroundColor: '#607e66' }}
                      data-testid="button-submit-assessment"
                    >
                      {submitAssessmentMutation.isPending ? "Submitting..." : "Submit Assessment"}
                    </Button>
                  </div>
                )}

                {isCompleted && latestAttempt && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#607e66' }} />
                    <h3 className="text-2xl font-bold mb-2" style={{ color: '#607e66' }}>Congratulations!</h3>
                    <p className="mb-4" style={{ color: '#8c93ad' }}>
                      You have successfully completed this training module
                    </p>
                    <div className="p-6 rounded-lg inline-block" style={{ backgroundColor: '#f8f8f3' }}>
                      <p className="text-sm mb-1" style={{ color: '#8c93ad' }}>Final Score</p>
                      <p className="text-4xl font-bold" style={{ color: '#607e66' }}>
                        {latestAttempt.score}%
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
