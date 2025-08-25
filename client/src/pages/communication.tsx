import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Megaphone, MessageSquare, Plus, Send, Users, AlertTriangle, Smartphone, History, CheckCircle, Check, X, ThumbsUp, HelpCircle, Hash } from "lucide-react";
import { format } from "date-fns";
import { MessageReactions } from "@/components/ui/message-reactions";

export default function Communication() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState("announcements");
  
  // Communication form state
  const [showNewCommunication, setShowNewCommunication] = useState(false);
  const [communicationType, setCommunicationType] = useState<'announcement' | 'message'>('message');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'emergency' | 'high' | 'normal' | 'low'>('normal');
  const [sendSMS, setSendSMS] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [targetAudience, setTargetAudience] = useState<string>('all');
  const [recipientMode, setRecipientMode] = useState<'audience' | 'individual' | 'channel'>('audience');

  // Data queries
  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ["/api/announcements/published"],
    enabled: isAuthenticated,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/communications/history"],
    enabled: isAuthenticated,
  });
  
  // All employees can now see team members for communication
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    enabled: isAuthenticated,
  });

  // Fetch available channels for team communication
  const { data: channels = [] } = useQuery({
    queryKey: ["/api/channels"],
    enabled: isAuthenticated,
  });
  
  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
    enabled: isAuthenticated,
  });

  // Communication history
  const { data: communicationHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["/api/communications/history"],
    enabled: isAuthenticated,
  });

  // Mutations
  const sendCommunicationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Communication Sent",
        description: "Your message has been sent successfully",
      });
      // Reset form
      setShowNewCommunication(false);
      setSubject('');
      setContent('');
      setPriority('normal');
      setSendSMS(false);
      setSelectedRecipients([]);
      setTargetAudience('all');
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/communications/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/published"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
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

  const handleSendCommunication = () => {
    if (!subject.trim() || !content.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both subject and message content",
        variant: "destructive",
      });
      return;
    }

    const data = {
      subject: subject.trim(),
      content: content.trim(),
      priority,
      messageType: communicationType === 'announcement' ? 'announcement' : 'broadcast',
      smsEnabled: sendSMS,
      recipientMode,
      ...(recipientMode === 'audience' && { targetAudience }),
      ...(recipientMode === 'individual' && { recipients: selectedRecipients }),
      ...(recipientMode === 'channel' && { selectedChannels }),
    };

    sendCommunicationMutation.mutate(data);
  };

  const canSelectAllEmployees = () => {
    // On communication page, ALL employees can send to "All employees"
    return true;
  };

  const canSelectAdminManagerOptions = () => {
    // Only admins and managers can select "Admins & Managers" option
    return user?.role === 'admin' || user?.role === 'manager';
  };

  const canSelectMultipleRecipients = () => {
    // ALL employees can now select multiple individual recipients and channels
    return true; // Removed role restriction - all employees can select multiple recipients
  };

  const getAudienceOptions = () => {
    const options = [];
    
    if (canSelectAllEmployees()) {
      options.push({ value: 'all', label: 'All Employees', icon: Users });
    }
    
    if (canSelectAdminManagerOptions()) {
      options.push({ value: 'role:admin', label: 'Admins Only', icon: AlertTriangle });
      options.push({ value: 'role:manager', label: 'Managers Only', icon: Users });
      options.push({ value: 'admin_manager', label: 'Admins & Managers', icon: AlertTriangle });
    }
    
    // Store-specific options
    locations.forEach((location: any) => {
      const storeKey = location.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      options.push({ 
        value: `store:${storeKey}`, 
        label: `${location.name} Staff`, 
        icon: Users 
      });
    });
    
    return options;
  };

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
        <h1 className="text-2xl font-bold text-slate-900">Communication Center</h1>
        <p className="text-slate-500 mt-1">
          Send announcements and messages to team members via app and SMS
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Dialog open={showNewCommunication} onOpenChange={setShowNewCommunication}>
          <DialogTrigger asChild>
            <Button className="bg-farm-blue hover:bg-blue-600">
              <Send className="w-4 h-4 mr-2" />
              Send Communication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send New Communication</DialogTitle>
              <DialogDescription>
                Send messages to team members via app notifications and SMS
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Communication Type */}
              <div className="space-y-2">
                <Label>Communication Type</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="message"
                      name="type"
                      checked={communicationType === 'message'}
                      onChange={() => setCommunicationType('message')}
                      className="radio"
                    />
                    <Label htmlFor="message">Message</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="announcement"
                      name="type"
                      checked={communicationType === 'announcement'}
                      onChange={() => setCommunicationType('announcement')}
                      className="radio"
                    />
                    <Label htmlFor="announcement">Announcement</Label>
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter subject or title..."
                  className="w-full"
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Message Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                  className="w-full"
                />
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority Level</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="normal">Normal Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="emergency">🚨 Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recipient Selection Mode */}
              <div className="space-y-2">
                <Label>Send To</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="audience"
                      name="recipientMode"
                      checked={recipientMode === 'audience'}
                      onChange={() => setRecipientMode('audience')}
                      className="radio"
                    />
                    <Label htmlFor="audience">Group/Audience</Label>
                  </div>
                  {canSelectMultipleRecipients() && (
                    <>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="individual"
                          name="recipientMode"
                          checked={recipientMode === 'individual'}
                          onChange={() => setRecipientMode('individual')}
                          className="radio"
                        />
                        <Label htmlFor="individual">Team Members</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="channel"
                          name="recipientMode"
                          checked={recipientMode === 'channel'}
                          onChange={() => setRecipientMode('channel')}
                          className="radio"
                        />
                        <Label htmlFor="channel">Channels</Label>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Audience Selection */}
              {recipientMode === 'audience' && (
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAudienceOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center">
                            <option.icon className="w-4 h-4 mr-2" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Individual Recipients Selection */}
              {recipientMode === 'individual' && canSelectMultipleRecipients() && (
                <div className="space-y-2">
                  <Label>Select Team Members</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                    {Array.isArray(employees) && employees.length > 0 ? employees.map((employee: any) => (
                      <div key={employee.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          checked={selectedRecipients.includes(employee.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRecipients([...selectedRecipients, employee.id]);
                            } else {
                              setSelectedRecipients(selectedRecipients.filter(id => id !== employee.id));
                            }
                          }}
                        />
                        <span className="text-sm">
                          {employee.firstName} {employee.lastName}
                          <span className="text-gray-500 ml-2">({employee.role})</span>
                        </span>
                      </div>
                    )) : (
                      <p className="text-sm text-gray-500 py-2">Loading team members...</p>
                    )}
                  </div>
                </div>
              )}

              {/* Channel Selection */}
              {recipientMode === 'channel' && canSelectMultipleRecipients() && (
                <div className="space-y-2">
                  <Label>Select Channels</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                    {Array.isArray(channels) && channels.length > 0 ? channels.map((channel: any) => (
                      <div key={channel.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          checked={selectedChannels.includes(channel.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedChannels([...selectedChannels, channel.id]);
                            } else {
                              setSelectedChannels(selectedChannels.filter(id => id !== channel.id));
                            }
                          }}
                        />
                        <span className="text-sm flex items-center">
                          <Hash className="w-3 h-3 mr-1" />
                          {channel.name}
                          {channel.description && (
                            <span className="text-gray-500 ml-2">- {channel.description}</span>
                          )}
                        </span>
                      </div>
                    )) : (
                      <div className="text-sm text-gray-500 py-2">
                        <p>No channels available yet.</p>
                        <p className="text-xs mt-1">Channels like General, Lake Geneva Retail, Watertown Retail, and Watertown Spa will appear here once they're set up.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SMS Option */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={sendSMS}
                    onCheckedChange={(checked) => setSendSMS(!!checked)}
                  />
                  <Label className="flex items-center">
                    <Smartphone className="w-4 h-4 mr-1" />
                    Also send via SMS
                  </Label>
                </div>
                <p className="text-xs text-gray-500">
                  SMS will be sent to consenting recipients based on their notification preferences
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewCommunication(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendCommunication} 
                disabled={sendCommunicationMutation.isPending}
                className="bg-farm-blue hover:bg-blue-600"
              >
                {sendCommunicationMutation.isPending ? "Sending..." : "Send Communication"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="messages">Team Messages</TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-1" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Megaphone className="w-5 h-5 mr-2 text-farm-green" />
                Company Announcements
              </CardTitle>
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
                      className="border-l-4 border-farm-green pl-4 py-3 border border-slate-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-900">
                          {announcement.title}
                        </h4>
                        <Badge 
                          variant={announcement.priority === 'urgent' ? 'destructive' : 'secondary'}
                        >
                          {announcement.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {announcement.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400">
                          {format(new Date(announcement.publishedAt), 'PPp')}
                        </p>
                        <MessageReactions messageId={announcement.id} />
                      </div>
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
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-farm-blue" />
                Team Messages
              </CardTitle>
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
                  {messages.filter((msg: any) => msg.messageType !== 'announcement').map((message: any) => (
                    <div
                      key={message.id}
                      className="border border-slate-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-900">
                          {message.subject}
                        </h4>
                        <div className="flex items-center gap-2">
                          {message.smsEnabled && (
                            <Badge variant="outline">
                              <Smartphone className="w-3 h-3 mr-1" />
                              SMS
                            </Badge>
                          )}
                          <span className="text-xs text-slate-400">
                            {format(new Date(message.sentAt), 'PPp')}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {message.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{message.targetAudience}</Badge>
                        <MessageReactions messageId={message.id} />
                      </div>
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
                    onClick={() => setShowNewCommunication(true)}
                  >
                    Send your first message
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="w-5 h-5 mr-2 text-slate-600" />
                Communication History
              </CardTitle>
              <CardDescription>
                View all messages and announcements sent and received
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex justify-between items-start mb-2">
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-200 rounded w-20"></div>
                      </div>
                      <div className="h-3 bg-slate-200 rounded w-1/2 mb-2"></div>
                      <div className="flex gap-2">
                        <div className="h-6 bg-slate-200 rounded w-16"></div>
                        <div className="h-6 bg-slate-200 rounded w-12"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : communicationHistory.length > 0 ? (
                <div className="space-y-4">
                  {communicationHistory.map((item: any) => (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-4 ${
                        !item.isRead ? 'border-farm-blue bg-blue-50' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-slate-900">
                              {item.subject || item.title}
                            </h4>
                            {!item.isRead && (
                              <Badge variant="secondary" className="text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mb-2">
                            {item.content}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">
                            {format(new Date(item.sentAt || item.publishedAt), 'MMM d, h:mm a')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          {/* Message Type Badge */}
                          <Badge 
                            variant={item.messageType === 'announcement' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {item.messageType === 'announcement' ? 'Announcement' : 'Message'}
                          </Badge>
                          
                          {/* Priority Badge */}
                          {item.priority && item.priority !== 'normal' && (
                            <Badge 
                              variant={
                                item.priority === 'emergency' ? 'destructive' :
                                item.priority === 'high' ? 'default' : 'secondary'
                              }
                              className="text-xs"
                            >
                              {item.priority === 'emergency' ? '🚨 Emergency' : 
                               item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                            </Badge>
                          )}
                          
                          {/* SMS Enabled Badge */}
                          {item.smsEnabled && (
                            <Badge variant="outline" className="text-xs">
                              <Smartphone className="w-3 h-3 mr-1" />
                              SMS
                            </Badge>
                          )}
                          
                          {/* Target Audience */}
                          <Badge variant="outline" className="text-xs">
                            {item.targetAudience === 'all' ? 'All Employees' :
                             item.targetAudience === 'admin_manager' ? 'Admins & Managers' :
                             item.targetAudience.startsWith('role:') ? `${item.targetAudience.replace('role:', '')}s`.replace(/^./, (c: string) => c.toUpperCase()) :
                             item.targetAudience.startsWith('store:') ? `${item.targetAudience.replace('store:', '').replace(/_/g, ' ')} Staff` :
                             'Custom'}
                          </Badge>
                        </div>

                        {/* Message Reactions */}
                        <div className="flex items-center gap-2">
                          {item.reactions && (
                            <MessageReactions 
                              messageId={item.id} 
                              existingReactions={item.reactions} 
                              className="text-xs"
                            />
                          )}
                          
                          {/* Mark as Read Button */}
                          {!item.isRead && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await fetch(`/api/communications/${item.id}/read`, {
                                    method: 'POST',
                                    credentials: 'include'
                                  });
                                  queryClient.invalidateQueries({ 
                                    queryKey: ["/api/communications/history"] 
                                  });
                                  toast({
                                    title: "Message marked as read",
                                    description: "The message has been marked as read",
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to mark message as read",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Mark Read
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Delivery Status (for sent messages) */}
                      {item.senderId === user?.id && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Sent to {item.recipients?.total || 'N/A'} recipients
                            </div>
                            {item.recipients?.smsNotifications > 0 && (
                              <div className="flex items-center gap-1">
                                <Smartphone className="w-3 h-3" />
                                {item.recipients.smsNotifications} SMS sent
                              </div>
                            )}
                            {item.recipients?.errors > 0 && (
                              <div className="flex items-center gap-1 text-red-500">
                                <AlertTriangle className="w-3 h-3" />
                                {item.recipients.errors} errors
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Load More Button */}
                  <div className="text-center mt-6">
                    <Button variant="outline" onClick={() => {
                      // TODO: Implement pagination
                      toast({
                        title: "Load More",
                        description: "Pagination coming soon",
                      });
                    }}>
                      Load More Messages
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No communication history yet</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Messages and announcements will appear here once sent or received
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
