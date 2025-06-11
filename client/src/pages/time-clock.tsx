import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Play, Pause, Square, MapPin, Calendar, ChevronDown } from "lucide-react";
import { format } from "date-fns";

export default function TimeClock() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClocked, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [totalHours, setTotalHours] = useState("0:00");
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [totalBreakTime, setTotalBreakTime] = useState("0:00");
  const [selectedLocation, setSelectedLocation] = useState("lake-geneva-retail");

  const locations = [
    {
      id: "lake-geneva-retail",
      name: "Lake Geneva Retail",
      address: "W4240 State Rd 50, Lake Geneva, WI 53147"
    },
    {
      id: "watertown-retail", 
      name: "Watertown Retail",
      address: "919 N Church St, Watertown, WI 53094"
    },
    {
      id: "watertown-spa",
      name: "Watertown Spa",
      address: "504 S Church St, Watertown, WI 53094"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isClocked && clockInTime) {
      const elapsed = Math.floor((currentTime.getTime() - clockInTime.getTime()) / 1000);
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      setTotalHours(`${hours}:${minutes.toString().padStart(2, '0')}`);
    }
  }, [currentTime, isClocked, clockInTime]);

  useEffect(() => {
    if (isOnBreak && breakStartTime) {
      const elapsed = Math.floor((currentTime.getTime() - breakStartTime.getTime()) / 1000);
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      setTotalBreakTime(`${hours}:${minutes.toString().padStart(2, '0')}`);
    }
  }, [currentTime, isOnBreak, breakStartTime]);

  const handleClockIn = () => {
    const location = locations.find(loc => loc.id === selectedLocation);
    setIsClockedIn(true);
    setClockInTime(new Date());
    toast({
      title: "Clocked In",
      description: `Welcome back, ${user?.firstName}! You are now clocked in at ${location?.name}.`,
    });
  };

  const handleClockOut = () => {
    setIsClockedIn(false);
    setClockInTime(null);
    setIsOnBreak(false);
    setBreakStartTime(null);
    toast({
      title: "Clocked Out", 
      description: `You worked ${totalHours} today. Have a great rest of your day!`,
    });
  };

  const handleStartBreak = () => {
    setIsOnBreak(true);
    setBreakStartTime(new Date());
    toast({
      title: "Break Started",
      description: "Enjoy your break! Remember to end it when you return.",
    });
  };

  const handleEndBreak = () => {
    setIsOnBreak(false);
    setBreakStartTime(null);
    toast({
      title: "Break Ended",
      description: `Break time: ${totalBreakTime}. Welcome back!`,
    });
    setTotalBreakTime("0:00");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome, {user?.firstName}!
            </h2>
            <p className="text-gray-600">
              {format(currentTime, "EEEE, MMMM d, yyyy")}
            </p>
            <p className="text-3xl font-mono font-bold text-gray-900 mt-2">
              {format(currentTime, "h:mm:ss a")}
            </p>
          </div>

          {/* Current Status */}
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <CardTitle>Current Status</CardTitle>
              </div>
              <Badge 
                variant={isClocked ? "default" : "secondary"}
                className={isClocked ? "bg-green-600" : "bg-gray-500"}
              >
                {isClocked ? "Clocked In" : "Clocked Out"}
              </Badge>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {isClocked && clockInTime && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Clocked in at: {format(clockInTime, "h:mm a")}
                  </p>
                  <p className="text-2xl font-mono font-bold text-green-600">
                    Time Worked: {totalHours}
                  </p>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                {!isClocked ? (
                  <Button 
                    onClick={handleClockIn}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                    size="lg"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Clock In
                  </Button>
                ) : (
                  <Button 
                    onClick={handleClockOut}
                    variant="destructive"
                    className="px-8 py-3 text-lg"
                    size="lg"
                  >
                    <Square className="h-5 w-5 mr-2" />
                    Clock Out
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location Selection */}
          <Card>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Today's Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{isClocked ? totalHours : "0:00"}</div>
                <p className="text-xs text-gray-500 mt-1">Current shift</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">24:30</div>
                <p className="text-xs text-gray-500 mt-1">Total hours worked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Break Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {isOnBreak ? "On Break" : "Available"}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {isOnBreak ? `Break time: ${totalBreakTime}` : "Ready for break"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Break Management */}
          <Card>
            <CardHeader>
              <CardTitle>Break Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center space-x-4">
                <Button 
                  variant="outline" 
                  disabled={!isClocked || isOnBreak}
                  onClick={handleStartBreak}
                  className={isOnBreak ? "opacity-50" : ""}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Start Break
                </Button>
                <Button 
                  variant="outline" 
                  disabled={!isOnBreak}
                  onClick={handleEndBreak}
                  className={!isOnBreak ? "opacity-50" : "bg-green-50 border-green-300 hover:bg-green-100"}
                >
                  <Play className="h-4 w-4 mr-2" />
                  End Break
                </Button>
              </div>
              <p className="text-sm text-gray-500 text-center">
                {isOnBreak 
                  ? `Break started at ${breakStartTime ? format(breakStartTime, "h:mm a") : ""}`
                  : "Click 'Start Break' when you need to take a break"
                }
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}