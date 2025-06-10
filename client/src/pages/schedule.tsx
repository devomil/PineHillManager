import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";

export default function Schedule() {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch user's schedules
  const { data: schedules = [] } = useQuery({
    queryKey: ["/api/my-schedules", format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await fetch(`/api/my-schedules?start=${format(weekStart, "yyyy-MM-dd")}&end=${format(weekEnd, "yyyy-MM-dd")}`, {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
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
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Week of {format(weekStart, "MMM d, yyyy")}
              </h2>
              <p className="text-gray-600">
                {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center space-x-4">
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
                This Week
              </Button>
              <Button 
                variant="outline"
                onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
              >
                Next Week →
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

          {/* Weekly Calendar */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                {weekDays.map((day, index) => {
                  const daySchedules = getScheduleForDay(day);
                  const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                  
                  return (
                    <div key={index} className={`border rounded-lg p-4 ${isToday ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      <div className="text-center mb-3">
                        <h3 className="font-semibold text-gray-900">
                          {format(day, "EEE")}
                        </h3>
                        <p className={`text-lg font-bold ${isToday ? 'text-green-600' : 'text-gray-600'}`}>
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
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                  <Calendar className="h-6 w-6 text-gray-600" />
                  <span className="text-sm">Request Time Off</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                  <User className="h-6 w-6 text-gray-600" />
                  <span className="text-sm">Find Shift Coverage</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
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