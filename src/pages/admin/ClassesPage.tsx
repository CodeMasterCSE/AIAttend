import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Search, MoreVertical, BookOpen, Loader2, Users, Building, MapPin, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddClassDialog } from '@/components/admin/AddClassDialog';
import { ManageClassEnrollmentsDialog } from '@/components/admin/ManageClassEnrollmentsDialog';
import { EditClassDialog } from '@/components/admin/EditClassDialog';

interface ClassData {
  id: string;
  subject: string;
  code: string;
  department: string;
  semester: string;
  room: string;
  join_code: string;
  professor_id: string;
  created_at: string;
  professor_name?: string;
  enrollment_count?: number;
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false });

      if (classesError) throw classesError;

      if (classesData && classesData.length > 0) {
        // Get professor names
        const professorIds = [...new Set(classesData.map(c => c.professor_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', professorIds);

        const professorMap = (profilesData || []).reduce((acc, p) => {
          acc[p.user_id] = p.name;
          return acc;
        }, {} as Record<string, string>);

        // Get enrollment counts
        const { data: enrollmentsData } = await supabase
          .from('class_enrollments')
          .select('class_id');

        const enrollmentCounts = (enrollmentsData || []).reduce((acc, e) => {
          acc[e.class_id] = (acc[e.class_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const classesWithDetails = classesData.map(cls => ({
          ...cls,
          professor_name: professorMap[cls.professor_id] || 'Unknown',
          enrollment_count: enrollmentCounts[cls.id] || 0
        }));

        setClasses(classesWithDetails);
      } else {
        setClasses([]);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({ title: 'Error', description: 'Failed to fetch classes', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!deletingClass) return;

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', deletingClass.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Class deleted successfully' });
      fetchClasses();
    } catch (error: any) {
      console.error('Error deleting class:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingClass(null);
    }
  };

  const handleRegenerateCode = async (classId: string, currentCode: string) => {
    try {
      const { data: newCode, error: rpcError } = await supabase.rpc('generate_join_code');

      if (rpcError) throw rpcError;

      const { error: updateError } = await supabase
        .from('classes')
        .update({ join_code: newCode })
        .eq('id', classId);

      if (updateError) throw updateError;

      toast({ title: 'Success', description: 'Join code regenerated successfully' });
      fetchClasses(); // Refresh list to show new code
    } catch (error: any) {
      console.error('Error regenerating code:', error);
      toast({ title: 'Error', description: 'Failed to regenerate join code', variant: 'destructive' });
    }
  };

  const filteredClasses = classes.filter(cls =>
    cls.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalEnrollments = classes.reduce((sum, c) => sum + (c.enrollment_count || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Classes</h1>
            <p className="text-muted-foreground">Manage all classes across the institution</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <AddClassDialog onSuccess={fetchClasses} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{classes.length}</p>
                  <p className="text-sm text-muted-foreground">Total Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <Users className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalEnrollments}</p>
                  <p className="text-sm text-muted-foreground">Total Enrollments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Building className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(classes.map(c => c.department.toLowerCase().trim())).size}
                  </p>
                  <p className="text-sm text-muted-foreground">Departments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <MapPin className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(classes.map(c => c.room)).size}
                  </p>
                  <p className="text-sm text-muted-foreground">Rooms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Classes</CardTitle>
            <CardDescription>
              {filteredClasses.length} class{filteredClasses.length !== 1 ? 'es' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No classes found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Professor</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Enrollments</TableHead>
                    <TableHead>Join Code</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cls.subject}</p>
                          <p className="text-sm text-muted-foreground">{cls.code}</p>
                        </div>
                      </TableCell>
                      <TableCell>{cls.department}</TableCell>
                      <TableCell>{cls.professor_name}</TableCell>
                      <TableCell>{cls.room}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{cls.enrollment_count}</Badge>
                      </TableCell>
                      <TableCell>
                        {cls.join_code ? (
                          <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                            {cls.join_code}
                          </code>
                        ) : (
                          <Badge variant="destructive">Missing</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ManageClassEnrollmentsDialog classId={cls.id} className={cls.subject} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>View Sessions</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {!cls.join_code && (
                                <DropdownMenuItem onClick={() => handleRegenerateCode(cls.id, cls.join_code)}>
                                  <RefreshCw className="h-4 w-4 mr-2" /> Regenerate Code
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => setEditingClass(cls)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeletingClass(cls)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <EditClassDialog
          classData={editingClass}
          open={!!editingClass}
          onOpenChange={(open) => !open && setEditingClass(null)}
          onSuccess={fetchClasses}
        />

        {/* Delete Alert */}
        <AlertDialog open={!!deletingClass} onOpenChange={(open) => !open && setDeletingClass(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the class "{deletingClass?.subject}" and all associated data including attendance records.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteClass} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
