import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Package, 
  ShoppingCart, 
  Video, 
  MessageSquare, 
  Settings, 
  FileText, 
  Eye, 
  Clock, 
  Menu,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  X,
  ListTodo
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: any;
  value: string;
  href: string;
  section: 'main' | 'operations' | 'tools';
}

const navigationItems: NavItem[] = [
  // Main Section
  { label: "Dashboard", icon: LayoutDashboard, value: "dashboard", href: "/admin", section: "main" },
  
  // Operations Section
  { label: "Employee Management", icon: Users, value: "employees", href: "/employees", section: "operations" },
  { label: "Task Management", icon: ListTodo, value: "tasks", href: "/tasks", section: "operations" },
  { label: "Schedule Management", icon: Calendar, value: "scheduling", href: "/shift-scheduling", section: "operations" },
  { label: "Accounting", icon: DollarSign, value: "accounting", href: "/accounting", section: "operations" },
  { label: "Inventory", icon: Package, value: "inventory", href: "/inventory", section: "operations" },
  
  // Tools Section
  { label: "Orders", icon: ShoppingCart, value: "orders", href: "/orders", section: "tools" },
  { label: "Marketing Videos", icon: Video, value: "marketing", href: "/admin/marketing", section: "tools" },
  { label: "Integrations", icon: Settings, value: "integrations", href: "/admin/integrations", section: "tools" },
  { label: "Communications", icon: MessageSquare, value: "communications", href: "/communications", section: "tools" },
  { label: "Support", icon: FileText, value: "system-support", href: "/admin/training", section: "tools" },
  { label: "Users", icon: Settings, value: "user-management", href: "/user-management", section: "tools" },
  { label: "Employee View", icon: Eye, value: "employee-view", href: "/dashboard", section: "tools" },
  { label: "Reports", icon: Clock, value: "reports", href: "/reports", section: "tools" },
];

interface SidebarProps {
  currentTab: string;
}

export function AdminSidebar({ currentTab }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('sidebar-toggle'));
  };

  const handleNavigation = (href: string) => {
    setLocation(href);
    setIsMobileOpen(false);
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={cn(
      "flex flex-col h-full",
      isMobile ? "w-full" : ""
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-4 border-b",
        !isMobile && isCollapsed && "justify-center"
      )}>
        {(!isCollapsed || isMobile) && (
          <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className="h-8 w-8 p-0"
            data-testid="button-toggle-sidebar"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileOpen(false)}
            className="h-8 w-8 p-0"
            data-testid="button-close-mobile-menu"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-6">
        {/* Main Section */}
        <div className="space-y-1">
          {!isCollapsed && !isMobile && (
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Main
            </p>
          )}
          {navigationItems
            .filter(item => item.section === 'main')
            .map(item => (
              <NavButton
                key={item.value}
                item={item}
                isActive={currentTab === item.value}
                isCollapsed={isCollapsed && !isMobile}
                onClick={() => handleNavigation(item.href)}
              />
            ))}
        </div>

        {/* Operations Section */}
        <div className="space-y-1">
          {!isCollapsed && !isMobile && (
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Operations
            </p>
          )}
          {navigationItems
            .filter(item => item.section === 'operations')
            .map(item => (
              <NavButton
                key={item.value}
                item={item}
                isActive={currentTab === item.value}
                isCollapsed={isCollapsed && !isMobile}
                onClick={() => handleNavigation(item.href)}
              />
            ))}
        </div>

        {/* Tools Section */}
        <div className="space-y-1">
          {!isCollapsed && !isMobile && (
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Tools & Settings
            </p>
          )}
          {navigationItems
            .filter(item => item.section === 'tools')
            .map(item => (
              <NavButton
                key={item.value}
                item={item}
                isActive={currentTab === item.value}
                isCollapsed={isCollapsed && !isMobile}
                onClick={() => handleNavigation(item.href)}
              />
            ))}
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-20 left-4 z-40 h-10 w-10 p-0 bg-white shadow-lg"
        data-testid="button-mobile-menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Drawer */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <SidebarContent isMobile={true} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:block fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-30 pt-24",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

function NavButton({ item, isActive, isCollapsed, onClick }: NavButtonProps) {
  const Icon = item.icon;
  
  return (
    <Button
      variant={isActive ? "default" : "ghost"}
      onClick={onClick}
      className={cn(
        "w-full justify-start gap-3 h-11 transition-all duration-200",
        isActive 
          ? "bg-blue-600 text-white hover:bg-blue-700" 
          : "hover:bg-blue-50 hover:text-blue-700",
        isCollapsed && "justify-center px-0"
      )}
      data-testid={`nav-${item.value}`}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0", isCollapsed && "h-6 w-6")} />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </Button>
  );
}
