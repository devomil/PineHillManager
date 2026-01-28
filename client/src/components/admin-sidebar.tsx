import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { QuickContactForm } from "@/components/quick-contact-form";
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
  ListTodo,
  GraduationCap,
  BarChart,
  Target,
  ShoppingBag,
  Store,
  LifeBuoy,
  Phone
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
  { label: "Practitioner Dashboard", icon: Users, value: "practitioner", href: "/practitioner", section: "operations" },
  { label: "Employee Management", icon: Users, value: "employees", href: "/employees", section: "operations" },
  { label: "Task Management", icon: ListTodo, value: "tasks", href: "/tasks", section: "operations" },
  { label: "Training Management", icon: GraduationCap, value: "training", href: "/admin/training", section: "operations" },
  { label: "Goals", icon: Target, value: "goals", href: "/goals", section: "operations" },
  { label: "Documents", icon: FileText, value: "documents", href: "/documents", section: "operations" },
  { label: "Schedule Management", icon: Calendar, value: "scheduling", href: "/shift-scheduling", section: "operations" },
  { label: "Accounting", icon: DollarSign, value: "accounting", href: "/accounting", section: "operations" },
  { label: "Inventory", icon: Package, value: "inventory", href: "/inventory", section: "operations" },
  { label: "Purchasing", icon: ShoppingBag, value: "purchasing", href: "/purchasing", section: "operations" },
  
  // Tools Section
  { label: "Marketplace", icon: Store, value: "marketplace", href: "/marketplace", section: "tools" },
  { label: "Orders", icon: ShoppingCart, value: "orders", href: "/orders", section: "tools" },
  { label: "Marketing Videos", icon: Video, value: "marketing", href: "/admin/marketing", section: "tools" },
  { label: "Employee Content", icon: FileText, value: "employee-content", href: "/admin/employee-content", section: "tools" },
  { label: "Integrations", icon: Settings, value: "integrations", href: "/admin/integrations", section: "tools" },
  { label: "Communications", icon: MessageSquare, value: "communications", href: "/communications", section: "tools" },
  { label: "Support", icon: LifeBuoy, value: "support", href: "/support", section: "tools" },
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
  const [quickContactOpen, setQuickContactOpen] = useState(false);

  // Fetch pending support ticket count for badge (only for Ryan/admin users)
  // This endpoint requires Ryan-level access, so we stop polling after first error
  const { data: pendingTicketData } = useQuery<{ pendingCount: number }>({
    queryKey: ['/api/support/tickets/pending-count'],
    staleTime: 30000, // Consider data fresh for 30 seconds
    retry: false, // Don't retry on failure (user may not have access)
    throwOnError: false, // Silently handle errors
    // Only refetch every 60s if initial fetch succeeded
    refetchInterval: (query) => query.state.data ? 60000 : false,
  });

  const pendingTicketCount = pendingTicketData?.pendingCount || 0;

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

      {/* Quick Contact Button */}
      <div className="p-4 border-b">
        <Button
          onClick={() => { setQuickContactOpen(true); if (isMobile) setIsMobileOpen(false); }}
          className={cn(
            "w-full bg-gradient-to-r from-sky-100 via-sky-200 to-sky-300 hover:from-sky-200 hover:via-sky-300 hover:to-sky-400 text-sky-700 font-semibold shadow-md rounded-full border border-sky-200",
            isCollapsed && !isMobile ? "p-2" : "py-3"
          )}
          data-testid="button-quick-contact-admin"
        >
          <Phone className={cn("h-5 w-5", !isCollapsed && "mr-2")} />
          {(!isCollapsed || isMobile) && "Quick Contact"}
        </Button>
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
                badgeCount={item.value === 'support' ? pendingTicketCount : undefined}
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

      {/* Quick Contact Form Modal */}
      <QuickContactForm open={quickContactOpen} onOpenChange={setQuickContactOpen} />
    </>
  );
}

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
  badgeCount?: number;
}

function NavButton({ item, isActive, isCollapsed, onClick, badgeCount }: NavButtonProps) {
  const Icon = item.icon;
  
  return (
    <Button
      variant={isActive ? "default" : "ghost"}
      onClick={onClick}
      className={cn(
        "w-full justify-start gap-3 h-11 transition-all duration-200 relative",
        isActive 
          ? "bg-blue-600 text-white hover:bg-blue-700" 
          : "hover:bg-blue-50 hover:text-blue-700",
        isCollapsed && "justify-center px-0"
      )}
      data-testid={`nav-${item.value}`}
    >
      <div className="relative">
        <Icon className={cn("h-5 w-5 flex-shrink-0", isCollapsed && "h-6 w-6")} />
        {isCollapsed && badgeCount !== undefined && badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
        )}
      </div>
      {!isCollapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {badgeCount !== undefined && badgeCount > 0 && (
            <Badge 
              variant="destructive" 
              className="ml-auto h-5 min-w-[20px] px-1.5 text-xs font-medium"
            >
              {badgeCount > 99 ? '99+' : badgeCount}
            </Badge>
          )}
        </>
      )}
    </Button>
  );
}
