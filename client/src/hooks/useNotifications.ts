import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      
      // Check current permission
      const currentPermission = Notification.permission;
      setPermission({
        granted: currentPermission === 'granted',
        denied: currentPermission === 'denied',
        default: currentPermission === 'default'
      });

      // Check if already subscribed
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      const granted = result === 'granted';
      
      setPermission({
        granted,
        denied: result === 'denied',
        default: result === 'default'
      });

      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const subscribeToPush = useMutation({
    mutationFn: async () => {
      if (!permission.granted) {
        const granted = await requestPermission();
        if (!granted) throw new Error('Notification permission denied');
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      const vapidResponse = await fetch('/api/notifications/vapid-key');
      if (!vapidResponse.ok) throw new Error('Failed to get VAPID key');
      const { publicKey } = await vapidResponse.json();

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server using the standard format
      console.log('Raw subscription object:', subscription);
      
      const authKey = subscription.getKey('auth');
      const p256dhKey = subscription.getKey('p256dh');
      
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          auth: authKey ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(authKey)) as any)) : '',
          p256dh: p256dhKey ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dhKey)) as any)) : ''
        }
      };

      console.log('Sending subscription data:', subscriptionData);
      
      // Extract keys for server format
      const serverData = {
        endpoint: subscriptionData.endpoint,
        auth: subscriptionData.keys.auth,
        p256dh: subscriptionData.keys.p256dh
      };
      
      await apiRequest('/api/notifications/subscribe', 'POST', serverData);

      setIsSubscribed(true);
      return subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  const unsubscribeFromPush = useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await apiRequest('/api/notifications/unsubscribe', 'POST', {
          endpoint: subscription.endpoint
        });
      }

      setIsSubscribed(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  // Fetch user notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const markAsRead = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest(`/api/notifications/${notificationId}/read`, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  return {
    isSupported,
    permission,
    isSubscribed,
    notifications,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    markAsRead
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}