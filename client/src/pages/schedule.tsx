import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { format, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, addDays } from "date-fns";
import { useLocation } from "wouter";

interface WorkSchedule {
  id: number;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId: number;
  position?: string;
  status?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  displayColor?: string;
}

interface Location {
  id: number;
  name: string;
  abbreviation?: string;
}

export default function Schedule() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [, setLocation] = useLocation();

  // Calculate calendar dates for month view
  const startOfCurrentMonth = startOfMonth(currentDate);
  const endOfCurrentMonth = endOfMonth(currentDate);
  const startOfCalendar = startOfWeek(startOfCurrentMonth, { weekStartsOn: 0 });
  const endOfCalendar = endOfWeek(endOfCurrentMonth, { weekStartsOn: 0 });
  
  const calendarDays = eachDayOfInterval({
    start: startOfCalendar,
    end: endOfCalendar
  });

  // Fetch locations for mapping
  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const response = await fetch("/api/locations", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    }
  });

  // Fetch employee data (including current user's display color)
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch("/api/employees", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    }
  });

  // Fetch user's schedules
  const { data: schedules = [] } = useQuery({
    queryKey: ["/api/work-schedules", format(startOfCalendar, "yyyy-MM-dd"), format(endOfCalendar, "yyyy-MM-dd"), user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/work-schedules?startDate=${format(startOfCalendar, "yyyy-MM-dd")}&endDate=${format(endOfCalendar, "yyyy-MM-dd")}&userId=${user?.id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch schedules");
      return response.json();
    },
    enabled: !!user?.id
  });

  const getScheduleForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return schedules.filter((schedule: any) => schedule.date === dateStr);
  };

  const getLocationAbbreviation = (locationId: number) => {
    const location = locations.find((loc: any) => loc.id === locationId);
    if (location?.abbreviation) return location.abbreviation;
    
    // Generate abbreviations for common locations
    const name = location?.name || "Location TBD";
    if (name.includes("Lake Geneva") && name.includes("Retail")) return "LGR";
    if (name.includes("Watertown") && name.includes("Retail")) return "WTR";
    if (name.includes("Watertown") && name.includes("Spa")) return "WTSPA";
    if (name.includes("Amazon")) return "online";
    return name.substring(0, 3).toUpperCase();
  };

  const getCurrentUserColor = () => {
    const currentEmployee = employees.find((emp: any) => emp.id === user?.id);
    return currentEmployee?.displayColor || "#3b82f6";
  };

  const getTotalMonthlyHours = () => {
    return schedules.reduce((total: number, schedule: any) => {
      try {
        const start = parseISO(schedule.startTime);
        const end = parseISO(schedule.endTime);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      } catch {
        return total;
      }
    }, 0);
  };

  const formatShiftTime = (startTime: string, endTime: string) => {
    try {
      const start = parseISO(startTime);
      const end = parseISO(endTime);
      const startFormat = start.getMinutes() === 0 ? 'ha' : 'h:mma';
      const endFormat = end.getMinutes() === 0 ? 'ha' : 'h:mma';
      return `${format(start, startFormat)}-${format(end, endFormat)}`;
    } catch {
      return `${startTime}-${endTime}`;
    }
  };

  const handlePrint = () => {
    const printContent = generatePrintContent();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const generatePrintContent = () => {
    const title = `Schedule for ${format(currentDate, "MMMM yyyy")}`;
    const scheduleHtml = generateMonthlyPrintHtml();
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .company-name { 
              font-size: 28px; 
              font-weight: bold; 
              color: #2563eb;
              margin-bottom: 5px;
            }
            .employee-info { 
              font-size: 14px; 
              color: #666; 
              margin-bottom: 10px;
            }
            .period { 
              font-size: 16px; 
              font-weight: bold; 
            }
            .schedule-grid { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
            }
            .schedule-grid th, .schedule-grid td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: left; 
              vertical-align: top;
            }
            .schedule-grid th { 
              background-color: #f8f9fa; 
              font-weight: bold; 
            }
            .day-header { 
              font-weight: bold; 
              font-size: 14px;
            }
            .shift-item { 
              margin-bottom: 8px; 
              padding: 8px; 
              background-color: #f0f9ff; 
              border-radius: 4px;
              font-size: 12px;
            }
            .shift-time { 
              font-weight: bold; 
              color: #1d4ed8;
            }
            .shift-location { 
              color: #666; 
              margin-top: 2px;
            }
            .no-shifts { 
              color: #999; 
              font-style: italic; 
              text-align: center;
            }
            .summary { 
              margin-top: 20px; 
              padding: 15px; 
              background-color: #f8f9fa; 
              border-radius: 6px;
            }
            @media print {
              body { margin: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Pine Hill Farm</div>
            <div class="employee-info">
              Employee: ${user?.firstName} ${user?.lastName}<br>
              Generated: ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}
            </div>
            <div class="period">${title}</div>
          </div>
          ${scheduleHtml}
        </body>
      </html>
    `;
  };

  const generateMonthlyPrintHtml = () => {
    const totalHours = getTotalMonthlyHours();
    
    // Create calendar grid
    const calendarWeeks = [];
    let startDate = startOfCalendar;
    
    while (startDate <= endOfCalendar) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(startDate));
        startDate = addDays(startDate, 1);
      }
      calendarWeeks.push(week);
      
      if (startDate > endOfCalendar) break;
    }

    return `
      <table class="schedule-grid">
        <thead>
          <tr>
            <th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th>
          </tr>
        </thead>
        <tbody>
          ${calendarWeeks.map(week => `
            <tr>
              ${week.map(day => {
                const daySchedules = getScheduleForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isDayToday = isToday(day);
                
                return `
                  <td style="${!isCurrentMonth ? 'background-color: #f5f5f5; color: #ccc;' : ''} height: 100px;">
                    <div class="day-header" style="${isDayToday ? 'color: #059669; font-weight: bold;' : ''}">
                      ${format(day, "d")}
                    </div>
                    ${daySchedules.map((schedule: any) => `
                      <div class="shift-item" style="margin: 2px 0; padding: 2px 4px; font-size: 10px; background-color: ${getCurrentUserColor()}20; border-left: 3px solid ${getCurrentUserColor()};">
                        <div class="shift-time">${formatShiftTime(schedule.startTime, schedule.endTime)} • ${getLocationAbbreviation(schedule.locationId)}</div>
                      </div>
                    `).join('')}
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="summary">
        <strong>Monthly Summary:</strong><br>
        Total Hours: ${totalHours.toFixed(1)}h<br>
        Total Shifts: ${schedules.length}
      </div>
    `;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 font-brand" 
                    style={{ fontFamily: "'Great Vibes', cursive" }}>
                  Pine Hill Farm
                </h1>
                <p className="text-sm text-gray-600">My Schedule</p>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {format(currentDate, "MMMM yyyy")}
              </h2>
              <p className="text-gray-600">
                {format(startOfCurrentMonth, "MMM d")} - {format(endOfCurrentMonth, "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline"
                onClick={() => setCurrentDate(addMonths(currentDate, -1))}
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous Month
              </Button>
              <Button 
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                Today
              </Button>
              <Button 
                variant="outline"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                Next Month
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              
              {/* Print Button */}
              <Button 
                variant="default"
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white ml-2"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Schedule
              </Button>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{getTotalMonthlyHours().toFixed(1)}h</div>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Shifts Scheduled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{schedules.length}</div>
                <p className="text-xs text-gray-500 mt-1">Total shifts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">My Color</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded border-2 border-gray-300"
                    style={{ backgroundColor: getCurrentUserColor() }}
                  />
                  <span className="text-sm text-gray-600">Your shifts display in this color</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Monthly Calendar */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  {format(currentDate, "MMMM yyyy")} Schedule
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="space-y-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-2 text-center font-semibold text-gray-700 text-sm border-b pb-3">
                  <div>Sunday</div>
                  <div>Monday</div>
                  <div>Tuesday</div>
                  <div>Wednesday</div>
                  <div>Thursday</div>
                  <div>Friday</div>
                  <div>Saturday</div>
                </div>
                
                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2" style={{ minHeight: '600px' }}>
                  {calendarDays.map((day, index) => {
                    const daySchedules = getScheduleForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isDayToday = isToday(day);
                    
                    return (
                      <div 
                        key={index}
                        className={`
                          min-h-[120px] border rounded-lg p-2 transition-colors
                          ${isDayToday 
                            ? 'border-blue-500 bg-blue-50' 
                            : isCurrentMonth 
                              ? 'border-gray-200 bg-white hover:bg-gray-50' 
                              : 'border-gray-100 bg-gray-50 text-gray-400'
                          }
                        `}
                      >
                        <div className={`text-sm font-semibold mb-2 ${
                          isDayToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {format(day, "d")}
                        </div>
                        
                        <div className="space-y-1">
                          {daySchedules.map((schedule: any, schedIndex: number) => (
                            <div 
                              key={schedIndex}
                              className="text-xs rounded p-1.5 border-l-3 text-gray-800"
                              style={{ 
                                backgroundColor: getCurrentUserColor() + '20',
                                borderLeftColor: getCurrentUserColor()
                              }}
                            >
                              <div className="font-medium">
                                {formatShiftTime(schedule.startTime, schedule.endTime)} • {getLocationAbbreviation(schedule.locationId)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}