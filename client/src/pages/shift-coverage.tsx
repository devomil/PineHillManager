import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Users, Calendar, Clock, MapPin, Plus, Search } from "lucide-react";
import { format } from "date-fns";

export default function ShiftCoverage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'my-requests' | 'offered'>('available');
  const [requestData, setRequestData] = useState({
    scheduleId: "",
    reason: ""
  });

  // Fetch available coverage requests
  const { data: availableRequests = [] } = useQuery({
    queryKey: ["/api/shift-coverage-requests", "open"],
    queryFn: async () => {
      const response = await fetch("/api/shift-coverage-requests?status=open", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch requests");
      return response.json();
    }
  });

  // Fetch user's own requests
  const { data: myRequests = [] } = useQuery({
    queryKey: ["/api/my-coverage-requests"],
    queryFn: async () => {
      const response = await fetch("/api/my-coverage-requests", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch my requests");
      return response.json();
    }
  });

  // Fetch user's schedules that can be covered
  const { data: mySchedules = [] } = useQuery({
    queryKey: ["/api/my-schedules"],
    queryFn: async () => {
      const response = await fetch("/api/my-schedules", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch schedules");
      return response.json();
    }
  });

  const createCoverageRequestMutation = useMutation({
    mutationFn: async (data: typeof requestData) => {
      const response = await fetch("/api/shift-coverage-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to create request");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-coverage-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-coverage-requests"] });
      setShowRequestForm(false);
      setRequestData({ scheduleId: "", reason: "" });
      toast({
        title: "Coverage Request Created",
        description: "Your shift coverage request has been posted.",
      });
    }
  });

  const acceptCoverageMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/shift-coverage-requests/${requestId}/accept`, {
        method: "POST",
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to accept coverage");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-coverage-requests"] });
      toast({
        title: "Coverage Accepted",
        description: "You have successfully accepted the shift coverage.",
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'covered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 font-brand" 
                    style={{ fontFamily: "'Great Vibes', cursive" }}>
                  Pine Hill Farm
                </h1>
                <p className="text-sm text-gray-600">Shift Coverage</p>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={() => window.history.back()}
              className="text-gray-700 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header with Request Button */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Shift Coverage</h2>
              <p className="text-gray-600">Find coverage for your shifts or help cover for colleagues</p>
            </div>
            <Button 
              onClick={() => setShowRequestForm(!showRequestForm)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Request Coverage
            </Button>
          </div>

          {/* New Coverage Request Form */}
          {showRequestForm && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Request Shift Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  createCoverageRequestMutation.mutate(requestData);
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="scheduleId">Select Shift to Cover</Label>
                    <select
                      id="scheduleId"
                      value={requestData.scheduleId}
                      onChange={(e) => setRequestData({...requestData, scheduleId: e.target.value})}
                      className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Choose a shift...</option>
                      {mySchedules.map((schedule: any) => (
                        <option key={schedule.id} value={schedule.id}>
                          {format(new Date(schedule.date), "MMM d, yyyy")} - {schedule.startTime} to {schedule.endTime} ({schedule.locationName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="reason">Reason for Coverage Request</Label>
                    <Textarea
                      id="reason"
                      value={requestData.reason}
                      onChange={(e) => setRequestData({...requestData, reason: e.target.value})}
                      placeholder="Please provide a reason for requesting coverage..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button type="button" variant="outline" onClick={() => setShowRequestForm(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={createCoverageRequestMutation.isPending}
                    >
                      {createCoverageRequestMutation.isPending ? "Submitting..." : "Request Coverage"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('available')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'available'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Available to Cover ({availableRequests.length})
              </button>
              <button
                onClick={() => setActiveTab('my-requests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'my-requests'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Requests ({myRequests.length})
              </button>
            </nav>
          </div>

          {/* Available Coverage Requests */}
          {activeTab === 'available' && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Available Shifts to Cover</CardTitle>
              </CardHeader>
              <CardContent>
                {availableRequests.length > 0 ? (
                  <div className="space-y-4">
                    {availableRequests.map((request: any) => (
                      <div key={request.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Calendar className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {format(new Date(request.shiftDate), "EEEE, MMM d, yyyy")}
                              </p>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{request.startTime} - {request.endTime}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{request.locationName || "Location TBD"}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button 
                            onClick={() => acceptCoverageMutation.mutate(request.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={acceptCoverageMutation.isPending}
                          >
                            Accept Coverage
                          </Button>
                        </div>
                        
                        {request.reason && (
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            <strong>Reason:</strong> {request.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No coverage requests available</h3>
                    <p className="text-gray-500">Check back later for new shift coverage opportunities</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* My Coverage Requests */}
          {activeTab === 'my-requests' && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>My Coverage Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {myRequests.length > 0 ? (
                  <div className="space-y-4">
                    {myRequests.map((request: any) => (
                      <div key={request.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Calendar className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {format(new Date(request.shiftDate), "EEEE, MMM d, yyyy")}
                              </p>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{request.startTime} - {request.endTime}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{request.locationName || "Location TBD"}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </div>
                        
                        {request.reason && (
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            <strong>Reason:</strong> {request.reason}
                          </p>
                        )}
                        
                        {request.coveredBy && (
                          <p className="text-sm text-green-600 mt-2">
                            Covered by colleague - Thank you!
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No coverage requests</h3>
                    <p className="text-gray-500 mb-4">You haven't requested any shift coverage yet</p>
                    <Button 
                      onClick={() => setShowRequestForm(true)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Request Coverage
                    </Button>
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