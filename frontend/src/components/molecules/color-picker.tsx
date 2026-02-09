import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#EAB308',
  '#84CC16',
  '#22C55E',
  '#14B8A6',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#D946EF',
  '#EC4899',
  '#F43F5E',
  '#78716C',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((color) => {
        const isSelected = value === color;

        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              'size-10 rounded-full transition-transform flex items-center justify-center',
              isSelected && 'scale-110 ring-2 ring-offset-2 ring-offset-background',
            )}
            style={{
              backgroundColor: color,
              ...(isSelected ? { ringColor: color } : {}),
            }}
            aria-label={`Color ${color}`}
            aria-pressed={isSelected}
          >
            {isSelected && <Check className="size-4 text-white" />}
          </button>
        );
      })}
    </div>
  );
}
