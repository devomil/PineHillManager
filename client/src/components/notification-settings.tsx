import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Bell, BellOff, Check, X } from "lucide-react";
import { notificationService } from "@/lib/notifications";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function NotificationSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
  });

  const { data: unreadCount } = useQuery({
    queryKey: ["/api/notifications/unread"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
    },
  });

  useEffect(() => {
    const initializeNotifications = async () => {
      // Check if notifications are supported
      const permission = notificationService.getPermissionStatus();
      setNotificationsEnabled(permission.granted);

      // Initialize service worker
      await notificationService.initialize();
    };

    initializeNotifications();
  }, []);

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      // Request permission
      const permission = await notificationService.requestPermission();
      
      if (permission.granted) {
        // Subscribe to push notifications
        const subscription = await notificationService.subscribeToPush();
        
        if (subscription) {
          setNotificationsEnabled(true);
          setIsSubscribed(true);
          toast({
            title: "Notifications Enabled",
            description: "You'll receive push notifications for time-sensitive approvals.",
          });
        } else {
          toast({
            title: "Subscription Failed",
            description: "Unable to set up push notifications.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Permission Denied",
          description: "Please allow notifications in your browser settings.",
          variant: "destructive",
        });
      }
    } else {
      setNotificationsEnabled(false);
      setIsSubscribed(false);
      toast({
        title: "Notifications Disabled",
        description: "You won't receive push notifications anymore.",
      });
    }
  };

  const handleTestNotification = async () => {
    if (notificationsEnabled) {
      await notificationService.showLocalNotification({
        title: "Test Notification",
        body: "This is a test notification from Pine Hill Farm employee portal.",
        tag: "test",
      });
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'time_off_request':
        return 'Time Off Request';
      case 'shift_coverage':
        return 'Shift Coverage';
      case 'approval_decision':
        return 'Approval Decision';
      case 'urgent_message':
        return 'Message';
      default:
        return 'General';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'time_off_request':
        return 'bg-blue-100 text-blue-800';
      case 'shift_coverage':
        return 'bg-yellow-100 text-yellow-800';
      case 'approval_decision':
        return 'bg-green-100 text-green-800';
      case 'urgent_message':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Push Notifications</h3>
              <p className="text-sm text-slate-500">
                Get notified about time-sensitive approvals and updates
              </p>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={handleToggleNotifications}
            />
          </div>

          {notificationsEnabled && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-green-600">
                <Check className="w-3 h-3 mr-1" />
                Enabled
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
              >
                Test Notification
              </Button>
            </div>
          )}

          {!notificationsEnabled && (
            <Badge variant="secondary" className="text-slate-600">
              <BellOff className="w-3 h-3 mr-1" />
              Disabled
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Notifications</CardTitle>
            {unreadCount?.count > 0 && (
              <Badge variant="destructive">{unreadCount.count} unread</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {notifications && notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification: any) => (
                <div
                  key={notification.id}
                  className={`p-3 border rounded-lg ${
                    notification.isRead ? 'bg-slate-50' : 'bg-white border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getNotificationColor(notification.type)}`}
                        >
                          {getNotificationTypeLabel(notification.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{notification.body}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(notification.sentAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        disabled={markAsReadMutation.isPending}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No notifications yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}