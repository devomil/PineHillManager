import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, MessageSquare, CheckSquare, GraduationCap, ShoppingCart, HelpCircle, User, LogOut, ChevronDown, Menu, X, ExternalLink, ChevronLeft, ChevronRight, ArrowRight, AlertCircle, FileText, UserCheck, Repeat, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import UserAvatar from "@/components/user-avatar";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Task, EmployeeBanner, EmployeeSpotlight, TrainingProgress, WorkSchedule, TimeOffRequest, ShiftSwapRequest } from "@shared/schema";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, getDay } from "date-fns";

export default function HomeDashboard() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const userRole = user?.role?.toLowerCase();
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager' || userRole === 'admin';
  
  const avatarUser = user ? {
    profileImageUrl: user.profileImageUrl ?? undefined,
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
  } : undefined;

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    enabled: !!user?.id,
  });

  const { data: employeeContent } = useQuery<{
    banners: EmployeeBanner[];
    spotlights: EmployeeSpotlight[];
  }>({
    queryKey: ['/api/employee-content'],
  });

  const banners = employeeContent?.banners || [];
  const spotlights = employeeContent?.spotlights || [];

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const taskCount = pendingTasks.length;

  const { data: trainingProgress = [] } = useQuery<TrainingProgress[]>({
    queryKey: ['/api/training/progress'],
    enabled: !!user?.id,
  });

  const currentMonth = new Date();
  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data: monthlySchedules = [] } = useQuery<WorkSchedule[]>({
    queryKey: ['/api/my-schedules', { start: monthStart, end: monthEnd }],
    enabled: !!user?.id,
  });

  // Fetch employees for managers/admins (to display names in approvals widget)
  const { data: employees = [] } = useQuery<Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>>({
    queryKey: ['/api/employees'],
    enabled: isManager,
  });

  // Fetch time off requests for managers/admins
  const { data: timeOffRequests = [] } = useQuery<TimeOffRequest[]>({
    queryKey: ['/api/time-off-requests'],
    enabled: isManager,
  });

  // Fetch shift swap requests for managers/admins
  const { data: shiftSwaps = [] } = useQuery<ShiftSwapRequest[]>({
    queryKey: ['/api/shift-swaps'],
    enabled: isManager,
  });

  // Filter pending approvals for managers/admins
  const pendingTimeOffRequests = timeOffRequests.filter(
    req => req.status === 'pending' || req.status === 'cancellation_requested'
  );
  const pendingShiftSwaps = shiftSwaps.filter(
    swap => swap.status === 'pending'
  );
  const totalPendingApprovals = pendingTimeOffRequests.length + pendingShiftSwaps.length;

  // Helper function to get employee name
  const getEmployeeName = (userId: string) => {
    const employee = employees.find(emp => emp.id === userId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  const navItems = [
    {
      title: "Time Clock",
      icon: Clock,
      href: "/time-clock",
      badge: undefined as number | undefined,
    },
    {
      title: "My Schedule", 
      icon: Calendar,
      href: "/schedule",
      badge: undefined as number | undefined,
    },
    {
      title: "Communications",
      icon: MessageSquare,
      href: "/communications",
      badge: undefined as number | undefined,
    },
    {
      title: "Training",
      icon: GraduationCap,
      href: "/training",
      badge: undefined as number | undefined,
    },
    {
      title: "Documents",
      icon: FileText,
      href: "/employee/documents",
      badge: undefined as number | undefined,
    },
    {
      title: "My Tasks",
      icon: CheckSquare,
      href: "/tasks",
      badge: taskCount > 0 ? taskCount : undefined,
    },
    {
      title: "Employee Purchases",
      icon: ShoppingCart,
      href: "/employee-purchases",
      badge: undefined as number | undefined,
    },
    {
      title: "Support Center",
      icon: HelpCircle,
      href: "/support",
      badge: undefined as number | undefined,
    },
    {
      title: "Practitioner Dashboard",
      icon: Users,
      href: "/practitioner",
      badge: undefined as number | undefined,
    }
  ];

  const nextBanner = () => {
    setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
  };

  const prevBanner = () => {
    setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  useEffect(() => {
    if (currentBannerIndex >= banners.length && banners.length > 0) {
      setCurrentBannerIndex(0);
    }
  }, [banners, currentBannerIndex]);

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  const currentBanner = banners[currentBannerIndex];

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('employee-sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  // Toggle collapsed state and save to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('employee-sidebar-collapsed', String(newState));
  };

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextBanner();
    } else if (isRightSwipe) {
      prevBanner();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <h1 className="text-xl font-bold font-brand brand-title" data-brand="pine-hill">
            Pine Hill Farm
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" data-testid="button-mobile-profile">
                <UserAvatar user={avatarUser} size="sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => window.location.href = '/profile'} className="cursor-pointer" data-testid="menu-profile">
                <User className="mr-2 h-4 w-4" />
                Profile & Settings
              </DropdownMenuItem>
              {isManager && (
                <DropdownMenuItem onClick={() => window.location.href = '/admin'} className="cursor-pointer" data-testid="menu-admin">
                  Admin View
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50" data-testid="menu-logout">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row flex-1">
        {/* Left Navigation Sidebar - Desktop */}
        <aside className={cn(
          "hidden lg:flex lg:flex-col bg-white border-r shadow-sm transition-all duration-300",
          isCollapsed ? "lg:w-20" : "lg:w-64"
        )}>
          <div className={cn(
            "p-6 border-b flex items-center justify-between",
            isCollapsed && "p-4 justify-center"
          )}>
            {!isCollapsed && (
              <div>
                <h1 className="text-2xl font-bold font-brand brand-title" data-brand="pine-hill">
                  Pine Hill Farm
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Employee Portal</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapsed}
              className={cn("h-8 w-8 p-0", isCollapsed && "mx-auto")}
              data-testid="button-toggle-sidebar"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start relative",
                      isActive && "bg-primary/10 text-primary hover:bg-primary/20",
                      isCollapsed && "justify-center px-0"
                    )}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon className={cn(
                      "h-5 w-5",
                      !isCollapsed && "mr-3",
                      isCollapsed && "h-6 w-6"
                    )} />
                    {!isCollapsed && item.title}
                    {!isCollapsed && item.badge && (
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full justify-start",
                    isCollapsed && "justify-center px-0"
                  )} 
                  data-testid="button-user-menu"
                >
                  <UserAvatar user={avatarUser} size="sm" />
                  {!isCollapsed && (
                    <>
                      <div className="ml-3 text-left flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {user?.role || 'Employee'}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => window.location.href = '/profile'} className="cursor-pointer" data-testid="desktop-menu-profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile & Settings
                </DropdownMenuItem>
                {isManager && (
                  <DropdownMenuItem onClick={() => window.location.href = '/admin'} className="cursor-pointer" data-testid="desktop-menu-admin">
                    Admin View
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50" data-testid="desktop-menu-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
            <aside
              className="w-64 h-full bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold font-brand brand-title" data-brand="pine-hill">
                    Pine Hill Farm
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1">Employee Portal</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)} data-testid="button-close-mobile-menu">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <nav className="p-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start relative",
                          isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid={`mobile-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="h-5 w-5 mr-3" />
                        {item.title}
                        {item.badge && (
                          <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {item.badge}
                          </span>
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8">
            {/* Welcome Banner Carousel */}
            {banners.length > 0 ? (
              <div 
                className="relative"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <Card className="overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-lg">
                  <CardContent className="p-0">
                    <div className="relative h-64 md:h-80">
                      {currentBanner?.imageUrl && (
                        <img
                          src={currentBanner.imageUrl}
                          alt={currentBanner.title || "Banner"}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-6 md:p-8">
                        <h2 className="text-3xl md:text-4xl font-bold mb-2" data-testid="banner-title">
                          {currentBanner?.title}
                        </h2>
                        {currentBanner?.subtitle && (
                          <p className="text-lg text-white/90 mb-4 max-w-2xl" data-testid="banner-description">
                            {currentBanner.subtitle}
                          </p>
                        )}
                        {currentBanner?.externalUrl && (
                          <a
                            href={currentBanner.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors w-fit"
                            data-testid="banner-link"
                          >
                            Learn More
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {banners.length > 1 && (
                  <>
                    <button
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 hover:bg-white/95 backdrop-blur-sm transition-all shadow-md"
                      onClick={prevBanner}
                      data-testid="button-prev-banner"
                    >
                      <ChevronLeft className="h-5 w-5 text-gray-800" />
                    </button>
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 hover:bg-white/95 backdrop-blur-sm transition-all shadow-md"
                      onClick={nextBanner}
                      data-testid="button-next-banner"
                    >
                      <ChevronRight className="h-5 w-5 text-gray-800" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {banners.map((_, index) => (
                        <div
                          key={index}
                          onClick={() => setCurrentBannerIndex(index)}
                          data-testid={`banner-indicator-${index}`}
                          className={cn(
                            "cursor-pointer rounded-full transition-all",
                            index === currentBannerIndex
                              ? "w-3 h-1 bg-white"
                              : "w-1 h-1 bg-white/40 hover:bg-white/60"
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-lg">
                <CardContent className="p-8 md:p-12">
                  <h2 className="text-3xl md:text-4xl font-bold mb-2">
                    Welcome to Pine Hill Farm
                  </h2>
                  <p className="text-lg text-white/90">
                    Your employee dashboard for all work activities and updates
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Spotlights Section */}
            {spotlights.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">What's New</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {spotlights.map((spotlight) => (
                    <Card
                      key={spotlight.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => spotlight.externalUrl && window.open(spotlight.externalUrl, '_blank')}
                      data-testid={`spotlight-${spotlight.id}`}
                    >
                      {spotlight.thumbnailUrl && (
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={spotlight.thumbnailUrl}
                            alt={spotlight.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 right-2">
                            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-900">
                              {spotlight.type}
                            </span>
                          </div>
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="text-lg">{spotlight.title}</CardTitle>
                        {spotlight.description && (
                          <CardDescription className="line-clamp-2">
                            {spotlight.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      {spotlight.externalUrl && (
                        <CardContent className="pt-0">
                          <div className="flex items-center gap-1 text-sm text-blue-600 font-medium">
                            View More
                            <ExternalLink className="h-4 w-4" />
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Links */}
            <div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Quick Links</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/employee-purchases">
                  <Card className="group hover:shadow-lg transition-all cursor-pointer border-[#607e66]/20 bg-gradient-to-br from-[#607e66]/10 to-[#607e66]/5 hover:from-[#607e66]/20 hover:to-[#607e66]/10" data-testid="quicklink-employee-purchases">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#607e66]/10 flex items-center justify-center group-hover:bg-[#607e66]/20 transition-colors">
                        <ShoppingCart className="h-6 w-6 text-[#607e66]" />
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">Employee Purchases</p>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/communications">
                  <Card className="group hover:shadow-lg transition-all cursor-pointer border-[#5c97ab]/20 bg-gradient-to-br from-[#5c97ab]/10 to-[#5c97ab]/5 hover:from-[#5c97ab]/20 hover:to-[#5c97ab]/10" data-testid="quicklink-communications">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#5c97ab]/10 flex items-center justify-center group-hover:bg-[#5c97ab]/20 transition-colors">
                        <MessageSquare className="h-6 w-6 text-[#5c97ab]" />
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">Communications</p>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/time-clock">
                  <Card className="group hover:shadow-lg transition-all cursor-pointer border-[#56637a]/20 bg-gradient-to-br from-[#56637a]/10 to-[#56637a]/5 hover:from-[#56637a]/20 hover:to-[#56637a]/10" data-testid="quicklink-time-clock">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#56637a]/10 flex items-center justify-center group-hover:bg-[#56637a]/20 transition-colors">
                        <Clock className="h-6 w-6 text-[#56637a]" />
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">Time Clock</p>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/schedule">
                  <Card className="group hover:shadow-lg transition-all cursor-pointer border-[#5b7c99]/20 bg-gradient-to-br from-[#5b7c99]/10 to-[#5b7c99]/5 hover:from-[#5b7c99]/20 hover:to-[#5b7c99]/10" data-testid="quicklink-schedule">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#5b7c99]/10 flex items-center justify-center group-hover:bg-[#5b7c99]/20 transition-colors">
                        <Calendar className="h-6 w-6 text-[#5b7c99]" />
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">My Schedule</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar Widgets - Mobile stacked, desktop sidebar */}
        <aside className="w-full xl:w-80 bg-gradient-to-b from-gray-50 to-white p-4 lg:p-6 space-y-5">
          
          {/* Work Calendar Widget - Moved to top */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div className="bg-gradient-to-r from-[#5b7c99] to-[#5c97ab] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-white" />
                <h3 className="font-semibold text-white text-base">Work Calendar</h3>
              </div>
              <Link href="/schedule">
                <Button variant="ghost" size="sm" className="text-xs text-white hover:bg-white/20 h-7" data-testid="widget-calendar-view-all">
                  Full Schedule
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="p-4 bg-white">
              <div className="text-center mb-3">
                <p className="font-semibold text-gray-900">{format(currentMonth, "MMMM yyyy")}</p>
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-xs font-semibold text-gray-500 pb-1">
                    {day}
                  </div>
                ))}
                {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => (
                  <div key={`empty-${i}`} className="text-xs p-1.5" />
                ))}
                {eachDayOfInterval({
                  start: startOfMonth(currentMonth),
                  end: endOfMonth(currentMonth)
                }).map((day, i) => {
                  const hasSchedule = monthlySchedules.some(schedule => 
                    isSameDay(parseISO(schedule.date), day)
                  );
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <div
                      key={i}
                      className={cn(
                        "text-xs p-1.5 rounded-md relative font-medium transition-colors",
                        isToday && "bg-blue-600 text-white font-bold shadow-sm",
                        !isToday && hasSchedule && "bg-green-50 text-green-900",
                        !isToday && !hasSchedule && "text-gray-600 hover:bg-gray-50"
                      )}
                      data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                    >
                      {format(day, 'd')}
                      {hasSchedule && !isToday && (
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-600">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
                <span>Scheduled shifts</span>
              </div>
            </div>
          </div>

          {/* Upcoming Tasks Widget */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div className="bg-gradient-to-r from-[#56637a] to-[#8c93ad] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-white" />
                <h3 className="font-semibold text-white text-base">Upcoming Tasks</h3>
              </div>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-xs text-white hover:bg-white/20 h-7" data-testid="widget-tasks-view-all">
                  View All
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="p-4 bg-white">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  <CheckSquare className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>No pending tasks</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingTasks.slice(0, 3).map((task) => (
                    <div 
                      key={task.id} 
                      className="group p-3 rounded-lg border border-gray-100 hover:border-[#8c93ad]/30 hover:bg-[#56637a]/5 transition-all cursor-pointer"
                      data-testid={`widget-task-${task.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate group-hover:text-[#56637a]">
                            {task.title}
                          </p>
                          {task.dueDate && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <p className="text-xs text-gray-600">
                                Due {format(new Date(task.dueDate), "MMM d")}
                              </p>
                            </div>
                          )}
                        </div>
                        {task.priority === 'high' && (
                          <div className="flex-shrink-0 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                            HIGH
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pending Approvals Widget - Only for Managers/Admins */}
          {isManager && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
              <div className="bg-gradient-to-r from-[#9b6347] to-[#d4a574] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-white" />
                  <h3 className="font-semibold text-white text-base">Pending Approvals</h3>
                  {totalPendingApprovals > 0 && (
                    <span className="bg-white/90 text-[#9b6347] text-xs font-bold px-2 py-0.5 rounded-full">
                      {totalPendingApprovals}
                    </span>
                  )}
                </div>
                <Link href="/schedule">
                  <Button variant="ghost" size="sm" className="text-xs text-white hover:bg-white/20 h-7" data-testid="widget-approvals-view-all">
                    Manage
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="p-4 bg-white">
                {totalPendingApprovals === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    <UserCheck className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>No pending approvals</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {/* Time Off Requests */}
                    {pendingTimeOffRequests.slice(0, 2).map((request) => (
                      <div 
                        key={`timeoff-${request.id}`} 
                        className="group p-3 rounded-lg border border-gray-100 hover:border-[#9b6347]/30 hover:bg-[#9b6347]/5 transition-all cursor-pointer"
                        data-testid={`widget-timeoff-${request.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="h-3.5 w-3.5 text-[#9b6347]" />
                              <p className="font-medium text-sm text-gray-900 truncate group-hover:text-[#9b6347]">
                                {getEmployeeName(request.userId)}
                              </p>
                            </div>
                            <p className="text-xs text-gray-600 ml-5">
                              {request.status === 'cancellation_requested' ? 'Cancellation Request' : 'Time Off Request'}
                            </p>
                            <p className="text-xs text-gray-500 ml-5 mt-0.5">
                              {format(new Date(request.startDate), "MMM d")} - {format(new Date(request.endDate), "MMM d")}
                            </p>
                          </div>
                          <div className="flex-shrink-0 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                            PENDING
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Shift Swaps */}
                    {pendingShiftSwaps.slice(0, Math.max(0, 3 - pendingTimeOffRequests.length)).map((swap) => (
                      <div 
                        key={`swap-${swap.id}`} 
                        className="group p-3 rounded-lg border border-gray-100 hover:border-[#9b6347]/30 hover:bg-[#9b6347]/5 transition-all cursor-pointer"
                        data-testid={`widget-swap-${swap.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Repeat className="h-3.5 w-3.5 text-[#9b6347]" />
                              <p className="font-medium text-sm text-gray-900 truncate group-hover:text-[#9b6347]">
                                {getEmployeeName(swap.requesterId)}
                              </p>
                            </div>
                            <p className="text-xs text-gray-600 ml-5">
                              Shift Swap Request
                            </p>
                            {swap.takerId && (
                              <p className="text-xs text-gray-500 ml-5 mt-0.5">
                                with {getEmployeeName(swap.takerId)}
                              </p>
                            )}
                          </div>
                          {swap.urgencyLevel === 'urgent' || swap.urgencyLevel === 'high' ? (
                            <div className="flex-shrink-0 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                              URGENT
                            </div>
                          ) : (
                            <div className="flex-shrink-0 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                              PENDING
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Training Progress Widget */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div className="bg-gradient-to-r from-[#607e66] to-[#5c97ab] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-white" />
                <h3 className="font-semibold text-white text-base">Training Progress</h3>
              </div>
              <Link href="/training">
                <Button variant="ghost" size="sm" className="text-xs text-white hover:bg-white/20 h-7" data-testid="widget-training-view-all">
                  View All
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="p-4 bg-white">
              {trainingProgress.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  <GraduationCap className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>No active training modules</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trainingProgress.slice(0, 3).map((progress) => (
                    <div 
                      key={progress.id} 
                      className="p-3 rounded-lg border border-gray-100 hover:border-[#607e66]/30 hover:bg-[#607e66]/5 transition-all"
                      data-testid={`widget-training-${progress.id}`}
                    >
                      <p className="font-medium text-sm text-gray-900 mb-2.5">{progress.id}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#607e66] to-[#5c97ab] h-full rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-700 min-w-[38px] text-right">
                          {progress.progress || 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
