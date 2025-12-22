import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarClock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RescheduleClassDialogProps {
  scheduleId: string;
  className: string;
  currentDay: string;
  currentStartTime: string;
  currentEndTime: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRescheduled: () => void;
}

const DAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
];

export function RescheduleClassDialog({
  scheduleId,
  className,
  currentDay,
  currentStartTime,
  currentEndTime,
  isOpen,
  onOpenChange,
  onRescheduled,
}: RescheduleClassDialogProps) {
  const [newDay, setNewDay] = useState(currentDay);
  const [newStartTime, setNewStartTime] = useState(currentStartTime.slice(0, 5));
  const [newEndTime, setNewEndTime] = useState(currentEndTime.slice(0, 5));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReschedule = async () => {
    if (!newDay || !newStartTime || !newEndTime) {
      toast.error('Please fill all fields');
      return;
    }

    if (newStartTime >= newEndTime) {
      toast.error('End time must be after start time');
      return;
    }

    // Check if anything changed
    if (
      newDay === currentDay &&
      newStartTime === currentStartTime.slice(0, 5) &&
      newEndTime === currentEndTime.slice(0, 5)
    ) {
      toast.error('Please select a different time or day');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('class-management', {
        body: {
          action: 'reschedule',
          scheduleId,
          newDay,
          newStartTime,
          newEndTime,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success('Class rescheduled successfully');
      onRescheduled();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error rescheduling class:', error);
      toast.error(error.message || 'Failed to reschedule class');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Reschedule Class
          </DialogTitle>
          <DialogDescription>
            Move {className} to a new time slot
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Schedule */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">Current Schedule</p>
            <p className="text-sm mt-1 capitalize">
              {currentDay} • {formatTime(currentStartTime.slice(0, 5))} - {formatTime(currentEndTime.slice(0, 5))}
            </p>
          </div>

          {/* New Schedule */}
          <div className="space-y-3">
            <Label>New Schedule</Label>
            
            <div className="space-y-2">
              <Label htmlFor="new-day" className="text-xs text-muted-foreground">Day</Label>
              <Select value={newDay} onValueChange={setNewDay}>
                <SelectTrigger id="new-day">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map(day => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="new-start" className="text-xs text-muted-foreground">Start Time</Label>
                <Input
                  id="new-start"
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-end" className="text-xs text-muted-foreground">End Time</Label>
                <Input
                  id="new-end"
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-primary font-medium">Note</p>
            <p className="text-sm text-muted-foreground mt-1">
              The original slot will be marked as rescheduled, and a new slot will be created.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleReschedule} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
