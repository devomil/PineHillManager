import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export interface WebSocketMessage {
  type: string;
  channel?: string;
  data?: any;
  message?: string;
  eventType?: string;
  timestamp?: string;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // Use current host (includes port automatically)
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      if (import.meta.env.DEV) console.log("Connecting to WebSocket:", wsUrl);
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        if (import.meta.env.DEV) console.log("WebSocket connected");
        
        // Send initial ping
        send({ type: "ping" });
      };

      socketRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Handle different message types
          switch (message.type) {
            case "connected":
              if (import.meta.env.DEV) console.log("WebSocket welcomed:", message.message);
              break;
            case "pong":
              // Keep-alive response
              break;
            case "notification":
              if (message.data) {
                toast({
                  title: message.data.title || "Notification",
                  description: message.data.message,
                  variant: message.data.type === "error" ? "destructive" : "default",
                });
              }
              break;
            case "update":
              // Handle real-time updates (refresh queries, etc.)
              console.log("Real-time update received:", message.data);
              break;
            case "analytics_update":
              // Handle analytics updates
              console.log("Analytics update received:", message.eventType, message.data);
              break;
            case "subscribed":
              // Handle successful subscription
              if (import.meta.env.DEV) console.log("Successfully subscribed to channel");
              break;
            default:
              console.log("Unknown message type:", message.type);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      socketRef.current.onclose = () => {
        setIsConnected(false);
        if (import.meta.env.DEV) console.log("WebSocket disconnected");
        
        // Attempt to reconnect if not intentionally closed
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            if (import.meta.env.DEV) console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
            connect();
          }, delay);
        } else {
          toast({
            title: "Connection Lost",
            description: "Unable to maintain real-time connection. Please refresh the page.",
            variant: "destructive",
          });
        }
      };

      socketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setIsConnected(false);
  };

  const send = (message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected. Message not sent:", message);
    }
  };

  const subscribe = (channel: string) => {
    send({ type: "subscribe", channel });
  };

  const unsubscribe = (channel: string) => {
    send({ type: "unsubscribe", channel });
  };

  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []);

  // Keep-alive ping every 30 seconds
  useEffect(() => {
    if (isConnected) {
      const pingInterval = setInterval(() => {
        send({ type: "ping" });
      }, 30000);

      return () => clearInterval(pingInterval);
    }
  }, [isConnected]);

  return {
    isConnected,
    lastMessage,
    send,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
  };
}

// Hook for subscribing to specific channels
export function useWebSocketSubscription(channel: string) {
  const { isConnected, lastMessage, subscribe, unsubscribe } = useWebSocket();
  const [channelMessages, setChannelMessages] = useState<WebSocketMessage[]>([]);

  useEffect(() => {
    if (isConnected) {
      subscribe(channel);
      
      return () => {
        unsubscribe(channel);
      };
    }
  }, [isConnected, channel]);

  useEffect(() => {
    if (lastMessage) {
      // For analytics channel, listen to analytics_update messages
      if (channel === 'analytics' && lastMessage.type === 'analytics_update') {
        setChannelMessages(prev => [...prev, lastMessage]);
      }
      // For other channels, use the channel property
      else if (lastMessage.channel === channel) {
        setChannelMessages(prev => [...prev, lastMessage]);
      }
    }
  }, [lastMessage, channel]);

  return {
    isConnected,
    messages: channelMessages,
    latestMessage: channelMessages[channelMessages.length - 1],
  };
}
