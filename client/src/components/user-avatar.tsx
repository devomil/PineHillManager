import { 
  Beef, 
  Flower, 
  Heart, 
  Leaf, 
  Apple, 
  Milk,
  Wheat,
  Egg,
  Cherry,
  Carrot,
  Fish,
  Salad,
  Pizza,
  Soup,
  Cookie,
  Wine,
  Coffee,
  IceCream,
  Candy,
  User
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  user?: {
    profileImageUrl?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const iconMap: Record<string, any> = {
  beef: Beef,
  flower: Flower,
  heart: Heart,
  leaf: Leaf,
  apple: Apple,
  milk: Milk,
  wheat: Wheat,
  egg: Egg,
  cherry: Cherry,
  carrot: Carrot,
  fish: Fish,
  salad: Salad,
  pizza: Pizza,
  soup: Soup,
  cookie: Cookie,
  wine: Wine,
  coffee: Coffee,
  "ice-cream": IceCream,
  candy: Candy,
  user: User,
};

const colorMap: Record<string, string> = {
  beef: "#ef4444",
  flower: "#ec4899",
  heart: "#f43f5e",
  leaf: "#10b981",
  apple: "#dc2626",
  milk: "#60a5fa",
  wheat: "#f59e0b",
  egg: "#fbbf24",
  cherry: "#dc2626",
  carrot: "#f97316",
  fish: "#06b6d4",
  salad: "#22c55e",
  pizza: "#f59e0b",
  soup: "#f97316",
  cookie: "#d97706",
  wine: "#7c3aed",
  coffee: "#78716c",
  "ice-cream": "#f472b6",
  candy: "#ec4899",
  user: "#6366f1",
};

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

const iconSizeMap = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
};

export default function UserAvatar({ user, size = "md", className }: UserAvatarProps) {
  const profileUrl = user?.profileImageUrl;
  
  // Check if it's an icon type (starts with /icon/)
  if (profileUrl?.startsWith('/icon/')) {
    const iconType = profileUrl.replace('/icon/', '');
    const IconComponent = iconMap[iconType] || User;
    const iconColor = colorMap[iconType] || "#6366f1";
    
    return (
      <div 
        className={cn(
          "rounded-full flex items-center justify-center bg-gray-100",
          sizeMap[size],
          className
        )}
      >
        <IconComponent 
          className={iconSizeMap[size]} 
          style={{ color: iconColor }}
        />
      </div>
    );
  }
  
  // Regular avatar with photo or fallback
  return (
    <Avatar className={cn(sizeMap[size], className)}>
      {profileUrl && <AvatarImage src={profileUrl} alt={`${user?.firstName || 'User'}'s avatar`} />}
      <AvatarFallback>
        {user?.firstName?.[0]}{user?.lastName?.[0]}
      </AvatarFallback>
    </Avatar>
  );
}
