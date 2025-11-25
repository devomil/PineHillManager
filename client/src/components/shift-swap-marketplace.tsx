import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Plus, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  Gift,
  Zap,
  Timer,
  Users,
  ArrowRight,
  Sparkles,
  Target,
  Bell,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import type { WorkSchedule, User as UserType, Location, ShiftSwapRequest } from "@shared/schema";

interface SwapWithDetails extends ShiftSwapRequest {
  originalSchedule: WorkSchedule & {
    location: Location;
  };
  requester: UserType;
  taker?: UserType;
}

export default function ShiftSwapMarketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filter, setFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSwap, setSelectedSwap] = useState<SwapWithDetails | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  
  const [createForm, setCreateForm] = useState({
    scheduleId: "",
    reason: "",
    offerMessage: "",
    urgencyLevel: "normal",
    incentive: "",
    expiresAt: "",
    notifiedEmployeeIds: [] as string[]
  });

  const [responseForm, setResponseForm] = useState({
    responseMessage: "",
    action: "accept" as "accept" | "reject"
  });

  // Fetch user's schedules for creating swap requests
  const { data: userSchedules = [] } = useQuery({
    queryKey: ["/api/my-schedules"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/my-schedules");
      return response.json();
    },
    enabled: !!user
  });

  // Fetch all swap requests
  const { data: swapRequests = [] } = useQuery({
    queryKey: ["/api/shift-swaps"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/shift-swaps");
      return response.json();
    },
    enabled: !!user
  });

  // Fetch all active employees for notification selection
  const { data: allEmployees = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      return response.json();
    },
    enabled: !!user
  });

  // Create swap request mutation
  const createSwapMutation = useMutation({
    mutationFn: async (data: typeof createForm) => {
      const response = await apiRequest("POST", "/api/shift-swaps", {
        ...data,
        originalScheduleId: parseInt(data.scheduleId),
        requesterId: user?.id,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
        notifiedEmployeeIds: data.notifiedEmployeeIds
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps"] });
      setIsCreateDialogOpen(false);
      setCreateForm({
        scheduleId: "",
        reason: "",
        offerMessage: "",
        urgencyLevel: "normal",
        incentive: "",
        expiresAt: "",
        notifiedEmployeeIds: []
      });
      toast({
        title: "Swap Request Created",
        description: "Your shift swap request has been posted to the marketplace. SMS notifications sent to selected employees.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create swap request: " + error.message,
        variant: "destructive",
      });
    }
  });

  // Handler for employee checkbox selection (max 10)
  const handleEmployeeToggle = (employeeId: string) => {
    setCreateForm((prev) => {
      const isSelected = prev.notifiedEmployeeIds.includes(employeeId);
      if (isSelected) {
        // Remove employee
        return {
          ...prev,
          notifiedEmployeeIds: prev.notifiedEmployeeIds.filter((id) => id !== employeeId)
        };
      } else {
        // Add employee (max 10)
        if (prev.notifiedEmployeeIds.length >= 10) {
          toast({
            title: "Maximum Selection Reached",
            description: "You can notify up to 10 employees",
            variant: "destructive",
          });
          return prev;
        }
        return {
          ...prev,
          notifiedEmployeeIds: [...prev.notifiedEmployeeIds, employeeId]
        };
      }
    });
  };

  // Respond to swap request mutation
  const respondToSwapMutation = useMutation({
    mutationFn: async ({ id, action, message }: { id: number; action: string; message: string }) => {
      const response = await apiRequest("POST", `/api/shift-swaps/${id}/${action}`, {
        responseMessage: message,
        takerId: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps"] });
      setIsResponseDialogOpen(false);
      setSelectedSwap(null);
      toast({
        title: "Response Sent",
        description: "Your response has been sent to the requester.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to respond to swap request: " + error.message,
        variant: "destructive",
      });
    }
  });

  // Approve swap request mutation (admin/manager only)
  const approveSwapMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/shift-swaps/${id}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-schedules"] });
      toast({
        title: "Shift Swap Approved",
        description: "The shift has been transferred successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to approve shift swap: " + error.message,
        variant: "destructive",
      });
    }
  });

  const handleApproveSwap = (id: number) => {
    approveSwapMutation.mutate(id);
  };

  // Delete swap request mutation (admin/manager only)
  const deleteSwapMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/shift-swaps/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps"] });
      toast({
        title: "Shift Swap Deleted",
        description: "The shift swap request has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to delete shift swap: " + error.message,
        variant: "destructive",
      });
    }
  });

  const handleDeleteSwap = (id: number) => {
    if (confirm("Are you sure you want to delete this shift swap request? This action cannot be undone.")) {
      deleteSwapMutation.mutate(id);
    }
  };

  // Filter swap requests
  const filteredSwaps = swapRequests.filter((swap: SwapWithDetails) => {
    if (filter === "my-requests" && swap.requesterId !== user?.id) return false;
    if (filter === "available" && swap.status !== "open") return false;
    if (filter === "pending" && swap.takerId !== user?.id) return false;
    if (urgencyFilter !== "all" && swap.urgencyLevel !== urgencyFilter) return false;
    return true;
  });

  // Get urgency styling
  const getUrgencyStyle = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return <Zap className="h-3 w-3" />;
      case "high":
        return <AlertTriangle className="h-3 w-3" />;
      case "normal":
        return <Target className="h-3 w-3" />;
      case "low":
        return <Timer className="h-3 w-3" />;
      default:
        return <Timer className="h-3 w-3" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "approved":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const canRespondToSwap = (swap: SwapWithDetails) => {
    return swap.status === "open" && swap.requesterId !== user?.id;
  };

  const formatScheduleTime = (schedule: WorkSchedule) => {
    try {
      const start = parseISO(schedule.startTime);
      const end = parseISO(schedule.endTime);
      return `${format(start, "MMM d, yyyy")} • ${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
    } catch {
      return "Invalid time format";
    }
  };

  const upcomingSchedules = userSchedules.filter((schedule: WorkSchedule) => {
    const scheduleDate = new Date(schedule.date);
    const today = new Date();
    return scheduleDate >= today;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            Shift Swap Marketplace
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Find coverage for your shifts or pick up extra work
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Post Shift Swap
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Create Shift Swap Request</DialogTitle>
              <DialogDescription>
                Post your shift to the marketplace and find someone to cover it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div>
                <Label>Select Shift to Swap</Label>
                <Select value={createForm.scheduleId} onValueChange={(value) => setCreateForm({...createForm, scheduleId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {upcomingSchedules.map((schedule: WorkSchedule) => (
                      <SelectItem key={schedule.id} value={schedule.id.toString()}>
                        {formatScheduleTime(schedule)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason for Swap</Label>
                <Textarea
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({...createForm, reason: e.target.value})}
                  placeholder="Why do you need to swap this shift?"
                />
              </div>
              <div>
                <Label>Message to Potential Takers</Label>
                <Textarea
                  value={createForm.offerMessage}
                  onChange={(e) => setCreateForm({...createForm, offerMessage: e.target.value})}
                  placeholder="What would you like to say to encourage someone to take your shift?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Urgency Level</Label>
                  <Select value={createForm.urgencyLevel} onValueChange={(value) => setCreateForm({...createForm, urgencyLevel: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Urgent!</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Expires (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={createForm.expiresAt}
                    onChange={(e) => setCreateForm({...createForm, expiresAt: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Incentive (Optional)</Label>
                <Textarea
                  value={createForm.incentive}
                  onChange={(e) => setCreateForm({...createForm, incentive: e.target.value})}
                  placeholder="e.g., 'I'll cover your next weekend shift' or 'Coffee on me!'"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notify Employees via SMS (Optional)
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {createForm.notifiedEmployeeIds.length}/10 selected
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Select up to 10 employees to notify about this shift swap via SMS
                </p>
                <ScrollArea className="h-[200px] border rounded-lg p-3">
                  <div className="space-y-2">
                    {allEmployees
                      .filter((emp: UserType) => emp.id !== user?.id && emp.isActive)
                      .map((employee: UserType) => (
                        <div
                          key={employee.id}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md"
                        >
                          <Checkbox
                            id={`employee-${employee.id}`}
                            checked={createForm.notifiedEmployeeIds.includes(employee.id)}
                            onCheckedChange={() => handleEmployeeToggle(employee.id)}
                            data-testid={`checkbox-employee-${employee.id}`}
                          />
                          <label
                            htmlFor={`employee-${employee.id}`}
                            className="flex-1 text-sm cursor-pointer"
                          >
                            <div className="font-medium">
                              {employee.firstName} {employee.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {employee.department} • {employee.role}
                            </div>
                          </label>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createSwapMutation.mutate(createForm)}
                disabled={!createForm.scheduleId || createSwapMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-post-swap-request"
              >
                Post Swap Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-4 items-center"
      >
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="available">Available Shifts</SelectItem>
            <SelectItem value="my-requests">My Requests</SelectItem>
            <SelectItem value="pending">Pending My Response</SelectItem>
          </SelectContent>
        </Select>

        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {filteredSwaps.length} swap request{filteredSwaps.length !== 1 ? 's' : ''}
        </div>
      </motion.div>

      {/* Swap Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredSwaps.map((swap: SwapWithDetails, index: number) => (
            <motion.div
              key={swap.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 group-hover:scale-105 bg-gradient-to-br from-white to-gray-50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Badge className={`${getUrgencyStyle((swap.urgencyLevel || 'normal') as string)} flex items-center gap-1`}>
                        {getUrgencyIcon((swap.urgencyLevel || 'normal') as string)}
                        {swap.urgencyLevel ?? 'normal'}
                      </Badge>
                      <Badge className={getStatusStyle(swap.status ?? 'open')}>
                        {swap.status ?? 'open'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {swap.incentive && (
                        <Gift className="h-4 w-4 text-green-500" />
                      )}
                      {(user?.role === "admin" || user?.role === "manager") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSwap(swap.id);
                          }}
                          data-testid={`button-delete-swap-${swap.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {swap.requester.firstName} {swap.requester.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span>{formatScheduleTime(swap.originalSchedule)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span>{swap.originalSchedule.location?.name || "Unknown Location"}</span>
                  </div>

                  {swap.reason && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <strong>Reason:</strong> {swap.reason}
                    </div>
                  )}

                  {swap.offerMessage && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                      <MessageSquare className="h-3 w-3 inline mr-1" />
                      {swap.offerMessage}
                    </div>
                  )}

                  {swap.incentive && (
                    <div className="text-sm text-green-600 bg-green-50 p-2 rounded flex items-center gap-1">
                      <Gift className="h-3 w-3" />
                      <strong>Incentive:</strong> {swap.incentive}
                    </div>
                  )}

                  {canRespondToSwap(swap) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-2 pt-2"
                    >
                      <Button
                        size="sm"
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        onClick={() => {
                          setSelectedSwap(swap);
                          setResponseForm({ responseMessage: "", action: "accept" });
                          setIsResponseDialogOpen(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Take Shift
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSwap(swap);
                          setResponseForm({ responseMessage: "", action: "reject" });
                          setIsResponseDialogOpen(true);
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}

                  {swap.taker && (
                    <div className="text-sm text-purple-600 bg-purple-50 p-2 rounded flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      <strong>Covered by:</strong> {swap.taker.firstName} {swap.taker.lastName}
                    </div>
                  )}

                  {/* Approve button for pending swaps (admin/manager only) */}
                  {swap.status === "pending" && swap.taker && (user?.role === "admin" || user?.role === "manager") && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-2 pt-2"
                    >
                      <Button
                        size="sm"
                        className="flex-1 bg-blue-500 hover:bg-blue-600"
                        onClick={() => handleApproveSwap(swap.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve Swap
                      </Button>
                    </motion.div>
                  )}

                  {swap.expiresAt && (
                    <div className="text-xs text-orange-600 flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      Expires: {format(typeof swap.expiresAt === 'string' ? parseISO(swap.expiresAt) : swap.expiresAt, "MMM d, h:mm a")}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredSwaps.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No swap requests found</h3>
          <p className="text-gray-500">
            {filter === "all" ? "Be the first to post a shift swap!" : "Try adjusting your filters to see more requests."}
          </p>
        </motion.div>
      )}

      {/* Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseForm.action === "accept" ? "Accept Shift Swap" : "Send Message"}
            </DialogTitle>
            <DialogDescription>
              {selectedSwap && (
                <div className="space-y-2">
                  <div>Shift: {formatScheduleTime(selectedSwap.originalSchedule)}</div>
                  <div>Requested by: {selectedSwap.requester.firstName} {selectedSwap.requester.lastName}</div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Your Message</Label>
              <Textarea
                value={responseForm.responseMessage}
                onChange={(e) => setResponseForm({...responseForm, responseMessage: e.target.value})}
                placeholder={
                  responseForm.action === "accept" 
                    ? "Let them know you're happy to take their shift..."
                    : "Send a message to the requester..."
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResponseDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedSwap && respondToSwapMutation.mutate({
                id: selectedSwap.id,
                action: responseForm.action,
                message: responseForm.responseMessage
              })}
              disabled={respondToSwapMutation.isPending}
              className={responseForm.action === "accept" ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {responseForm.action === "accept" ? "Accept & Take Shift" : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}