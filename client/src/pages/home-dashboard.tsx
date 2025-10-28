import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, MessageSquare, CheckSquare, GraduationCap, ShoppingCart, HelpCircle, User, LogOut, ChevronDown, Menu, X, ExternalLink, ChevronLeft, ChevronRight, ArrowRight, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import UserAvatar from "@/components/user-avatar";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Task, EmployeeBanner, EmployeeSpotlight, TrainingProgress, WorkSchedule } from "@shared/schema";
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

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  
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
        <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r shadow-sm">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold font-brand brand-title" data-brand="pine-hill">
              Pine Hill Farm
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Employee Portal</p>
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
                      isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
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

          <div className="p-4 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start" data-testid="button-user-menu">
                  <UserAvatar user={avatarUser} size="sm" />
                  <div className="ml-3 text-left flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user?.role || 'Employee'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-2" />
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
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg"
                      onClick={prevBanner}
                      data-testid="button-prev-banner"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg"
                      onClick={nextBanner}
                      data-testid="button-next-banner"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {banners.map((_, index) => (
                        <button
                          key={index}
                          className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            index === currentBannerIndex
                              ? "bg-white w-8"
                              : "bg-white/50 hover:bg-white/75"
                          )}
                          onClick={() => setCurrentBannerIndex(index)}
                          data-testid={`banner-indicator-${index}`}
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

            {/* Quick Links Placeholder (Task 8) */}
            <div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Quick Links</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/employee-purchases">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-green-200 bg-green-50" data-testid="quicklink-employee-purchases">
                    <CardContent className="p-6 text-center">
                      <ShoppingCart className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="font-semibold text-gray-900">Employee Purchases</p>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/communications">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-200 bg-blue-50" data-testid="quicklink-communications">
                    <CardContent className="p-6 text-center">
                      <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="font-semibold text-gray-900">Communications</p>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/time-clock">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-red-200 bg-red-50" data-testid="quicklink-time-clock">
                    <CardContent className="p-6 text-center">
                      <Clock className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <p className="font-semibold text-gray-900">Time Clock</p>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/schedule">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-200 bg-purple-50" data-testid="quicklink-schedule">
                    <CardContent className="p-6 text-center">
                      <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <p className="font-semibold text-gray-900">My Schedule</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar Widgets (Task 7 & 9) - Mobile stacked, desktop sidebar */}
        <aside className="w-full xl:w-80 bg-white xl:border-l shadow-sm p-6 space-y-6">
          {/* Upcoming Tasks Widget */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Upcoming Tasks</h3>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="widget-tasks-view-all">
                  View All
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            {pendingTasks.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground text-sm">
                  No pending tasks
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingTasks.slice(0, 3).map((task) => (
                  <Card key={task.id} className="hover:shadow-sm transition-shadow" data-testid={`widget-task-${task.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{task.title}</p>
                          {task.dueDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Due: {format(new Date(task.dueDate), "MMM d")}
                            </p>
                          )}
                        </div>
                        {task.priority === 'high' && (
                          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Training Progress Widget */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Training Progress</h3>
              <Link href="/training">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="widget-training-view-all">
                  View All
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            {trainingProgress.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground text-sm">
                  No active training modules
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {trainingProgress.slice(0, 3).map((progress) => (
                  <Card key={progress.id} className="hover:shadow-sm transition-shadow" data-testid={`widget-training-${progress.id}`}>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm mb-2">{progress.id}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          {progress.progress || 0}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Work Calendar Widget */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Work Calendar</h3>
              <Link href="/schedule">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="widget-calendar-view-all">
                  Full Schedule
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="text-center mb-3">
                  <p className="font-semibold">{format(currentMonth, "MMMM yyyy")}</p>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-xs font-medium text-muted-foreground p-1">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => (
                    <div key={`empty-${i}`} className="text-xs p-1" />
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
                          "text-xs p-1 rounded relative",
                          isToday && "bg-blue-100 font-bold text-blue-900",
                          !isToday && "text-gray-700"
                        )}
                        data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                      >
                        {format(day, 'd')}
                        {hasSchedule && (
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full" />
                    <span>Scheduled shifts</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
