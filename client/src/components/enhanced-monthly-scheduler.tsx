import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Plus, 
  Edit, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Download,
  StickyNote,
  Users2,
  Building
} from "lucide-react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek,
  isSameMonth,
  isToday,
  parseISO,
  isSameDay 
} from "date-fns";
import type { WorkSchedule, User as UserType, Location, CalendarNote } from "@shared/schema";

interface DraggedEmployee {
  employee: UserType;
  startTime: string;
  endTime: string;
  locationId: number;
}

interface ScheduleForDay {
  schedules: WorkSchedule[];
  notes: CalendarNote[];
}

export default function EnhancedMonthlyScheduler() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [draggedEmployee, setDraggedEmployee] = useState<DraggedEmployee | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [noteForm, setNoteForm] = useState({
    title: "",
    content: "",
    noteType: "general",
    locationId: 1
  });
  const [defaultShiftTimes, setDefaultShiftTimes] = useState({
    startTime: "09:00",
    endTime: "17:00"
  });

  // Calculate calendar dates
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/employees");
      return response.json();
    },
    enabled: !!user
  });

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/locations");
      return response.json();
    },
    enabled: !!user
  });

  // Fetch schedules for the month
  const { data: schedules = [] } = useQuery({
    queryKey: ["/api/work-schedules", format(calendarStart, "yyyy-MM-dd"), format(calendarEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/work-schedules?startDate=${format(calendarStart, "yyyy-MM-dd")}&endDate=${format(calendarEnd, "yyyy-MM-dd")}`);
      return response.json();
    },
    enabled: !!user
  });

  // Fetch calendar notes for the month
  const { data: calendarNotes = [] } = useQuery({
    queryKey: ["/api/calendar-notes", format(calendarStart, "yyyy-MM-dd"), format(calendarEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/calendar-notes?startDate=${format(calendarStart, "yyyy-MM-dd")}&endDate=${format(calendarEnd, "yyyy-MM-dd")}`);
      return response.json();
    },
    enabled: !!user
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: { userId: string; locationId: number; date: string; startTime: string; endTime: string }) => {
      const response = await apiRequest("POST", "/api/work-schedules", {
        userId: data.userId,
        locationId: data.locationId,
        date: data.date,
        startTime: `${data.date}T${data.startTime}:00`,
        endTime: `${data.date}T${data.endTime}:00`,
        createdBy: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      toast({
        title: "Schedule Created",
        description: "Employee shift has been scheduled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create schedule: " + error.message,
        variant: "destructive",
      });
    }
  });

  // Create calendar note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (data: { date: string; title: string; content: string; noteType: string; locationId: number }) => {
      const response = await apiRequest("POST", "/api/calendar-notes", {
        ...data,
        createdBy: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-notes"] });
      setIsNoteDialogOpen(false);
      setNoteForm({ title: "", content: "", noteType: "general", locationId: 1 });
      toast({
        title: "Note Added",
        description: "Calendar note has been added successfully.",
      });
    }
  });

  // PDF generation mutation
  const generatePDFMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/schedules/generate-pdf", {
        month: format(currentMonth, "yyyy-MM"),
        locationId: selectedLocation
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schedule-${format(currentMonth, "yyyy-MM")}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "PDF Generated",
        description: "Schedule PDF has been downloaded.",
      });
    }
  });

  // Get data for specific day
  const getDataForDay = (date: Date): ScheduleForDay => {
    const dateStr = format(date, "yyyy-MM-dd");
    const daySchedules = schedules.filter((schedule: WorkSchedule) => schedule.date === dateStr);
    const dayNotes = calendarNotes.filter((note: CalendarNote) => note.date === dateStr);
    
    // Filter by location if selected
    const filteredSchedules = selectedLocation 
      ? daySchedules.filter((s: WorkSchedule) => s.locationId === selectedLocation)
      : daySchedules;
    const filteredNotes = selectedLocation 
      ? dayNotes.filter((n: CalendarNote) => n.locationId === selectedLocation)
      : dayNotes;

    return { schedules: filteredSchedules, notes: filteredNotes };
  };

  // Employee card drag handlers
  const handleDragStart = (employee: UserType) => {
    setDraggedEmployee({
      employee,
      startTime: defaultShiftTimes.startTime,
      endTime: defaultShiftTimes.endTime,
      locationId: selectedLocation || 1
    });
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setDraggedEmployee(null);
    setIsDragging(false);
  };

  // Calendar day drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedEmployee) {
      createScheduleMutation.mutate({
        userId: draggedEmployee.employee.id,
        locationId: draggedEmployee.locationId,
        date: format(date, "yyyy-MM-dd"),
        startTime: draggedEmployee.startTime,
        endTime: draggedEmployee.endTime
      });
    }
    handleDragEnd();
  };

  // Note type styling
  const getNoteTypeStyle = (noteType: string) => {
    switch (noteType) {
      case "meeting":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "open_shifts":
        return "bg-green-100 text-green-800 border-green-200";
      case "closure":
        return "bg-red-100 text-red-800 border-red-200";
      case "event":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLocationName = (locationId: number) => {
    const location = locations.find((loc: Location) => loc.id === locationId);
    return location ? location.name : "Unknown";
  };

  const getEmployeeName = (userId: string) => {
    const employee = employees.find((emp: UserType) => emp.id === userId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown";
  };

  const formatTime = (timeString: string) => {
    try {
      const time = parseISO(timeString);
      return format(time, "HH:mm");
    } catch {
      return timeString;
    }
  };

  const handleAddNote = (date: Date) => {
    setSelectedDate(date);
    setNoteForm({
      title: "",
      content: "",
      noteType: "general",
      locationId: selectedLocation || 1
    });
    setIsNoteDialogOpen(true);
  };

  const activeEmployees = employees.filter((emp: UserType) => emp.isActive);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Monthly Schedule Manager</h1>
          <p className="text-muted-foreground">
            Drag employees onto calendar days to create shifts
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => generatePDFMutation.mutate()}
            disabled={generatePDFMutation.isPending}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold min-w-[200px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Select value={selectedLocation?.toString() || "all"} onValueChange={(value) => setSelectedLocation(value === "all" ? null : parseInt(value))}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Locations" />
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

        <div className="flex gap-2">
          <div className="flex items-center gap-1">
            <Label className="text-sm">Default Shift:</Label>
            <Input
              type="time"
              value={defaultShiftTimes.startTime}
              onChange={(e) => setDefaultShiftTimes({...defaultShiftTimes, startTime: e.target.value})}
              className="w-24"
            />
            <span>-</span>
            <Input
              type="time"
              value={defaultShiftTimes.endTime}
              onChange={(e) => setDefaultShiftTimes({...defaultShiftTimes, endTime: e.target.value})}
              className="w-24"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Employee Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users2 className="h-5 w-5" />
                Active Employees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeEmployees.map((employee: UserType) => (
                <div
                  key={employee.id}
                  draggable
                  onDragStart={() => handleDragStart(employee)}
                  onDragEnd={handleDragEnd}
                  className={`p-3 border rounded-lg cursor-move hover:bg-gray-50 transition-colors ${
                    isDragging ? 'opacity-50' : ''
                  }`}
                >
                  <div className="font-medium text-sm">
                    {employee.firstName} {employee.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {employee.department} • {employee.position}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {format(currentMonth, "MMMM yyyy")} Schedule
                </span>
                {selectedLocation && (
                  <Badge variant="outline">
                    <Building className="h-3 w-3 mr-1" />
                    {getLocationName(selectedLocation)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="p-2 text-center font-medium text-sm bg-gray-50 rounded">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dayData = getDataForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isCurrentDay = isToday(day);
                  
                  return (
                    <div
                      key={day.toISOString()}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day)}
                      className={`
                        min-h-[120px] p-2 border rounded-lg relative
                        ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                        ${isCurrentDay ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                        ${isDragging ? 'border-dashed border-green-400 bg-green-50' : ''}
                        hover:border-gray-300 transition-colors
                      `}
                    >
                      {/* Date Number */}
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-sm font-medium ${
                          isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                        } ${isCurrentDay ? 'text-blue-600 font-bold' : ''}`}>
                          {format(day, "d")}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleAddNote(day)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Calendar Notes */}
                      {dayData.notes.map((note: CalendarNote) => (
                        <div
                          key={note.id}
                          className={`text-xs p-1 rounded mb-1 border ${getNoteTypeStyle(note.noteType)}`}
                        >
                          <div className="font-semibold">{note.title}</div>
                          {note.content && (
                            <div className="truncate">{note.content}</div>
                          )}
                        </div>
                      ))}

                      {/* Scheduled Shifts */}
                      {dayData.schedules.map((schedule: WorkSchedule) => (
                        <div
                          key={schedule.id}
                          className="text-xs p-1 bg-blue-100 border border-blue-200 rounded mb-1"
                        >
                          <div className="font-medium text-blue-800">
                            {getEmployeeName(schedule.userId)}
                          </div>
                          <div className="text-blue-600">
                            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                          </div>
                          {!selectedLocation && schedule.locationId && (
                            <div className="text-blue-500 text-xs">
                              {getLocationName(schedule.locationId)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Calendar Note</DialogTitle>
            <DialogDescription>
              Add a note for {selectedDate && format(selectedDate, "MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Note Type</Label>
              <Select value={noteForm.noteType} onValueChange={(value) => setNoteForm({...noteForm, noteType: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="meeting">Staff Meeting</SelectItem>
                  <SelectItem value="open_shifts">Open Shifts</SelectItem>
                  <SelectItem value="closure">Closure</SelectItem>
                  <SelectItem value="event">Special Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={noteForm.title}
                onChange={(e) => setNoteForm({...noteForm, title: e.target.value})}
                placeholder="e.g., STAFF MEETING"
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm({...noteForm, content: e.target.value})}
                placeholder="Additional details..."
              />
            </div>
            <div>
              <Label>Location</Label>
              <Select value={noteForm.locationId.toString()} onValueChange={(value) => setNoteForm({...noteForm, locationId: parseInt(value)})}>
                <SelectTrigger>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedDate && createNoteMutation.mutate({
                date: format(selectedDate, "yyyy-MM-dd"),
                ...noteForm
              })}
              disabled={!noteForm.title}
            >
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}