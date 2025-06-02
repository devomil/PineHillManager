import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Printer, Eye } from "lucide-react";

export default function UpcomingShifts() {
  const { user } = useAuth();
  
  // Get work schedules for the current week
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["/api/work-schedules", { 
      startDate: startOfWeek.toISOString().split('T')[0],
      endDate: endOfWeek.toISOString().split('T')[0]
    }],
  });

  const handlePrint = () => {
    window.print();
  };

  const weekDays = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  ];

  const getDateForDay = (dayIndex: number) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + dayIndex);
    return date;
  };

  const getScheduleForDay = (dayIndex: number) => {
    if (!schedules) return null;
    const dayDate = getDateForDay(dayIndex).toISOString().split('T')[0];
    return schedules.find((schedule: any) => schedule.date === dayDate);
  };

  const getShiftColor = (shift?: string) => {
    switch (shift) {
      case "morning":
        return "bg-farm-green bg-opacity-10 border-farm-green border-opacity-20 text-farm-green";
      case "afternoon":
        return "bg-farm-blue bg-opacity-10 border-farm-blue border-opacity-20 text-farm-blue";
      case "evening":
        return "bg-farm-brown bg-opacity-10 border-farm-brown border-opacity-20 text-farm-brown";
      default:
        return "bg-slate-100 border-slate-200 text-slate-600";
    }
  };

  return (
    <Card className="shadow-sm border border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Your Upcoming Shifts</CardTitle>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handlePrint}
              className="text-farm-green hover:text-green-600"
            >
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
            <Link href="/time">
              <Button variant="ghost" size="sm" className="text-farm-green hover:text-green-600">
                <Eye className="w-4 h-4 mr-1" />
                View All
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-7 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded mb-3"></div>
                  <div className="h-16 bg-slate-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-4">
            {weekDays.map((day, index) => {
              const date = getDateForDay(index);
              const schedule = getScheduleForDay(index);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div key={day} className="text-center">
                  <div className={`text-sm font-medium mb-2 ${
                    isToday ? 'text-farm-green' : 'text-slate-900'
                  }`}>
                    {day}
                  </div>
                  <div className="text-xs text-slate-500 mb-3">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="space-y-2">
                    {schedule ? (
                      <div className={`border rounded-lg p-2 ${getShiftColor(schedule.shift)}`}>
                        <div className="text-xs font-medium">
                          {schedule.startTime} - {schedule.endTime}
                        </div>
                        {schedule.location && (
                          <div className="text-xs mt-1 opacity-80">
                            {schedule.location}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-xs text-slate-400 mt-8">
                        {index === 5 || index === 6 ? 'Weekend' : 'Off Day'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
