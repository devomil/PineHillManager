import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Play, Pause, Square, MapPin, Calendar, ArrowLeft, Home } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { formatTimeToCST, formatDateTimeToCST, getCurrentTimeCST } from "@/lib/time-utils";

export default function TimeClock() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState("1");

  const locations = [
    {
      id: "1",
      name: "Lake Geneva Retail",
      address: "W4240 State Rd 50, Lake Geneva, WI 53147"
    },
    {
      id: "2", 
      name: "Watertown Retail",
      address: "919 N Church St, Watertown, WI 53094"
    },
    {
      id: "3",
      name: "Watertown Spa",
      address: "504 S Church St, Watertown, WI 53094"
    }
  ];

  // Get current time entry and real-time data
  const { data: currentEntry, isLoading: currentEntryLoading, error: currentEntryError } = useQuery<any>({
    queryKey: ['/api/time-clock/current'],
    queryFn: async () => {
      console.log('Custom queryFn for current entry');
      const response = await fetch('/api/time-clock/current', {
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      console.log('Current entry response status:', response.status);
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Current entry data received:', data);
      return data;
    },
    refetchInterval: 30000, // Poll every 30 seconds instead of 2 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
    enabled: !!user,
    staleTime: 10000, // Allow 10 seconds of stale data
    gcTime: 60000,
  });

  const { data: todayEntries = [], isLoading: todayLoading } = useQuery<any[]>({
    queryKey: ['/api/time-clock/today'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: weekEntries = [], isLoading: weekLoading } = useQuery<any[]>({
    queryKey: ['/api/time-clock/week'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/time-clock/clock-in', {
        locationId: parseInt(selectedLocation)
      });
      return res;
    },
    onSuccess: () => {
      const location = locations.find(loc => loc.id === selectedLocation);
      queryClient.invalidateQueries({ queryKey: ['/api/time-clock/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time-clock/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time-clock/week'] });
      toast({
        title: "Clocked In",
        description: `Welcome back, ${user?.firstName}! You are now clocked in at ${location?.name}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Clock In Failed",
        description: error.message || "Failed to clock in",
        variant: "destructive",
      });
    }
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/time-clock/clock-out', {});
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-clock/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/time-clock/today'] });
      const hours = Math.floor(data.totalWorkedMinutes / 60);
      const minutes = data.totalWorkedMinutes % 60;
      toast({
        title: "Clocked Out",
        description: `Good work today! You worked ${hours}:${minutes.toString().padStart(2, '0')}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Clock Out Failed",
        description: error.message || "Failed to clock out",
        variant: "destructive",
      });
    }
  });

  // Start break mutation
  const startBreakMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/time-clock/start-break', {});
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-clock/current'] });
      toast({
        title: "Break Started",
        description: "Enjoy your break!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Start Break Failed",
        description: error.message || "Failed to start break",
        variant: "destructive",
      });
    }
  });

  // End break mutation
  const endBreakMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/time-clock/end-break', {});
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-clock/current'] });
      toast({
        title: "Break Ended",
        description: "Welcome back! Break time recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "End Break Failed",
        description: error.message || "Failed to end break",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate today's total hours from entries
  const calculateTodaysHours = () => {
    if (!todayEntries || !Array.isArray(todayEntries) || !todayEntries.length) return "0:00";
    
    let totalMinutes = 0;
    todayEntries.forEach((entry: any) => {
      if (entry && typeof entry === 'object') {
        if (entry.totalWorkedMinutes) {
          totalMinutes += entry.totalWorkedMinutes;
        } else if (entry.clockInTime && entry.status !== 'clocked_out') {
          // Calculate current session time for active entries
          const elapsed = Date.now() - new Date(entry.clockInTime).getTime();
          const sessionMinutes = Math.floor(elapsed / (1000 * 60)) - (entry.totalBreakMinutes || 0);
          totalMinutes += Math.max(0, sessionMinutes);
        }
      }
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Calculate this week's total hours
  const calculateWeekHours = () => {
    if (!weekEntries || !Array.isArray(weekEntries) || !weekEntries.length) return "0:00";
    
    let totalMinutes = 0;
    weekEntries.forEach((entry: any) => {
      if (entry && typeof entry === 'object' && entry.totalWorkedMinutes) {
        totalMinutes += entry.totalWorkedMinutes;
      }
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Calculate current break time
  const calculateCurrentBreakTime = () => {
    if (!currentEntry || typeof currentEntry !== 'object' || 
        currentEntry.status !== 'on_break' || !currentEntry.breakStartTime) {
      return "0:00";
    }
    
    const elapsed = Date.now() - new Date(currentEntry.breakStartTime).getTime();
    const minutes = Math.floor(elapsed / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}`;
  };

  // Only show loading on initial load, not during background refreshes
  const isLoading = (currentEntryLoading && currentEntry === undefined) || 
                   (todayLoading && todayEntries.length === 0) || 
                   (weekLoading && weekEntries.length === 0);
  const isClockedIn = Boolean(currentEntry && typeof currentEntry === 'object' && 
    (currentEntry.status === 'clocked_in' || currentEntry.status === 'on_break'));
  const isOnBreak = Boolean(currentEntry && typeof currentEntry === 'object' && 
    currentEntry.status === 'on_break');
  const todaysHours = calculateTodaysHours();
  const weekHours = calculateWeekHours();
  const currentBreakTime = calculateCurrentBreakTime();

  // Debug logging only in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('=== TIME CLOCK STATE DEBUG ===');
      console.log('Current Entry:', currentEntry);
      console.log('Current Entry Type:', typeof currentEntry);
      console.log('Is Clocked In:', isClockedIn);
      console.log('Is On Break:', isOnBreak);
      console.log('Current Entry Loading:', currentEntryLoading);
      console.log('Current Entry Error:', currentEntryError);
      console.log('Button should show:', !isClockedIn ? 'Clock In' : 'Clock Out');
      console.log('===========================');
    }
  }, [currentEntry, isClockedIn, isOnBreak, currentEntryLoading, currentEntryError]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Please log in to access the time clock.</p>
        </div>
      </div>
    );
  }

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
                <p className="text-sm text-gray-600">Time Clock</p>
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome, {user.firstName}!
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            {format(currentTime, "EEEE, MMMM d, yyyy")}
          </p>
          <div className="text-5xl font-mono font-bold text-gray-800">
            {format(currentTime, "h:mm:ss a")} CST
          </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Status */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-6 w-6" />
                <span>Current Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center">
                <Badge
                  variant={
                    isLoading ? "secondary" : 
                    isClockedIn ? (isOnBreak ? "default" : "destructive") : "outline"
                  }
                  className="text-lg px-6 py-2"
                >
                  {isLoading ? "Loading..." : 
                   isClockedIn ? (isOnBreak ? "On Break" : "Clocked In") : "Clocked Out"}
                </Badge>
              </div>

              <div className="flex justify-center">
                {!isClockedIn ? (
                  <Button
                    size="lg"
                    onClick={() => clockInMutation.mutate()}
                    disabled={clockInMutation.isPending || currentEntryLoading}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => clockOutMutation.mutate()}
                    disabled={clockOutMutation.isPending || currentEntryLoading}
                    variant="destructive"
                    className="px-8 py-3"
                  >
                    <Square className="mr-2 h-5 w-5" />
                    {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
                  </Button>
                )}
              </div>

              {isClockedIn && currentEntry && typeof currentEntry === 'object' && currentEntry.clockInTime && (
                <div className="text-center text-sm text-gray-600">
                  Clocked in at {formatTimeToCST(currentEntry.clockInTime)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Selection */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Work Location</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Select Your Location</label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose work location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedLocation && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-lg font-medium text-gray-900">
                    {locations.find(loc => loc.id === selectedLocation)?.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {locations.find(loc => loc.id === selectedLocation)?.address}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:col-span-2">
            <Card className="bg-white shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Today's Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{todaysHours}</div>
                <p className="text-xs text-gray-500 mt-1">Current shift</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{weekHours}</div>
                <p className="text-xs text-gray-500 mt-1">Total hours worked</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Break Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {isOnBreak ? currentBreakTime : "Available"}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {isOnBreak ? "Current break" : "Ready for break"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Break Management */}
          <Card className="bg-white shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle>Break Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center space-x-4">
                {isClockedIn && !isOnBreak && (
                  <Button
                    onClick={() => startBreakMutation.mutate()}
                    disabled={startBreakMutation.isPending}
                    variant="outline"
                    size="lg"
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    Start Break
                  </Button>
                )}

                {isOnBreak && (
                  <Button
                    onClick={() => endBreakMutation.mutate()}
                    disabled={endBreakMutation.isPending}
                    variant="outline"
                    size="lg"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    End Break
                  </Button>
                )}
              </div>

              <p className="text-center text-sm text-gray-600">
                {isClockedIn && !isOnBreak && "Click 'Start Break' when you need to take a break"}
                {isOnBreak && "You are currently on break. Click 'End Break' when you return."}
                {!isClockedIn && "Clock in to manage your breaks"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}