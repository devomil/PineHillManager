import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Clock, MapPin, User, Plus, Edit, ChevronLeft, ChevronRight, Copy, Users, CalendarDays } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isWithinInterval, parseISO, addWeeks, subWeeks, getDay } from "date-fns";
import type { WorkSchedule, User as UserType, Location } from "@shared/schema";

interface ScheduleEntry {
  employeeId: string;
  locationId: number;
  startTime: string;
  endTime: string;
  date: string;
  role?: string;
}

export default function EnhancedShiftScheduling() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<number>(1);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isBulkScheduleMode, setIsBulkScheduleMode] = useState(false);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["/api/work-schedules", format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
    queryFn: () => apiRequest(`/api/work-schedules?startDate=${format(weekStart, "yyyy-MM-dd")}&endDate=${format(weekEnd, "yyyy-MM-dd")}`),
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (scheduleData: ScheduleEntry[]) => {
      // Create multiple schedules
      const promises = scheduleData.map(entry => 
        fetch("/api/work-schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: entry.employeeId,
            locationId: entry.locationId,
            startTime: `${entry.date}T${entry.startTime}:00`,
            endTime: `${entry.date}T${entry.endTime}:00`,
            role: entry.role || "employee"
          }),
        }).then(res => res.json())
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      setIsScheduleDialogOpen(false);
      setSelectedDays([]);
      setSelectedEmployee("");
      toast({
        title: "Success",
        description: "Shifts scheduled successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyWeekMutation = useMutation({
    mutationFn: async () => {
      const nextWeekStart = addWeeks(weekStart, 1);
      const schedulePromises = schedules.map((schedule: WorkSchedule) => {
        const originalDate = parseISO(schedule.startTime);
        const dayOfWeek = getDay(originalDate);
        const newDate = addDays(nextWeekStart, dayOfWeek);
        
        return fetch("/api/work-schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: schedule.userId,
            locationId: schedule.locationId,
            startTime: `${format(newDate, "yyyy-MM-dd")}T${format(parseISO(schedule.startTime), "HH:mm")}:00`,
            endTime: `${format(newDate, "yyyy-MM-dd")}T${format(parseISO(schedule.endTime), "HH:mm")}:00`,
            role: schedule.role || "employee"
          }),
        }).then(res => res.json());
      });
      
      return Promise.all(schedulePromises);
    },
    onSuccess: () => {
      setCurrentWeek(addWeeks(currentWeek, 1));
      toast({
        title: "Success",
        description: "Week schedule copied to next week",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays(prev => 
      prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const handleBulkSchedule = () => {
    if (!selectedEmployee || selectedDays.length === 0) {
      toast({
        title: "Error",
        description: "Please select an employee and at least one day",
        variant: "destructive",
      });
      return;
    }

    const scheduleEntries: ScheduleEntry[] = selectedDays.map(dayIndex => ({
      employeeId: selectedEmployee,
      locationId: selectedLocation,
      startTime,
      endTime,
      date: format(weekDays[dayIndex], "yyyy-MM-dd"),
      role: "employee"
    }));

    createScheduleMutation.mutate(scheduleEntries);
  };

  const getSchedulesForDay = (date: Date) => {
    return schedules.filter((schedule: WorkSchedule) => {
      const scheduleDate = parseISO(schedule.startTime);
      return format(scheduleDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
    });
  };

  const getEmployeeName = (userId: string) => {
    const employee = employees.find((emp: UserType) => emp.id === userId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown";
  };

  const getLocationName = (locationId: number) => {
    const location = locations.find((loc: Location) => loc.id === locationId);
    return location ? location.name : "Unknown Location";
  };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Enhanced Shift Scheduling</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Schedule employees across multiple days and locations</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => copyWeekMutation.mutate()}
            disabled={copyWeekMutation.isPending || schedules.length === 0}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Week
          </Button>
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Bulk Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Bulk Schedule Employee</DialogTitle>
                <DialogDescription>
                  Schedule an employee across multiple days at once
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Employee</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee: UserType) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.firstName} {employee.lastName} ({employee.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Select Location</Label>
                  <Select value={selectedLocation.toString()} onValueChange={(value) => setSelectedLocation(parseInt(value))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location: Location) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Select Days</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {dayNames.map((day, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${index}`}
                          checked={selectedDays.includes(index)}
                          onCheckedChange={() => handleDayToggle(index)}
                        />
                        <Label htmlFor={`day-${index}`} className="text-sm">
                          {day.substring(0, 3)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleBulkSchedule}
                  disabled={createScheduleMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createScheduleMutation.isPending ? "Scheduling..." : "Schedule Shifts"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          className="flex items-center space-x-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous Week</span>
        </Button>
        
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Week of {format(weekStart, "MMM d, yyyy")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          className="flex items-center space-x-2"
        >
          <span>Next Week</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekly Schedule Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const daySchedules = getSchedulesForDay(day);
          const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
          
          return (
            <Card key={index} className={`${isToday ? "ring-2 ring-blue-500" : ""}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {format(day, "EEE")}
                  <span className="block text-lg font-semibold">
                    {format(day, "d")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {daySchedules.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No shifts scheduled</p>
                ) : (
                  daySchedules.map((schedule: WorkSchedule) => (
                    <div
                      key={schedule.id}
                      className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-blue-900 dark:text-blue-100 truncate">
                            {getEmployeeName(schedule.userId)}
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            {format(parseISO(schedule.startTime), "h:mm a")} - {format(parseISO(schedule.endTime), "h:mm a")}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            {getLocationName(schedule.locationId)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Shifts This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {schedules.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Unique Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {new Set(schedules.map((s: WorkSchedule) => s.userId)).size}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {schedules.reduce((total: number, schedule: WorkSchedule) => {
                const start = parseISO(schedule.startTime);
                const end = parseISO(schedule.endTime);
                const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                return total + hours;
              }, 0).toFixed(1)}h
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}