import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDepartments } from '@/hooks/useDepartments';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface Professor {
    user_id: string;
    name: string;
    email: string;
    employee_id: string | null;
    department: string | null;
}

interface EditProfessorDialogProps {
    professor: Professor | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EditProfessorDialog({ professor, open, onOpenChange, onSuccess }: EditProfessorDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        department: '',
        employee_id: '',
    });
    const { toast } = useToast();
    const { departments, isLoading: deptsLoading } = useDepartments();

    useEffect(() => {
        if (professor) {
            setFormData({
                name: professor.name || '',
                email: professor.email || '',
                password: '',
                department: professor.department || '',
                employee_id: professor.employee_id || '',
            });
        }
    }, [professor]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!professor) return;

        setIsLoading(true);

        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                throw new Error('Not authenticated');
            }

            const body: any = {
                user_id: professor.user_id,
                name: formData.name,
                email: formData.email,
                department: formData.department || null,
                employee_id: formData.employee_id || null,
            };

            if (formData.password && formData.password.trim() !== "") {
                body.password = formData.password;
            }

            const response = await supabase.functions.invoke('admin-update-user', {
                body: body,
            });

            if (response.error) {
                throw new Error(response.error.message);
            }

            if (!response.data.success) {
                throw new Error(response.data.error);
            }

            toast({ title: 'Success', description: 'Professor updated successfully' });
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            console.error('Error updating professor:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Professor</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="prof-name">Full Name *</Label>
                        <Input
                            id="prof-name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prof-email">Email *</Label>
                        <Input
                            id="prof-email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prof-password">Password (Leave blank to keep current)</Label>
                        <Input
                            id="prof-password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            minLength={6}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prof-department">Department</Label>
                        <Select
                            value={formData.department}
                            onValueChange={(value) => setFormData({ ...formData, department: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={deptsLoading ? "Loading..." : "Select department"} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                                {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.name}>
                                        {dept.name}
                                    </SelectItem>
                                ))}
                                {departments.length === 0 && !deptsLoading && (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                        No departments available
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prof-employee_id">Employee ID</Label>
                        <Input
                            id="prof-employee_id"
                            value={formData.employee_id}
                            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
