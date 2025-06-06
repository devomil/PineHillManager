import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Calendar, Users, AlertTriangle, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: string;
  targetAudience: string;
  publishedAt: string;
  expiresAt?: string;
  authorId: string;
}

export default function AnnouncementsFeed() {
  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements/published"],
    retry: 1,
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'normal': return 'bg-blue-500 text-white';
      case 'low': return 'bg-gray-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getTargetAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'all': return <Users className="h-3 w-3" />;
      case 'employees': return <Users className="h-3 w-3" />;
      case 'admins': return <AlertTriangle className="h-3 w-3" />;
      default: return <Users className="h-3 w-3" />;
    }
  };

  const formatAudience = (audience: string) => {
    switch (audience) {
      case 'all': return 'All Staff';
      case 'employees': return 'Employees';
      case 'admins': return 'Management';
      default: return audience;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Company Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-farm-green" />
            Company Announcements
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.location.href = '/announcements'}
            className="text-farm-green hover:bg-farm-green/10"
          >
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No announcements at this time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.slice(0, 3).map((announcement: Announcement) => (
              <div key={announcement.id} className="border-l-4 border-farm-green pl-4 pb-4 border-b border-gray-100 last:border-b-0">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm leading-tight">
                    {announcement.title}
                  </h4>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge 
                      className={`text-xs px-2 py-1 ${getPriorityColor(announcement.priority)}`}
                    >
                      {announcement.priority}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                  {announcement.content}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(announcement.publishedAt), "MMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-1">
                      {getTargetAudienceIcon(announcement.targetAudience)}
                      {formatAudience(announcement.targetAudience)}
                    </span>
                  </div>
                  {announcement.expiresAt && (
                    <span className="text-orange-600">
                      Expires {format(new Date(announcement.expiresAt), "MMM d")}
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {announcements.length > 3 && (
              <div className="text-center pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/announcements'}
                  className="text-farm-green border-farm-green hover:bg-farm-green hover:text-white"
                >
                  View {announcements.length - 3} More
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}