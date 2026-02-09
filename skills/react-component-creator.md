---
name: react-component-creator
description: "Use this skill when creating React components for the finance app. Triggers: user asks to create/modify React components, mentions 'component', 'UI', 'page', atoms/molecules/organisms, or any React JSX/TSX files. Ensures Atomic Design, TypeScript, Tailwind CSS, shadcn/ui, mobile-first responsive design, dark mode support, and accessibility (WCAG AA)."
---

# React Component Creator Skill

## When to Use This Skill

**ALWAYS use this skill when:**

- Creating new React components (atoms, molecules, organisms, templates, pages)
- Modifying existing React components
- User mentions: "component", "UI", "create page", "build form", "add chart"
- Working with any `.tsx` or `.jsx` file in the frontend

---

## Atomic Design Structure

```
src/components/
├── atoms/          # Buttons, inputs, icons, badges
├── molecules/      # Form fields, stat cards, category badges
├── organisms/      # Forms, charts, tables, navigation
├── templates/      # Page layouts
└── pages/          # Complete pages
```

---

## Component Template

```typescript
import { cn } from '@/lib/utils';

interface ComponentNameProps {
  /** Primary prop description */
  propName: string;
  /** Optional prop */
  optionalProp?: number;
  /** Callback handler */
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function ComponentName({
  propName,
  optionalProp = 10,
  onAction,
  className,
  children
}: ComponentNameProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-4 shadow-sm bg-white",
        "dark:bg-gray-800",
        "hover:shadow-md transition-shadow",
        className
      )}
    >
      {children}
    </div>
  );
}
```

---

## Critical Rules

### TypeScript

✅ Always use TypeScript, define props interface, use descriptive names
❌ Never use `any`, never use default exports

### Styling

✅ Mobile-first, dark mode always, use cn(), consistent spacing
❌ Never inline styles, never CSS modules

### Colors

- Backgrounds: `bg-white dark:bg-gray-800`
- Text: `text-gray-900 dark:text-gray-100`
- Brand: `bg-teal-500`, `text-teal-600`
- Categories: Food `#FF6B6B`, Transport `#4ECDC4`, etc.

### Accessibility

✅ Semantic HTML, ARIA labels, focus indicators, 44px touch targets
❌ Never `<div onClick>`, always `<button>`

### Responsive

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
<h1 className="text-2xl md:text-3xl lg:text-4xl">
<div className="p-4 md:p-6 lg:p-8">
```

---

## Component Patterns

### Loading (Skeleton)

```typescript
{isLoading ? (
  <Skeleton className="h-4 w-3/4" />
) : (
  <Content />
)}
```

### Error

```typescript
{error && (
  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
    <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>
  </div>
)}
```

### Empty

```typescript
{items.length === 0 && (
  <div className="text-center py-12">
    <p className="text-gray-600 dark:text-gray-400">No data yet</p>
  </div>
)}
```

---

## shadcn/ui Components

```typescript
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

<Button variant="default">Primary</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Tertiary</Button>
```

---

## Checklist

- [ ] TypeScript interface with JSDoc
- [ ] Named export
- [ ] Mobile-first responsive
- [ ] Dark mode variants
- [ ] Semantic HTML
- [ ] ARIA labels
- [ ] 44px touch targets
- [ ] Loading/error/empty states
