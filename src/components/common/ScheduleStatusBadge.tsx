import { Badge } from '@/components/ui/badge';
import { XCircle, CalendarClock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleStatusBadgeProps {
  status: 'scheduled' | 'cancelled' | 'rescheduled';
  className?: string;
  showIcon?: boolean;
}

export function ScheduleStatusBadge({ status, className, showIcon = true }: ScheduleStatusBadgeProps) {
  const variants = {
    scheduled: {
      variant: 'outline' as const,
      icon: CheckCircle,
      label: 'Scheduled',
      className: 'border-green-500/30 text-green-600 bg-green-500/10',
    },
    cancelled: {
      variant: 'destructive' as const,
      icon: XCircle,
      label: 'Cancelled',
      className: 'bg-destructive/10 text-destructive border-destructive/30',
    },
    rescheduled: {
      variant: 'secondary' as const,
      icon: CalendarClock,
      label: 'Rescheduled',
      className: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    },
  };

  const config = variants[status] || variants.scheduled;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
}
