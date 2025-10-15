import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertTaskSchema, type Task, type User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, User as UserIcon, AlertCircle, CheckCircle, Clock, MessageSquare, Filter, X, ListChecks, Check, XCircle, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const taskFormSchema = insertTaskSchema.omit({
  createdBy: true,
}).extend({
  dueDate: z.string().optional(),
  steps: z.array(z.object({
    text: z.string(),
    completed: z.boolean(),
    order: z.number(),
  })).optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;
type TaskStep = { text: string; completed: boolean; order: number };

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [taskSteps, setTaskSteps] = useState<TaskStep[]>([]);
  const [newStepText, setNewStepText] = useState("");

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  // Fetch employees for assignment
  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ['/api/employees'],
    enabled: isAdminOrManager,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['/api/tasks/stats/overview'],
    enabled: isAdminOrManager,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: TaskFormData) => apiRequest('POST', '/api/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/stats/overview'] });
      toast({ title: "Success", description: "Task created successfully" });
      setIsCreateDialogOpen(false);
      form.reset();
      setTaskSteps([]);
      setNewStepText("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TaskFormData> }) =>
      apiRequest('PATCH', `/api/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/stats/overview'] });
      toast({ title: "Success", description: "Task updated successfully" });
      setSelectedTask(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    },
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
      priority: "medium",
      assignedTo: undefined,
      dueDate: "",
      steps: [],
    },
  });

  const onSubmit = (data: TaskFormData) => {
    if (!user?.id) return;
    const taskData = {
      ...data,
      steps: taskSteps.length > 0 ? taskSteps : undefined,
      createdBy: user.id,
    };
    createTaskMutation.mutate(taskData);
  };

  const handleAddStep = () => {
    if (!newStepText.trim()) return;
    const newStep: TaskStep = {
      text: newStepText,
      completed: false,
      order: taskSteps.length,
    };
    setTaskSteps([...taskSteps, newStep]);
    setNewStepText("");
  };

  const handleRemoveStep = (index: number) => {
    setTaskSteps(taskSteps.filter((_, i) => i !== index).map((step, i) => ({ ...step, order: i })));
  };

  const handleToggleStep = (index: number) => {
    setTaskSteps(taskSteps.map((step, i) => 
      i === index ? { ...step, completed: !step.completed } : step
    ));
  };

  const handleStatusChange = (taskId: number, newStatus: string) => {
    updateTaskMutation.mutate({
      id: taskId,
      data: { status: newStatus },
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'blocked': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
    return true;
  });

  const getEmployeeName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const employee = employees.find(e => e.id === userId);
    return employee ? `${employee.firstName} ${employee.lastName}` : userId;
  };

  if (!user) return null;

  return (
    <AdminLayout currentTab="tasks">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Task Management</h1>
            <p className="text-muted-foreground mt-1">
              {isAdminOrManager ? "Create, assign, and manage tasks" : "View and manage your assigned tasks"}
            </p>
          </div>
          {isAdminOrManager && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-task">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    Assign a new task to an employee or yourself
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Task title" {...field} data-testid="input-task-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Task description" 
                              {...field} 
                              value={field.value || ''}
                              data-testid="input-task-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Steps Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center gap-2">
                          <ListChecks className="h-4 w-4" />
                          Steps to Complete
                        </FormLabel>
                        <span className="text-xs text-muted-foreground">
                          {taskSteps.length} step{taskSteps.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {/* Step List */}
                      {taskSteps.length > 0 && (
                        <div className="space-y-2 p-3 bg-muted/50 rounded-md max-h-40 overflow-y-auto">
                          {taskSteps.map((step, index) => (
                            <div key={index} className="flex items-center gap-2 group">
                              <Checkbox
                                checked={step.completed}
                                onCheckedChange={() => handleToggleStep(index)}
                                data-testid={`checkbox-step-${index}`}
                              />
                              <span className={`flex-1 text-sm ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {step.text}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveStep(index)}
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                data-testid={`button-remove-step-${index}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Add Step Input */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a step..."
                          value={newStepText}
                          onChange={(e) => setNewStepText(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStep())}
                          data-testid="input-new-step"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddStep}
                          disabled={!newStepText.trim()}
                          data-testid="button-add-step"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-task-priority">
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="assignedTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assign To</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-task-assignee">
                                  <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {employees.map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id}>
                                    {emp.firstName} {emp.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              {...field} 
                              value={field.value || ''}
                              data-testid="input-task-due-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createTaskMutation.isPending} data-testid="button-submit-task">
                        {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats Cards - Admin/Manager Only */}
        {isAdminOrManager && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Tasks</CardDescription>
                <CardTitle className="text-3xl">{stats.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>In Progress</CardDescription>
                <CardTitle className="text-3xl text-blue-600">{stats.inProgress}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completed</CardDescription>
                <CardTitle className="text-3xl text-green-600">{stats.completed}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Urgent</CardDescription>
                <CardTitle className="text-3xl text-red-600">{stats.urgent}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="filter-status">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]" data-testid="filter-priority">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading tasks...
              </CardContent>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No tasks found
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow" data-testid={`card-task-${task.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                      </div>
                      {task.description && (
                        <CardDescription className="mt-2">{task.description}</CardDescription>
                      )}
                      {task.steps && task.steps.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <ListChecks className="h-4 w-4" />
                          <span>
                            {task.steps.filter(s => s.completed).length}/{task.steps.length} steps completed
                          </span>
                        </div>
                      )}
                    </div>
                    <Badge variant={getPriorityColor(task.priority)} data-testid={`badge-priority-${task.id}`}>
                      {task.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-4 w-4" />
                      <span data-testid={`text-assignee-${task.id}`}>Assigned: {task.assigneeName || getEmployeeName(task.assignedTo)}</span>
                    </div>
                    {(task as any).creatorName && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="font-medium">Created by: {(task as any).creatorName}</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTask(task)}
                      data-testid={`button-view-task-${task.id}`}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Select 
                      value={task.status} 
                      onValueChange={(value) => handleStatusChange(task.id, value)}
                      disabled={!isAdminOrManager && task.assignedTo !== user.id}
                    >
                      <SelectTrigger className="w-[180px]" data-testid={`select-status-${task.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Task Details Dialog */}
        {selectedTask && (
          <TaskDetailsDialog
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            isAdminOrManager={isAdminOrManager}
            currentUserId={user.id}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// Task Details Dialog Component
function TaskDetailsDialog({ 
  task: initialTask, 
  onClose, 
  isAdminOrManager,
  currentUserId
}: { 
  task: Task; 
  onClose: () => void;
  isAdminOrManager: boolean;
  currentUserId: string;
}) {
  const { toast } = useToast();
  const [noteContent, setNoteContent] = useState("");
  const [isQuestion, setIsQuestion] = useState(false);
  const [celebratingStep, setCelebratingStep] = useState<number | null>(null);
  
  // Local state for instant UI updates
  const [localSteps, setLocalSteps] = useState<TaskStep[]>(initialTask.steps || []);
  
  // Sync local state with task prop changes
  useEffect(() => {
    if (initialTask.steps) {
      setLocalSteps(initialTask.steps);
    }
  }, [initialTask.steps]);

  const task = { ...initialTask, steps: localSteps };

  const { data: notes = [] } = useQuery({
    queryKey: [`/api/tasks/${task.id}/notes`],
  });

  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ['/api/employees'],
  });

  const addNoteMutation = useMutation({
    mutationFn: (data: { content: string; isQuestion: boolean }) =>
      apiRequest('POST', `/api/tasks/${task.id}/notes`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task.id}/notes`] });
      toast({ title: "Success", description: "Note added successfully" });
      setNoteContent("");
      setIsQuestion(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add note", variant: "destructive" });
    },
  });

  const updateStepsMutation = useMutation({
    mutationFn: (steps: TaskStep[]) =>
      apiRequest('PATCH', `/api/tasks/${task.id}`, { steps }),
    onMutate: async (newSteps) => {
      // Cancel ongoing queries to prevent overwrites
      await queryClient.cancelQueries({ queryKey: ['/api/tasks'] });
      
      // Save snapshot for potential rollback
      const previousTasks = queryClient.getQueryData<Task[]>(['/api/tasks']);
      
      // Immediately update cache for instant UI feedback
      queryClient.setQueryData<Task[]>(['/api/tasks'], (old) => {
        if (!old) return old;
        return old.map(t => 
          t.id === task.id ? { ...t, steps: newSteps, updatedAt: new Date().toISOString() } : t
        );
      });
      
      return { previousTasks };
    },
    onError: (_err, _newSteps, context) => {
      // Rollback on failure
      if (context?.previousTasks) {
        queryClient.setQueryData(['/api/tasks'], context.previousTasks);
      }
      toast({ title: "Error", description: "Failed to update step", variant: "destructive" });
    },
    onSuccess: async () => {
      toast({ title: "Success", description: "Step updated successfully" });
      // Refetch in background to sync with server
      await queryClient.refetchQueries({ queryKey: ['/api/tasks'] });
    },
  });

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    addNoteMutation.mutate({ content: noteContent, isQuestion });
  };

  const handleToggleStep = (stepIndex: number) => {
    if (!localSteps || !localSteps[stepIndex]) return;
    
    const currentStep = localSteps[stepIndex];
    const isCompletingStep = !currentStep.completed;
    
    const updatedSteps = localSteps.map((step, index) =>
      index === stepIndex ? { ...step, completed: !step.completed } : step
    );
    
    // Update local state IMMEDIATELY for instant UI feedback
    setLocalSteps(updatedSteps);
    
    // Trigger celebration animation if completing
    if (isCompletingStep) {
      setCelebratingStep(stepIndex);
      setTimeout(() => setCelebratingStep(null), 2000);
    }
    
    // Save to server in background
    updateStepsMutation.mutate(updatedSteps);
  };

  const canEditSteps = isAdminOrManager || task.assignedTo === currentUserId;

  const getUserName = (userId: string) => {
    const user = employees.find(e => e.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : userId;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-visible">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>{task.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[calc(80vh-120px)] overflow-y-auto pr-2">
          {/* Task Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Status:</span> {task.status}
            </div>
            <div>
              <span className="font-semibold">Priority:</span> {task.priority}
            </div>
            <div>
              <span className="font-semibold">Assigned To:</span> {task.assignedTo ? getUserName(task.assignedTo) : "Unassigned"}
            </div>
            {task.dueDate && (
              <div>
                <span className="font-semibold">Due Date:</span> {format(new Date(task.dueDate), 'MMM dd, yyyy HH:mm')}
              </div>
            )}
          </div>

          {/* Steps Section */}
          {task.steps && task.steps.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                Steps to Complete ({task.steps.filter(s => s.completed).length}/{task.steps.length})
              </h3>
              <div className="space-y-2 bg-muted/30 p-4 rounded-lg overflow-visible">
                {task.steps
                  .sort((a, b) => a.order - b.order)
                  .map((step, index) => (
                    <motion.div 
                      key={index} 
                      className="flex items-center gap-3 relative overflow-visible"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Checkbox
                        checked={step.completed}
                        disabled={!canEditSteps || updateStepsMutation.isPending}
                        onCheckedChange={() => handleToggleStep(index)}
                        data-testid={`checkbox-step-${index}`}
                      />
                      <span className={`flex-1 ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {step.text}
                      </span>
                      
                      {/* Visual Feedback Icon */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        {step.completed ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )}
                      </motion.div>

                      {/* Celebration Animation */}
                      <AnimatePresence>
                        {celebratingStep === index && (
                          <>
                            {/* Sparkles */}
                            {[...Array(6)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute z-50 pointer-events-none"
                                initial={{ 
                                  scale: 0,
                                  x: 0,
                                  y: 0,
                                  opacity: 1
                                }}
                                animate={{ 
                                  scale: [0, 1, 0],
                                  x: Math.cos(i * 60 * Math.PI / 180) * 60,
                                  y: Math.sin(i * 60 * Math.PI / 180) * 60,
                                  opacity: [1, 1, 0]
                                }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1, ease: "easeOut" }}
                              >
                                <Sparkles className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                              </motion.div>
                            ))}
                            {/* Confetti particles */}
                            {[...Array(8)].map((_, i) => (
                              <motion.div
                                key={`confetti-${i}`}
                                className="absolute w-3 h-3 rounded-full z-50 pointer-events-none"
                                style={{
                                  backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'][i % 5]
                                }}
                                initial={{ 
                                  scale: 0,
                                  x: 0,
                                  y: 0,
                                  opacity: 1
                                }}
                                animate={{ 
                                  scale: [0, 1, 0.5],
                                  x: (Math.random() - 0.5) * 100,
                                  y: Math.random() * -80 - 30,
                                  rotate: Math.random() * 360,
                                  opacity: [1, 1, 0]
                                }}
                                transition={{ 
                                  duration: 1.2,
                                  ease: "easeOut",
                                  delay: i * 0.05
                                }}
                              />
                            ))}
                          </>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div>
            <h3 className="font-semibold mb-3">Notes & Comments</h3>
            <div className="space-y-3 mb-4 max-h-[200px] overflow-y-auto">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet</p>
              ) : (
                notes.map((note: any) => (
                  <div key={note.id} className="bg-muted p-3 rounded-lg" data-testid={`note-${note.id}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm">{getUserName(note.userId)}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.createdAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm">{note.content}</p>
                    {note.isQuestion && (
                      <Badge variant="outline" className="mt-2">Question</Badge>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Note Form */}
            <div className="space-y-2">
              <Textarea
                placeholder="Add a note or ask a question..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                data-testid="input-task-note"
              />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isQuestion"
                    checked={isQuestion}
                    onChange={(e) => setIsQuestion(e.target.checked)}
                    data-testid="checkbox-is-question"
                  />
                  <label htmlFor="isQuestion" className="text-sm">Mark as question</label>
                </div>
                <Button 
                  onClick={handleAddNote} 
                  disabled={!noteContent.trim() || addNoteMutation.isPending}
                  data-testid="button-add-note"
                >
                  {addNoteMutation.isPending ? "Adding..." : "Add Note"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
