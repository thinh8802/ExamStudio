import React from 'react';
import { cn } from '@/utils';
import { Button } from './button';

/* ============================================
   CARD COMPONENT
   ============================================ */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hoverable, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]',
        'transition-all duration-200',
        variant === 'default' && 'border border-[hsl(var(--border))] shadow-[var(--shadow-xs)]',
        variant === 'bordered' && 'border border-[hsl(var(--border))]',
        variant === 'elevated' && 'shadow-[var(--shadow-sm)] border border-[hsl(var(--border))]',
        hoverable && 'hover:shadow-[var(--shadow-md)] hover:-translate-y-[1px] cursor-pointer',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('p-5 pb-3', className)} {...props} />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3 className={cn('text-lg font-semibold leading-tight', className)} {...props} />
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn('text-sm text-[hsl(var(--muted-foreground))] mt-1', className)} {...props} />
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('p-5 pt-0', className)} {...props} />
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('p-5 pt-0 flex items-center gap-2', className)} {...props} />
);

/* ============================================
   BADGE COMPONENT
   ============================================ */
type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline' | 'secondary';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]',
  success: 'bg-[hsl(var(--success-light))] text-[hsl(var(--success))]',
  warning: 'bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))]',
  destructive: 'bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]',
  info: 'bg-[hsl(var(--info-light))] text-[hsl(var(--info))]',
  outline: 'border border-[hsl(var(--border))] text-[hsl(var(--foreground))]',
  secondary: 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]',
};

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', dot, children, ...props }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
      'transition-colors duration-200',
      badgeVariants[variant],
      className
    )}
    {...props}
  >
    {dot && (
      <span className={cn('h-1.5 w-1.5 rounded-full', {
        'bg-[hsl(var(--primary))]': variant === 'default',
        'bg-[hsl(var(--success))]': variant === 'success',
        'bg-[hsl(var(--warning))]': variant === 'warning',
        'bg-[hsl(var(--destructive))]': variant === 'destructive',
        'bg-[hsl(var(--info))]': variant === 'info',
        'bg-current': variant === 'outline' || variant === 'secondary',
      })} />
    )}
    {children}
  </span>
);

/* ============================================
   MODAL COMPONENT
   ============================================ */
interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const modalSizes: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
  full: 'max-w-[94vw] w-[94vw]',
};

export const Modal: React.FC<ModalProps> = ({ open, isOpen, onClose, title, description, size = 'md', children, footer }) => {
  const isModalOpen = open ?? isOpen ?? false;

  React.useEffect(() => {
    if (!isModalOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isModalOpen, onClose]);

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={cn(
        'relative z-10 w-full mx-4 bg-[hsl(var(--card))] rounded-3xl shadow-2xl border-2 border-[hsl(var(--border))] dark:border-white/20 ring-1 ring-black/5',
        'animate-scale-in max-h-[88vh] flex flex-col overflow-hidden',
        modalSizes[size]
      )}>
        {title && (
          <div className="p-5 pb-3.5 border-b-2 border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)]">
            {typeof title === 'string' ? (
              <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">{title}</h2>
            ) : (
              title
            )}
            {description && (
              typeof description === 'string' ? (
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{description}</p>
              ) : (
                description
              )
            )}
          </div>
        )}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="p-5 pt-3.5 border-t-2 border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] flex justify-end gap-2.5">{footer}</div>
        )}
      </div>
    </div>
  );
};

/* ============================================
   CONFIRM DIALOG
   ============================================ */
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, onClose, onConfirm, title, description,
  confirmText = 'Xác nhận', cancelText = 'Hủy',
  variant = 'default', loading,
}) => (
  <Modal open={open} onClose={onClose} title={title} size="sm" footer={
    <>
      <Button variant="outline" onClick={onClose} disabled={loading}>{cancelText}</Button>
      <Button variant={variant === 'destructive' ? 'destructive' : 'default'} onClick={onConfirm} loading={loading}>
        {confirmText}
      </Button>
    </>
  }>
    <p className="text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
  </Modal>
);

/* ============================================
   TABS
   ============================================ */
interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode; count?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => (
  <div className={cn('flex border-b border-[hsl(var(--border))]', className)} role="tablist">
    {tabs.map(tab => (
      <button
        key={tab.id}
        role="tab"
        aria-selected={activeTab === tab.id}
        onClick={() => onChange(tab.id)}
        className={cn(
          'relative px-4 py-2.5 text-sm font-medium transition-colors duration-200',
          'hover:text-[hsl(var(--foreground))]',
          'flex items-center gap-2',
          activeTab === tab.id
            ? 'text-[hsl(var(--primary))]'
            : 'text-[hsl(var(--muted-foreground))]'
        )}
      >
        {tab.icon}
        {tab.label}
        {tab.count !== undefined && (
          <span className="text-xs bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded-full">{tab.count}</span>
        )}
        {activeTab === tab.id && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--primary))] rounded-t-full" />
        )}
      </button>
    ))}
  </div>
);

/* ============================================
   PROGRESS BAR
   ============================================ */
interface ProgressProps {
  value: number; // 0-100
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
}

const progressColors: Record<string, string> = {
  primary: 'bg-gradient-primary shadow-xs',
  success: 'bg-[hsl(var(--success))]',
  warning: 'bg-[hsl(var(--warning))]',
  destructive: 'bg-[hsl(var(--destructive))]',
};

const progressSizes: Record<string, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export const Progress: React.FC<ProgressProps> = ({ value, className, size = 'md', showLabel, color = 'primary' }) => {
  const safeValue = isNaN(value) || value == null ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))] mb-1">
          <span>Tiến độ</span>
          <span>{Math.round(safeValue)}%</span>
        </div>
      )}
      <div className={cn('w-full rounded-full bg-[hsl(var(--muted))] overflow-hidden', progressSizes[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', progressColors[color])}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
};

/* ============================================
   SKELETON
   ============================================ */
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, width, height }) => (
  <div
    className={cn('rounded-lg bg-[hsl(var(--muted))] animate-shimmer', className)}
    style={{ width, height }}
  />
);

/* ============================================
   EMPTY STATE
   ============================================ */
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className }) => (
  <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
    <div className="mb-4 text-[hsl(var(--muted-foreground))] opacity-50">{icon}</div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-md mb-6">{description}</p>
    {action}
  </div>
);

/* ============================================
   STAT CARD (Dashboard)
   ============================================ */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; label: string };
  color?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, trend, color, className }) => (
  <Card className={cn('p-5 relative overflow-hidden', className)}>
    {color && <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: color }} />}
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {trend && (
          <p className={cn('text-xs mt-1', trend.value >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]')}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
      <div className={cn('p-2.5 rounded-lg', color ? 'text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]')}
        style={color ? { backgroundColor: color + '20', color: color } : undefined}
      >
        {icon}
      </div>
    </div>
  </Card>
);

/* ============================================
   CHECKBOX
   ============================================ */
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const checkId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <label htmlFor={checkId} className={cn('inline-flex items-center gap-2 cursor-pointer select-none', className)}>
        <input
          ref={ref}
          type="checkbox"
          id={checkId}
          className="h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--ring))] focus:ring-2 focus:ring-offset-1 transition-colors"
          {...props}
        />
        {label && <span className="text-sm">{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

/* ============================================
   SELECT
   ============================================ */
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full h-10 rounded-lg border bg-[hsl(var(--background))] px-3 text-sm appearance-none',
            'transition-all duration-200',
            'border-[hsl(var(--input))]',
            'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'currentColor\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M4.646 6.646a.5.5 0 0 1 .708 0L8 9.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z\'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_12px_center]',
            error && 'border-[hsl(var(--destructive))]',
            className
          )}
          {...props}
        >
          {placeholder && <option value="" className="bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">{opt.label}</option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

/* ============================================
   SWITCH (Toggle)
   ============================================ */
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, disabled, className }) => (
  <label className={cn('inline-flex items-center gap-3 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed', className)}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
        checked ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
    {label && <span className="text-sm">{label}</span>}
  </label>
);

/* ============================================
   TEXTAREA
   ============================================ */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full rounded-lg border bg-[hsl(var(--background))] px-3 py-2 text-sm min-h-[80px] resize-y',
            'transition-all duration-200',
            'border-[hsl(var(--input))]',
            'placeholder:text-[hsl(var(--muted-foreground))]',
            'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-1',
            error && 'border-[hsl(var(--destructive))]',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

/* ============================================
   TOOLTIP
   ============================================ */
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, className }) => (
  <div className={cn('relative group inline-flex', className)}>
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
    </div>
  </div>
);

