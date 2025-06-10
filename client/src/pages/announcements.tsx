import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
  createdAt?: string;
}

export default function AnnouncementsPage() {
  console.log("AnnouncementsPage component rendered");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  
  const { data: announcements = [], isLoading, error } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements/published"],
    retry: 1,
    queryFn: async () => {
      const response = await fetch("/api/announcements/published", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch announcements');
      const data = await response.json();
      return data;
    }
  });

  console.log("Announcements query state:", { isLoading, error, announcements });
  console.log("Raw announcements data:", announcements);

  if (isLoading) {
    console.log("Showing loading state");
  }

  if (error) {
    console.log("Error in announcements query:", error);
  }

  if (announcements) {
    queryClient.setQueryData(["/api/announcements/published"], announcements);
    console.log("Fresh API response:", announcements);
  }

  console.log("Announcements query state:", { isLoading, error, announcements });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTargetAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'all': return <Users className="h-4 w-4" />;
      case 'managers': return <Users className="h-4 w-4" />;
      case 'employees': return <Users className="h-4 w-4" />;
      case 'admins': return <Users className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const formatAudience = (audience: string) => {
    switch (audience) {
      case 'all': return 'All Staff';
      case 'managers': return 'Managers';
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
        <div className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 font-brand" 
                      style={{ fontFamily: "'Great Vibes', cursive" }}>
                    Pine Hill Farm
                  </h1>
                  <p className="text-sm text-gray-600">Company Announcements</p>
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
        <div className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 font-brand" 
                      style={{ fontFamily: "'Great Vibes', cursive" }}>
                    Pine Hill Farm
                  </h1>
                  <p className="text-sm text-gray-600">Company Announcements</p>
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load announcements</h3>
              <p className="text-gray-500">
                Please check your connection and try again.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                <p className="text-sm text-gray-600">Company Announcements</p>
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Company Announcements
          </h2>
          <p className="text-gray-600">
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

        {announcements.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements</h3>
              <p className="text-gray-500">
                There are no announcements to display at this time.
              </p>
            </CardContent>
          </Card>
        ) : filteredAnnouncements.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matching announcements</h3>
              <p className="text-gray-500">
                No announcements found for the selected filter.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Filtered Announcements */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {selectedFilter === "all" ? "Current Announcements" : 
                 selectedFilter === "important" ? "Important Announcements" :
                 selectedFilter === "general" ? "General Announcements" :
                 "Policy Updates"}
              </h2>
              <div className="space-y-4">
                {filteredAnnouncements.map((announcement) => (
                  <Card key={announcement.id} className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-xl font-semibold text-gray-900">
                            {announcement.title}
                          </CardTitle>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge className={`${getPriorityColor(announcement.priority)} text-xs`}>
                            {announcement.priority}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none mb-4">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {announcement.content}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Published {announcement.publishedAt ? format(new Date(announcement.publishedAt), "MMM d, yyyy 'at' h:mm a") : 'Unknown'}
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
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Expired Announcements
                </h2>
                <div className="space-y-4">
                  {expiredAnnouncements.map((announcement) => (
                    <Card key={announcement.id} className="opacity-60">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-xl font-semibold text-gray-900">
                              {announcement.title}
                            </CardTitle>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              Expired
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none mb-4">
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {announcement.content}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Published {announcement.publishedAt ? format(new Date(announcement.publishedAt), "MMM d, yyyy 'at' h:mm a") : 'Unknown'}
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
    </div>
  );
}