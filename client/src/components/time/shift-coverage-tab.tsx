import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Handshake, Plus, Users, Clock } from "lucide-react";

export default function ShiftCoverageTab() {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number>();
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's upcoming work schedules
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ["/api/work-schedules"],
  });

  // Get shift coverage requests
  const { data: coverageRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/shift-coverage-requests"],
  });

  const createCoverageRequestMutation = useMutation({
    mutationFn: async (data: { scheduleId: number; reason?: string }) => {
      await apiRequest("POST", "/api/shift-coverage-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-coverage-requests"] });
      setShowRequestForm(false);
      setSelectedScheduleId(undefined);
      setReason("");
      toast({
        title: "Success",
        description: "Shift coverage request submitted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to submit coverage request",
        variant: "destructive",
      });
    },
  });

  const coverShiftMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/shift-coverage-requests/${id}/cover`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-coverage-requests"] });
      toast({
        title: "Success",
        description: "Shift covered successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to cover shift",
        variant: "destructive",
      });
    },
  });

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedScheduleId) {
      toast({
        title: "Error",
        description: "Please select a shift to request coverage for",
        variant: "destructive",
      });
      return;
    }

    createCoverageRequestMutation.mutate({
      scheduleId: selectedScheduleId,
      reason: reason.trim() || undefined,
    });
  };

  const handleCoverShift = (id: number) => {
    coverShiftMutation.mutate(id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "covered":
        return "bg-green-100 text-green-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const upcomingSchedules = schedules?.filter((schedule: any) => 
    new Date(schedule.date) >= new Date()
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Shift Coverage</h3>
          <p className="text-sm text-slate-500">Request coverage or help colleagues with their shifts</p>
        </div>
        <Button 
          onClick={() => setShowRequestForm(true)}
          className="bg-farm-blue hover:bg-blue-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Request Coverage
        </Button>
      </div>

      {/* Request Coverage Form */}
      {showRequestForm && (
        <Card>
          <CardHeader>
            <CardTitle>Request Shift Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="space-y-2">
                <Label>Select Shift</Label>
                {schedulesLoading ? (
                  <div className="animate-pulse">
                    <div className="h-10 bg-slate-200 rounded"></div>
                  </div>
                ) : upcomingSchedules && upcomingSchedules.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingSchedules.map((schedule: any) => (
                      <label
                        key={schedule.id}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50 ${
                          selectedScheduleId === schedule.id ? 'border-farm-blue bg-blue-50' : 'border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="schedule"
                          value={schedule.id}
                          checked={selectedScheduleId === schedule.id}
                          onChange={() => setSelectedScheduleId(schedule.id)}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">
                              {new Date(schedule.date).toLocaleDateString()}
                            </span>
                            <span className="text-sm text-slate-500">
                              {schedule.startTime} - {schedule.endTime}
                            </span>
                          </div>
                          {schedule.location && (
                            <p className="text-sm text-slate-600 mt-1">
                              {schedule.location}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">
                    No upcoming shifts available for coverage requests
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why do you need coverage for this shift?"
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  disabled={createCoverageRequestMutation.isPending || !selectedScheduleId}
                  className="bg-farm-blue hover:bg-blue-600"
                >
                  {createCoverageRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowRequestForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Coverage Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Shifts to Cover */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-farm-green" />
              Available to Cover
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse p-4 border border-slate-200 rounded-lg">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : coverageRequests?.filter((req: any) => req.status === 'open').length > 0 ? (
              <div className="space-y-4">
                {coverageRequests
                  .filter((req: any) => req.status === 'open')
                  .map((request: any) => (
                    <div
                      key={request.id}
                      className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-900">
                          Coverage Needed
                        </h4>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center text-sm text-slate-600 mb-2">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(request.requestedAt).toLocaleDateString()}
                      </div>
                      
                      {request.reason && (
                        <p className="text-sm text-slate-600 mb-3">
                          <strong>Reason:</strong> {request.reason}
                        </p>
                      )}
                      
                      <Button
                        size="sm"
                        onClick={() => handleCoverShift(request.id)}
                        disabled={coverShiftMutation.isPending}
                        className="bg-farm-green hover:bg-green-600"
                      >
                        <Handshake className="w-4 h-4 mr-2" />
                        Offer to Cover
                      </Button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No shifts need coverage right now</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Coverage Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Handshake className="w-5 h-5 mr-2 text-farm-blue" />
              My Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="animate-pulse p-4 border border-slate-200 rounded-lg">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : coverageRequests?.length > 0 ? (
              <div className="space-y-4">
                {coverageRequests
                  .slice(0, 5)
                  .map((request: any) => (
                    <div
                      key={request.id}
                      className="p-4 border border-slate-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-900">
                          Coverage Request
                        </h4>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center text-sm text-slate-600 mb-2">
                        <Clock className="w-4 h-4 mr-1" />
                        Requested {new Date(request.requestedAt).toLocaleDateString()}
                      </div>
                      
                      {request.reason && (
                        <p className="text-sm text-slate-600">
                          <strong>Reason:</strong> {request.reason}
                        </p>
                      )}
                      
                      {request.status === 'covered' && request.coveredAt && (
                        <p className="text-sm text-green-600 mt-2">
                          Covered on {new Date(request.coveredAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Handshake className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No coverage requests yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
