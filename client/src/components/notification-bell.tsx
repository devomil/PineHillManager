import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@shared/schema";
import { useState } from "react";

function notificationHref(n: Notification): string {
  switch (n.type) {
    case "quick_connect_assigned":
      return `/practitioner?source=notification&contactId=${n.relatedId ?? ""}`;
    case "time_off_request":
    case "shift_coverage":
    case "approval_decision":
      return "/time";
    case "urgent_message":
    case "message":
      return "/communication";
    default:
      return "/notifications";
  }
}

export default function NotificationBell() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const unread = notifications.filter((n) => !n.isRead);
  const recent = notifications.slice(0, 10);

  const markRead = useMutation({
    mutationFn: async (id: number) => apiRequest("POST", `/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/notifications/mark-all-read"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const handleClick = (n: Notification) => {
    if (!n.isRead) markRead.mutate(n.id);
    setOpen(false);
    setLocation(notificationHref(n));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          data-testid="button-notifications"
          aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ""}`}
        >
          <Bell className="w-5 h-5" />
          {unread.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full text-xs bg-red-500 text-white flex items-center justify-center">
              {unread.length > 99 ? "99+" : unread.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold text-sm">Notifications</div>
          {unread.length > 0 && (
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              data-testid="button-mark-all-read"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {recent.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No notifications yet</div>
          ) : (
            <ul className="divide-y">
              {recent.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    data-testid={`notification-item-${n.id}`}
                    className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      !n.isRead ? "bg-blue-50/60 dark:bg-blue-950/30" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{n.title}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {n.body}
                        </div>
                        {n.sentAt && (
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {formatDistanceToNow(new Date(n.sentAt), { addSuffix: true })}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setOpen(false);
              setLocation("/notifications");
            }}
            data-testid="button-view-all-notifications"
          >
            View all
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
