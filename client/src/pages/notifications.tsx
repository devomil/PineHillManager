import NotificationSettings from "@/components/notification-settings";

export default function Notifications() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="text-slate-500 mt-1">
          Manage your notification settings and view recent alerts
        </p>
      </div>

      {/* Notification Settings Component */}
      <NotificationSettings />
    </div>
  );
}