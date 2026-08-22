import React from 'react';
import { cn } from '@/utils';
import { Search, X } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'search';
  clearable?: boolean;
  onClear?: () => void;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, variant = 'default', clearable, onClear, leftIcon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {(variant === 'search' || leftIcon) && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">
              {leftIcon || <Search className="h-4 w-4" />}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-10 rounded-lg border bg-[hsl(var(--background))] px-3 text-sm',
              'transition-all duration-150',
              'border-[hsl(var(--input))]',
              'placeholder:text-[hsl(var(--muted-foreground)/0.6)]',
              'focus:outline-none focus:border-[hsl(var(--ring))] focus:ring-1 focus:ring-[hsl(var(--ring))]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-[hsl(var(--destructive))] focus:ring-[hsl(var(--destructive))] focus:border-[hsl(var(--destructive))]',
              (variant === 'search' || leftIcon) && 'pl-10',
              clearable && props.value && 'pr-10',
              className
            )}
            {...props}
          />
          {clearable && props.value && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
