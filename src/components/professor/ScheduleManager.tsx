import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Trash2, Loader2, Clock, MoreVertical, XCircle, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { useClassSchedules, ClassSchedule } from '@/hooks/useClassSchedules';
import { CancelClassDialog } from './CancelClassDialog';
import { RescheduleClassDialog } from './RescheduleClassDialog';
import { ScheduleStatusBadge } from '@/components/common/ScheduleStatusBadge';

interface ScheduleManagerProps {
  classId: string;
  className: string;
  onScheduleChange?: () => void;
}

const DAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
];

export function ScheduleManager({ classId, className, onScheduleChange }: ScheduleManagerProps) {
  const { schedules, isLoading, addSchedule, deleteSchedule, refreshSchedules } = useClassSchedules(classId);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    day: '',
    start_time: '09:00',
    end_time: '10:00',
  });
  
  // Cancel/Reschedule dialog states
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null);

  const handleAddSchedule = async () => {
    if (!newSchedule.day || !newSchedule.start_time || !newSchedule.end_time) {
      toast.error('Please fill all fields');
      return;
    }

    if (newSchedule.start_time >= newSchedule.end_time) {
      toast.error('End time must be after start time');
      return;
    }

    setIsSubmitting(true);
    try {
      await addSchedule({
        class_id: classId,
        day: newSchedule.day,
        start_time: newSchedule.start_time,
        end_time: newSchedule.end_time,
      });
      toast.success('Schedule added');
      onScheduleChange?.();
      setNewSchedule({ day: '', start_time: '09:00', end_time: '10:00' });
    } catch (error) {
      console.error('Error adding schedule:', error);
      toast.error('Failed to add schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      await deleteSchedule(scheduleId);
      toast.success('Schedule removed');
      onScheduleChange?.();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to remove schedule');
    }
  };

  const handleCancelClick = (schedule: ClassSchedule) => {
    setSelectedSchedule(schedule);
    setCancelDialogOpen(true);
  };

  const handleRescheduleClick = (schedule: ClassSchedule) => {
    setSelectedSchedule(schedule);
    setRescheduleDialogOpen(true);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Filter to show active schedules
  const activeSchedules = schedules.filter(s => s.status === 'scheduled');
  const inactiveSchedules = schedules.filter(s => s.status !== 'scheduled');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Class Schedule
            </DialogTitle>
            <DialogDescription>
              Manage weekly schedule for {className}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Add New Schedule */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <Label className="text-sm font-medium">Add Schedule Slot</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={newSchedule.day} onValueChange={(v) => setNewSchedule({ ...newSchedule, day: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map(day => (
                      <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  value={newSchedule.start_time}
                  onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                />
                <Input
                  type="time"
                  value={newSchedule.end_time}
                  onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                />
              </div>
              <Button onClick={handleAddSchedule} disabled={isSubmitting} className="w-full" size="sm">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Slot
              </Button>
            </div>

            {/* Active Schedules */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Active Schedule</Label>
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : activeSchedules.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No active schedule set
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSchedules.map(schedule => (
                    <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="capitalize">
                          {schedule.day.slice(0, 3)}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRescheduleClick(schedule)}>
                            <CalendarClock className="w-4 h-4 mr-2" />
                            Reschedule
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleCancelClick(schedule)}
                            className="text-destructive focus:text-destructive"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inactive/Cancelled Schedules */}
            {inactiveSchedules.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Past Changes</Label>
                <div className="space-y-2">
                  {inactiveSchedules.map(schedule => (
                    <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 opacity-60">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="capitalize">
                          {schedule.day.slice(0, 3)}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm line-through">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                        </div>
                        <ScheduleStatusBadge status={schedule.status} showIcon={false} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      {selectedSchedule && (
        <CancelClassDialog
          scheduleId={selectedSchedule.id}
          className={className}
          day={selectedSchedule.day}
          time={`${formatTime(selectedSchedule.start_time)} - ${formatTime(selectedSchedule.end_time)}`}
          isOpen={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          onCancelled={() => {
            refreshSchedules();
            onScheduleChange?.();
          }}
        />
      )}

      {/* Reschedule Dialog */}
      {selectedSchedule && (
        <RescheduleClassDialog
          scheduleId={selectedSchedule.id}
          className={className}
          currentDay={selectedSchedule.day}
          currentStartTime={selectedSchedule.start_time}
          currentEndTime={selectedSchedule.end_time}
          isOpen={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          onRescheduled={() => {
            refreshSchedules();
            onScheduleChange?.();
          }}
        />
      )}
    </>
  );
}
