import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Plus, MapPin, Clock, Users, Edit, Trash2 } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const shiftSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  locationId: z.string().min(1, "Location is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  position: z.string().optional(),
  notes: z.string().optional(),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
}

interface WorkSchedule {
  id: number;
  userId: string;
  locationId: number;
  date: string;
  startTime: string;
  endTime: string;
  position?: string;
  notes?: string;
  employee?: Employee;
  location?: Location;
}

export default function ShiftScheduling() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [viewType, setViewType] = useState<"week" | "month" | "3month" | "6month">("week");
  const [currentMonth, setCurrentMonth] = useState(0);

  // Check if user can manage schedules
  const canManageSchedules = user?.role === "admin" || user?.role === "manager";

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      employeeId: "",
      locationId: "",
      date: "",
      startTime: "",
      endTime: "",
      position: "",
      notes: "",
    },
  });

  // Fetch employees
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: canManageSchedules,
  });

  // Fetch locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Calculate date ranges based on view type
  const getDateRange = () => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (viewType) {
      case "week":
        startDate = startOfWeek(today, { weekStartsOn: 0 });
        startDate.setDate(startDate.getDate() + (selectedWeek * 7));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case "month":
        startDate = new Date(today.getFullYear(), today.getMonth() + currentMonth, 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + currentMonth + 1, 0);
        break;
      case "3month":
        startDate = new Date(today.getFullYear(), today.getMonth() + (currentMonth * 3), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + (currentMonth * 3) + 3, 0);
        break;
      case "6month":
        startDate = new Date(today.getFullYear(), today.getMonth() + (currentMonth * 6), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + (currentMonth * 6) + 6, 0);
        break;
      default:
        startDate = new Date(today);
        endDate = new Date(today);
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();
  
  const getWeekDates = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return date;
    });
  };

  const weekDates = viewType === "week" ? getWeekDates() : [];

  // Fetch work schedules for the week
  const { data: schedules = [] } = useQuery<WorkSchedule[]>({
    queryKey: ["/api/work-schedules", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/work-schedules?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      );
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Create shift mutation
  const createShiftMutation = useMutation({
    mutationFn: async (data: ShiftFormData) => {
      return apiRequest("/api/work-schedules", "POST", {
        userId: data.employeeId,
        locationId: parseInt(data.locationId),
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        position: data.position,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Shift scheduled successfully",
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

  // Update shift mutation
  const updateShiftMutation = useMutation({
    mutationFn: async (data: ShiftFormData & { id: number }) => {
      return apiRequest(`/api/work-schedules/${data.id}`, "PATCH", {
        userId: data.employeeId,
        locationId: parseInt(data.locationId),
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        position: data.position,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      setDialogOpen(false);
      setEditingSchedule(null);
      form.reset();
      toast({
        title: "Success",
        description: "Shift updated successfully",
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

  // Delete shift mutation
  const deleteShiftMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/work-schedules/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      toast({
        title: "Success",
        description: "Shift deleted successfully",
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

  const onSubmit = (data: ShiftFormData) => {
    if (editingSchedule) {
      updateShiftMutation.mutate({ ...data, id: editingSchedule.id });
    } else {
      createShiftMutation.mutate(data);
    }
  };

  const handleEdit = (schedule: WorkSchedule) => {
    setEditingSchedule(schedule);
    form.reset({
      employeeId: schedule.userId,
      locationId: schedule.locationId.toString(),
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      position: schedule.position || "",
      notes: schedule.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this shift?")) {
      deleteShiftMutation.mutate(id);
    }
  };

  const getSchedulesForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return schedules.filter(
      (schedule) =>
        schedule.date === dateStr &&
        (selectedLocation === "all" || schedule.locationId.toString() === selectedLocation)
    );
  };

  const filteredSchedules = schedules.filter(
    (schedule) =>
      selectedLocation === "all" || schedule.locationId.toString() === selectedLocation
  );

  // Helper functions for date formatting and navigation
  const getViewTitle = () => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
    
    switch (viewType) {
      case "week":
        return `Week of ${startDate.toLocaleDateString()}`;
      case "month":
        return startDate.toLocaleDateString('en-US', options);
      case "3month":
        const endMonth = new Date(endDate);
        endMonth.setDate(endMonth.getDate() - 1);
        return `${startDate.toLocaleDateString('en-US', options)} - ${endMonth.toLocaleDateString('en-US', options)}`;
      case "6month":
        const end6Month = new Date(endDate);
        end6Month.setDate(end6Month.getDate() - 1);
        return `${startDate.toLocaleDateString('en-US', options)} - ${end6Month.toLocaleDateString('en-US', options)}`;
      default:
        return "Schedule View";
    }
  };

  const handlePrevious = () => {
    if (viewType === "week") {
      setSelectedWeek(selectedWeek - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNext = () => {
    if (viewType === "week") {
      setSelectedWeek(selectedWeek + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const renderScheduleView = () => {
    if (viewType === "week") {
      return renderWeekView();
    } else {
      return renderMonthView();
    }
  };

  const renderWeekView = () => (
    <div className="grid grid-cols-7 gap-4">
      {weekDates.map((date, index) => {
        const dayName = format(date, "EEEE");
        const daySchedules = getSchedulesForDate(date);

        return (
          <div key={date.toISOString()} className="border rounded-lg p-3 min-h-32">
            <div className="font-medium text-sm mb-2">
              {dayName} {format(date, "M/d")}
            </div>
            <div className="space-y-2">
              {daySchedules.length === 0 ? (
                <div className="text-xs text-muted-foreground bg-gray-100 p-1 rounded">
                  No shifts scheduled
                </div>
              ) : (
                daySchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="text-xs bg-blue-100 text-blue-800 p-2 rounded border group relative"
                  >
                    <div className="font-medium">
                      {schedule.employee?.firstName} {schedule.employee?.lastName}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {schedule.startTime} - {schedule.endTime}
                    </div>
                    {schedule.position && (
                      <div className="text-xs opacity-75 mt-1">
                        {schedule.position}
                      </div>
                    )}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-blue-200"
                        onClick={() => handleEdit(schedule)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-red-200"
                        onClick={() => handleDelete(schedule.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderMonthView = () => {
    const eventsByDate = new Map();
    
    schedules.forEach(schedule => {
      const date = new Date(schedule.date).toDateString();
      if (!eventsByDate.has(date)) {
        eventsByDate.set(date, []);
      }
      eventsByDate.get(date).push(schedule);
    });

    const months = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }

    return (
      <div className="space-y-6">
        {months.map((month, monthIndex) => (
          <div key={monthIndex} className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">
              {month.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </h3>
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium p-2 text-muted-foreground">
                  {day}
                </div>
              ))}
              
              {(() => {
                const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
                const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
                const startPadding = firstDay.getDay();
                const days = [];
                
                // Add padding for days before month starts
                for (let i = 0; i < startPadding; i++) {
                  days.push(<div key={`pad-${i}`} className="p-2"></div>);
                }
                
                // Add days of the month
                for (let day = 1; day <= lastDay.getDate(); day++) {
                  const currentDate = new Date(month.getFullYear(), month.getMonth(), day);
                  const dateString = currentDate.toDateString();
                  const daySchedules = eventsByDate.get(dateString) || [];
                  const filteredDaySchedules = daySchedules.filter((schedule: WorkSchedule) =>
                    selectedLocation === "all" || schedule.locationId.toString() === selectedLocation
                  );
                  
                  days.push(
                    <div key={day} className="border rounded p-2 min-h-20 text-sm">
                      <div className="font-medium mb-1">{day}</div>
                      <div className="space-y-1">
                        {filteredDaySchedules.slice(0, 2).map((schedule: WorkSchedule, i: number) => (
                          <div key={i} className="text-xs bg-blue-100 text-blue-800 p-1 rounded truncate">
                            {schedule.employee?.firstName} {schedule.employee?.lastName}
                            <div className="text-xs opacity-75">
                              {schedule.startTime}-{schedule.endTime}
                            </div>
                          </div>
                        ))}
                        {filteredDaySchedules.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{filteredDaySchedules.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                
                return days;
              })()}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!canManageSchedules) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground">
                Only managers and admins can access shift scheduling.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Shift Scheduling
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage employee schedules across all locations
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* View Type Selector */}
          <Select value={viewType} onValueChange={(value: "week" | "month" | "3month" | "6month") => {
            setViewType(value);
            setSelectedWeek(0);
            setCurrentMonth(0);
          }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="3month">3 Months</SelectItem>
              <SelectItem value="6month">6 Months</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id.toString()}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingSchedule(null);
                form.reset();
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Shift
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingSchedule ? "Edit Shift" : "Schedule New Shift"}
                </DialogTitle>
                <DialogDescription>
                  {editingSchedule ? "Update shift details" : "Create a new shift for an employee"}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.firstName} {employee.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations.map((location) => (
                              <SelectItem key={location.id} value={location.id.toString()}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Cashier, Sales Associate" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createShiftMutation.isPending || updateShiftMutation.isPending}
                    >
                      {createShiftMutation.isPending || updateShiftMutation.isPending
                        ? "Saving..."
                        : editingSchedule
                        ? "Update Shift"
                        : "Schedule Shift"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Schedule Display */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{getViewTitle()}</CardTitle>
              <CardDescription>
                {selectedLocation === "all"
                  ? "Showing all locations"
                  : locations.find((l) => l.id.toString() === selectedLocation)?.name ||
                    "Selected location"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
              >
                Next
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderScheduleView()}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {locations.map((location) => {
          const locationSchedules = filteredSchedules.filter(
            (s) => s.locationId === location.id
          );
          
          return (
            <Card key={location.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {location.name}
                </CardTitle>
                <CardDescription>
                  {location.address}, {location.city}, {location.state}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {locationSchedules.length} shifts this week
                  </Badge>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Set(locationSchedules.map(s => s.userId)).size} employees scheduled
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}