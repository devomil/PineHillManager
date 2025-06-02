import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  CalendarDays, 
  Handshake, 
  BookOpen, 
  Megaphone, 
  Calendar,
  Clock
} from "lucide-react";

export default function QuickActionsPanel() {
  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ["/api/announcements"],
  });

  const quickActions = [
    {
      label: "View Schedule",
      icon: CalendarDays,
      href: "/time",
      color: "text-emerald-500",
    },
    {
      label: "Request Coverage",
      icon: Handshake,
      href: "/time",
      color: "text-blue-500",
    },
    {
      label: "Continue Training",
      icon: BookOpen,
      href: "/training",
      color: "text-slate-500",
    },
    {
      label: "Announcements",
      icon: Megaphone,
      href: "/communication",
      color: "text-purple-500",
    },
  ];

  const upcomingEvents = [
    {
      title: "Team Meeting",
      time: "Today, 2:00 PM",
      color: "bg-farm-green",
    },
    {
      title: "Equipment Maintenance",
      time: "Tomorrow, 9:00 AM",
      color: "bg-farm-blue",
    },
    {
      title: "Safety Inspection",
      time: "Friday, 10:30 AM",
      color: "bg-yellow-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card className="shadow-sm border border-slate-200">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Button
                variant="ghost"
                className="w-full justify-start p-3 h-auto hover:bg-slate-50 transition-colors"
              >
                <action.icon className={`w-5 h-5 mr-3 ${action.color}`} />
                <span className="text-sm font-medium text-slate-900">
                  {action.label}
                </span>
              </Button>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Recent Announcements */}
      <Card className="shadow-sm border border-slate-200">
        <CardHeader>
          <CardTitle>Recent Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {announcementsLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2 mb-1"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : announcements && announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.slice(0, 2).map((announcement: any) => (
                <div
                  key={announcement.id}
                  className="border-l-4 border-farm-green pl-4"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {announcement.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {announcement.content}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(announcement.publishedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No announcements yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* This Week Events */}
      <Card className="shadow-sm border border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>This Week</CardTitle>
            <Link href="/time">
              <Button variant="ghost" size="sm" className="text-farm-green hover:text-green-600">
                Full Calendar
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingEvents.map((event, index) => (
              <div key={index} className="flex items-start">
                <div className={`flex-shrink-0 w-2 h-2 ${event.color} rounded-full mt-2`}></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-900">
                    {event.title}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {event.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
