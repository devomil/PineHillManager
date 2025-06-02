import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, MessageSquare, Plus } from "lucide-react";

export default function Communication() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("announcements");

  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ["/api/announcements"],
    enabled: isAuthenticated,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/messages"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-green"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Communication</h1>
        <p className="text-slate-500 mt-1">
          Stay connected with announcements and team messages
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Megaphone className="w-5 h-5 mr-2 text-farm-green" />
                  Company Announcements
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {announcementsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : announcements && announcements.length > 0 ? (
                <div className="space-y-4">
                  {announcements.map((announcement: any) => (
                    <div
                      key={announcement.id}
                      className="border-l-4 border-farm-green pl-4 py-2"
                    >
                      <h4 className="font-medium text-slate-900">
                        {announcement.title}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {announcement.content}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(announcement.publishedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No announcements yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-farm-blue" />
                  Team Messages
                </CardTitle>
                <Button size="sm" className="bg-farm-blue hover:bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  New Message
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {messagesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : messages && messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message: any) => (
                    <div
                      key={message.id}
                      className="border border-slate-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-900">
                          {message.subject}
                        </h4>
                        <span className="text-xs text-slate-400">
                          {new Date(message.sentAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {message.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No messages yet</p>
                  <Button
                    className="mt-4 bg-farm-blue hover:bg-blue-600"
                    size="sm"
                  >
                    Send your first message
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
