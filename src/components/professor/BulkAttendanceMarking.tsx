import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, CheckSquare, Loader2, UserCheck, UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkAttendanceMarkingProps {
  classId: string;
  sessionId: string;
  className: string;
  onSuccess: () => void;
}

interface EnrolledStudent {
  id: string;
  student_id: string;
  name: string;
  email: string;
  roll_number?: string;
  hasAttendance: boolean;
}

export function BulkAttendanceMarking({ classId, sessionId, className, onSuccess }: BulkAttendanceMarkingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'late'>('present');

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      // Fetch enrolled students
      const { data: enrollments, error: enrollError } = await supabase
        .from('class_enrollments')
        .select('id, student_id')
        .eq('class_id', classId);

      if (enrollError) throw enrollError;

      // Fetch existing attendance records for this session
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('student_id')
        .eq('session_id', sessionId);

      if (attendanceError) throw attendanceError;

      const attendedStudentIds = new Set(attendanceRecords?.map(r => r.student_id) || []);

      // Fetch student profiles
      const studentIds = enrollments?.map(e => e.student_id) || [];
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, name, email, roll_number')
        .in('user_id', studentIds);

      if (profileError) throw profileError;

      const studentList: EnrolledStudent[] = enrollments?.map(enrollment => {
        const profile = profiles?.find(p => p.user_id === enrollment.student_id);
        return {
          id: enrollment.id,
          student_id: enrollment.student_id,
          name: profile?.name || 'Unknown',
          email: profile?.email || '',
          roll_number: profile?.roll_number || undefined,
          hasAttendance: attendedStudentIds.has(enrollment.student_id),
        };
      }) || [];

      setStudents(studentList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
      setSelectedStudents(new Set());
    }
  }, [isOpen, classId, sessionId]);

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const selectAll = () => {
    const unmarkedStudents = students.filter(s => !s.hasAttendance);
    setSelectedStudents(new Set(unmarkedStudents.map(s => s.student_id)));
  };

  const deselectAll = () => {
    setSelectedStudents(new Set());
  };

  const handleSubmit = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setIsSubmitting(true);
    try {
      const records = Array.from(selectedStudents).map(studentId => ({
        session_id: sessionId,
        class_id: classId,
        student_id: studentId,
        status: attendanceStatus,
        method_used: 'manual',
      }));

      const { error } = await supabase
        .from('attendance_records')
        .insert(records);

      if (error) throw error;

      toast.success(`Marked ${selectedStudents.size} students as ${attendanceStatus}`);
      setIsOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast.error(error.message || 'Failed to mark attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const unmarkedStudents = students.filter(s => !s.hasAttendance);
  const markedStudents = students.filter(s => s.hasAttendance);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CheckSquare className="w-4 h-4 mr-2" />
          Bulk Mark Attendance
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Bulk Mark Attendance
          </DialogTitle>
          <DialogDescription>
            Manually mark attendance for multiple students in {className}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status Selection */}
            <div className="flex items-center gap-4">
              <Label>Mark as:</Label>
              <Select value={attendanceStatus} onValueChange={(v: 'present' | 'late') => setAttendanceStatus(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Unmarked Students */}
            {unmarkedStudents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Unmarked Students ({unmarkedStudents.length})
                  </Label>
                  <div className="space-x-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg max-h-[250px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Select</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Roll No.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unmarkedStudents.map(student => (
                        <TableRow key={student.student_id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedStudents.has(student.student_id)}
                              onCheckedChange={() => toggleStudent(student.student_id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {student.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">{student.name}</div>
                                <div className="text-xs text-muted-foreground">{student.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {student.roll_number || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Already Marked Students */}
            {markedStudents.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Already Marked ({markedStudents.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {markedStudents.map(student => (
                    <Badge key={student.student_id} variant="secondary" className="bg-success/10 text-success">
                      <UserCheck className="w-3 h-3 mr-1" />
                      {student.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* No students */}
            {students.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <UserX className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No students enrolled in this class</p>
              </div>
            )}

            {unmarkedStudents.length === 0 && markedStudents.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50 text-success" />
                <p>All students have been marked!</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedStudents.size === 0}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Mark {selectedStudents.size} Students
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
