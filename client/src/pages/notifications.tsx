import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Menu } from "lucide-react";
import NotificationSettings from "@/components/notification-settings";

export default function NotificationsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-3xl font-bold">Notification Settings</h1>
        </div>
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <Menu className="h-4 w-4" />
            Main Menu
          </Button>
        </Link>
      </div>

      <div className="max-w-4xl">
        <NotificationSettings />
      </div>
    </div>
  );
}