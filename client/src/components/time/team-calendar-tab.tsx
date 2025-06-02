import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Users, Clock, MapPin } from "lucide-react";

export default function TeamCalendarTab() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Get all work schedules for the selected date
  const { data: teamSchedules, isLoading } = useQuery({
    queryKey: ["/api/work-schedules/team", selectedDate.toISOString().split('T')[0]],
    enabled: false, // Disable for now since we don't have a team endpoint
  });

  // Mock team data for demonstration
  const mockTeamSchedules = [
    {
      id: 1,
      employee: "John Smith",
      startTime: "08:00",
      endTime: "16:00",
      location: "Greenhouse A",
      shift: "morning",
      role: "Farm Manager"
    },
    {
      id: 2,
      employee: "Sarah Johnson",
      startTime: "09:00",
      endTime: "17:00",
      location: "Field Operations",
      shift: "morning",
      role: "Field Worker"
    },
    {
      id: 3,
      employee: "Mike Davis",
      startTime: "14:00",
      endTime: "22:00",
      location: "Greenhouse B",
      shift: "afternoon",
      role: "Greenhouse Specialist"
    }
  ];

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

  const getShiftIcon = (shift?: string) => {
    switch (shift) {
      case "morning":
        return "🌅";
      case "afternoon":
        return "☀️";
      case "evening":
        return "🌙";
      default:
        return "⏰";
    }
  };

  // Get current week dates
  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    weekDates.push(date);
  }

  const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Team Calendar</h3>
          <p className="text-sm text-slate-500">View team schedules and availability</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Mini Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Team Schedule Overview */}
        <div className="lg:col-span-3 space-y-6">
          {/* Week View */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-farm-green" />
                Week of {startOfWeek.toLocaleDateString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-4">
                {weekDates.map((date, index) => {
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isSelected = date.toDateString() === selectedDate.toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-farm-green bg-green-50' 
                          : isToday 
                          ? 'border-farm-blue bg-blue-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <div className="text-center">
                        <div className={`text-sm font-medium mb-1 ${
                          isToday ? 'text-farm-blue' : 'text-slate-900'
                        }`}>
                          {weekDays[index].slice(0, 3)}
                        </div>
                        <div className="text-xs text-slate-500 mb-2">
                          {date.getDate()}
                        </div>
                        
                        {/* Mini schedule indicators */}
                        <div className="space-y-1">
                          {mockTeamSchedules.slice(0, 2).map((schedule, scheduleIndex) => (
                            <div
                              key={scheduleIndex}
                              className={`w-full h-1 rounded ${getShiftColor(schedule.shift).replace('text-white', '')}`}
                            ></div>
                          ))}
                          {mockTeamSchedules.length > 2 && (
                            <div className="text-xs text-slate-400">
                              +{mockTeamSchedules.length - 2}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse p-4 border border-slate-200 rounded-lg">
                      <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : mockTeamSchedules.length > 0 ? (
                <div className="space-y-4">
                  {mockTeamSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {schedule.employee.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-900">
                              {schedule.employee}
                            </h4>
                            <p className="text-sm text-slate-500">
                              {schedule.role}
                            </p>
                          </div>
                        </div>
                        <Badge className={getShiftColor(schedule.shift)}>
                          {getShiftIcon(schedule.shift)} {schedule.shift}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center text-slate-600">
                          <Clock className="w-4 h-4 mr-2" />
                          {schedule.startTime} - {schedule.endTime}
                        </div>
                        <div className="flex items-center text-slate-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          {schedule.location}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No team schedules for this day</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
