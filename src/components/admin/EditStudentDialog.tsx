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

interface Student {
    user_id: string;
    name: string;
    email: string;
    roll_number: string | null;
    department: string | null;
}

interface EditStudentDialogProps {
    student: Student | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EditStudentDialog({ student, open, onOpenChange, onSuccess }: EditStudentDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        department: '',
        roll_number: '',
    });
    const { toast } = useToast();
    const { departments, isLoading: deptsLoading } = useDepartments();

    const handleRollNumberChange = (value: string) => {
        const rollNumber = value.toUpperCase();
        const email = rollNumber ? `${rollNumber.toLowerCase()}@rcciit.org.in` : '';
        setFormData(prev => ({ ...prev, roll_number: rollNumber, email }));
    };

    useEffect(() => {
        if (student) {
            setFormData({
                name: student.name || '',
                email: student.email || '',
                password: '',
                department: student.department || '',
                roll_number: student.roll_number || '',
            });
        }
    }, [student]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student) return;

        setIsLoading(true);

        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                throw new Error('Not authenticated');
            }

            const body: any = {
                user_id: student.user_id,
                name: formData.name,
                email: formData.email,
                department: formData.department || null,
                roll_number: formData.roll_number || null,
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

            toast({ title: 'Success', description: 'Student updated successfully' });
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            console.error('Error updating student:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Student</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Full Name *</Label>
                        <Input
                            id="edit-name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-department">Department</Label>
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
                        <Label htmlFor="edit-roll_number">Roll Number</Label>
                        <Input
                            id="edit-roll_number"
                            value={formData.roll_number}
                            onChange={(e) => handleRollNumberChange(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-email">Email *</Label>
                        <Input
                            id="edit-email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            readOnly
                            className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                            Auto-generated from roll number
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-password">Password (Leave blank to keep current)</Label>
                        <Input
                            id="edit-password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            minLength={6}
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
