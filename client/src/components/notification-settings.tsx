import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Smartphone, AlertCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function NotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    notifications,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    markAsRead
  } = useNotifications();
  
  const { toast } = useToast();
  const [isEnabling, setIsEnabling] = useState(false);

  const handleToggleNotifications = async () => {
    setIsEnabling(true);
    try {
      if (isSubscribed) {
        await unsubscribeFromPush.mutateAsync();
        toast({
          title: "Notifications Disabled",
          description: "You will no longer receive push notifications.",
        });
      } else {
        await subscribeToPush.mutateAsync();
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive important notifications on your device.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsRead.mutateAsync(notificationId);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read.",
        variant: "destructive",
      });
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications. Please use a modern browser to receive time-sensitive alerts.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Mobile Push Notifications
          </CardTitle>
          <CardDescription>
            Receive instant notifications for time-sensitive approvals and important updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Push Notifications</div>
              <div className="text-xs text-muted-foreground">
                Get notified about time-off requests, shift coverage, and urgent announcements
              </div>
            </div>
            <div className="flex items-center gap-3">
              {permission.denied && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Blocked
                </Badge>
              )}
              {permission.granted && isSubscribed && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Active
                </Badge>
              )}
              <Switch
                checked={isSubscribed}
                onCheckedChange={handleToggleNotifications}
                disabled={permission.denied || isEnabling || subscribeToPush.isPending || unsubscribeFromPush.isPending}
              />
            </div>
          </div>

          {permission.denied && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="text-xs">
                  <div className="font-medium text-destructive">Notifications Blocked</div>
                  <div className="text-muted-foreground mt-1">
                    To enable notifications, click the lock icon in your browser's address bar and allow notifications for this site.
                  </div>
                </div>
              </div>
            </div>
          )}

          {!permission.granted && !permission.denied && (
            <Button 
              onClick={requestPermission} 
              variant="outline" 
              size="sm"
              className="w-full"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Enable Notifications
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>
              Your latest notifications and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification: any) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.read ? 'bg-muted/30' : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{notification.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {notification.body}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(notification.createdAt).toLocaleDateString()} at{' '}
                        {new Date(notification.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="h-8 px-2"
                      >
                        Mark Read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}