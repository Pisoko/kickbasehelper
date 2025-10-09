import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const simpleSelectVariants = cva(
  "flex w-full rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-slate-600 bg-slate-800 text-white",
        ghost: "border-transparent bg-transparent",
        outline: "border-slate-700 bg-slate-950 text-white"
      },
      size: {
        sm: "h-8 px-3 py-1 text-sm",
        md: "h-10 px-3 py-2",
        lg: "h-11 px-4 py-3 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export interface SimpleSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof simpleSelectVariants> {}

const SimpleSelect = forwardRef<HTMLSelectElement, SimpleSelectProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <select
        className={cn(simpleSelectVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);

SimpleSelect.displayName = "SimpleSelect";

export { SimpleSelect, simpleSelectVariants };