import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Clock, AlertTriangle, GraduationCap } from "lucide-react";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const statsData = [
    {
      title: "Time Off Balance",
      value: stats?.timeOffBalance ? `${stats.timeOffBalance} days` : "24 days",
      icon: CalendarCheck,
      color: "text-farm-green",
      bgColor: "bg-farm-green bg-opacity-10",
    },
    {
      title: "Hours This Week",
      value: stats?.hoursThisWeek ? `${stats.hoursThisWeek} hrs` : "42.5 hrs",
      icon: Clock,
      color: "text-farm-blue",
      bgColor: "bg-farm-blue bg-opacity-10",
    },
    {
      title: "Pending Requests",
      value: stats?.pendingRequests !== undefined ? stats.pendingRequests : "2",
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Training Progress",
      value: stats?.trainingProgress ? `${stats.trainingProgress}%` : "85%",
      icon: GraduationCap,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <Card key={index} className="shadow-sm border border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">
                  {stat.title}
                </p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mt-1"></div>
                ) : (
                  <p className="text-2xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
