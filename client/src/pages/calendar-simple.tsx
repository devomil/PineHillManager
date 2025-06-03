import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, MapPin, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { format, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";
import type { Location } from "@shared/schema";

export default function Calendar() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  // Calculate week range
  const getWeekRange = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    };
  };

  const { start: startDate, end: endDate } = getWeekRange();

  // Fetch locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
    enabled: isAuthenticated,
  });

  // Navigation handlers
  const navigatePrevious = () => {
    setCurrentDate(subDays(currentDate, 7));
  };

  const navigateNext = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  // Generate week days
  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Global Calendar</h1>
          <p className="text-muted-foreground">
            Smart scheduling system with automatic sync for shift coverage and time-off
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={navigatePrevious}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-lg font-semibold min-w-[200px] text-center">
            Week of {format(startOfWeek(currentDate, { weekStartsOn: 0 }), "MMM d, yyyy")}
          </div>
          
          <Button variant="outline" size="sm" onClick={navigateNext}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location: Location) => (
                <SelectItem key={location.id} value={location.id.toString()}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Location Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.map((location: Location) => (
          <Card key={location.id}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>{location.name}</span>
              </CardTitle>
              <CardDescription>
                {location.address}, {location.city}, {location.state} {location.zipCode}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-green-700 bg-green-50">
                Active Location
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Week View */}
      <div className="grid grid-cols-7 gap-4">
        {getWeekDays().map((day, index) => (
          <Card key={index} className="min-h-[300px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {format(day, "EEE")}
              </CardTitle>
              <CardDescription className="text-lg font-semibold">
                {format(day, "d")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">
                No events scheduled
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>Calendar Features</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">Work Shifts</Badge>
            <span className="text-sm">Regular employee schedules</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-orange-50 text-orange-700">Time Off</Badge>
            <span className="text-sm">Approved vacation and leave requests</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-red-50 text-red-700">Coverage Needed</Badge>
            <span className="text-sm">Shifts requiring coverage</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-50 text-green-700">Announcements</Badge>
            <span className="text-sm">Company announcements and events</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}