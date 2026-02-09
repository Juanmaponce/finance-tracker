import {
  Utensils,
  Car,
  Gamepad2,
  ShoppingBag,
  HeartPulse,
  Receipt,
  GraduationCap,
  CircleEllipsis,
  Banknote,
  Laptop,
  TrendingUp,
  PlusCircle,
  Home,
  Plane,
  Gift,
  Music,
  Coffee,
  Pizza,
  Dog,
  Baby,
  Briefcase,
  Phone,
  Wifi,
  Zap,
  Star,
  Tag,
  Bookmark,
  Shirt,
  Dumbbell,
  Scissors,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  'gamepad-2': Gamepad2,
  'shopping-bag': ShoppingBag,
  'heart-pulse': HeartPulse,
  receipt: Receipt,
  'graduation-cap': GraduationCap,
  'circle-ellipsis': CircleEllipsis,
  banknote: Banknote,
  laptop: Laptop,
  'trending-up': TrendingUp,
  'plus-circle': PlusCircle,
  home: Home,
  plane: Plane,
  gift: Gift,
  music: Music,
  coffee: Coffee,
  pizza: Pizza,
  dog: Dog,
  baby: Baby,
  briefcase: Briefcase,
  phone: Phone,
  wifi: Wifi,
  zap: Zap,
  star: Star,
  tag: Tag,
  bookmark: Bookmark,
  shirt: Shirt,
  dumbbell: Dumbbell,
  scissors: Scissors,
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

interface CategoryIconProps {
  icon: string;
  color: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function CategoryIcon({ icon, color, size = 'md', className }: CategoryIconProps) {
  const IconComponent = ICON_MAP[icon] || CircleEllipsis;
  const sizeClasses = size === 'sm' ? 'size-8' : 'size-10';
  const iconSize = size === 'sm' ? 'size-4' : 'size-5';

  return (
    <div
      className={cn('flex items-center justify-center rounded-xl', sizeClasses, className)}
      style={{ backgroundColor: `${color}20` }}
    >
      <IconComponent className={iconSize} style={{ color }} />
    </div>
  );
}
