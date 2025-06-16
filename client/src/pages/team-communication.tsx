import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Users, Hash, MapPin, Clock, Wifi, WifiOff } from "lucide-react";
import { format } from "date-fns";

export default function TeamCommunication() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("general");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages for the selected channel
  const { data: messages = [] } = useQuery({
    queryKey: ["/api/messages", selectedChannel],
    queryFn: async () => {
      const response = await fetch(`/api/messages?channel=${selectedChannel}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  // Fetch available channels
  const { data: channels = [] } = useQuery({
    queryKey: ["/api/chat-channels"],
    queryFn: async () => {
      const response = await fetch("/api/chat-channels", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch channels");
      return response.json();
    }
  });

  // Fetch employee presence data with location and work status
  const { data: employeePresence = [] } = useQuery({
    queryKey: ["/api/user-presence"],
    queryFn: async () => {
      const response = await fetch("/api/user-presence", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch employee presence");
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch store locations for channels
  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const response = await fetch("/api/locations", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string; channelId: string }) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedChannel] });
      setNewMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate({
        content: newMessage.trim(),
        channelId: selectedChannel
      });
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create channels based on store locations
  const createChannelsFromLocations = () => {
    const generalChannel = { id: "general", name: "General", description: "General team discussion" };
    
    if (locations.length > 0) {
      const locationChannels = locations.map((location: any) => ({
        id: `location-${location.id}`,
        name: location.name,
        description: `Discussion for ${location.name} team`
      }));
      return [generalChannel, ...locationChannels];
    }
    
    // Fallback channels if locations haven't loaded yet
    return [
      generalChannel,
      { id: "location-1", name: "Lake Geneva Retail", description: "Discussion for Lake Geneva Retail team" },
      { id: "location-2", name: "Watertown Retail", description: "Discussion for Watertown Retail team" },
      { id: "location-3", name: "Watertown Spa", description: "Discussion for Watertown Spa team" }
    ];
  };

  const allChannels = createChannelsFromLocations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
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
                <p className="text-sm text-gray-600">Team Communication</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Channels Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Channels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {allChannels.map((channel: any) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedChannel === channel.id
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4" />
                      <span className="font-medium">{channel.name}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{channel.description}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Employee Presence */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Team Members</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {employeePresence?.filter((emp: any) => emp.isWorking).length || 0} active
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {employeePresence?.length > 0 ? (
                    employeePresence.map((employee: any) => (
                      <div key={employee.userId} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
                        <div className="flex-shrink-0">
                          {employee.isWorking ? (
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          ) : employee.status === 'online' ? (
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          ) : employee.status === 'away' ? (
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          ) : (
                            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium truncate">
                              {employee.firstName} {employee.lastName}
                            </span>
                            {employee.userId === user?.id && (
                              <Badge variant="secondary" className="text-xs">You</Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            {employee.isWorking && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3 text-green-600" />
                                <span className="text-xs text-green-600">Working</span>
                              </div>
                            )}
                            {employee.currentLocation && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3 text-blue-600" />
                                <span className="text-xs text-blue-600 truncate">
                                  {employee.currentLocation}
                                </span>
                              </div>
                            )}
                            {employee.status === 'on_break' && (
                              <Badge variant="outline" className="text-xs">Break</Badge>
                            )}
                          </div>
                          {employee.statusMessage && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {employee.statusMessage}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            Last seen: {employee.lastSeen ? format(new Date(employee.lastSeen), 'MMM d, h:mm a') : 'Unknown'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <WifiOff className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No team members online</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center space-x-2">
                  <Hash className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-lg">
                    {allChannels.find((c: any) => c.id === selectedChannel)?.name || "General"}
                  </CardTitle>
                </div>
              </CardHeader>
              
              {/* Messages Area */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length > 0 ? (
                  <>
                    {messages.map((message: any) => (
                      <div key={message.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {message.senderName?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {message.senderName || 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {message.sentAt ? format(new Date(message.sentAt), "MMM d, h:mm a") : 'Just now'}
                            </span>
                          </div>
                          <p className="text-gray-700">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                      <p className="text-gray-500">Start the conversation in this channel</p>
                    </div>
                  </div>
                )}
              </CardContent>

              {/* Message Input */}
              <div className="border-t p-4">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message #${allChannels.find((c: any) => c.id === selectedChannel)?.name || "general"}`}
                    className="flex-1"
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button 
                    type="submit" 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}