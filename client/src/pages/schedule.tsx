import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, User, Printer } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, addMonths, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import { useLocation } from "wouter";

export default function Schedule() {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [, setLocation] = useLocation();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Determine the date range based on view mode
  const startDate = viewMode === 'week' ? weekStart : monthStart;
  const endDate = viewMode === 'week' ? weekEnd : monthEnd;

  // Fetch user's schedules
  const { data: schedules = [] } = useQuery({
    queryKey: ["/api/my-schedules", format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await fetch(`/api/my-schedules?start=${format(startDate, "yyyy-MM-dd")}&end=${format(endDate, "yyyy-MM-dd")}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch schedules");
      return response.json();
    }
  });

  const getScheduleForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return schedules.filter((schedule: any) => schedule.date === dateStr);
  };

  const getTotalWeeklyHours = () => {
    return schedules.reduce((total: number, schedule: any) => {
      const start = new Date(`2000-01-01T${schedule.startTime}`);
      const end = new Date(`2000-01-01T${schedule.endTime}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);
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
    const title = viewMode === 'week' 
      ? `Schedule for Week of ${format(weekStart, "MMM d, yyyy")}`
      : `Schedule for ${format(currentMonth, "MMMM yyyy")}`;
    
    const scheduleHtml = viewMode === 'week' ? generateWeeklyPrintHtml() : generateMonthlyPrintHtml();
    
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

  const generateWeeklyPrintHtml = () => {
    const totalHours = getTotalWeeklyHours();
    
    return `
      <table class="schedule-grid">
        <thead>
          <tr>
            ${weekDays.map(day => `
              <th class="day-header">
                ${format(day, "EEE, MMM d")}
                ${isToday(day) ? ' (Today)' : ''}
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            ${weekDays.map(day => {
              const daySchedules = getScheduleForDay(day);
              return `
                <td>
                  ${daySchedules.length > 0 ? 
                    daySchedules.map(schedule => `
                      <div class="shift-item">
                        <div class="shift-time">${schedule.startTime} - ${schedule.endTime}</div>
                        <div class="shift-location">${schedule.locationName || 'Location TBD'}</div>
                        ${schedule.position ? `<div class="shift-location">${schedule.position}</div>` : ''}
                      </div>
                    `).join('') :
                    '<div class="no-shifts">No shifts</div>'
                  }
                </td>
              `;
            }).join('')}
          </tr>
        </tbody>
      </table>
      <div class="summary">
        <strong>Weekly Summary:</strong><br>
        Total Hours: ${totalHours.toFixed(1)}h<br>
        Total Shifts: ${schedules.length}
      </div>
    `;
  };

  const generateMonthlyPrintHtml = () => {
    const monthlySchedules = schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.date);
      return isSameMonth(scheduleDate, currentMonth);
    });
    
    const totalMonthlyHours = monthlySchedules.reduce((total: number, schedule: any) => {
      const start = new Date(`2000-01-01T${schedule.startTime}`);
      const end = new Date(`2000-01-01T${schedule.endTime}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);

    // Create calendar grid
    const calendarWeeks = [];
    let currentDate = startOfWeek(monthStart);
    
    while (currentDate <= endOfMonth(currentMonth)) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(currentDate));
        currentDate = addDays(currentDate, 1);
      }
      calendarWeeks.push(week);
      
      // Break if we've covered the entire month
      if (currentDate > endOfMonth(currentMonth)) break;
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
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isDayToday = isToday(day);
                
                return `
                  <td style="${!isCurrentMonth ? 'background-color: #f5f5f5; color: #ccc;' : ''} height: 100px;">
                    <div class="day-header" style="${isDayToday ? 'color: #059669; font-weight: bold;' : ''}">
                      ${format(day, "d")}
                    </div>
                    ${daySchedules.slice(0, 3).map(schedule => `
                      <div class="shift-item" style="margin: 2px 0; padding: 2px 4px; font-size: 10px;">
                        <div class="shift-time">${schedule.startTime}</div>
                      </div>
                    `).join('')}
                    ${daySchedules.length > 3 ? `<div style="font-size: 10px; color: #666;">+${daySchedules.length - 3} more</div>` : ''}
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="summary">
        <strong>Monthly Summary:</strong><br>
        Total Hours: ${totalMonthlyHours.toFixed(1)}h<br>
        Total Shifts: ${monthlySchedules.length}
      </div>
    `;
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {viewMode === 'week' 
                  ? `Week of ${format(weekStart, "MMM d, yyyy")}`
                  : format(currentMonth, "MMMM yyyy")
                }
              </h2>
              <p className="text-gray-600">
                {viewMode === 'week'
                  ? `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
                  : `${format(monthStart, "MMM d")} - ${format(monthEnd, "MMM d, yyyy")}`
                }
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2 mr-4">
                <Button 
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                >
                  This Week
                </Button>
                <Button 
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                >
                  This Month
                </Button>
              </div>
              
              {/* Navigation Buttons */}
              {viewMode === 'week' ? (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                  >
                    ← Previous Week
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentWeek(new Date())}
                  >
                    Today
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                  >
                    Next Week →
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                  >
                    ← Previous Month
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Today
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    Next Month →
                  </Button>
                </>
              )}
              
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

          {/* Weekly Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{getTotalWeeklyHours().toFixed(1)}h</div>
                <p className="text-xs text-gray-500 mt-1">This week</p>
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
                <CardTitle className="text-sm font-medium text-gray-600">Next Shift</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {schedules.length > 0 ? format(new Date(schedules[0].date), "MMM d") : "None"}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {schedules.length > 0 ? `${schedules[0].startTime} - ${schedules[0].endTime}` : "No upcoming shifts"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Schedule Display */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>
                {viewMode === 'week' ? 'Weekly Schedule' : 'Monthly Schedule'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {viewMode === 'week' ? (
                /* Weekly View */
                <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                  {weekDays.map((day, index) => {
                    const daySchedules = getScheduleForDay(day);
                    const isTodayWeek = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                    
                    return (
                      <div key={index} className={`border rounded-lg p-4 ${isTodayWeek ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                        <div className="text-center mb-3">
                          <h3 className="font-semibold text-gray-900">
                            {format(day, "EEE")}
                          </h3>
                          <p className={`text-lg font-bold ${isTodayWeek ? 'text-green-600' : 'text-gray-600'}`}>
                            {format(day, "d")}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          {daySchedules.length > 0 ? (
                            daySchedules.map((schedule: any, schedIndex: number) => (
                              <div key={schedIndex} className="bg-white rounded p-3 border border-gray-200 shadow-sm">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Clock className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium text-sm">
                                    {schedule.startTime} - {schedule.endTime}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 mb-2">
                                  <MapPin className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">
                                    {schedule.locationName || "Location TBD"}
                                  </span>
                                </div>
                                {schedule.position && (
                                  <div className="flex items-center space-x-2">
                                    <User className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm text-gray-600">
                                      {schedule.position}
                                    </span>
                                  </div>
                                )}
                                <Badge 
                                  variant="secondary" 
                                  className="mt-2 bg-green-100 text-green-800 text-xs"
                                >
                                  {schedule.status || "Scheduled"}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-gray-500">No shifts</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Monthly View */
                <div className="space-y-4">
                  {/* Calendar Header */}
                  <div className="grid grid-cols-7 gap-2 text-center font-semibold text-gray-700 border-b pb-2">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: startOfWeek(monthStart).getDay() }).map((_, index) => (
                      <div key={`empty-${index}`} className="h-24 border border-gray-100 rounded bg-gray-50"></div>
                    ))}
                    
                    {/* Month days */}
                    {monthDays.map((day, index) => {
                      const daySchedules = getScheduleForDay(day);
                      const isTodayMonth = isToday(day);
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      
                      return (
                        <div 
                          key={index} 
                          className={`h-24 border rounded p-1 ${
                            isTodayMonth 
                              ? 'border-green-500 bg-green-50' 
                              : isCurrentMonth 
                                ? 'border-gray-200 bg-white' 
                                : 'border-gray-100 bg-gray-50'
                          }`}
                        >
                          <div className={`text-sm font-semibold mb-1 ${
                            isTodayMonth ? 'text-green-600' : 'text-gray-700'
                          }`}>
                            {format(day, "d")}
                          </div>
                          
                          <div className="space-y-1">
                            {daySchedules.slice(0, 2).map((schedule: any, schedIndex: number) => (
                              <div key={schedIndex} className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded truncate">
                                {schedule.startTime}
                              </div>
                            ))}
                            {daySchedules.length > 2 && (
                              <div className="text-xs text-gray-500 px-1">
                                +{daySchedules.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  onClick={() => setLocation('/time-off')}
                >
                  <Calendar className="h-6 w-6 text-gray-600" />
                  <span className="text-sm">Request Time Off</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  onClick={() => setLocation('/shift-coverage')}
                >
                  <User className="h-6 w-6 text-gray-600" />
                  <span className="text-sm">Find Shift Coverage</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  onClick={() => setLocation('/time-clock')}
                >
                  <Clock className="h-6 w-6 text-gray-600" />
                  <span className="text-sm">View Time Clock</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}