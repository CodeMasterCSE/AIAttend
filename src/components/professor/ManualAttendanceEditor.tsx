import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  UserPlus,
  Loader2,
  Check,
  X,
  Clock,
  Edit,
  History,
  AlertTriangle,
} from 'lucide-react';
import { useEffect } from 'react';

interface ManualAttendanceEditorProps {
  classId: string;
  sessionId: string;
  className: string;
  onSuccess?: () => void;
}

interface StudentRecord {
  student_id: string;
  name: string;
  email: string;
  roll_number: string | null;
  attendance_id: string | null;
  status: string | null;
  method_used: string | null;
  timestamp: string | null;
  proximity_status?: string | null;
}

interface AuditLogEntry {
  id: string;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  reason: string;
  created_at: string;
  student_name?: string;
}

export function ManualAttendanceEditor({
  classId,
  sessionId,
  className,
  onSuccess,
}: ManualAttendanceEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [editStatus, setEditStatus] = useState<string>('present');
  const [editReason, setEditReason] = useState<string>('');
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchStudents = async () => {
    if (!classId || !sessionId) return;
    setIsLoading(true);
    try {
      // Fetch enrolled students
      const { data: enrollments, error: enrollError } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', classId);

      if (enrollError) throw enrollError;

      const studentIds = (enrollments || []).map(e => e.student_id);
      if (studentIds.length === 0) {
        setStudents([]);
        return;
      }

      // Fetch student profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, name, email, roll_number')
        .in('user_id', studentIds);

      if (profileError) throw profileError;

      // Fetch attendance records for this session
      const { data: records, error: recordError } = await supabase
        .from('attendance_records')
        .select('id, student_id, status, method_used, timestamp')
        .eq('session_id', sessionId);

      if (recordError) throw recordError;

      const recordMap = new Map(
        (records as any[] || []).map(r => [r.student_id, r])
      );

      const studentRecords: StudentRecord[] = (profiles || []).map(p => {
        const record = recordMap.get(p.user_id);
        return {
          student_id: p.user_id,
          name: p.name,
          email: p.email,
          roll_number: p.roll_number,
          attendance_id: record?.id || null,
          status: record?.status || null,
          method_used: record?.method_used || null,
          timestamp: record?.timestamp || null,
        };
      });

      setStudents(studentRecords.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load students',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditLog = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_audit_log')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with student names
      const studentIds = [...new Set((data || []).map(d => d.student_id))];

      if (studentIds.length === 0) {
        setAuditLog([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', studentIds);

      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.name]));

      setAuditLog((data || []).map(entry => ({
        ...entry,
        student_name: nameMap.get(entry.student_id) || 'Unknown',
      })));
    } catch (error) {
      console.error('Error fetching audit log:', error);
    }
  };

  useEffect(() => {
    if (isOpen && classId && sessionId) {
      fetchStudents();
      fetchAuditLog();
    }
  }, [isOpen, sessionId, classId]);

  const handleEditClick = (student: StudentRecord) => {
    setEditingStudent(student);
    setEditStatus(student.status || 'present');
    setEditReason('');
  };

  const handleSaveEdit = async () => {
    if (!editingStudent || !editReason.trim() || !user) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for this change',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const previousStatus = editingStudent.status;

      if (editingStudent.attendance_id) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('attendance_records')
          .update({
            status: editStatus,
            method_used: 'manual',
            manual_reason: editReason,
          })
          .eq('id', editingStudent.attendance_id);

        if (updateError) throw updateError;

        // Log the change
        const { error: logError } = await supabase
          .from('attendance_audit_log')
          .insert({
            attendance_record_id: editingStudent.attendance_id,
            session_id: sessionId,
            student_id: editingStudent.student_id,
            action: 'update',
            previous_status: previousStatus,
            new_status: editStatus,
            reason: editReason,
            marked_by: user.id,
          });

        if (logError) throw logError;
      } else {
        // Create new record
        const { data: newRecord, error: insertError } = await supabase
          .from('attendance_records')
          .insert({
            session_id: sessionId,
            class_id: classId,
            student_id: editingStudent.student_id,
            status: editStatus,
            method_used: 'manual',
            manual_reason: editReason,
            late_submission: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Log the change
        const { error: logError } = await supabase
          .from('attendance_audit_log')
          .insert({
            attendance_record_id: newRecord.id,
            session_id: sessionId,
            student_id: editingStudent.student_id,
            action: 'create',
            previous_status: null,
            new_status: editStatus,
            reason: editReason,
            marked_by: user.id,
          });

        if (logError) throw logError;
      }

      toast({
        title: 'Success',
        description: `Attendance ${editingStudent.attendance_id ? 'updated' : 'marked'} for ${editingStudent.name}`,
      });

      setEditingStudent(null);
      setEditReason('');
      fetchStudents();
      fetchAuditLog();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to save attendance',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string | null, method: string | null) => {
    if (!status) {
      return <Badge variant="outline" className="text-muted-foreground">Not Marked</Badge>;
    }

    const isManual = method === 'manual';

    switch (status) {
      case 'present':
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <Check className="w-3 h-3 mr-1" />
            Present {isManual && '(Manual)'}
          </Badge>
        );
      case 'late':
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            <Clock className="w-3 h-3 mr-1" />
            Late {isManual && '(Manual)'}
          </Badge>
        );
      case 'absent':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <X className="w-3 h-3 mr-1" />
            Absent {isManual && '(Manual)'}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isUnverified = (student: StudentRecord) =>
    student.method_used === 'proximity' && student.proximity_status === 'unverified';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="w-4 h-4 mr-2" />
          Manual Attendance
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Manual Attendance Editor
          </DialogTitle>
          <DialogDescription>
            {className} - Mark or edit attendance for individual students. All changes are logged for audit purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            variant={!showAuditLog ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAuditLog(false)}
          >
            Students
          </Button>
          <Button
            variant={showAuditLog ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAuditLog(true)}
          >
            <History className="w-4 h-4 mr-1" />
            Audit Log
          </Button>
        </div>

        {!showAuditLog ? (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : students.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No students enrolled in this class.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.student_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{student.roll_number || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(student.status, student.method_used)}
                          {isUnverified(student) && (
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Review
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{student.method_used || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(student)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Edit Dialog */}
            {editingStudent && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-3">
                  {editingStudent.attendance_id ? 'Edit' : 'Mark'} Attendance for {editingStudent.name}
                </h4>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Reason for change (required)</Label>
                    <Textarea
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      placeholder="e.g., Late arrival due to traffic, AI verification failed, connectivity issues..."
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingStudent(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={isSubmitting || !editReason.trim()}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            {auditLog.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No manual changes have been made to this session.
              </p>
            ) : (
              auditLog.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-lg border bg-card text-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{entry.student_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {entry.action}
                    </Badge>
                    {entry.previous_status && (
                      <>
                        <span className="capitalize">{entry.previous_status}</span>
                        <span>→</span>
                      </>
                    )}
                    <span className="capitalize font-medium">{entry.new_status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reason: {entry.reason}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
