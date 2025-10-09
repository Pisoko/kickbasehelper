import { forwardRef } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input, type InputProps } from './input';

export interface SearchInputProps extends Omit<InputProps, 'type'> {
  showIcon?: boolean;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, showIcon = true, placeholder = "Suchen...", ...props }, ref) => {
    return (
      <div className="relative">
        {showIcon && (
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        )}
        <Input
          type="text"
          className={cn(
            showIcon && "pl-10",
            className
          )}
          placeholder={placeholder}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

export { SearchInput };