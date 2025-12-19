import { Button } from '@/components/ui/button';
import { 
  UserX, 
  UserCheck, 
  TrendingDown, 
  BarChart3,
  Calendar 
} from 'lucide-react';

interface QuickActionsProps {
  onAction: (action: string) => void;
  userRole: 'admin' | 'professor' | 'student' | null;
  disabled?: boolean;
}

export function QuickActions({ onAction, userRole, disabled }: QuickActionsProps) {
  const getActions = () => {
    const commonActions = [
      { label: 'Absent Today', query: 'Who was absent today?', icon: UserX },
      { label: 'Present Today', query: 'How many students were present today?', icon: UserCheck },
    ];

    if (userRole === 'student') {
      return [
        { label: 'My Attendance', query: 'Show my attendance summary', icon: BarChart3 },
        { label: 'This Week', query: 'Show my attendance for this week', icon: Calendar },
      ];
    }

    const teacherActions = [
      ...commonActions,
      { label: 'Low Attendance', query: 'Which students have attendance below 75%?', icon: TrendingDown },
      { label: 'Class Stats', query: 'Show attendance statistics for my classes', icon: BarChart3 },
    ];

    if (userRole === 'admin') {
      return [
        ...teacherActions,
        { label: 'Department', query: 'Show attendance by department', icon: BarChart3 },
      ];
    }

    return teacherActions;
  };

  const actions = getActions();

  return (
    <div className="px-4 pb-2">
      <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
      <div className="flex flex-wrap gap-2">
        {actions.slice(0, 4).map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            onClick={() => onAction(action.query)}
            disabled={disabled}
            className="text-xs h-7 px-2"
          >
            <action.icon className="w-3 h-3 mr-1" />
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
