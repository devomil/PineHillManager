import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, Users, AlertTriangle, Clock, Plus, Send, MessageSquare, BarChart3 } from "lucide-react";
import { format, isAfter, parseISO } from "date-fns";
import AdminLayout from "@/components/admin-layout";
import { MessageReactions } from "@/components/ui/message-reactions";
import { AnnouncementResponses } from "@/components/ui/announcement-responses";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: string;
  targetAudience: string;
  authorName: string;
  createdAt: string;
  expiresAt?: string;
  smsEnabled: boolean;
  reactions?: any[];
}

interface Communication {
  id: number;
  type: 'announcement' | 'direct_message' | 'group_message';
  title: string;
  content: string;
  priority: string;
  smsEnabled: boolean;
  targetAudience: string;
  authorName: string;
  createdAt: string;
  scheduledFor?: string;
  status: string;
}

function CommunicationsContent() {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("announcements");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state for creating communications
  const [formData, setFormData] = useState({
    type: 'announcement' as 'announcement' | 'direct_message' | 'group_message',
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    targetAudience: 'all',
    smsEnabled: false,
    scheduledFor: ''
  });

  // Fetch announcements (existing functionality)
  const { data: announcements = [], isLoading: announcementsLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements/published"],
    retry: 1,
  });

  // Create communication mutation
  const createCommunicationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/communications', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Communication sent successfully!" });
      setShowCreateDialog(false);
      setFormData({
        type: 'announcement',
        title: '',
        content: '',
        priority: 'normal',
        targetAudience: 'all',
        smsEnabled: false,
        scheduledFor: ''
      });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/published"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error sending communication", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleCreateCommunication = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ 
        title: "Missing required fields", 
        description: "Please fill in title and content",
        variant: "destructive" 
      });
      return;
    }

    createCommunicationMutation.mutate(formData);
  };

  // Utility functions (existing from announcements page)
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
    return <Users className="h-4 w-4" />;
  };

  const formatAudience = (audience: string) => {
    switch (audience) {
      case 'all': return 'All Staff';
      case 'employees-only': return 'Employees Only';
      case 'admins-managers': return 'Admins & Managers';
      case 'managers-only': return 'Managers Only';
      case 'admins-only': return 'Admins Only';
      case 'lake-geneva': return 'Lake Geneva Team';
      case 'watertown': return 'Watertown Team';
      case 'watertown-retail': return 'Watertown Retail';
      case 'watertown-spa': return 'Watertown Spa';
      case 'online-team': return 'Online Team';
      default: return audience.charAt(0).toUpperCase() + audience.slice(1);
    }
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return isAfter(new Date(), parseISO(expiresAt));
  };

  // Filter announcements
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

  if (announcementsLoading) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div></div>
        
        {/* Create Communication Button - Admin/Manager Only */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button 
                style={{
                  backgroundColor: '#1e40af',
                  borderColor: '#1e40af',
                  color: 'white',
                  fontWeight: '600'
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Communication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Communication</DialogTitle>
                <DialogDescription>
                  Send announcements, direct messages, or group communications
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Communication Type */}
                <div>
                  <Label htmlFor="type">Communication Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">📢 Announcement</SelectItem>
                      <SelectItem value="direct_message">💬 Direct Message</SelectItem>
                      <SelectItem value="group_message">👥 Group Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter communication title"
                  />
                </div>

                {/* Content */}
                <div>
                  <Label htmlFor="content">Message Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter your message content"
                    rows={4}
                  />
                </div>

                {/* Priority */}
                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">🔵 Low Priority</SelectItem>
                      <SelectItem value="normal">⚪ Normal Priority</SelectItem>
                      <SelectItem value="high">🟠 High Priority</SelectItem>
                      <SelectItem value="urgent">🔴 Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Audience */}
                <div>
                  <Label htmlFor="audience">Target Audience</Label>
                  <Select 
                    value={formData.targetAudience} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, targetAudience: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      <SelectItem value="employees-only">Employees Only</SelectItem>
                      <SelectItem value="admins-managers">Admins & Managers</SelectItem>
                      <SelectItem value="managers-only">Managers Only</SelectItem>
                      <SelectItem value="admins-only">Admins Only</SelectItem>
                      <SelectItem value="lake-geneva">Lake Geneva Team</SelectItem>
                      <SelectItem value="watertown">Watertown Team</SelectItem>
                      <SelectItem value="watertown-retail">Watertown Retail</SelectItem>
                      <SelectItem value="watertown-spa">Watertown Spa</SelectItem>
                      <SelectItem value="online-team">Online Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* SMS Enabled */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="smsEnabled"
                    checked={formData.smsEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, smsEnabled: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="smsEnabled">📱 Send SMS notifications</Label>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateCommunication}
                  disabled={createCommunicationMutation.isPending}
                  style={{
                    backgroundColor: '#1e40af',
                    borderColor: '#1e40af',
                    color: 'white',
                    fontWeight: '600'
                  }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {createCommunicationMutation.isPending ? 'Sending...' : 'Send Communication'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Messages
          </TabsTrigger>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          )}
        </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-6">
          {/* Filter Buttons */}
          <div className="mb-6 flex flex-wrap gap-2">
            <Button
              variant={selectedFilter === "all" ? "default" : "outline"}
              onClick={() => setSelectedFilter("all")}
              style={selectedFilter === "all" ? {
                backgroundColor: '#16a34a',
                borderColor: '#16a34a',
                color: 'white',
                fontWeight: '600'
              } : {
                backgroundColor: 'white',
                borderColor: '#d1d5db',
                color: '#374151'
              }}
            >
              All Announcements
            </Button>
            <Button
              variant={selectedFilter === "important" ? "default" : "outline"}
              onClick={() => setSelectedFilter("important")}
              style={selectedFilter === "important" ? {
                backgroundColor: '#dc2626',
                borderColor: '#dc2626',
                color: 'white',
                fontWeight: '600'
              } : {
                backgroundColor: 'white',
                borderColor: '#d1d5db',
                color: '#374151'
              }}
            >
              Important
            </Button>
            <Button
              variant={selectedFilter === "general" ? "default" : "outline"}
              onClick={() => setSelectedFilter("general")}
              style={selectedFilter === "general" ? {
                backgroundColor: '#1e40af',
                borderColor: '#1e40af',
                color: 'white',
                fontWeight: '600'
              } : {
                backgroundColor: 'white',
                borderColor: '#d1d5db',
                color: '#374151'
              }}
            >
              General
            </Button>
            <Button
              variant={selectedFilter === "policy" ? "default" : "outline"}
              onClick={() => setSelectedFilter("policy")}
              style={selectedFilter === "policy" ? {
                backgroundColor: '#7c3aed',
                borderColor: '#7c3aed',
                color: 'white',
                fontWeight: '600'
              } : {
                backgroundColor: 'white',
                borderColor: '#d1d5db',
                color: '#374151'
              }}
            >
              Policy Updates
            </Button>
          </div>

          {/* Announcements List */}
          {filteredAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matching announcements</h3>
                <p className="text-gray-500">
                  There are no announcements matching your current filter.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Current Announcements */}
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
                            <Badge className={getPriorityColor(announcement.priority)}>
                              {announcement.priority}
                            </Badge>
                            {announcement.smsEnabled && (
                              <Badge variant="outline" className="text-blue-600 border-blue-600">
                                📱 SMS
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-gray-700 leading-relaxed">
                          {announcement.content}
                        </p>
                        
                        {/* Message Reactions */}
                        <MessageReactions 
                          messageId={announcement.id} 
                        />
                        
                        {/* Announcement Responses */}
                        <AnnouncementResponses announcementId={announcement.id} />
                        
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <div className="flex items-center text-sm text-gray-500 space-x-4">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              Published {format(parseISO(announcement.createdAt), "MMM d, yyyy")}
                            </span>
                            <span className="flex items-center">
                              {getTargetAudienceIcon(announcement.targetAudience)}
                              <span className="ml-1">{formatAudience(announcement.targetAudience)}</span>
                            </span>
                          </div>
                          {announcement.expiresAt && (
                            <span className="flex items-center text-sm text-orange-600">
                              <Clock className="h-4 w-4 mr-1" />
                              Expires {format(parseISO(announcement.expiresAt), "MMM d, yyyy")}
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
                              <Badge className={getPriorityColor(announcement.priority)}>
                                {announcement.priority}
                              </Badge>
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                Expired
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-gray-700 leading-relaxed">
                            {announcement.content}
                          </p>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <div className="flex items-center text-sm text-gray-500 space-x-4">
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                Published {format(parseISO(announcement.createdAt), "MMM d, yyyy")}
                              </span>
                              <span className="flex items-center">
                                {getTargetAudienceIcon(announcement.targetAudience)}
                                <span className="ml-1">{formatAudience(announcement.targetAudience)}</span>
                              </span>
                            </div>
                            {announcement.expiresAt && (
                              <span className="flex items-center text-sm text-red-600">
                                <Clock className="h-4 w-4 mr-1" />
                                Expired {format(parseISO(announcement.expiresAt), "MMM d, yyyy")}
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
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Direct Messages</h3>
              <p className="text-gray-500 mb-4">
                Direct messaging functionality will be implemented in Phase 3.
              </p>
              <p className="text-sm text-gray-400">
                This will include one-on-one conversations, group chats, and SMS integration.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardContent className="text-center py-12">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Communication Analytics</h3>
              <p className="text-gray-500 mb-4">
                Analytics dashboard will be implemented in Phase 5.
              </p>
              <p className="text-sm text-gray-400">
                This will include delivery rates, engagement metrics, and SMS analytics.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CommunicationsPage() {
  return (
    <AdminLayout currentTab="communications">
      <div className="space-y-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            📢 Communications Hub
          </h2>
          <p className="text-gray-600">
            Unified platform for announcements, messages, and team communication with SMS integration.
          </p>
        </div>
        <CommunicationsContent />
      </div>
    </AdminLayout>
  );
}