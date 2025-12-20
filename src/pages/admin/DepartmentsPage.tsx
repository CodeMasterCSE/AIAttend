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
import { Search, MoreVertical, Building2, Loader2, Users, BookOpen, Edit, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddDepartmentDialog } from '@/components/admin/AddDepartmentDialog';
import { EditDepartmentDialog } from '@/components/admin/EditDepartmentDialog';

interface DepartmentData {
  id: string;
  name: string;
  code: string;
  description: string | null;
  head_of_department: string | null;
  created_at: string;
  student_count?: number;
  faculty_count?: number;
  class_count?: number;
}

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDepartment, setEditingDepartment] = useState<DepartmentData | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<DepartmentData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      
      const [deptRes, profilesRes, rolesRes, classesRes] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('profiles').select('user_id, department'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('classes').select('id, department'),
      ]);

      if (deptRes.error) throw deptRes.error;

      const rolesMap = (rolesRes.data || []).reduce((acc, r) => {
        acc[r.user_id] = r.role;
        return acc;
      }, {} as Record<string, string>);

      // Count students and faculty by department name
      const deptCounts = (profilesRes.data || []).reduce((acc, p) => {
        const deptName = (p.department || '').toLowerCase().trim();
        if (!acc[deptName]) acc[deptName] = { students: 0, faculty: 0 };
        if (rolesMap[p.user_id] === 'student') acc[deptName].students++;
        if (rolesMap[p.user_id] === 'professor') acc[deptName].faculty++;
        return acc;
      }, {} as Record<string, { students: number; faculty: number }>);

      // Count classes by department name
      const classCounts = (classesRes.data || []).reduce((acc, c) => {
        const deptName = (c.department || '').toLowerCase().trim();
        acc[deptName] = (acc[deptName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const departmentsWithCounts = (deptRes.data || []).map(dept => ({
        ...dept,
        student_count: deptCounts[dept.name.toLowerCase().trim()]?.students || 0,
        faculty_count: deptCounts[dept.name.toLowerCase().trim()]?.faculty || 0,
        class_count: classCounts[dept.name.toLowerCase().trim()] || 0,
      }));

      setDepartments(departmentsWithCounts);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({ title: 'Error', description: 'Failed to fetch departments', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!deletingDepartment) return;

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', deletingDepartment.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Department deleted successfully' });
      fetchDepartments();
    } catch (error: any) {
      console.error('Error deleting department:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingDepartment(null);
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (dept.head_of_department?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const totalStudents = departments.reduce((sum, d) => sum + (d.student_count || 0), 0);
  const totalFaculty = departments.reduce((sum, d) => sum + (d.faculty_count || 0), 0);
  const totalClasses = departments.reduce((sum, d) => sum + (d.class_count || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Departments</h1>
            <p className="text-muted-foreground">Manage all departments in the institution</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <AddDepartmentDialog onSuccess={fetchDepartments} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{departments.length}</p>
                  <p className="text-sm text-muted-foreground">Total Departments</p>
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
                  <p className="text-2xl font-bold">{totalStudents}</p>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalFaculty}</p>
                  <p className="text-sm text-muted-foreground">Total Faculty</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <BookOpen className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalClasses}</p>
                  <p className="text-sm text-muted-foreground">Total Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Departments</CardTitle>
            <CardDescription>
              {filteredDepartments.length} department{filteredDepartments.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No departments found</p>
                <AddDepartmentDialog onSuccess={fetchDepartments} />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Head of Department</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Classes</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDepartments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{dept.name}</p>
                            {dept.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {dept.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                            {dept.code}
                          </code>
                        </TableCell>
                        <TableCell>{dept.head_of_department || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{dept.student_count}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{dept.faculty_count}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{dept.class_count}</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingDepartment(dept)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeletingDepartment(dept)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <EditDepartmentDialog
          department={editingDepartment}
          open={!!editingDepartment}
          onOpenChange={(open) => !open && setEditingDepartment(null)}
          onSuccess={fetchDepartments}
        />

        {/* Delete Alert */}
        <AlertDialog open={!!deletingDepartment} onOpenChange={(open) => !open && setDeletingDepartment(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the department "{deletingDepartment?.name}".
                Note: This will not delete associated classes, students, or faculty.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteDepartment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
