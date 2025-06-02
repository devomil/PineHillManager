import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { Sprout, Home, Clock, MessageSquare, Users, GraduationCap, Megaphone, BookOpen, BarChart3, Settings, X } from "lucide-react";

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const navigationItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home, roles: ["employee", "admin"] },
    { name: "Time Management", href: "/time", icon: Clock, roles: ["employee", "admin"] },
    { name: "Communication", href: "/communication", icon: MessageSquare, roles: ["employee", "admin"] },
    { name: "Marketing", href: "/marketing", icon: Megaphone, roles: ["employee", "admin"] },
    { name: "Training Portal", href: "/training", icon: BookOpen, roles: ["employee", "admin"] },
    { name: "Reports", href: "/reports", icon: BarChart3, roles: ["employee", "admin"] },
    { name: "Diagnostics", href: "/diagnostics", icon: Settings, roles: ["employee", "admin"] },
  ];

  const adminItems = [
    { name: "Employees", href: "/employees", icon: Users, roles: ["admin"] },
    { name: "Admin Training", href: "/admin-training", icon: GraduationCap, roles: ["admin"] },
  ];

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return location === "/" || location === "/dashboard";
    }
    return location === href;
  };

  const canAccess = (roles: string[]) => {
    return roles.includes(user?.role || "employee");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-farm-green rounded-lg flex items-center justify-center">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div className="ml-3">
            <h1 className="text-xl font-bold text-slate-900">Pine Hill Farm</h1>
            <p className="text-sm text-slate-500">Employee Portal</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => {
          if (!canAccess(item.roles)) return null;
          
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive(item.href) ? "default" : "ghost"}
                className={`w-full justify-start ${
                  isActive(item.href)
                    ? "bg-farm-green text-white hover:bg-green-600"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className={`w-5 h-5 mr-3 ${
                  isActive(item.href) ? "text-white" : "text-slate-400"
                }`} />
                {item.name}
              </Button>
            </Link>
          );
        })}

        {/* Admin Section */}
        {user?.role === "admin" && (
          <>
            <div className="border-t border-slate-200 pt-4 mt-4">
              <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Admin Only
              </p>
              {adminItems.map((item) => (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className={`w-full justify-start ${
                      isActive(item.href)
                        ? "bg-farm-green text-white hover:bg-green-600"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className={`w-5 h-5 mr-3 ${
                      isActive(item.href) ? "text-white" : "text-slate-400"
                    }`} />
                    {item.name}
                  </Button>
                </Link>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-slate-700">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 capitalize">
                {user?.role || 'Employee'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:bg-white lg:border-r lg:border-slate-200">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
