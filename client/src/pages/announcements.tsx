import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function AnnouncementsPage() {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  
  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements/published"],
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
      case 'all': return <Users className="h-4 w-4" />;
      case 'employees': return <Users className="h-4 w-4" />;
      case 'admins': return <AlertTriangle className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
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

  // Filter announcements based on selected filter
  const getFilteredAnnouncements = () => {
    const activeAnnouncements = announcements.filter(announcement => !isExpired(announcement.expiresAt));
    
    if (selectedFilter === "all") return activeAnnouncements;
    if (selectedFilter === "important") return activeAnnouncements.filter(a => a.priority === "urgent" || a.priority === "high");
    if (selectedFilter === "general") return activeAnnouncements.filter(a => a.priority === "normal" || a.priority === "low");
    if (selectedFilter === "policy") return activeAnnouncements.filter(a => a.title.toLowerCase().includes("policy"));
    
    return activeAnnouncements;
  };

  const filteredAnnouncements = getFilteredAnnouncements();
  const expiredAnnouncements = announcements.filter(announcement => isExpired(announcement.expiresAt));

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Bell className="h-8 w-8 text-farm-green" />
          Company Announcements
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Stay updated with the latest company news, policy changes, and important updates.
        </p>
      </div>

      {/* Filter Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={selectedFilter === "all" ? "default" : "outline"}
          onClick={() => setSelectedFilter("all")}
          className={selectedFilter === "all" ? "bg-farm-green hover:bg-farm-green/90" : ""}
        >
          All Announcements
        </Button>
        <Button
          variant={selectedFilter === "important" ? "default" : "outline"}
          onClick={() => setSelectedFilter("important")}
          className={selectedFilter === "important" ? "bg-red-500 hover:bg-red-600" : ""}
        >
          Important
        </Button>
        <Button
          variant={selectedFilter === "general" ? "default" : "outline"}
          onClick={() => setSelectedFilter("general")}
          className={selectedFilter === "general" ? "bg-blue-500 hover:bg-blue-600" : ""}
        >
          General
        </Button>
        <Button
          variant={selectedFilter === "policy" ? "default" : "outline"}
          onClick={() => setSelectedFilter("policy")}
          className={selectedFilter === "policy" ? "bg-purple-500 hover:bg-purple-600" : ""}
        >
          Policy Updates
        </Button>
      </div>

      {filteredAnnouncements.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No announcements</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {selectedFilter === "all" 
                ? "There are no announcements to display at this time."
                : `No ${selectedFilter} announcements found.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Filtered Announcements */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {selectedFilter === "all" ? "Current Announcements" : 
               selectedFilter === "important" ? "Important Announcements" :
               selectedFilter === "general" ? "General Announcements" :
               selectedFilter === "policy" ? "Policy Updates" : "Announcements"}
            </h2>
            <div className="space-y-4">
              {filteredAnnouncements.map((announcement) => (
                <Card key={announcement.id} className="border-l-4 border-l-farm-green">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getPriorityColor(announcement.priority)} text-xs`}>
                          {announcement.priority}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none mb-4">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Published {format(new Date(announcement.publishedAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        <span className="flex items-center gap-1">
                          {getTargetAudienceIcon(announcement.targetAudience)}
                          {formatAudience(announcement.targetAudience)}
                        </span>
                      </div>
                      {announcement.expiresAt && (
                        <span className="flex items-center gap-1 text-orange-600">
                          <Clock className="h-4 w-4" />
                          Expires {format(new Date(announcement.expiresAt), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Expired Announcements */}
          {expiredAnnouncements.length > 0 && selectedFilter === "all" && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Past Announcements
              </h2>
              <div className="space-y-4">
                {expiredAnnouncements.map((announcement) => (
                  <Card key={announcement.id} className="border-l-4 border-l-gray-300 opacity-75">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg text-gray-600">{announcement.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            Expired
                          </Badge>
                          <Badge className={`${getPriorityColor(announcement.priority)} text-xs opacity-75`}>
                            {announcement.priority}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none mb-4">
                        <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                          {announcement.content}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Published {format(new Date(announcement.publishedAt), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                          <span className="flex items-center gap-1">
                            {getTargetAudienceIcon(announcement.targetAudience)}
                            {formatAudience(announcement.targetAudience)}
                          </span>
                        </div>
                        {announcement.expiresAt && (
                          <span className="flex items-center gap-1 text-red-600">
                            <Clock className="h-4 w-4" />
                            Expired {format(new Date(announcement.expiresAt), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}