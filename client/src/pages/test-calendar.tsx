import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, MapPin, ArrowLeft, ArrowRight } from "lucide-react";

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

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8" />
            Global Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            View schedules, time-off requests, and shift coverage across all locations
          </p>
        </div>

        <div className="flex items-center gap-4">
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
              <CardTitle className="text-xl">Weekly Schedule</CardTitle>
              <CardDescription>
                {selectedLocation === "all" ? "Showing all locations" : 
                  locations.find(l => l.id.toString() === selectedLocation)?.name || "Selected location"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentWeek(currentWeek - 1)}>
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentWeek(currentWeek + 1)}>
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => (
              <div key={day} className="border rounded-lg p-3 min-h-32">
                <div className="font-medium text-sm mb-2">{day}</div>
                <div className="space-y-1">
                  <div className="text-xs bg-blue-100 text-blue-800 p-1 rounded">
                    No events scheduled
                  </div>
                </div>
              </div>
            ))}
          </div>
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