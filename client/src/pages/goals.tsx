import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Plus, Trash2, Save, TrendingUp, Users, User } from 'lucide-react';
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

export default function GoalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [myGoalForm, setMyGoalForm] = useState({
    title: '',
    description: '',
    targetDate: '',
  });

  const [bhagForm, setBhagForm] = useState({
    title: '',
    description: '',
    targetDate: '',
  });

  const [teamGoalForm, setTeamGoalForm] = useState({
    title: '',
    description: '',
    targetDate: '',
  });

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

  const createMyGoal = useMutation({
    mutationFn: async (goalData: any) => {
      const response = await fetch('/api/goals/my', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });
      if (!response.ok) throw new Error('Failed to create goal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals/my'] });
      toast({ title: 'Goal created successfully!' });
      setMyGoalForm({ title: '', description: '', targetDate: '' });
    },
    onError: () => {
      toast({ title: 'Failed to create goal', variant: 'destructive' });
    },
  });

  const createCompanyGoal = useMutation({
    mutationFn: async (goalData: any) => {
      const response = await fetch('/api/goals/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });
      if (!response.ok) throw new Error('Failed to create company goal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals/company'] });
      toast({ title: 'Company goal created successfully!' });
      setBhagForm({ title: '', description: '', targetDate: '' });
    },
    onError: () => {
      toast({ title: 'Failed to create company goal', variant: 'destructive' });
    },
  });

  const createTeamGoal = useMutation({
    mutationFn: async (goalData: any) => {
      const response = await fetch('/api/goals/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });
      if (!response.ok) throw new Error('Failed to create team goal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals/team'] });
      toast({ title: 'Team goal created successfully!' });
      setTeamGoalForm({ title: '', description: '', targetDate: '' });
    },
    onError: () => {
      toast({ title: 'Failed to create team goal', variant: 'destructive' });
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: 'my' | 'company' | 'team' }) => {
      const response = await fetch(`/api/goals/${type}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete goal');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${variables.type}`] });
      toast({ title: 'Goal deleted successfully!' });
    },
    onError: () => {
      toast({ title: 'Failed to delete goal', variant: 'destructive' });
    },
  });

  const updateGoalStatus = useMutation({
    mutationFn: async ({ id, type, status }: { id: number; type: 'my' | 'company' | 'team'; status: string }) => {
      const response = await fetch(`/api/goals/${type}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update goal status');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${variables.type}`] });
      toast({ title: 'Goal status updated!' });
    },
    onError: () => {
      toast({ title: 'Failed to update goal status', variant: 'destructive' });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Not Started';
    }
  };

  const handleMyGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myGoalForm.title.trim()) {
      toast({ title: 'Please enter a goal title', variant: 'destructive' });
      return;
    }
    createMyGoal.mutate({
      ...myGoalForm,
      status: 'not_started',
    });
  };

  const handleBhagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bhagForm.title.trim()) {
      toast({ title: 'Please enter a goal title', variant: 'destructive' });
      return;
    }
    createCompanyGoal.mutate({
      ...bhagForm,
      status: 'not_started',
    });
  };

  const handleTeamGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamGoalForm.title.trim()) {
      toast({ title: 'Please enter a goal title', variant: 'destructive' });
      return;
    }
    createTeamGoal.mutate({
      ...teamGoalForm,
      status: 'not_started',
    });
  };

  const renderGoalCard = (goal: Goal, type: 'my' | 'company' | 'team') => {
    const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
    const canEdit = type === 'my' || isAdminOrManager;

    return (
      <Card key={goal.id} className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{goal.title}</CardTitle>
              {goal.description && (
                <CardDescription className="mt-2">{goal.description}</CardDescription>
              )}
            </div>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteGoal.mutate({ id: goal.id, type })}
                data-testid={`button-delete-goal-${goal.id}`}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                {canEdit ? (
                  <select
                    value={goal.status}
                    onChange={(e) =>
                      updateGoalStatus.mutate({ id: goal.id, type, status: e.target.value })
                    }
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      goal.status
                    )}`}
                    data-testid={`select-status-goal-${goal.id}`}
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                ) : (
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    goal.status
                  )}`}>
                    {getStatusLabel(goal.status)}
                  </div>
                )}
              </div>
              {goal.targetDate && (
                <div>
                  <Label className="text-xs text-muted-foreground">Target Date</Label>
                  <p className="text-sm font-medium">
                    {new Date(goal.targetDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            <div className="text-right">
              <Label className="text-xs text-muted-foreground">Created</Label>
              <p className="text-sm">
                {new Date(goal.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout currentTab="">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Goals
          </h1>
          <p className="text-muted-foreground mt-2">
            Set and track your personal, team, and company goals
          </p>
        </div>

        <Tabs defaultValue="my-goals" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my-goals" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              My Goals
            </TabsTrigger>
            <TabsTrigger value="company-bhag" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Company BHAG Goals
            </TabsTrigger>
            <TabsTrigger value="team-goals" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Goals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-goals" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Add Personal Goal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleMyGoalSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="my-goal-title">Goal Title *</Label>
                        <Input
                          id="my-goal-title"
                          value={myGoalForm.title}
                          onChange={(e) =>
                            setMyGoalForm({ ...myGoalForm, title: e.target.value })
                          }
                          placeholder="e.g., Increase sales by 20%"
                          data-testid="input-my-goal-title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="my-goal-description">Description</Label>
                        <Textarea
                          id="my-goal-description"
                          value={myGoalForm.description}
                          onChange={(e) =>
                            setMyGoalForm({ ...myGoalForm, description: e.target.value })
                          }
                          placeholder="Describe your goal..."
                          rows={3}
                          data-testid="textarea-my-goal-description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="my-goal-target">Target Date</Label>
                        <Input
                          id="my-goal-target"
                          type="date"
                          value={myGoalForm.targetDate}
                          onChange={(e) =>
                            setMyGoalForm({ ...myGoalForm, targetDate: e.target.value })
                          }
                          data-testid="input-my-goal-target"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createMyGoal.isPending}
                        data-testid="button-create-my-goal"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {createMyGoal.isPending ? 'Creating...' : 'Create Goal'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <h2 className="text-xl font-semibold mb-4">My Goals</h2>
                {myGoals.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No goals yet. Create your first goal to get started!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  myGoals.map((goal) => renderGoalCard(goal, 'my'))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="company-bhag" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <div className="lg:col-span-1">
                  <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Add BHAG Goal
                    </CardTitle>
                    <CardDescription>
                      Big Hairy Audacious Goals for the entire company
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleBhagSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="bhag-title">Goal Title *</Label>
                        <Input
                          id="bhag-title"
                          value={bhagForm.title}
                          onChange={(e) =>
                            setBhagForm({ ...bhagForm, title: e.target.value })
                          }
                          placeholder="e.g., Reach $1M in annual revenue"
                          data-testid="input-bhag-title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bhag-description">Description</Label>
                        <Textarea
                          id="bhag-description"
                          value={bhagForm.description}
                          onChange={(e) =>
                            setBhagForm({ ...bhagForm, description: e.target.value })
                          }
                          placeholder="Describe the company goal..."
                          rows={3}
                          data-testid="textarea-bhag-description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bhag-target">Target Date</Label>
                        <Input
                          id="bhag-target"
                          type="date"
                          value={bhagForm.targetDate}
                          onChange={(e) =>
                            setBhagForm({ ...bhagForm, targetDate: e.target.value })
                          }
                          data-testid="input-bhag-target"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createCompanyGoal.isPending}
                        data-testid="button-create-bhag"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {createCompanyGoal.isPending ? 'Creating...' : 'Create Goal'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
              )}

              <div className={(user?.role === 'admin' || user?.role === 'manager') ? "lg:col-span-2" : "lg:col-span-3"}>
                <h2 className="text-xl font-semibold mb-4">Company BHAG Goals</h2>
                {companyGoals.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No company goals yet. Create the first BHAG goal!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  companyGoals.map((goal) => renderGoalCard(goal, 'company'))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="team-goals" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <div className="lg:col-span-1">
                  <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Add Team Goal
                    </CardTitle>
                    <CardDescription>
                      Goals for your team or department
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleTeamGoalSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="team-goal-title">Goal Title *</Label>
                        <Input
                          id="team-goal-title"
                          value={teamGoalForm.title}
                          onChange={(e) =>
                            setTeamGoalForm({ ...teamGoalForm, title: e.target.value })
                          }
                          placeholder="e.g., Complete Q4 training program"
                          data-testid="input-team-goal-title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="team-goal-description">Description</Label>
                        <Textarea
                          id="team-goal-description"
                          value={teamGoalForm.description}
                          onChange={(e) =>
                            setTeamGoalForm({
                              ...teamGoalForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="Describe the team goal..."
                          rows={3}
                          data-testid="textarea-team-goal-description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="team-goal-target">Target Date</Label>
                        <Input
                          id="team-goal-target"
                          type="date"
                          value={teamGoalForm.targetDate}
                          onChange={(e) =>
                            setTeamGoalForm({ ...teamGoalForm, targetDate: e.target.value })
                          }
                          data-testid="input-team-goal-target"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createTeamGoal.isPending}
                        data-testid="button-create-team-goal"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {createTeamGoal.isPending ? 'Creating...' : 'Create Goal'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
              )}

              <div className={(user?.role === 'admin' || user?.role === 'manager') ? "lg:col-span-2" : "lg:col-span-3"}>
                <h2 className="text-xl font-semibold mb-4">Team Goals</h2>
                {teamGoals.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No team goals yet. Create the first team goal!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  teamGoals.map((goal) => renderGoalCard(goal, 'team'))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
