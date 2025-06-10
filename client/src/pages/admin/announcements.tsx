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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Send, Save, Calendar, Users, AlertTriangle } from "lucide-react";

function AnnouncementsContent() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Fetch announcements
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAnnouncements();
    }
  }, [isAuthenticated, user]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/announcements');
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load announcements",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
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

                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Select name="targetAudience" defaultValue="all">
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      <SelectItem value="employees">Employees Only</SelectItem>
                      <SelectItem value="admins">Admins & Managers</SelectItem>
                    </SelectContent>
                  </Select>
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