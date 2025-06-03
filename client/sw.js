const CACHE_NAME = 'pine-hill-farm-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'Pine Hill Farm',
    body: 'You have a new notification',
    icon: '/generated-icon.png',
    badge: '/generated-icon.png',
    tag: 'general',
    data: {},
    actions: []
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  // Enhanced options for time-sensitive approvals
  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/generated-icon.png',
    badge: notificationData.badge || '/generated-icon.png',
    tag: notificationData.tag,
    data: notificationData.data,
    vibrate: notificationData.tag === 'approval' ? [200, 100, 200, 100, 200] : [100, 50, 100],
    requireInteraction: notificationData.tag === 'approval' || notificationData.tag === 'urgent',
    silent: false,
    timestamp: Date.now(),
    actions: notificationData.actions || [
      {
        action: 'view',
        title: 'View Details',
        icon: '/generated-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/generated-icon.png'
      }
    ]
  };

  // Add approval-specific actions for time-off requests
  if (notificationData.tag === 'approval') {
    options.actions = [
      {
        action: 'approve',
        title: 'Approve',
        icon: '/generated-icon.png'
      },
      {
        action: 'view',
        title: 'Review',
        icon: '/generated-icon.png'
      }
    ];
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  // Handle different action types
  switch (event.action) {
    case 'approve':
      // Navigate to time management with approval action
      event.waitUntil(
        clients.openWindow('/time?action=approve&id=' + (event.notification.data?.relatedId || ''))
      );
      break;
    case 'view':
      // Navigate to relevant page based on notification type
      const viewUrl = event.notification.data?.url || '/time';
      event.waitUntil(
        clients.openWindow(viewUrl)
      );
      break;
    case 'dismiss':
      // Just close the notification
      break;
    default:
      // Default click behavior - open relevant page or dashboard
      const defaultUrl = event.notification.data?.url || '/';
      event.waitUntil(
        clients.openWindow(defaultUrl)
      );
  }
});