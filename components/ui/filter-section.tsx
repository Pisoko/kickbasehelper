import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FilterSectionProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function FilterSection({ 
  children, 
  className, 
  title, 
  description 
}: FilterSectionProps) {
  return (
    <div className={cn(
      "space-y-4 p-4 border-b border-slate-700 bg-slate-900/30",
      className
    )}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-sm font-medium text-slate-200">{title}</h3>
          )}
          {description && (
            <p className="text-xs text-slate-400">{description}</p>
          )}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-4">
        {children}
      </div>
    </div>
  );
}

interface FilterGroupProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export function FilterGroup({ children, label, className }: FilterGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}