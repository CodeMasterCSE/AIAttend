import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Loader2, X, Search, UserPlus } from 'lucide-react';

interface Student {
  user_id: string;
  name: string;
  email: string;
  roll_number: string | null;
}

interface Enrollment {
  id: string;
  student_id: string;
  student?: Student;
}

interface ManageClassEnrollmentsDialogProps {
  classId: string;
  className: string;
}

export function ManageClassEnrollmentsDialog({ classId, className }: ManageClassEnrollmentsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, classId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch current enrollments
      const { data: enrollmentData } = await supabase
        .from('class_enrollments')
        .select('id, student_id')
        .eq('class_id', classId);

      const enrolledStudentIds = enrollmentData?.map(e => e.student_id) || [];

      // Fetch all students
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (roleData && roleData.length > 0) {
        const studentIds = roleData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, email, roll_number')
          .in('user_id', studentIds);

        const allStudents = profilesData || [];

        // Separate enrolled and available students
        const enrolled = enrollmentData?.map(e => ({
          ...e,
          student: allStudents.find(s => s.user_id === e.student_id)
        })) || [];

        const available = allStudents.filter(s => !enrolledStudentIds.includes(s.user_id));

        setEnrollments(enrolled);
        setAvailableStudents(available);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnrollStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('class_enrollments')
        .insert({ class_id: classId, student_id: studentId });

      if (error) throw error;

      toast({ title: 'Success', description: 'Student enrolled successfully' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    try {
      const { error } = await supabase
        .from('class_enrollments')
        .delete()
        .eq('id', enrollmentId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Student removed from class' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const filteredStudents = availableStudents.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Manage Students
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Enrollments - {className}</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Enrolled Students */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Enrolled Students ({enrollments.length})</h4>
              <ScrollArea className="h-64 border rounded-md p-2">
                {enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No students enrolled</p>
                ) : (
                  <div className="space-y-2">
                    {enrollments.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{enrollment.student?.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{enrollment.student?.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleRemoveEnrollment(enrollment.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Available Students */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Add Students</h4>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8"
                />
              </div>
              <ScrollArea className="h-52 border rounded-md p-2">
                {filteredStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No students available</p>
                ) : (
                  <div className="space-y-2">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.user_id}
                        className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{student.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleEnrollStudent(student.user_id)}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
