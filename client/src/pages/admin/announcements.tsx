import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { MessageReactions } from "@/components/ui/message-reactions";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Plus, Send, Save, Calendar, Users, AlertTriangle, MessageSquare, Smartphone } from "lucide-react";
import { AudienceSelector } from "@/components/ui/audience-selector";

function AnnouncementsContent() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formAudience, setFormAudience] = useState<string[]>(["all"]);

  // Emergency broadcast state
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [emergencyAudience, setEmergencyAudience] = useState<string[]>(["all"]);
  const [sendingEmergency, setSendingEmergency] = useState(false);

  // Check authentication and access
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

    if (!isLoading && isAuthenticated && user) {
      // Check if user has admin or manager role
      if ((user as any)?.role !== 'admin' && (user as any)?.role !== 'manager') {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Fetch announcements using React Query - with explicit queryFn
  const { data: announcements = [], isLoading: loading, error } = useQuery<any[]>({
    queryKey: ['/api/announcements'],
    queryFn: async () => {
      console.log('Fetching announcements...');
      const response = await fetch('/api/announcements', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('Announcements fetch failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch announcements: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Announcements fetched successfully:', data);
      return data;
    },
    enabled: !!user && isAuthenticated, // Simplified condition
    retry: 1, // Allow one retry
    refetchOnWindowFocus: false,
  });


  // Only log meaningful errors and avoid showing toast for empty error objects
  useEffect(() => {
    if (error && error instanceof Error && error.message && error.message !== "{}") {
      console.error('Real announcements error:', error.message);
      toast({
        title: "Error", 
        description: "Failed to load announcements",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Handle URL params for success/error messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success === 'published') {
      toast({
        title: "Success",
        description: "Announcement published successfully!",
      });
    } else if (success === 'saved_as_draft') {
      toast({
        title: "Success", 
        description: "Announcement saved as draft!",
      });
    } else if (error === 'access_denied') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create announcements.",
        variant: "destructive",
      });
    } else if (error === 'creation_failed') {
      toast({
        title: "Error",
        description: "Failed to create announcement. Please try again.",
        variant: "destructive",
      });
    }

    // Clear URL params
    if (success || error) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

  // Emergency broadcast handler
  const handleEmergencyBroadcast = async () => {
    if (!emergencyMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter an emergency message",
        variant: "destructive",
      });
      return;
    }

    setSendingEmergency(true);
    try {
      const response = await fetch('/api/sms/emergency-broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: emergencyMessage,
          targetAudience: emergencyAudience
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Emergency Broadcast Sent",
          description: `Message sent to ${result.sent} employees (${result.failed} failed)`,
          variant: "default",
        });
        setEmergencyMessage("");
        setShowEmergencyDialog(false);
        setEmergencyAudience(["all"]);
      } else {
        toast({
          title: "Broadcast Failed",
          description: result.error || "Failed to send emergency broadcast",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error", 
        description: "Failed to send emergency broadcast. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingEmergency(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 hover:bg-red-600';
      case 'high': return 'bg-orange-500 hover:bg-orange-600';
      case 'normal': return 'bg-blue-500 hover:bg-blue-600';
      case 'low': return 'bg-gray-500 hover:bg-gray-600';
      default: return 'bg-blue-500 hover:bg-blue-600';
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

  // Show loading state during authentication check
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-green"></div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Don't render if user doesn't have proper role
  if (user && (user as any)?.role !== 'admin' && (user as any)?.role !== 'manager') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Announcements</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create and manage company announcements for your team
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Emergency Broadcast
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <Smartphone className="h-5 w-5" />
                  Emergency SMS Broadcast
                </DialogTitle>
                <DialogDescription>
                  Send an urgent SMS message to all employees immediately. This will be marked as an emergency.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="emergency-message">Emergency Message</Label>
                  <Textarea
                    id="emergency-message"
                    placeholder="Enter emergency message..."
                    value={emergencyMessage}
                    onChange={(e) => setEmergencyMessage(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div>
                  <AudienceSelector
                    selectedAudience={emergencyAudience}
                    onAudienceChange={setEmergencyAudience}
                    name="emergencyTargetAudience"
                    showSMSInfo={true}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEmergencyDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleEmergencyBroadcast}
                  disabled={sendingEmergency || !emergencyMessage.trim()}
                >
                  {sendingEmergency ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Emergency SMS
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Announcement</CardTitle>
          </CardHeader>
          <CardContent>
            <form action="/api/announcements" method="POST" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Enter announcement title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select name="priority" defaultValue="normal">
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <AudienceSelector
                    selectedAudience={formAudience}
                    onAudienceChange={setFormAudience}
                    name="targetAudience"
                    showSMSInfo={true}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                  <Input
                    id="expiresAt"
                    name="expiresAt"
                    type="datetime-local"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  name="content"
                  placeholder="Enter announcement content..."
                  rows={6}
                  required
                />
              </div>

              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="smsEnabled"
                    name="smsEnabled"
                    value="true"
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="smsEnabled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    📱 Send SMS notifications to all eligible employees
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  SMS will be sent to employees who have SMS notifications enabled and consent given.
                </p>
              </div>

              <Separator />

              <div className="flex gap-4 justify-end">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  name="action" 
                  value="draft"
                  variant="outline"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
                <Button 
                  type="submit" 
                  name="action" 
                  value="publish"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publish Now
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-green mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No announcements yet.</p>
              <p className="text-sm">Click "New Announcement" to create your first announcement.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement: any) => (
                <div key={announcement.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{announcement.title}</h3>
                        <Badge className={getPriorityColor(announcement.priority)}>
                          {announcement.priority}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getTargetAudienceIcon(announcement.targetAudience)}
                          {announcement.targetAudience === 'all' ? 'All Employees' : 
                           announcement.targetAudience === 'employees' ? 'Employees Only' : 'Admins & Managers'}
                        </Badge>
                        {!announcement.isPublished && (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Created: {new Date(announcement.createdAt).toLocaleDateString()}</span>
                        {announcement.expiresAt && (
                          <span>Expires: {new Date(announcement.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                      
                      {/* Phase 3: Message Reactions */}
                      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <MessageReactions 
                          messageId={announcement.id} 
                          existingReactions={announcement.reactions || []} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AnnouncementsPage() {
  return (
    <AdminLayout currentTab="announcements">
      <AnnouncementsContent />
    </AdminLayout>
  );
}