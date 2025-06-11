import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Play, Pause, Square, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
  const { data: currentEntry, isLoading: currentEntryLoading } = useQuery<any>({
    queryKey: ['/api/time-clock/current'],
    refetchInterval: 5000, // Refresh every 5 seconds
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
      return res.json();
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
      return res.json();
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
      return res.json();
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
      return res.json();
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

  const isLoading = currentEntryLoading || todayLoading || weekLoading;
  const isClockedIn = currentEntry && typeof currentEntry === 'object' && 
    (currentEntry.status === 'clocked_in' || currentEntry.status === 'on_break');
  const isOnBreak = currentEntry && typeof currentEntry === 'object' && 
    currentEntry.status === 'on_break';
  const todaysHours = calculateTodaysHours();
  const weekHours = calculateWeekHours();
  const currentBreakTime = calculateCurrentBreakTime();

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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome, {user.firstName}!
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            {format(currentTime, "EEEE, MMMM d, yyyy")}
          </p>
          <div className="text-5xl font-mono font-bold text-gray-800">
            {format(currentTime, "HH:mm:ss")} {format(currentTime, "a")}
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
                    disabled={clockInMutation.isPending || !selectedLocation}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Clock In
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => clockOutMutation.mutate()}
                    disabled={clockOutMutation.isPending}
                    variant="destructive"
                    className="px-8 py-3"
                  >
                    <Square className="mr-2 h-5 w-5" />
                    Clock Out
                  </Button>
                )}
              </div>

              {isClockedIn && currentEntry && typeof currentEntry === 'object' && currentEntry.clockInTime && (
                <div className="text-center text-sm text-gray-600">
                  Clocked in at {format(new Date(currentEntry.clockInTime), "h:mm a")}
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