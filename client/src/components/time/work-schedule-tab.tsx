import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Clock, MapPin, Calendar as CalendarIcon, Printer } from "lucide-react";
import { formatTimeStringToCST } from "@/lib/time-utils";

export default function WorkScheduleTab() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { user } = useAuth();

  // Get work schedules for the selected month
  const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["/api/work-schedules", { 
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
      userId: user?.id
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0],
        userId: user?.id || ''
      });
      
      const response = await fetch(`/api/work-schedules?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch schedules: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!user?.id,
  });

  const handlePrint = () => {
    window.print();
  };

  const getScheduleForDate = (date: Date) => {
    if (!schedules) return null;
    const dateString = date.toISOString().split('T')[0];
    return schedules.find((schedule: any) => schedule.date === dateString);
  };

  const getShiftColor = (shift?: string) => {
    switch (shift) {
      case "morning":
        return "bg-farm-green text-white";
      case "afternoon":
        return "bg-farm-blue text-white";
      case "evening":
        return "bg-farm-brown text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const getShiftLabel = (shift?: string) => {
    switch (shift) {
      case "morning":
        return "Morning";
      case "afternoon":
        return "Afternoon";
      case "evening":
        return "Evening";
      default:
        return "Shift";
    }
  };

  // Get schedules for the current week
  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
  const weekSchedules = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    weekSchedules.push({
      date,
      schedule: getScheduleForDate(date)
    });
  }

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Work Schedules</h3>
          <p className="text-sm text-slate-500">View your work schedule and shift assignments</p>
        </div>
        <Button 
          onClick={handlePrint}
          variant="outline"
          size="sm"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Schedule
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2 text-farm-green" />
              Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
              modifiers={{
                hasSchedule: (date) => !!getScheduleForDate(date)
              }}
              modifiersClassNames={{
                hasSchedule: "bg-farm-green text-white hover:bg-green-600"
              }}
            />
          </CardContent>
        </Card>

        {/* Schedule Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Week View */}
          <Card>
            <CardHeader>
              <CardTitle>
                Week of {startOfWeek.toLocaleDateString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-7 gap-2">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-slate-200 rounded mb-2"></div>
                      <div className="h-16 bg-slate-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {weekSchedules.map((day, index) => {
                    const isToday = day.date.toDateString() === new Date().toDateString();
                    const isSelected = day.date.toDateString() === selectedDate.toDateString();
                    
                    return (
                      <div
                        key={index}
                        className={`text-center p-2 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-farm-green bg-green-50' 
                            : isToday 
                            ? 'border-farm-blue bg-blue-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                        onClick={() => setSelectedDate(day.date)}
                      >
                        <div className={`text-sm font-medium mb-2 ${
                          isToday ? 'text-farm-blue' : 'text-slate-900'
                        }`}>
                          {weekDays[index]}
                        </div>
                        <div className="text-xs text-slate-500 mb-2">
                          {day.date.getDate()}
                        </div>
                        {day.schedule ? (
                          <div className={`text-xs px-2 py-1 rounded ${getShiftColor(day.schedule.shift)}`}>
                            {day.schedule.startTime}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">
                            Off
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Day Details */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
                  <div className="h-20 bg-slate-200 rounded"></div>
                </div>
              ) : (
                <>
                  {(() => {
                    const daySchedule = getScheduleForDate(selectedDate);
                    
                    if (!daySchedule) {
                      return (
                        <div className="text-center py-8">
                          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500">No shift scheduled for this day</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Badge className={getShiftColor(daySchedule.shift)}>
                              {getShiftLabel(daySchedule.shift)}
                            </Badge>
                            <div className="flex items-center text-slate-600">
                              <Clock className="w-4 h-4 mr-1" />
                              {formatTimeStringToCST(daySchedule.startTime)} - {formatTimeStringToCST(daySchedule.endTime)}
                            </div>
                          </div>
                        </div>
                        
                        {daySchedule.location && (
                          <div className="flex items-center text-slate-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            {daySchedule.location}
                          </div>
                        )}
                        
                        {daySchedule.notes && (
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-sm text-slate-700">
                              <strong>Notes:</strong> {daySchedule.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
