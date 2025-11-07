import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Target, Plus, Trash2, Edit, MessageSquare, ArrowRight, TrendingUp, Users, User, Lightbulb } from 'lucide-react';
import AdminLayout from '@/components/admin-layout';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

type Goal = {
  id: number;
  title: string;
  description?: string;
  targetDate?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  createdBy: string;
  createdAt: string;
};

type SuggestedGoal = {
  id: number;
  title: string;
  description?: string;
  createdBy: string;
  assignedTo?: string;
  assignedGoalId?: number;
  status: 'suggested' | 'assigned' | 'archived';
  notes?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
};

export default function GoalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newSuggestionForm, setNewSuggestionForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const [editingSuggestion, setEditingSuggestion] = useState<SuggestedGoal | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestedGoal | null>(null);
  const [assignCategory, setAssignCategory] = useState<'my' | 'team' | 'company'>('my');

  // Goal management states
  const [createGoalDialogOpen, setCreateGoalDialogOpen] = useState(false);
  const [createGoalType, setCreateGoalType] = useState<'my' | 'team' | 'company'>('my');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    targetDate: '',
    status: 'not_started' as 'not_started' | 'in_progress' | 'completed',
  });

  // Fetch suggested goals
  const { data: suggestedGoals = [] } = useQuery<SuggestedGoal[]>({
    queryKey: ['/api/goals/suggested'],
    enabled: !!user,
  });

  // Fetch categorized goals
  const { data: myGoals = [] } = useQuery<Goal[]>({
    queryKey: ['/api/goals/my'],
    enabled: !!user,
  });

  const { data: companyGoals = [] } = useQuery<Goal[]>({
    queryKey: ['/api/goals/company'],
    enabled: !!user,
  });

  const { data: teamGoals = [] } = useQuery<Goal[]>({
    queryKey: ['/api/goals/team'],
    enabled: !!user,
  });

  // Create suggested goal
  const createSuggestion = useMutation({
    mutationFn: async (data: typeof newSuggestionForm) => {
      return await apiRequest('POST', '/api/goals/suggested', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals/suggested'] });
      setNewSuggestionForm({ title: '', description: '', priority: 'medium' });
      toast({ title: 'Goal idea added to the board!' });
    },
  });

  // Update suggested goal
  const updateSuggestion = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SuggestedGoal> }) => {
      return await apiRequest('PATCH', `/api/goals/suggested/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals/suggested'] });
      setEditingSuggestion(null);
      toast({ title: 'Goal idea updated!' });
    },
  });

  // Delete suggested goal
  const deleteSuggestion = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/goals/suggested/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals/suggested'] });
      toast({ title: 'Goal idea removed' });
    },
  });

  // Assign suggested goal to category
  const assignSuggestion = useMutation({
    mutationFn: async ({ id, category }: { id: number; category: string }) => {
      return await apiRequest('POST', `/api/goals/suggested/${id}/assign`, { category });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals/suggested'] });
      queryClient.invalidateQueries({ queryKey: ['/api/goals/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/goals/team'] });
      queryClient.invalidateQueries({ queryKey: ['/api/goals/company'] });
      setAssignDialogOpen(false);
      setSelectedSuggestion(null);
      toast({ title: 'Goal assigned successfully!' });
    },
  });

  // Create goal mutation
  const createGoal = useMutation({
    mutationFn: async ({ type, data }: { type: 'my' | 'team' | 'company'; data: typeof goalForm }) => {
      return await apiRequest('POST', `/api/goals/${type}`, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${variables.type}`] });
      setCreateGoalDialogOpen(false);
      setGoalForm({ title: '', description: '', targetDate: '', status: 'not_started' });
      toast({ title: 'Goal created successfully!' });
    },
  });

  // Update goal mutation
  const updateGoal = useMutation({
    mutationFn: async ({ type, id, data }: { type: 'my' | 'team' | 'company'; id: number; data: Partial<typeof goalForm> }) => {
      return await apiRequest('PATCH', `/api/goals/${type}/${id}`, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${variables.type}`] });
      setEditingGoal(null);
      toast({ title: 'Goal updated successfully!' });
    },
  });

  // Delete goal mutation
  const deleteGoal = useMutation({
    mutationFn: async ({ type, id }: { type: 'my' | 'team' | 'company'; id: number }) => {
      return await apiRequest('DELETE', `/api/goals/${type}/${id}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${variables.type}`] });
      toast({ title: 'Goal archived successfully' });
    },
  });

  const handleCreateSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuggestionForm.title.trim()) {
      toast({ title: 'Please enter a goal title', variant: 'destructive' });
      return;
    }
    createSuggestion.mutate(newSuggestionForm);
  };

  const handleAssign = () => {
    if (selectedSuggestion) {
      assignSuggestion.mutate({ id: selectedSuggestion.id, category: assignCategory });
    }
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.title.trim()) {
      toast({ title: 'Please enter a goal title', variant: 'destructive' });
      return;
    }
    createGoal.mutate({ type: createGoalType, data: goalForm });
  };

  const handleEditGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    
    const goalType = editingGoal.id && myGoals.find(g => g.id === editingGoal.id) ? 'my' :
                     editingGoal.id && teamGoals.find(g => g.id === editingGoal.id) ? 'team' : 'company';
    
    updateGoal.mutate({ 
      type: goalType, 
      id: editingGoal.id, 
      data: goalForm 
    });
  };

  const openCreateDialog = (type: 'my' | 'team' | 'company') => {
    setCreateGoalType(type);
    setGoalForm({ title: '', description: '', targetDate: '', status: 'not_started' });
    setCreateGoalDialogOpen(true);
  };

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      description: goal.description || '',
      targetDate: goal.targetDate || '',
      status: goal.status,
    });
  };

  const isManager = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'manager';

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700';
      case 'low': return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700';
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700';
    }
  };

  return (
    <AdminLayout currentTab="">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Lightbulb className="h-9 w-9" />
            Goals Collaboration Board
          </h1>
          <p className="text-muted-foreground mt-2">
            Brainstorm and collaborate on goals together, then assign them to your team
          </p>
        </div>

        <Tabs defaultValue="board" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="board" data-testid="tab-board">
              <Lightbulb className="h-4 w-4 mr-2" />
              Idea Board
            </TabsTrigger>
            <TabsTrigger value="my-goals" data-testid="tab-my-goals">
              <User className="h-4 w-4 mr-2" />
              My Goals
            </TabsTrigger>
            <TabsTrigger value="team-goals" data-testid="tab-team-goals">
              <Users className="h-4 w-4 mr-2" />
              Team Goals
            </TabsTrigger>
            <TabsTrigger value="company-bhag" data-testid="tab-company-bhag">
              <TrendingUp className="h-4 w-4 mr-2" />
              Company BHAGs
            </TabsTrigger>
          </TabsList>

          {/* COLLABORATIVE BOARD TAB */}
          <TabsContent value="board" className="mt-6">
            {/* Quick Add Form */}
            <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 border-2 border-dashed border-purple-300 dark:border-purple-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add a New Goal Idea
                </CardTitle>
                <CardDescription>
                  Share a goal idea - anyone can add suggestions here!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateSuggestion} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        placeholder="What goal would you like to suggest?"
                        value={newSuggestionForm.title}
                        onChange={(e) => setNewSuggestionForm({ ...newSuggestionForm, title: e.target.value })}
                        data-testid="input-new-suggestion-title"
                      />
                    </div>
                    <Select
                      value={newSuggestionForm.priority}
                      onValueChange={(value: 'low' | 'medium' | 'high') =>
                        setNewSuggestionForm({ ...newSuggestionForm, priority: value })
                      }
                    >
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    placeholder="Add details about this goal idea..."
                    value={newSuggestionForm.description}
                    onChange={(e) => setNewSuggestionForm({ ...newSuggestionForm, description: e.target.value })}
                    rows={2}
                    data-testid="textarea-new-suggestion-description"
                  />
                  <Button type="submit" disabled={createSuggestion.isPending} data-testid="button-create-suggestion">
                    <Plus className="h-4 w-4 mr-2" />
                    {createSuggestion.isPending ? 'Adding...' : 'Add to Board'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Padlet-style Grid of Suggestions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedGoals.map((suggestion) => (
                <Card key={suggestion.id} className={`border-2 ${getPriorityColor(suggestion.priority)} hover:shadow-lg transition-shadow`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base line-clamp-2">{suggestion.title}</CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingSuggestion(suggestion)}
                          data-testid={`button-edit-suggestion-${suggestion.id}`}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500"
                          onClick={() => deleteSuggestion.mutate(suggestion.id)}
                          data-testid={`button-delete-suggestion-${suggestion.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize px-2 py-0.5 rounded bg-white dark:bg-gray-900">
                        {suggestion.priority} priority
                      </span>
                    </div>
                  </CardHeader>
                  {suggestion.description && (
                    <CardContent className="pb-3 pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-3">{suggestion.description}</p>
                    </CardContent>
                  )}
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedSuggestion(suggestion);
                          setAssignDialogOpen(true);
                        }}
                        data-testid={`button-assign-suggestion-${suggestion.id}`}
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Assign to Goal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {suggestedGoals.length === 0 && (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Lightbulb className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No goal ideas yet</p>
                  <p className="text-muted-foreground">
                    Be the first to add a goal idea to the collaborative board!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* MY GOALS TAB */}
          <TabsContent value="my-goals" className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">My Personal Goals</h2>
                <p className="text-muted-foreground">Goals assigned specifically to you</p>
              </div>
              <Button onClick={() => openCreateDialog('my')} data-testid="button-create-my-goal">
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
              </Button>
            </div>
            <div className="space-y-4">
              {myGoals.map((goal) => (
                <Card key={goal.id} data-testid={`goal-card-${goal.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{goal.title}</CardTitle>
                        {goal.description && <CardDescription>{goal.description}</CardDescription>}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(goal)}
                          data-testid={`button-edit-goal-${goal.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => deleteGoal.mutate({ type: 'my', id: goal.id })}
                          data-testid={`button-delete-goal-${goal.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        goal.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        goal.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {goal.status === 'not_started' ? 'Not Started' : goal.status === 'in_progress' ? 'In Progress' : 'Completed'}
                      </span>
                      {goal.targetDate && (
                        <span className="text-sm text-muted-foreground">
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {myGoals.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No personal goals yet. Create one to get started!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* TEAM GOALS TAB */}
          <TabsContent value="team-goals" className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Team Goals</h2>
                <p className="text-muted-foreground">Goals for the entire team to work on together</p>
              </div>
              {isManager && (
                <Button onClick={() => openCreateDialog('team')} data-testid="button-create-team-goal">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Goal
                </Button>
              )}
            </div>
            <div className="space-y-4">
              {teamGoals.map((goal) => (
                <Card key={goal.id} data-testid={`goal-card-${goal.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{goal.title}</CardTitle>
                        {goal.description && <CardDescription>{goal.description}</CardDescription>}
                      </div>
                      {isManager && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(goal)}
                            data-testid={`button-edit-goal-${goal.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => deleteGoal.mutate({ type: 'team', id: goal.id })}
                            data-testid={`button-delete-goal-${goal.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        goal.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        goal.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {goal.status === 'not_started' ? 'Not Started' : goal.status === 'in_progress' ? 'In Progress' : 'Completed'}
                      </span>
                      {goal.targetDate && (
                        <span className="text-sm text-muted-foreground">
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {teamGoals.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {isManager ? 'No team goals yet. Create one to get started!' : 'No team goals yet.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* COMPANY BHAG TAB */}
          <TabsContent value="company-bhag" className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Company BHAG Goals</h2>
                <p className="text-muted-foreground">Big Hairy Audacious Goals for the entire company</p>
              </div>
              {isManager && (
                <Button onClick={() => openCreateDialog('company')} data-testid="button-create-company-goal">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Goal
                </Button>
              )}
            </div>
            <div className="space-y-4">
              {companyGoals.map((goal) => (
                <Card key={goal.id} data-testid={`goal-card-${goal.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{goal.title}</CardTitle>
                        {goal.description && <CardDescription>{goal.description}</CardDescription>}
                      </div>
                      {isManager && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(goal)}
                            data-testid={`button-edit-goal-${goal.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => deleteGoal.mutate({ type: 'company', id: goal.id })}
                            data-testid={`button-delete-goal-${goal.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        goal.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        goal.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {goal.status === 'not_started' ? 'Not Started' : goal.status === 'in_progress' ? 'In Progress' : 'Completed'}
                      </span>
                      {goal.targetDate && (
                        <span className="text-sm text-muted-foreground">
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {companyGoals.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {isManager ? 'No company goals yet. Create one to get started!' : 'No company goals yet.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Suggestion Dialog */}
        <Dialog open={!!editingSuggestion} onOpenChange={() => setEditingSuggestion(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Goal Idea</DialogTitle>
              <DialogDescription>Update the details of this goal suggestion</DialogDescription>
            </DialogHeader>
            {editingSuggestion && (
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={editingSuggestion.title}
                    onChange={(e) => setEditingSuggestion({ ...editingSuggestion, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={editingSuggestion.description || ''}
                    onChange={(e) => setEditingSuggestion({ ...editingSuggestion, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={editingSuggestion.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high') =>
                      setEditingSuggestion({ ...editingSuggestion, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={editingSuggestion.notes || ''}
                    onChange={(e) => setEditingSuggestion({ ...editingSuggestion, notes: e.target.value })}
                    placeholder="Add collaboration notes..."
                    rows={2}
                  />
                </div>
                <Button
                  onClick={() => updateSuggestion.mutate({ id: editingSuggestion.id, data: editingSuggestion })}
                  disabled={updateSuggestion.isPending}
                >
                  Save Changes
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Assign Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Goal</DialogTitle>
              <DialogDescription>Choose where to assign this goal idea</DialogDescription>
            </DialogHeader>
            {selectedSuggestion && (
              <div className="space-y-4">
                <div>
                  <p className="font-medium mb-2">{selectedSuggestion.title}</p>
                  {selectedSuggestion.description && (
                    <p className="text-sm text-muted-foreground">{selectedSuggestion.description}</p>
                  )}
                </div>
                <div>
                  <Label>Assign to:</Label>
                  <Select value={assignCategory} onValueChange={(value: 'my' | 'team' | 'company') => setAssignCategory(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="my">My Personal Goals</SelectItem>
                      <SelectItem value="team">Team Goals</SelectItem>
                      <SelectItem value="company">Company BHAG Goals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssign} disabled={assignSuggestion.isPending}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  {assignSuggestion.isPending ? 'Assigning...' : 'Assign Goal'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Goal Dialog */}
        <Dialog open={createGoalDialogOpen} onOpenChange={setCreateGoalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create {createGoalType === 'my' ? 'Personal' : createGoalType === 'team' ? 'Team' : 'Company'} Goal</DialogTitle>
              <DialogDescription>
                {createGoalType === 'my' && 'Set a personal goal for yourself'}
                {createGoalType === 'team' && 'Create a goal for your team to achieve together'}
                {createGoalType === 'company' && 'Set a Big Hairy Audacious Goal for the company'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  placeholder="Enter goal title"
                  data-testid="input-goal-title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  placeholder="Describe the goal in detail..."
                  rows={3}
                  data-testid="textarea-goal-description"
                />
              </div>
              <div>
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                  data-testid="input-goal-target-date"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={goalForm.status}
                  onValueChange={(value: 'not_started' | 'in_progress' | 'completed') =>
                    setGoalForm({ ...goalForm, status: value })
                  }
                >
                  <SelectTrigger data-testid="select-goal-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={createGoal.isPending} data-testid="button-submit-create-goal">
                <Plus className="h-4 w-4 mr-2" />
                {createGoal.isPending ? 'Creating...' : 'Create Goal'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Goal Dialog */}
        <Dialog open={!!editingGoal} onOpenChange={() => setEditingGoal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Goal</DialogTitle>
              <DialogDescription>Update the goal details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditGoal} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  placeholder="Enter goal title"
                  data-testid="input-edit-goal-title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  placeholder="Describe the goal in detail..."
                  rows={3}
                  data-testid="textarea-edit-goal-description"
                />
              </div>
              <div>
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                  data-testid="input-edit-goal-target-date"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={goalForm.status}
                  onValueChange={(value: 'not_started' | 'in_progress' | 'completed') =>
                    setGoalForm({ ...goalForm, status: value })
                  }
                >
                  <SelectTrigger data-testid="select-edit-goal-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={updateGoal.isPending} data-testid="button-submit-edit-goal">
                {updateGoal.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
