import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Search, MoreVertical, UserCog, Loader2, BookOpen, Building, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddProfessorDialog } from '@/components/admin/AddProfessorDialog';
import { EditProfessorDialog } from '@/components/admin/EditProfessorDialog';

interface Professor {
  user_id: string;
  name: string;
  email: string;
  employee_id: string | null;
  department: string | null;
  photo_url: string | null;
  created_at: string;
  class_count?: number;
}

export default function FacultyPage() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProfessor, setEditingProfessor] = useState<Professor | null>(null);
  const [deletingProfessor, setDeletingProfessor] = useState<Professor | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfessors();
  }, []);

  const fetchProfessors = async () => {
    try {
      // Get all professor user_ids from user_roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'professor');

      if (roleError) throw roleError;

      if (roleData && roleData.length > 0) {
        const professorIds = roleData.map(r => r.user_id);

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, name, email, employee_id, department, photo_url, created_at')
          .in('user_id', professorIds)
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;

        // Get class counts for each professor
        const { data: classesData } = await supabase
          .from('classes')
          .select('professor_id');

        const classCounts = classesData?.reduce((acc, cls) => {
          acc[cls.professor_id] = (acc[cls.professor_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const professorsWithCounts = (profilesData || []).map(prof => ({
          ...prof,
          class_count: classCounts[prof.user_id] || 0
        }));

        setProfessors(professorsWithCounts);
      } else {
        setProfessors([]);
      }
    } catch (error) {
      console.error('Error fetching professors:', error);
      toast({ title: 'Error', description: 'Failed to fetch faculty', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProfessor = async () => {
    if (!deletingProfessor) return;

    try {
      // Call admin-delete-user edge function
      const response = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: deletingProfessor.user_id }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error);
      }

      toast({ title: 'Success', description: 'Faculty member deleted successfully' });
      fetchProfessors();
    } catch (error: any) {
      console.error('Error deleting professor:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingProfessor(null);
    }
  };

  const filteredProfessors = professors.filter(prof =>
    prof.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prof.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (prof.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Faculty</h1>
            <p className="text-muted-foreground">Manage all professors and instructors</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search faculty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <AddProfessorDialog onSuccess={fetchProfessors} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <UserCog className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{professors.length}</p>
                  <p className="text-sm text-muted-foreground">Total Faculty</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {professors.reduce((sum, p) => sum + (p.class_count || 0), 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Classes Assigned</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <Building className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(professors.map(p => p.department).filter(Boolean)).size}
                  </p>
                  <p className="text-sm text-muted-foreground">Departments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Faculty Members</CardTitle>
            <CardDescription>
              {filteredProfessors.length} member{filteredProfessors.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProfessors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <UserCog className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No faculty members found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Faculty Member</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfessors.map((professor) => (
                    <TableRow key={professor.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={professor.photo_url || ''} />
                            <AvatarFallback className="bg-accent/10 text-accent">
                              {professor.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{professor.name}</p>
                            <p className="text-sm text-muted-foreground">{professor.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{professor.employee_id || '-'}</Badge>
                      </TableCell>
                      <TableCell>{professor.department || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{professor.class_count || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(professor.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>View Classes</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditingProfessor(professor)}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingProfessor(professor)}
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
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <EditProfessorDialog
          professor={editingProfessor}
          open={!!editingProfessor}
          onOpenChange={(open) => !open && setEditingProfessor(null)}
          onSuccess={fetchProfessors}
        />

        {/* Delete Alert */}
        <AlertDialog open={!!deletingProfessor} onOpenChange={(open) => !open && setDeletingProfessor(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the faculty account for {deletingProfessor?.name} and remove all their data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProfessor} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
