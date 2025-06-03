import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Plus, Send, Users, Hash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ChatChannel, Message, User } from "@shared/schema";

interface QuickChatProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function QuickChat({ isOpen, onToggle }: QuickChatProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user's chat channels
  const { data: channels = [] } = useQuery<ChatChannel[]>({
    queryKey: ["/api/chat/channels"],
    enabled: isOpen,
  });

  // Fetch all users for direct messages
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/employees"],
    enabled: isOpen,
  });

  // Fetch messages for selected channel
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/chat/channels", selectedChannel, "messages"],
    enabled: !!selectedChannel,
  });

  // WebSocket connection
  useEffect(() => {
    if (isOpen && !ws) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("WebSocket connected");
        setWs(socket);
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'channel_message' && data.channelId === selectedChannel) {
          queryClient.invalidateQueries({ queryKey: ["/api/chat/channels", selectedChannel, "messages"] });
        }
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected");
        setWs(null);
      };

      return () => {
        socket.close();
      };
    }
  }, [isOpen, selectedChannel, queryClient, ws]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string; channelId?: string; recipientId?: string }) => {
      if (messageData.channelId) {
        return apiRequest(`/api/chat/channels/${messageData.channelId}/messages`, "POST", { content: messageData.content });
      } else {
        return apiRequest("/api/chat/direct", "POST", {
          content: messageData.content,
          recipientId: messageData.recipientId,
        });
      }
    },
    onSuccess: () => {
      setMessageText("");
      if (selectedChannel) {
        queryClient.invalidateQueries({ queryKey: ["/api/chat/channels", selectedChannel, "messages"] });
      }
    },
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async (channelData: { name: string; description?: string; type: string; isPrivate: boolean }) => {
      return apiRequest("/api/chat/channels", "POST", channelData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/channels"] });
      setNewChannelOpen(false);
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedChannel) return;

    sendMessageMutation.mutate({
      content: messageText,
      channelId: selectedChannel,
    });
  };

  const handleCreateChannel = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createChannelMutation.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as string,
      isPrivate: formData.get("type") === "private",
    });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[500px] shadow-lg z-50 flex flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Quick Chat
          </CardTitle>
          <div className="flex items-center gap-2">
            <Dialog open={newChannelOpen} onOpenChange={setNewChannelOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Channel</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateChannel} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Channel Name</Label>
                    <Input id="name" name="name" placeholder="e.g., general, announcements" required />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" placeholder="What's this channel for?" />
                  </div>
                  <div>
                    <Label htmlFor="type">Channel Type</Label>
                    <Select name="type" defaultValue="public">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={createChannelMutation.isPending}>
                    {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button onClick={onToggle} size="sm" variant="ghost">
              ×
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        <Tabs value={selectedChannel || "channels"} onValueChange={setSelectedChannel} className="flex-1 flex flex-col">
          <TabsList className="flex-shrink-0 mx-3">
            <TabsTrigger value="channels" className="flex items-center gap-2">
              <Hash className="h-3 w-3" />
              Channels
            </TabsTrigger>
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <Users className="h-3 w-3" />
              Direct
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="channels" className="flex-1 flex flex-col mt-0">
            <div className="flex-shrink-0 px-3 py-2 border-b">
              <div className="space-y-1">
                {channels.map((channel) => (
                  <Button
                    key={channel.id}
                    variant={selectedChannel === channel.id.toString() ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setSelectedChannel(channel.id.toString())}
                  >
                    <Hash className="h-3 w-3 mr-2" />
                    {channel.name}
                    {channel.isPrivate && <Badge variant="secondary" className="ml-auto text-xs">Private</Badge>}
                  </Button>
                ))}
              </div>
            </div>
            
            {selectedChannel && (
              <>
                <ScrollArea className="flex-1 px-3">
                  <div className="space-y-2 py-2">
                    {messages.map((message) => (
                      <div key={message.id} className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-sm">
                            {users.find(u => u.id === message.senderId)?.firstName || 'Unknown User'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {message.sentAt ? formatDistanceToNow(new Date(message.sentAt), { addSuffix: true }) : 'Now'}
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                <div className="flex-shrink-0 p-3 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type a message..."
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      onClick={handleSendMessage}
                      size="icon"
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="direct" className="flex-1 flex flex-col mt-0">
            <div className="flex-shrink-0 px-3 py-2 border-b">
              <div className="space-y-1">
                {users.filter(u => u.id !== user?.id).map((otherUser) => (
                  <Button
                    key={otherUser.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setSelectedChannel(`direct-${otherUser.id}`)}
                  >
                    <Users className="h-3 w-3 mr-2" />
                    {otherUser.firstName} {otherUser.lastName}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a person to start chatting
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}