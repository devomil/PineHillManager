import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Sparkles, Megaphone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmployeeBanner {
  id: number;
  title: string;
  content: string;
  variant: 'info' | 'warning' | 'success' | 'error';
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  orderIndex: number;
}

interface EmployeeSpotlight {
  id: number;
  title: string;
  description: string;
  category: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  orderIndex: number;
}

interface EmployeeContentResponse {
  banners: EmployeeBanner[];
  spotlights: EmployeeSpotlight[];
}

export default function EmployeeContentPage() {
  const { data, isLoading, error } = useQuery<EmployeeContentResponse>({
    queryKey: ['/api/employee-content'],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Employee Content</h1>
          <p className="text-muted-foreground">
            Latest announcements and featured content
          </p>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load employee content. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { banners = [], spotlights = [] } = data || {};

  const getVariantColor = (variant: string) => {
    switch (variant) {
      case 'info':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800';
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Employee Content</h1>
        <p className="text-muted-foreground">
          Latest announcements and featured content from management
        </p>
      </div>

      {/* Main Banners */}
      {banners.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold" data-testid="header-announcements">Announcements</h2>
          </div>
          
          <div className="space-y-3">
            {banners.map((banner) => (
              <Card
                key={banner.id}
                className={getVariantColor(banner.variant)}
                data-testid={`banner-${banner.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg" data-testid={`banner-title-${banner.id}`}>
                      {banner.title}
                    </CardTitle>
                    <Badge variant="secondary" data-testid={`banner-variant-${banner.id}`}>
                      {banner.variant}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap" data-testid={`banner-content-${banner.id}`}>
                    {banner.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {banners.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No announcements at this time</p>
          </CardContent>
        </Card>
      )}

      {/* Spotlight Content */}
      {spotlights.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold" data-testid="header-spotlights">Spotlight</h2>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {spotlights.map((spotlight) => (
              <Card key={spotlight.id} data-testid={`spotlight-${spotlight.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" data-testid={`spotlight-category-${spotlight.id}`}>
                      {spotlight.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg" data-testid={`spotlight-title-${spotlight.id}`}>
                    {spotlight.title}
                  </CardTitle>
                  <CardDescription data-testid={`spotlight-description-${spotlight.id}`}>
                    {spotlight.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {spotlights.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No spotlight content at this time</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
