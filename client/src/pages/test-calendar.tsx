import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, MapPin, ArrowLeft, ArrowRight, Home, Menu } from "lucide-react";
import { Link } from "wouter";

interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export default function TestCalendar() {
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [currentWeek, setCurrentWeek] = useState(0);
  const [viewType, setViewType] = useState<"week" | "month" | "3month" | "6month">("week");
  const [currentMonth, setCurrentMonth] = useState(0);

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
        startDate = new Date(today);
        startDate.setDate(today.getDate() + (currentWeek * 7));
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

  // Fetch calendar events for the current date range
  const { data: events = [] } = useQuery({
    queryKey: ["/api/calendar/events", viewType, currentWeek, currentMonth],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      
      const response = await fetch(`/api/calendar/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Helper functions for date formatting and navigation
  const getViewTitle = () => {
    const { startDate, endDate } = getDateRange();
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
        return "Calendar View";
    }
  };

  const handlePrevious = () => {
    if (viewType === "week") {
      setCurrentWeek(currentWeek - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNext = () => {
    if (viewType === "week") {
      setCurrentWeek(currentWeek + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const renderCalendarView = () => {
    if (viewType === "week") {
      return renderWeekView();
    } else {
      return renderMonthView();
    }
  };

  const renderWeekView = () => (
    <div className="grid grid-cols-7 gap-2">
      {weekDays.map((day, index) => {
        const { startDate } = getDateRange();
        const dayDate = new Date(startDate);
        dayDate.setDate(startDate.getDate() + index);
        
        const dayEvents = events.filter(event => {
          const eventDate = new Date(event.start);
          return eventDate.toDateString() === dayDate.toDateString();
        });

        return (
          <div key={day} className="border rounded-lg p-3 min-h-32">
            <div className="font-medium text-sm mb-2">
              {day}
              <div className="text-xs text-muted-foreground">
                {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div className="space-y-1">
              {dayEvents.length > 0 ? dayEvents.map((event, i) => (
                <div key={i} className={`text-xs p-1 rounded ${
                  event.type === 'schedule' ? 'bg-blue-100 text-blue-800' :
                  event.type === 'timeoff' ? 'bg-yellow-100 text-yellow-800' :
                  event.type === 'coverage_request' ? 'bg-red-100 text-red-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {event.title}
                </div>
              )) : (
                <div className="text-xs bg-gray-100 text-gray-600 p-1 rounded">
                  No events
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderMonthView = () => {
    const { startDate, endDate } = getDateRange();
    const eventsByDate = new Map();
    
    events.forEach(event => {
      const date = new Date(event.start).toDateString();
      if (!eventsByDate.has(date)) {
        eventsByDate.set(date, []);
      }
      eventsByDate.get(date).push(event);
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
              
              {/* Generate calendar days for this month */}
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
                  const dayEvents = eventsByDate.get(dateString) || [];
                  
                  days.push(
                    <div key={day} className="border rounded p-2 min-h-20 text-sm">
                      <div className="font-medium mb-1">{day}</div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event, i) => (
                          <div key={i} className={`text-xs p-1 rounded truncate ${
                            event.type === 'schedule' ? 'bg-blue-100 text-blue-800' :
                            event.type === 'timeoff' ? 'bg-yellow-100 text-yellow-800' :
                            event.type === 'coverage_request' ? 'bg-red-100 text-red-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - 2} more
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
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8" />
            Global Calendar
          </h1>
        </div>
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <Menu className="h-4 w-4" />
            Main Menu
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-muted-foreground">
            View schedules, time-off requests, and shift coverage across all locations
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* View Type Selector */}
          <Select value={viewType} onValueChange={(value: "week" | "month" | "3month" | "6month") => {
            setViewType(value);
            setCurrentWeek(0);
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
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{getViewTitle()}</CardTitle>
              <CardDescription>
                {selectedLocation === "all" ? "Showing all locations" : 
                  locations.find(l => l.id.toString() === selectedLocation)?.name || "Selected location"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevious}>
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderCalendarView()}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {locations.map((location) => (
          <Card key={location.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {location.name}
              </CardTitle>
              <CardDescription>
                {location.address}, {location.city}, {location.state} {location.zipCode}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">0 shifts this week</Badge>
                <Badge variant="outline">0 coverage requests</Badge>
                <Badge variant="outline">0 time-off requests</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}