import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface DepartmentData {
  id: string;
  name: string;
  code: string;
  description: string | null;
  head_of_department: string | null;
}

interface EditDepartmentDialogProps {
  department: DepartmentData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditDepartmentDialog({ department, open, onOpenChange, onSuccess }: EditDepartmentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    head_of_department: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name,
        code: department.code,
        description: department.description || '',
        head_of_department: department.head_of_department || '',
      });
    }
  }, [department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!department || !formData.name.trim() || !formData.code.trim()) {
      toast({ title: 'Error', description: 'Name and code are required', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('departments')
        .update({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim() || null,
          head_of_department: formData.head_of_department.trim() || null,
        })
        .eq('id', department.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Department updated successfully' });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating department:', error);
      toast({ 
        title: 'Error', 
        description: error.message.includes('duplicate') 
          ? 'A department with this name or code already exists' 
          : error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Department Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Computer Science"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-code">Department Code *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="e.g., CS"
                className="uppercase"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-head">Head of Department</Label>
              <Input
                id="edit-head"
                value={formData.head_of_department}
                onChange={(e) => setFormData(prev => ({ ...prev, head_of_department: e.target.value }))}
                placeholder="e.g., Dr. John Smith"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the department..."
                rows={3}
              />
            </div>
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
