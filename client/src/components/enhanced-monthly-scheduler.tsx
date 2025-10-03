import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Building,
  Trash2,
  Palette,
  MessageSquare,
  MessageSquareOff,
  Play,
  Pause,
  RefreshCw
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
  isSameDay,
  addDays,
  addWeeks,
  subWeeks
} from "date-fns";
import type { WorkSchedule, User as UserType, Location, CalendarNote } from "@shared/schema";
import ShiftSwapMarketplace from "./shift-swap-marketplace";
import UserAvatar from "./user-avatar";
import TimeOffManager from "./time-off-manager";

interface DraggedEmployee {
  employee: UserType;
  startTime: string;
  endTime: string;
  locationId: number;
}

interface ScheduleForDay {
  schedules: WorkSchedule[];
  notes: CalendarNote[];
  timeOff: any[];
}

export default function EnhancedMonthlyScheduler() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [draggedEmployee, setDraggedEmployee] = useState<DraggedEmployee | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState("schedule");
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [noteForm, setNoteForm] = useState({
    title: "",
    content: "",
    noteType: "general",
    locationId: 1
  });

  const [employeeColorForm, setEmployeeColorForm] = useState({
    color: "#3b82f6"
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<WorkSchedule | null>(null);
  const [selectedEmployeeShifts, setSelectedEmployeeShifts] = useState<WorkSchedule[]>([]);
  const [selectedEditDate, setSelectedEditDate] = useState<Date | null>(null);
  const [editForm, setEditForm] = useState({
    startTime: "",
    endTime: "",
    locationId: 1
  });
  const [isAddingShift, setIsAddingShift] = useState(false);
  const [defaultShiftTimes, setDefaultShiftTimes] = useState({
    startTime: "09:00",
    endTime: "17:00"
  });
  
  // SMS Control State
  const [showSMSSummaryOption, setShowSMSSummaryOption] = useState(false);
  
  // Team Schedule State
  const [selectedTeamDay, setSelectedTeamDay] = useState<Date>(new Date());
  const [teamWeekStart, setTeamWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  
  // Schedule View State (for employees)
  const [showCalendarView, setShowCalendarView] = useState(false);

  // Team Schedule Scroll Detection
  const teamScheduleScrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollYRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

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

  // Fetch schedules for the month (filter by user for employees)
  const { data: schedules = [] } = useQuery({
    queryKey: ["/api/work-schedules", format(calendarStart, "yyyy-MM-dd"), format(calendarEnd, "yyyy-MM-dd"), user?.role === 'employee' ? user.id : 'all'],
    queryFn: async () => {
      const url = user?.role === 'employee' 
        ? `/api/work-schedules?startDate=${format(calendarStart, "yyyy-MM-dd")}&endDate=${format(calendarEnd, "yyyy-MM-dd")}&userId=${user.id}`
        : `/api/work-schedules?startDate=${format(calendarStart, "yyyy-MM-dd")}&endDate=${format(calendarEnd, "yyyy-MM-dd")}`;
      const response = await apiRequest("GET", url);
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

  // Fetch approved time off requests for calendar display
  const { data: approvedTimeOff = [] } = useQuery({
    queryKey: ["/api/time-off-requests/approved", format(calendarStart, "yyyy-MM-dd"), format(calendarEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/time-off-requests/approved?startDate=${format(calendarStart, "yyyy-MM-dd")}&endDate=${format(calendarEnd, "yyyy-MM-dd")}`);
      return response.json();
    },
    enabled: !!user
  });

  // Fetch all team schedules (for Team Schedule tab - employees only)
  const { data: teamSchedules = [] } = useQuery({
    queryKey: ["/api/work-schedules/team", format(calendarStart, "yyyy-MM-dd"), format(calendarEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/work-schedules?startDate=${format(calendarStart, "yyyy-MM-dd")}&endDate=${format(calendarEnd, "yyyy-MM-dd")}`);
      return response.json();
    },
    enabled: !!user && user?.role === 'employee'
  });

  // Team Schedule Scroll Navigation
  useEffect(() => {
    const scrollContainer = teamScheduleScrollRef.current;
    if (!scrollContainer || activeTab !== 'team-schedule') return;

    const handleDayNavigation = (direction: 'next' | 'prev') => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const newDay = direction === 'next' 
          ? addDays(selectedTeamDay, 1) 
          : addDays(selectedTeamDay, -1);
        
        setSelectedTeamDay(newDay);
        
        // Update week if we've scrolled outside current week
        const weekStart = startOfWeek(newDay, { weekStartsOn: 0 });
        if (!isSameDay(weekStart, teamWeekStart)) {
          setTeamWeekStart(weekStart);
        }
      }, 150);
    };

    // Handle wheel scroll (desktop)
    const handleWheel = (e: WheelEvent) => {
      const currentScroll = scrollContainer.scrollTop;
      const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      
      // Check if we're at the top or bottom and trying to scroll further
      if (e.deltaY > 0 && currentScroll >= maxScroll - 5) {
        // Scrolling down at bottom - go to next day
        e.preventDefault();
        handleDayNavigation('next');
      } else if (e.deltaY < 0 && currentScroll <= 5) {
        // Scrolling up at top - go to previous day
        e.preventDefault();
        handleDayNavigation('prev');
      }
    };

    // Handle touch scroll (mobile)
    const handleTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentScroll = scrollContainer.scrollTop;
      const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      const touchY = e.touches[0].clientY;
      const touchDelta = touchStartYRef.current - touchY;

      // Swiping up (scrolling down) at bottom
      if (touchDelta > 0 && currentScroll >= maxScroll - 5) {
        e.preventDefault();
        handleDayNavigation('next');
      } 
      // Swiping down (scrolling up) at top
      else if (touchDelta < 0 && currentScroll <= 5) {
        e.preventDefault();
        handleDayNavigation('prev');
      }
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel);
      scrollContainer.removeEventListener('touchstart', handleTouchStart);
      scrollContainer.removeEventListener('touchmove', handleTouchMove);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [selectedTeamDay, teamWeekStart, activeTab]);

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

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (data: { id: number; userId: string; locationId: number; date: string; startTime: string; endTime: string }) => {
      const response = await apiRequest("PUT", `/api/admin/work-schedules/${data.id}`, {
        userId: data.userId,
        locationId: data.locationId,
        date: data.date,
        startTime: `${data.date}T${data.startTime}:00`,
        endTime: `${data.date}T${data.endTime}:00`,
        updatedBy: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Schedule Updated",
        description: "Employee shift has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update schedule: " + error.message,
        variant: "destructive",
      });
    }
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/work-schedules/${scheduleId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Schedule Removed",
        description: "Employee has been removed from this shift.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to remove schedule: " + error.message,
        variant: "destructive",
      });
    }
  });

  // Update employee color mutation
  const updateEmployeeColorMutation = useMutation({
    mutationFn: async ({ employeeId, color }: { employeeId: string, color: string }) => {
      return apiRequest("PATCH", `/api/employees/${employeeId}`, { displayColor: color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ 
        title: "Employee color updated", 
        description: "The employee's display color has been updated." 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update color", 
        description: error.message,
        variant: "destructive" 
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
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schedule-${format(currentMonth, "yyyy-MM")}.pdf`;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up the URL after a short delay
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    },
    onSuccess: () => {
      toast({
        title: "PDF Generated",
        description: "Schedule PDF has been downloaded.",
      });
    },
    onError: (error: any) => {
      console.error("PDF generation failed:", error);
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Check if user is employee for role-based view
  const isEmployee = user?.role === 'employee';
  
  // SMS Status Query with manual control
  const [manualSMSStatus, setManualSMSStatus] = useState<any>(null);
  const [manualSMSLoading, setManualSMSLoading] = useState(false);

  const fetchSMSStatus = async () => {
    if (isEmployee || !user || (user.role !== 'admin' && user.role !== 'manager')) {
      return;
    }
    
    try {
      setManualSMSLoading(true);
      if (process.env.NODE_ENV === 'development') {
        console.log('Manually fetching SMS status...');
      }
      const response = await fetch('/api/sms/status', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (process.env.NODE_ENV === 'development') {
        console.log('SMS Status Response:', data);
      }
      setManualSMSStatus(data);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Manual SMS Status Error:', error);
      }
      setManualSMSStatus(null);
    } finally {
      setManualSMSLoading(false);
    }
  };

  // Fetch status on component mount and when user changes
  useEffect(() => {
    fetchSMSStatus();
  }, [user?.id, isEmployee]);

  // Auto-refresh status every 5 seconds
  useEffect(() => {
    if (isEmployee || !user || (user.role !== 'admin' && user.role !== 'manager')) {
      return;
    }
    
    const interval = setInterval(fetchSMSStatus, 5000);
    return () => clearInterval(interval);
  }, [user?.id, isEmployee]);

  // SMS Status logging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('SMS Status Debug:', {
      isEmployee,
      user: !!user,
      userRole: user?.role,
      manualSMSStatus,
      manualSMSLoading,
      isPaused: manualSMSStatus?.status?.isPaused
    });
  }

  // SMS Control Mutations
  const pauseSMSMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/sms/pause');
    },
    onSuccess: () => {
      fetchSMSStatus(); // Force immediate refetch
      toast({
        title: "SMS Paused",
        description: "SMS notifications are now paused for bulk schedule entry",
      });
    },
    onError: (error: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Pause SMS Error:', error);
      }
      // If SMS is already paused, just refresh status instead of showing error
      if (error.message?.includes('already paused')) {
        fetchSMSStatus();
        toast({
          title: "SMS Already Paused",
          description: "SMS notifications are already paused for bulk schedule entry",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to pause SMS notifications",
          variant: "destructive"
        });
      }
    }
  });

  const resumeSMSMutation = useMutation({
    mutationFn: async (sendSummary: boolean) => {
      return await apiRequest('POST', '/api/sms/resume', { sendSummary });
    },
    onSuccess: (data: any) => {
      fetchSMSStatus(); // Force immediate refetch
      setShowSMSSummaryOption(false);
      toast({
        title: "SMS Resumed",
        description: data?.summary ? `SMS notifications resumed. ${data.summary.sent} notifications sent.` : "SMS notifications resumed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to resume SMS notifications",
        variant: "destructive"
      });
    }
  });

  const handleSMSToggle = () => {
    if (manualSMSStatus?.status?.isPaused) {
      setShowSMSSummaryOption(true);
    } else {
      pauseSMSMutation.mutate();
    }
  };

  const handleSMSResume = (sendSummary: boolean) => {
    resumeSMSMutation.mutate(sendSummary);
  };

  // Get data for specific day
  const getDataForDay = (date: Date): ScheduleForDay => {
    const dateStr = format(date, "yyyy-MM-dd");
    const daySchedules = schedules.filter((schedule: WorkSchedule) => schedule.date === dateStr);
    const dayNotes = calendarNotes.filter((note: CalendarNote) => note.date === dateStr);
    
    // Filter time off requests that overlap with this date
    const dayTimeOff = approvedTimeOff.filter((timeOff: any) => {
      const startDate = new Date(timeOff.startDate);
      const endDate = new Date(timeOff.endDate);
      const currentDate = new Date(dateStr);
      return currentDate >= startDate && currentDate <= endDate;
    });
    
    // Filter by location if selected
    const filteredSchedules = selectedLocation 
      ? daySchedules.filter((s: WorkSchedule) => s.locationId === selectedLocation)
      : daySchedules;
    const filteredNotes = selectedLocation 
      ? dayNotes.filter((n: CalendarNote) => n.locationId === selectedLocation)
      : dayNotes;

    return { schedules: filteredSchedules, notes: filteredNotes, timeOff: dayTimeOff };
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
      const dateStr = format(date, "yyyy-MM-dd");
      const existingShifts = schedules.filter((s: WorkSchedule) => 
        s.userId === draggedEmployee.employee.id && s.date === dateStr
      );

      if (existingShifts.length > 0) {
        // Employee already has shift(s) on this day - ask if they want to add another
        if (confirm(`${draggedEmployee.employee.firstName} ${draggedEmployee.employee.lastName} already has ${existingShifts.length} shift${existingShifts.length > 1 ? 's' : ''} on this day. Add another shift?`)) {
          createScheduleMutation.mutate({
            userId: draggedEmployee.employee.id,
            locationId: draggedEmployee.locationId,
            date: dateStr,
            startTime: draggedEmployee.startTime,
            endTime: draggedEmployee.endTime
          });
        }
      } else {
        // No existing shifts - create new one
        createScheduleMutation.mutate({
          userId: draggedEmployee.employee.id,
          locationId: draggedEmployee.locationId,
          date: dateStr,
          startTime: draggedEmployee.startTime,
          endTime: draggedEmployee.endTime
        });
      }
    }
    handleDragEnd();
  };

  // Note type styling
  const getNoteTypeStyle = (noteType: string | null) => {
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

  const getLocationAbbreviation = (locationId: number): string => {
    const location = locations.find((loc: Location) => loc.id === locationId);
    if (!location) return 'UNK';
    
    // Store name abbreviations for space optimization
    switch (location.name) {
      case 'Lake Geneva Retail':
        return 'LGR';
      case 'Watertown Retail':
        return 'WTR';
      case 'Watertown Spa':
        return 'WTSPA';
      case 'Amazon Store':
        return 'online';
      default:
        // Fallback: first 4 characters or custom abbreviation
        return location.name.length > 4 ? location.name.substring(0, 4).toUpperCase() : location.name.toUpperCase();
    }
  };

  const getEmployeeName = (userId: string) => {
    const employee = employees.find((emp: UserType) => emp.id === userId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown";
  };

  const getEmployeeColor = (userId: string) => {
    const employee = employees.find((emp: UserType) => emp.id === userId);
    return employee?.displayColor || "#3b82f6";
  };

  const getEmployeeData = (userId: string) => {
    return employees.find((emp: UserType) => emp.id === userId);
  };

  const formatTime = (timeString: string) => {
    try {
      const time = parseISO(timeString);
      return format(time, "h:mm a");
    } catch {
      return timeString;
    }
  };

  const formatCompactTime = (timeString: string) => {
    try {
      const time = parseISO(timeString);
      return format(time, "h a").replace(' ', '').toLowerCase();
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

  const handleEditSchedule = (schedule: WorkSchedule) => {
    setSelectedSchedule(schedule);
    const scheduleDate = parseISO(schedule.date);
    setSelectedEditDate(scheduleDate);
    
    // Get all shifts for this employee on this day
    const employeeShiftsThisDay = schedules.filter((s: WorkSchedule) => 
      s.userId === schedule.userId && s.date === schedule.date
    ).sort((a: WorkSchedule, b: WorkSchedule) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
    
    setSelectedEmployeeShifts(employeeShiftsThisDay);
    
    const startHour = parseISO(schedule.startTime).getHours();
    const endHour = parseISO(schedule.endTime).getHours();
    const startMinute = parseISO(schedule.startTime).getMinutes();
    const endMinute = parseISO(schedule.endTime).getMinutes();
    
    setEditForm({
      startTime: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
      endTime: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
      locationId: schedule.locationId || 1
    });
    
    // Set employee color form with current color
    const employeeData = getEmployeeData(schedule.userId);
    setEmployeeColorForm({
      color: employeeData?.displayColor || "#3b82f6"
    });
    
    setIsAddingShift(false);
    setIsEditDialogOpen(true);
  };

  const handleUpdateEmployeeColor = () => {
    if (selectedSchedule) {
      updateEmployeeColorMutation.mutate({
        employeeId: selectedSchedule.userId,
        color: employeeColorForm.color
      });
    }
  };

  const handleUpdateSchedule = () => {
    if (selectedSchedule) {
      updateScheduleMutation.mutate({
        id: selectedSchedule.id,
        userId: selectedSchedule.userId,
        locationId: editForm.locationId,
        date: selectedSchedule.date,
        startTime: editForm.startTime,
        endTime: editForm.endTime
      });
    }
  };

  const handleRemoveEmployee = () => {
    if (selectedSchedule) {
      deleteScheduleMutation.mutate(selectedSchedule.id);
    }
  };

  const handleAddAnotherShift = () => {
    setIsAddingShift(true);
    setSelectedSchedule(null);
    setEditForm({
      startTime: "17:00",
      endTime: "19:00",
      locationId: 1
    });
  };

  const handleCreateAdditionalShift = () => {
    if (selectedEmployeeShifts.length > 0 && selectedEditDate) {
      createScheduleMutation.mutate({
        userId: selectedEmployeeShifts[0].userId,
        locationId: editForm.locationId,
        date: format(selectedEditDate, "yyyy-MM-dd"),
        startTime: editForm.startTime,
        endTime: editForm.endTime
      });
    }
  };

  const activeEmployees = employees.filter((emp: UserType) => emp.isActive);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {isEmployee ? 'My Schedule' : 'Monthly Schedule Manager'}
          </h1>
          <p className="text-muted-foreground">
            {isEmployee 
              ? 'View your schedule, request time off, and manage shift swaps' 
              : 'Drag employees onto calendar days to create shifts'
            }
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

        {!isEmployee && (
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Default Shift:</Label>
              <Input
                type="time"
                value={defaultShiftTimes.startTime}
                onChange={(e) => setDefaultShiftTimes({...defaultShiftTimes, startTime: e.target.value})}
                className="w-28"
              />
              <span className="text-sm">-</span>
              <Input
                type="time"
                value={defaultShiftTimes.endTime}
                onChange={(e) => setDefaultShiftTimes({...defaultShiftTimes, endTime: e.target.value})}
                className="w-28"
              />
            </div>
            
            {/* SMS Control Toggle */}
            <div className="flex items-center gap-2 border-l pl-4">
              <Label className="text-sm whitespace-nowrap flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                SMS:
              </Label>
              <Button
                variant={manualSMSStatus?.status?.isPaused ? "secondary" : "outline"}
                size="sm"
                onClick={handleSMSToggle}
                disabled={pauseSMSMutation.isPending || resumeSMSMutation.isPending || manualSMSLoading}
                className="h-8"
              >
                {manualSMSLoading ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Loading...
                  </>
                ) : manualSMSStatus?.status?.isPaused ? (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Pause
                  </>
                )}
              </Button>
              {manualSMSStatus?.status?.isPaused && (
                <Badge variant="secondary" className="text-xs">
                  Paused
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs for Schedule and Shift Swaps */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Mobile Dropdown Navigation */}
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {activeTab === 'schedule' && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule
                  </div>
                )}
                {activeTab === 'team-schedule' && (
                  <div className="flex items-center gap-2">
                    <Users2 className="h-4 w-4" />
                    Team Schedule
                  </div>
                )}
                {activeTab === 'shift-swaps' && (
                  <div className="flex items-center gap-2">
                    <Users2 className="h-4 w-4" />
                    Shift Swaps
                  </div>
                )}
                {activeTab === 'time-off' && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time Off
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="schedule">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule
                </div>
              </SelectItem>
              {isEmployee && (
                <SelectItem value="team-schedule">
                  <div className="flex items-center gap-2">
                    <Users2 className="h-4 w-4" />
                    Team Schedule
                  </div>
                </SelectItem>
              )}
              <SelectItem value="shift-swaps">
                <div className="flex items-center gap-2">
                  <Users2 className="h-4 w-4" />
                  Shift Swaps
                </div>
              </SelectItem>
              <SelectItem value="time-off">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Off
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop Tab Navigation */}
        <TabsList className={`hidden md:grid w-full max-w-2xl ${isEmployee ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          {isEmployee && (
            <TabsTrigger value="team-schedule" className="flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              Team Schedule
            </TabsTrigger>
          )}
          <TabsTrigger value="shift-swaps" className="flex items-center gap-2">
            <Users2 className="h-4 w-4" />
            Shift Swaps
          </TabsTrigger>
          <TabsTrigger value="time-off" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Off
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          {/* Employee List View - Mobile First */}
          {isEmployee && !showCalendarView && (
            <div className="space-y-6">
              {/* Greeting */}
              <div className="flex items-center gap-4">
                <UserAvatar 
                  user={user} 
                  size="lg"
                />
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},
                  </h2>
                  <p className="text-xl text-slate-700">{user?.firstName}.</p>
                </div>
              </div>

              {/* Status Message */}
              {(() => {
                const today = format(new Date(), 'yyyy-MM-dd');
                const todaySchedules = schedules.filter((s: WorkSchedule) => s.date === today);
                const todayTimeOff = approvedTimeOff.filter((t: any) => t.startDate === today);
                
                if (todayTimeOff.length > 0) {
                  return (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-6">
                        <h3 className="text-2xl font-semibold text-slate-900">
                          You have the day off—stay safe!
                        </h3>
                      </CardContent>
                    </Card>
                  );
                } else if (todaySchedules.length > 0) {
                  const firstShift = todaySchedules[0];
                  const location = locations.find((loc: Location) => loc.id === firstShift.locationId);
                  return (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-6">
                        <h3 className="text-2xl font-semibold text-slate-900">
                          You're working today at {location?.name}
                        </h3>
                      </CardContent>
                    </Card>
                  );
                }
                return null;
              })()}

              {/* Upcoming Shifts */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">Your upcoming shifts</CardTitle>
                    <Button 
                      variant="link" 
                      className="text-farm-green hover:text-farm-green/80"
                      onClick={() => setShowCalendarView(true)}
                    >
                      View all
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const today = new Date();
                    const upcomingSchedules = schedules
                      .filter((s: WorkSchedule) => new Date(s.date) >= today)
                      .sort((a: WorkSchedule, b: WorkSchedule) => 
                        new Date(a.date).getTime() - new Date(b.date).getTime()
                      )
                      .slice(0, 5);
                    
                    if (upcomingSchedules.length === 0) {
                      return (
                        <p className="text-slate-500 text-center py-8">No upcoming shifts scheduled</p>
                      );
                    }
                    
                    return upcomingSchedules.map((schedule: WorkSchedule) => {
                      const scheduleDate = new Date(schedule.date);
                      const location = locations.find((loc: Location) => loc.id === schedule.locationId);
                      
                      return (
                        <div key={schedule.id} className="flex gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="text-center min-w-[60px]">
                            <div className="text-sm font-medium text-farm-green">
                              {format(scheduleDate, 'EEE').toUpperCase()}
                            </div>
                            <div className="text-3xl font-bold text-slate-900">
                              {format(scheduleDate, 'd')}
                            </div>
                            <div className="text-xs text-slate-500">
                              {format(scheduleDate, 'MMM').toUpperCase()}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-lg font-semibold text-slate-900">
                              {formatTime(schedule.startTime)} – {formatTime(schedule.endTime)}
                            </div>
                            <div className="text-base text-slate-700">
                              {location?.name || 'Unknown Location'}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: location?.displayColor || '#10b981' }}
                              ></div>
                              <span className="text-sm text-slate-500">
                                {location?.address || ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Employee Panel - Only show for admins/managers */}
          {!isEmployee && (
            <div className="mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users2 className="h-5 w-5" />
                    Active Employees (Drag to schedule)
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[200px] overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                    {activeEmployees.map((employee: UserType) => (
                      <div
                        key={employee.id}
                        draggable
                        onDragStart={() => handleDragStart(employee)}
                        onDragEnd={handleDragEnd}
                        className={`p-2 border rounded-lg cursor-move hover:bg-gray-50 transition-colors text-center ${
                          isDragging ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="font-medium text-xs">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {employee.department}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

      {/* Calendar Grid - Show for managers/admins always, or employees when they click View All */}
      {(!isEmployee || showCalendarView) && (
      <div className="w-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {format(currentMonth, "MMMM yyyy")} Schedule
                </span>
                <div className="flex items-center gap-2">
                  {isEmployee && showCalendarView && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCalendarView(false)}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back to List
                    </Button>
                  )}
                  {selectedLocation && (
                    <Badge variant="outline">
                      <Building className="h-3 w-3 mr-1" />
                      {getLocationName(selectedLocation)}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-2 mb-3">
                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                  <div key={day} className="p-3 text-center font-semibold text-sm bg-gray-100 rounded-lg">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const dayData = getDataForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isCurrentDay = isToday(day);
                  
                  return (
                    <div
                      key={day.toISOString()}
                      {...(!isEmployee && {
                        onDragOver: handleDragOver,
                        onDrop: (e: React.DragEvent) => handleDrop(e, day)
                      })}
                      className={`
                        min-h-[140px] p-2 border rounded-lg relative
                        ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                        ${isCurrentDay ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                        ${!isEmployee && isDragging ? 'border-dashed border-green-400 bg-green-50' : ''}
                        ${!isEmployee ? 'hover:border-gray-300' : ''} transition-colors
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
                          className="h-5 w-5 p-0"
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
                          <div className="font-semibold truncate">{note.title}</div>
                          {note.content && (
                            <div className="text-xs truncate">{note.content}</div>
                          )}
                        </div>
                      ))}

                      {/* Scheduled Shifts - Group by employee */}
                      {(() => {
                        // Group schedules by employee
                        const employeeGroups = dayData.schedules.reduce((groups: { [key: string]: WorkSchedule[] }, schedule: WorkSchedule) => {
                          if (!groups[schedule.userId]) {
                            groups[schedule.userId] = [];
                          }
                          groups[schedule.userId].push(schedule);
                          return groups;
                        }, {});

                        return Object.entries(employeeGroups).map(([userId, employeeSchedules]) => {
                          // Sort schedules by start time
                          const sortedSchedules = employeeSchedules.sort((a: WorkSchedule, b: WorkSchedule) => 
                            parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()
                          );
                          
                          const hasMultipleShifts = sortedSchedules.length > 1;

                          return (
                            <div key={userId} className="mb-1 space-y-1">
                              {sortedSchedules.map((schedule, index) => (
                                <div
                                  key={schedule.id}
                                  className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-colors"
                                  style={{ 
                                    backgroundColor: `${getEmployeeColor(userId)}20`,
                                    borderColor: getEmployeeColor(userId),
                                    borderWidth: '1px',
                                    borderStyle: 'solid'
                                  }}
                                  onClick={() => handleEditSchedule(schedule)}
                                >
                                  <div className="font-medium text-blue-800 flex items-center justify-between">
                                    {index === 0 ? getEmployeeName(userId) : ""}
                                    <Edit className="h-3 w-3" />
                                  </div>
                                  <div className="text-blue-600 text-xs">
                                    {formatCompactTime(schedule.startTime)}-{formatCompactTime(schedule.endTime)}
                                    {!selectedLocation && schedule.locationId && (
                                      <span className="text-blue-500 ml-1">
                                        • {getLocationAbbreviation(schedule.locationId)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        });
                      })()}

                      {/* Display Time Off Requests */}
                      {dayData.timeOff.map((timeOff: any) => (
                        <div
                          key={`timeoff-${timeOff.id}`}
                          className="text-xs p-1 rounded border border-orange-200 bg-orange-50 mb-1"
                        >
                          <div className="font-medium text-orange-800 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeOff.user ? `${timeOff.user.firstName} ${timeOff.user.lastName}` : 'Time Off'}
                          </div>
                          <div className="text-orange-600 text-xs">
                            Time Off
                            {timeOff.reason && (
                              <span className="text-orange-500 ml-1">• {timeOff.reason}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
      </div>
      )}

      {/* Add Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Calendar Note</DialogTitle>
            <DialogDescription>
              Add a note for {selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}
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

      {/* Edit Schedule Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isAddingShift ? "Add Another Shift" : "Edit Shift Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployeeShifts.length > 0 && selectedEditDate && (
                <>
                  {isAddingShift ? "Adding new shift for" : "Managing shifts for"} {getEmployeeName(selectedEmployeeShifts[0]?.userId || "")} on {selectedEditDate ? format(selectedEditDate, "MMMM d, yyyy") : ""}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {/* Show existing shifts for this employee/day */}
          {!isAddingShift && selectedEmployeeShifts.length > 1 && (
            <div className="mb-4">
              <Label className="text-sm font-medium">All shifts today:</Label>
              <div className="space-y-2 mt-2">
                {selectedEmployeeShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className={`p-2 border rounded-lg text-sm ${
                      selectedSchedule?.id === shift.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                      </span>
                      <span className="text-muted-foreground">
                        {getLocationAbbreviation(shift.locationId || 1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={editForm.startTime}
                  onChange={(e) => setEditForm({...editForm, startTime: e.target.value})}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm({...editForm, endTime: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <Select value={editForm.locationId.toString()} onValueChange={(value) => setEditForm({...editForm, locationId: parseInt(value)})}>
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
            
            {/* Employee Color Picker - Only for Managers/Admins */}
            {!isAddingShift && selectedSchedule && user && (user.role === 'manager' || user.role === 'admin') && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-gray-500" />
                    <Label className="text-sm">Employee Display Color</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded border-2 cursor-pointer"
                      style={{ backgroundColor: employeeColorForm.color }}
                    />
                    <Input
                      type="color"
                      value={employeeColorForm.color}
                      onChange={(e) => setEmployeeColorForm({ color: e.target.value })}
                      className="w-16 h-8 p-0 border-0"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUpdateEmployeeColor}
                      disabled={updateEmployeeColorMutation.isPending}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              {!isAddingShift && selectedSchedule && (
                <Button 
                  variant="destructive" 
                  onClick={handleRemoveEmployee}
                  disabled={deleteScheduleMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Shift
                </Button>
              )}
              {!isAddingShift && selectedEmployeeShifts.length >= 1 && (
                <Button 
                  variant="outline"
                  onClick={handleAddAnotherShift}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Shift
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              {isAddingShift ? (
                <Button 
                  onClick={handleCreateAdditionalShift}
                  disabled={createScheduleMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Shift
                </Button>
              ) : (
                <Button 
                  onClick={handleUpdateSchedule}
                  disabled={updateScheduleMutation.isPending}
                >
                  Update Shift
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="team-schedule" className="space-y-4">
          {/* Team Schedule View for Employees - List Design */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">
                    {format(teamWeekStart, "MMMM yyyy")}
                  </CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newWeekStart = subWeeks(teamWeekStart, 1);
                      setTeamWeekStart(newWeekStart);
                      setSelectedTeamDay(newWeekStart);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newWeekStart = addWeeks(teamWeekStart, 1);
                      setTeamWeekStart(newWeekStart);
                      setSelectedTeamDay(newWeekStart);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Horizontal Week View */}
              <div className="flex justify-between gap-2 overflow-x-auto pb-2">
                {[...Array(7)].map((_, index) => {
                  const day = addDays(teamWeekStart, index);
                  const dateStr = format(day, "yyyy-MM-dd");
                  const daySchedules = teamSchedules.filter((s: WorkSchedule) => s.date === dateStr);
                  const isDayToday = isToday(day);
                  const isSelected = isSameDay(day, selectedTeamDay);
                  const hasSchedules = daySchedules.length > 0;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedTeamDay(day)}
                      className={`flex-1 min-w-[70px] p-3 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-farm-green text-white border-farm-green shadow-md"
                          : isDayToday
                          ? "border-farm-green bg-green-50 text-farm-green"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`text-xs font-medium mb-1 ${
                        isSelected ? "text-white" : "text-slate-600"
                      }`}>
                        {format(day, "EEE")}
                      </div>
                      <div className={`text-2xl font-bold ${
                        isSelected ? "text-white" : isDayToday ? "text-farm-green" : "text-slate-900"
                      }`}>
                        {format(day, "d")}
                      </div>
                      {hasSchedules && !isSelected && (
                        <div className="flex justify-center mt-1">
                          <div className="w-1 h-1 rounded-full bg-farm-green"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Header */}
              <div className="pt-2 border-t">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  {format(selectedTeamDay, "EEEE")}
                </h3>
                <p className="text-2xl font-bold text-farm-green mb-4">
                  {format(selectedTeamDay, "d")}
                </p>
              </div>

              {/* Employee List for Selected Day */}
              <div ref={teamScheduleScrollRef} className="space-y-3 max-h-[500px] overflow-y-auto">
                {(() => {
                  const dateStr = format(selectedTeamDay, "yyyy-MM-dd");
                  const daySchedules = teamSchedules.filter((s: WorkSchedule) => s.date === dateStr);
                  
                  if (daySchedules.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-400">
                        <Users2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No team members scheduled for this day</p>
                      </div>
                    );
                  }
                  
                  return daySchedules.map((schedule: WorkSchedule, idx: number) => {
                    const employee = employees.find((emp: UserType) => emp.id === schedule.userId);
                    const location = locations.find((loc: Location) => loc.id === schedule.locationId);
                    
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        {/* Avatar */}
                        <UserAvatar 
                          user={employee} 
                          size="md"
                        />
                        
                        {/* Employee Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 truncate">
                            {employee?.firstName || 'Unknown'} {employee?.lastName || ''}
                          </h4>
                          <p className="text-sm text-slate-600">
                            {formatTime(schedule.startTime)} – {formatTime(schedule.endTime)}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: location?.displayColor || '#10b981' }}
                            />
                            <span className="text-xs text-slate-500">
                              {location?.name || 'Unknown Location'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shift-swaps" className="space-y-6">
          <ShiftSwapMarketplace />
        </TabsContent>
        
        <TabsContent value="time-off" className="space-y-6">
          <TimeOffManager />
        </TabsContent>
      </Tabs>

      {/* SMS Summary Options Dialog */}
      <Dialog open={showSMSSummaryOption} onOpenChange={setShowSMSSummaryOption}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Resume SMS Notifications
          </DialogTitle>
          <DialogDescription>
            SMS notifications are currently paused. How would you like to resume?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            <Button
              onClick={() => handleSMSResume(true)}
              disabled={resumeSMSMutation.isPending}
              className="w-full justify-start h-auto p-4"
              variant="outline"
            >
              <div className="text-left">
                <div className="font-semibold">Resume with Summary</div>
                <div className="text-sm text-muted-foreground">
                  Send one summary message about all schedule changes
                </div>
              </div>
            </Button>
            <Button
              onClick={() => handleSMSResume(false)}
              disabled={resumeSMSMutation.isPending}
              className="w-full justify-start h-auto p-4"
              variant="outline"
            >
              <div className="text-left">
                <div className="font-semibold">Resume Silently</div>
                <div className="text-sm text-muted-foreground">
                  Resume notifications without sending queued messages
                </div>
              </div>
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setShowSMSSummaryOption(false)}
            disabled={resumeSMSMutation.isPending}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}