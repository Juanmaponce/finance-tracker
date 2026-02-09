import { ICON_MAP, AVAILABLE_ICONS } from '@/components/atoms/category-icon';
import { CircleEllipsis } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconPickerProps {
  value: string;
  color: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, color, onChange }: IconPickerProps) {
  return (
    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
      {AVAILABLE_ICONS.map((iconKey) => {
        const Icon = ICON_MAP[iconKey] || CircleEllipsis;
        const isSelected = value === iconKey;

        return (
          <button
            key={iconKey}
            type="button"
            onClick={() => onChange(iconKey)}
            className={cn(
              'flex items-center justify-center size-11 rounded-xl transition-all',
              isSelected ? 'ring-2 ring-primary-500 scale-110' : 'hover:bg-muted',
            )}
            style={isSelected ? { backgroundColor: `${color}20` } : undefined}
            aria-label={iconKey}
            aria-pressed={isSelected}
          >
            <Icon className="size-5" style={{ color: isSelected ? color : undefined }} />
          </button>
        );
      })}
    </div>
  );
}
