import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";

interface DynamicLogoProps {
  logoType: "login_logo" | "header_logo" | "footer_logo";
  className?: string;
  fallbackText?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function DynamicLogo({ 
  logoType, 
  className = "", 
  fallbackText = "Pine Hill Farm",
  size = "md" 
}: DynamicLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16",
    xl: "w-24 h-24"
  };

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        
        console.log(`Fetching logo for type: ${logoType}`);
        const response = await fetch(`/api/logos/${logoType}`);
        console.log(`Response status for ${logoType}:`, response.status);
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          console.log(`Successfully loaded logo for ${logoType}`);
          setLogoUrl(url);
        } else {
          console.error(`Failed to fetch ${logoType}, status:`, response.status);
          setHasError(true);
        }
      } catch (error) {
        console.error(`Error fetching ${logoType}:`, error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogo();

    // Cleanup blob URL on unmount
    return () => {
      if (logoUrl) {
        URL.revokeObjectURL(logoUrl);
      }
    };
  }, [logoType]);

  if (isLoading) {
    return (
      <div className={`${sizeClasses[size]} ${className} animate-pulse bg-muted rounded-lg flex items-center justify-center`}>
        <Building2 className="w-1/2 h-1/2 text-muted-foreground" />
      </div>
    );
  }

  if (hasError || !logoUrl) {
    return (
      <div className={`${sizeClasses[size]} ${className} bg-farm-green rounded-lg flex items-center justify-center`}>
        <Building2 className="w-1/2 h-1/2 text-white" />
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={fallbackText}
      className={`${sizeClasses[size]} ${className} object-contain`}
      onError={() => {
        setHasError(true);
        setLogoUrl(null);
      }}
    />
  );
}