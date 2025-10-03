import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, User, Plus, CheckCircle, XCircle, MessageSquare, CalendarDays, Timer } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

interface TimeOffRequest {
  id: number;
  userId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: "pending" | "approved" | "rejected" | "cancellation_requested" | "cancelled";
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  comments?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

const statusStyles = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancellation_requested: "bg-orange-100 text-orange-800 border-orange-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200"
};

export default function TimeOffManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isCancellationDialogOpen, setIsCancellationDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  const [filter, setFilter] = useState("all");

  const [createForm, setCreateForm] = useState({
    startDate: "",
    endDate: "",
    reason: ""
  });

  const [reviewForm, setReviewForm] = useState({
    status: "",
    comments: ""
  });

  const [cancellationForm, setCancellationForm] = useState({
    reason: ""
  });

  // Fetch time off requests
  const { data: timeOffRequests = [] } = useQuery({
    queryKey: ["/api/time-off-requests"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/time-off-requests");
      return response.json();
    },
    enabled: !!user
  });

  // Create time off request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: typeof createForm) => {
      const response = await apiRequest("POST", "/api/time-off-requests", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-off-requests"] });
      setIsCreateDialogOpen(false);
      setCreateForm({ startDate: "", endDate: "", reason: "" });
      toast({
        title: "Time Off Request Submitted",
        description: "Your request has been sent for manager approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to submit request: " + error.message,
        variant: "destructive",
      });
    }
  });

  // Review time off request mutation (admin/manager only)
  const reviewRequestMutation = useMutation({
    mutationFn: async ({ id, status, comments }: { id: number; status: string; comments?: string }) => {
      const response = await apiRequest("PATCH", `/api/time-off-requests/${id}/status`, { status, comments });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-off-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-off-requests/approved"] });
      setIsReviewDialogOpen(false);
      setSelectedRequest(null);
      toast({
        title: "Request Updated",
        description: `Request has been ${reviewForm.status}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update request: " + error.message,
        variant: "destructive",
      });
    }
  });

  // Request cancellation mutation
  const requestCancellationMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      const response = await apiRequest("PATCH", `/api/time-off-requests/${id}/request-cancellation`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-off-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-off-requests/approved"] });
      setIsCancellationDialogOpen(false);
      setSelectedRequest(null);
      setCancellationForm({ reason: "" });
      toast({
        title: "Cancellation Requested",
        description: "Your cancellation request has been sent for manager review.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to request cancellation: " + error.message,
        variant: "destructive",
      });
    }
  });

  const handleCreateRequest = () => {
    if (!createForm.startDate || !createForm.endDate) {
      toast({
        title: "Missing Information",
        description: "Please select start and end dates.",
        variant: "destructive"
      });
      return;
    }

    const start = new Date(createForm.startDate);
    const end = new Date(createForm.endDate);
    
    if (start > end) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after start date.",
        variant: "destructive"
      });
      return;
    }

    createRequestMutation.mutate(createForm);
  };

  const handleReviewRequest = (action: "approved" | "rejected" | "cancelled") => {
    if (!selectedRequest) return;
    
    setReviewForm({ status: action, comments: reviewForm.comments });
    reviewRequestMutation.mutate({
      id: selectedRequest.id,
      status: action,
      comments: reviewForm.comments
    });
  };

  const handleRequestCancellation = () => {
    if (!selectedRequest) return;
    
    requestCancellationMutation.mutate({
      id: selectedRequest.id,
      reason: cancellationForm.reason
    });
  };

  const calculateDays = (startDate: string, endDate: string) => {
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      return differenceInDays(end, start) + 1;
    } catch {
      return 0;
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      
      if (format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd")) {
        return format(start, "MMM d, yyyy");
      }
      
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    } catch {
      return "Invalid date";
    }
  };

  // Filter requests based on user role and filter selection
  const filteredRequests = timeOffRequests.filter((request: TimeOffRequest) => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      // Managers/admins see all requests, can filter by status
      if (filter === "pending") return request.status === "pending";
      if (filter === "approved") return request.status === "approved";
      if (filter === "rejected") return request.status === "rejected";
      if (filter === "cancellation_requested") return request.status === "cancellation_requested";
      if (filter === "cancelled") return request.status === "cancelled";
      return true; // "all"
    } else {
      // Employees see only their own requests
      return request.userId === user?.id;
    }
  });

  const canReviewRequests = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-blue-500" />
            Time Off Management
          </h1>
          <p className="text-muted-foreground">
            Request time off and manage approvals
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Request Time Off
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Time Off</DialogTitle>
              <DialogDescription>
                Submit a request for time off. Manager approval is required.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({...createForm, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={createForm.endDate}
                    onChange={(e) => setCreateForm({...createForm, endDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Vacation, personal, medical, etc."
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({...createForm, reason: e.target.value})}
                />
              </div>
              
              {createForm.startDate && createForm.endDate && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-700">
                    <strong>Duration:</strong> {calculateDays(createForm.startDate, createForm.endDate)} day(s)
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                onClick={handleCreateRequest}
                disabled={createRequestMutation.isPending || !createForm.startDate || !createForm.endDate}
              >
                {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            {canReviewRequests && (
              <>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancellation_requested">Cancellation Requested</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
        
        <Badge variant="outline" className="ml-auto">
          {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Requests List */}
      <div className="grid gap-4">
        <AnimatePresence>
          {filteredRequests.map((request: TimeOffRequest) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full"
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      {canReviewRequests && request.user ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            {request.user.firstName} {request.user.lastName}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">My Request</span>
                        </div>
                      )}
                    </div>
                    <Badge className={statusStyles[request.status]}>
                      {request.status}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span>{formatDateRange(request.startDate, request.endDate)}</span>
                      <span className="text-gray-500">
                        ({calculateDays(request.startDate, request.endDate)} day{calculateDays(request.startDate, request.endDate) !== 1 ? 's' : ''})
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>Requested {format(parseISO(request.requestedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                    </div>

                    {request.reason && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>Reason:</strong> {request.reason}
                      </div>
                    )}

                    {request.comments && (
                      <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                        <MessageSquare className="h-3 w-3 inline mr-1" />
                        <strong>Manager Comments:</strong> {request.comments}
                      </div>
                    )}

                    {request.reviewedAt && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        Reviewed {format(parseISO(request.reviewedAt), "MMM d, h:mm a")}
                      </div>
                    )}
                  </div>

                  {/* Action buttons for managers/admins */}
                  {canReviewRequests && request.status === "pending" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-2 pt-4 mt-4 border-t"
                    >
                      <Button
                        size="sm"
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        onClick={() => {
                          setSelectedRequest(request);
                          setReviewForm({ status: "approved", comments: "" });
                          setIsReviewDialogOpen(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setSelectedRequest(request);
                          setReviewForm({ status: "rejected", comments: "" });
                          setIsReviewDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </motion.div>
                  )}

                  {/* Approve/Reject cancellation requests for managers/admins */}
                  {canReviewRequests && request.status === "cancellation_requested" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-2 pt-4 mt-4 border-t"
                    >
                      <Button
                        size="sm"
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        onClick={() => {
                          setSelectedRequest(request);
                          setReviewForm({ status: "cancelled", comments: "" });
                          setIsReviewDialogOpen(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve Cancellation
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setSelectedRequest(request);
                          setReviewForm({ status: "approved", comments: "" });
                          setIsReviewDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Keep Approved
                      </Button>
                    </motion.div>
                  )}

                  {/* Request cancellation button for own approved requests */}
                  {request.userId === user?.id && request.status === "approved" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-2 pt-4 mt-4 border-t"
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-orange-200 text-orange-600 hover:bg-orange-50"
                        onClick={() => {
                          setSelectedRequest(request);
                          setCancellationForm({ reason: "" });
                          setIsCancellationDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Request Cancellation
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredRequests.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No requests found</h3>
          <p className="text-gray-500">
            {user?.role === 'admin' || user?.role === 'manager' 
              ? "No time off requests to review at this time."
              : "You haven't submitted any time off requests yet."
            }
          </p>
        </motion.div>
      )}

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewForm.status === "approved" ? "Approve" : "Reject"} Time Off Request
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <div className="space-y-2 pt-2">
                  <div><strong>Employee:</strong> {selectedRequest.user?.firstName} {selectedRequest.user?.lastName}</div>
                  <div><strong>Dates:</strong> {formatDateRange(selectedRequest.startDate, selectedRequest.endDate)}</div>
                  <div><strong>Duration:</strong> {calculateDays(selectedRequest.startDate, selectedRequest.endDate)} day(s)</div>
                  {selectedRequest.reason && <div><strong>Reason:</strong> {selectedRequest.reason}</div>}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                placeholder="Add any comments for the employee..."
                value={reviewForm.comments}
                onChange={(e) => setReviewForm({...reviewForm, comments: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReviewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleReviewRequest(reviewForm.status as "approved" | "rejected")}
              disabled={reviewRequestMutation.isPending}
              className={reviewForm.status === "approved" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}
            >
              {reviewRequestMutation.isPending ? "Processing..." : 
               (reviewForm.status === "approved" ? "Approve Request" : "Reject Request")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancellation Request Dialog */}
      <Dialog open={isCancellationDialogOpen} onOpenChange={setIsCancellationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Time Off Cancellation</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <div className="space-y-2 pt-2">
                  <div><strong>Dates:</strong> {formatDateRange(selectedRequest.startDate, selectedRequest.endDate)}</div>
                  <div><strong>Duration:</strong> {calculateDays(selectedRequest.startDate, selectedRequest.endDate)} day(s)</div>
                  {selectedRequest.reason && <div><strong>Original Reason:</strong> {selectedRequest.reason}</div>}
                  <div className="text-amber-600 text-sm font-medium pt-2">
                    ⚠️ This will request cancellation of your approved time off. Manager approval is required.
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancellation-reason">Reason for Cancellation (Optional)</Label>
              <Textarea
                id="cancellation-reason"
                placeholder="Trip was cancelled, change of plans, etc."
                value={cancellationForm.reason}
                onChange={(e) => setCancellationForm({ ...cancellationForm, reason: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCancellationDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRequestCancellation}
              disabled={requestCancellationMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {requestCancellationMutation.isPending ? "Requesting..." : "Request Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}