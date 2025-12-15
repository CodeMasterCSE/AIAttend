import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'accent';
  className?: string;
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-primary/10',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  accent: 'bg-accent/10',
};

const iconVariantStyles = {
  default: 'bg-secondary text-foreground',
  primary: 'gradient-bg text-primary-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  accent: 'bg-accent text-accent-foreground',
};

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  variant = 'default',
  className 
}: StatsCardProps) {
  return (
    <div className={cn(
      "rounded-2xl p-6 border border-border/60 bg-background/70 dark:bg-card/70",
      "backdrop-blur-xl shadow-[0_16px_40px_rgba(15,23,42,0.18)] hover:shadow-[0_22px_55px_rgba(15,23,42,0.30)]",
      "transition-all duration-300 animate-fade-in",
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 text-sm font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal">vs last week</span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          iconVariantStyles[variant]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
