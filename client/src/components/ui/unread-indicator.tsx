import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Bell, MessageSquare, Megaphone } from "lucide-react";

interface UnreadCounts {
  messages: number;
  announcements: number;
  total: number;
}

interface UnreadIndicatorProps {
  type?: 'total' | 'messages' | 'announcements';
  className?: string;
  showIcon?: boolean;
  showZero?: boolean;
}

export function UnreadIndicator({ 
  type = 'total', 
  className = '', 
  showIcon = false,
  showZero = false
}: UnreadIndicatorProps) {
  const { data: unreadCounts, isLoading, error } = useQuery<UnreadCounts>({
    queryKey: ['/api/communications/unread-counts'],
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true
  });

  // Debug logging
  console.log('UnreadIndicator:', { type, isLoading, error, unreadCounts });

  if (isLoading || !unreadCounts) {
    return null;
  }

  const count = type === 'messages' ? unreadCounts.messages 
              : type === 'announcements' ? unreadCounts.announcements 
              : unreadCounts.total;

  if (count === 0 && !showZero) {
    return null;
  }

  const getIcon = () => {
    if (!showIcon) return null;
    
    switch (type) {
      case 'messages':
        return <MessageSquare className="h-4 w-4" />;
      case 'announcements':
        return <Megaphone className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getBadgeVariant = () => {
    if (count === 0) return "secondary";
    if (count > 10) return "destructive";
    if (count > 5) return "default";
    return "default";
  };

  return (
    <div className={`flex items-center gap-1 ${className}`} data-testid={`unread-indicator-${type}`}>
      {getIcon()}
      <Badge 
        variant={getBadgeVariant()}
        className="h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs font-semibold"
      >
        {count > 99 ? '99+' : count}
      </Badge>
    </div>
  );
}

export function UnreadBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count === 0) return null;
  
  return (
    <Badge 
      variant={count > 10 ? "destructive" : "default"}
      className={`h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs font-semibold ${className}`}
    >
      {count > 99 ? '99+' : count}
    </Badge>
  );
}