import { cn } from '@/lib/utils';

interface FieldErrorProps {
  messages?: string[];
  className?: string;
}

export function FieldError({ messages, className }: FieldErrorProps) {
  if (!messages || messages.length === 0) return null;

  return (
    <ul className={cn('space-y-0.5', className)}>
      {messages.map((msg) => (
        <li key={msg} className="text-xs text-destructive">
          {msg}
        </li>
      ))}
    </ul>
  );
}
