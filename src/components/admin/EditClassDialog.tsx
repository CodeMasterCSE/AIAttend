import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ClassData {
    id: string;
    subject: string;
    code: string;
    department: string;
    semester: string;
    room: string;
    professor_id: string;
}

interface EditClassDialogProps {
    classData: ClassData | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EditClassDialog({ classData, open, onOpenChange, onSuccess }: EditClassDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        code: '',
        department: '',
        semester: '',
        room: '',
    });
    const { toast } = useToast();

    useEffect(() => {
        if (classData) {
            setFormData({
                subject: classData.subject || '',
                code: classData.code || '',
                department: classData.department || '',
                semester: classData.semester || '',
                room: classData.room || '',
            });
        }
    }, [classData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!classData) return;

        setIsLoading(true);

        try {
            const { error } = await supabase
                .from('classes')
                .update({
                    subject: formData.subject,
                    code: formData.code,
                    department: formData.department,
                    semester: formData.semester,
                    room: formData.room,
                })
                .eq('id', classData.id);

            if (error) {
                throw error;
            }

            toast({ title: 'Success', description: 'Class updated successfully' });
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            console.error('Error updating class:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Class</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-subject">Subject Name *</Label>
                            <Input
                                id="edit-subject"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-code">Class Code *</Label>
                            <Input
                                id="edit-code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-class-dept">Department</Label>
                            <Input
                                id="edit-class-dept"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-semester">Semester</Label>
                            <Input
                                id="edit-semester"
                                value={formData.semester}
                                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-room">Room / Location</Label>
                        <Input
                            id="edit-room"
                            value={formData.room}
                            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
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
