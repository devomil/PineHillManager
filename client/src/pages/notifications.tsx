import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Home, Menu, Check, RotateCcw, Bell, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import type { Notification } from "@shared/schema";
import NotificationSettings from "@/components/notification-settings";
import NotificationDemo from "@/components/notification-demo";
import { notificationHref } from "@/components/notification-bell";

const PAGE_SIZE = 25;

type NotificationsResponse = {
  items: Notification[];
  total: number;
  unreadCount: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

function NotificationsList() {
  const [, setLocation] = useLocation();
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const undoDelete = async (token: string) => {
    try {
      const res = await apiRequest("POST", "/api/notifications/undo-delete", { token });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: data.count > 1 ? `Restored ${data.count} notifications` : "Notification restored",
      });
    } catch (err: any) {
      toast({
        title: "Couldn't undo",
        description: "The undo window has expired.",
        variant: "destructive",
      });
    }
  };

  const showUndoToast = (message: string, token: string | null) => {
    if (!token) return;
    toast({
      title: message,
      duration: 10000,
      action: (
        <ToastAction altText="Undo delete" onClick={() => undoDelete(token)}>
          Undo
        </ToastAction>
      ),
    });
  };

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications", { limit: pageSize, offset: 0 }],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?limit=${pageSize}&offset=0`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load notifications");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  };

  const markRead = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/notifications/${id}/read`),
    onSuccess: invalidate,
  });

  const markUnread = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/notifications/${id}/unread`),
    onSuccess: invalidate,
  });

  const markAll = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/mark-all-read"),
    onSuccess: invalidate,
  });

  const deleteOne = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/notifications/${id}`);
      return res.json() as Promise<{ undoToken: string | null }>;
    },
    onSuccess: (data) => {
      invalidate();
      showUndoToast("Notification deleted", data?.undoToken ?? null);
    },
  });

  const clearRead = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/notifications/clear-read");
      return res.json() as Promise<{ count: number; undoToken: string | null }>;
    },
    onSuccess: (data) => {
      invalidate();
      if (data?.count > 0) {
        showUndoToast(
          data.count === 1 ? "1 notification cleared" : `${data.count} notifications cleared`,
          data?.undoToken ?? null,
        );
      }
    },
  });

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  const openNotification = (n: Notification) => {
    if (!n.isRead) markRead.mutate(n.id);
    setLocation(notificationHref(n));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-xl">All Notifications</CardTitle>
          <div className="text-sm text-muted-foreground mt-1">
            {total === 0
              ? "You're all caught up"
              : `${total} total${unreadCount > 0 ? ` · ${unreadCount} unread` : ""}`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              data-testid="button-notifications-mark-all"
            >
              <Check className="w-4 h-4 mr-2" /> Mark all read
            </Button>
          )}
          {total - unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearRead.mutate()}
              disabled={clearRead.isPending}
              data-testid="button-notifications-clear-read"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Clear all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading notifications…
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <div className="text-sm">No notifications yet</div>
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((n) => (
              <li
                key={n.id}
                className={`group flex items-start gap-3 py-3 px-2 -mx-2 rounded ${
                  !n.isRead ? "bg-blue-50/60 dark:bg-blue-950/30" : ""
                }`}
                data-testid={`notification-row-${n.id}`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                    !n.isRead ? "bg-blue-600" : "bg-transparent border border-gray-300"
                  }`}
                  aria-label={n.isRead ? "Read" : "Unread"}
                />
                <button
                  type="button"
                  onClick={() => openNotification(n)}
                  className="flex-1 text-left min-w-0"
                  data-testid={`notification-link-${n.id}`}
                >
                  <div className="text-sm font-medium truncate">{n.title}</div>
                  {n.body && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
                      {n.body}
                    </div>
                  )}
                  {n.sentAt && (
                    <div className="text-[11px] text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(n.sentAt), { addSuffix: true })}
                    </div>
                  )}
                </button>
                <div className="flex-shrink-0 flex items-center gap-1">
                  {n.isRead ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markUnread.mutate(n.id)}
                      disabled={markUnread.isPending}
                      title="Mark as unread"
                      data-testid={`button-mark-unread-${n.id}`}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markRead.mutate(n.id)}
                      disabled={markRead.isPending}
                      title="Mark as read"
                      data-testid={`button-mark-read-${n.id}`}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteOne.mutate(n.id)}
                    disabled={deleteOne.isPending}
                    title="Delete notification"
                    data-testid={`button-delete-notification-${n.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {hasMore && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageSize((s) => s + PAGE_SIZE)}
              data-testid="button-load-more-notifications"
            >
              Load more
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SettingsPane() {
  return (
    <div className="space-y-8">
      <NotificationSettings />
      <NotificationDemo />
    </div>
  );
}

export default function NotificationsPage() {
  const [isSettings] = useRoute("/notifications/settings");
  const [, setLocation] = useLocation();
  const tab = isSettings ? "settings" : "all";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <Menu className="h-4 w-4" />
            Main Menu
          </Button>
        </Link>
      </div>

      <div className="max-w-4xl">
        <Tabs
          value={tab}
          onValueChange={(v) =>
            setLocation(v === "settings" ? "/notifications/settings" : "/notifications")
          }
        >
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-notifications-all">
              All Notifications
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-notifications-settings">
              Settings
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <NotificationsList />
          </TabsContent>
          <TabsContent value="settings" className="mt-4">
            <SettingsPane />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
