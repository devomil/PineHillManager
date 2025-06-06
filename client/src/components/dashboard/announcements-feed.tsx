import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, Users, AlertTriangle, Clock } from "lucide-react";
import { format, isAfter, parseISO } from "date-fns";

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
    queryFn: async () => {
      const response = await fetch("/api/announcements/published", {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Dashboard fresh API response:", data);
      return data;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Debug logging
  console.log("Dashboard announcements query state:", { isLoading, announcements });
  console.log("Dashboard raw announcements data:", announcements);

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

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return isAfter(new Date(), parseISO(expiresAt));
  };

  // Filter out expired announcements and sort by priority and date
  const activeAnnouncements = announcements
    .filter(announcement => !isExpired(announcement.expiresAt))
    .sort((a, b) => {
      // Sort by priority first (urgent > high > normal > low)
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then sort by date (newest first)
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    })
    .slice(0, 5); // Show only top 5 announcements

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Bell className="h-5 w-5 text-farm-green" />
            Recent Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border rounded-lg p-3">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Bell className="h-5 w-5 text-farm-green" />
          Recent Announcements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeAnnouncements.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 dark:text-gray-400">No current announcements</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    {announcement.title}
                  </h4>
                  <Badge className={`${getPriorityColor(announcement.priority)} text-xs ml-2 flex-shrink-0`}>
                    {announcement.priority}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                  {announcement.content}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {announcement.publishedAt ? format(new Date(announcement.publishedAt), "MMM d") : format(new Date(), "MMM d")}
                    </span>
                    <span className="flex items-center gap-1">
                      {getTargetAudienceIcon(announcement.targetAudience)}
                      {formatAudience(announcement.targetAudience)}
                    </span>
                  </div>
                  {announcement.expiresAt && (
                    <span className="flex items-center gap-1 text-orange-600">
                      <Clock className="h-3 w-3" />
                      Expires {format(new Date(announcement.expiresAt), "MMM d")}
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {announcements.length > 5 && (
              <div className="text-center pt-2">
                <Link 
                  href="/announcements" 
                  className="text-sm text-farm-green hover:text-green-700 font-medium"
                >
                  View all announcements →
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}