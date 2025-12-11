import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkStudentImportProps {
  classId: string;
  className: string;
  onSuccess: () => void;
}

interface ImportResult {
  email: string;
  status: 'success' | 'error' | 'pending';
  message: string;
}

export function BulkStudentImport({ classId, className, onSuccess }: BulkStudentImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [previewData, setPreviewData] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    const text = await file.text();
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    
    // Extract emails from CSV (assuming first column is email or single column)
    const emails: string[] = [];
    lines.forEach((line, index) => {
      // Skip header row if it looks like a header
      if (index === 0 && (line.toLowerCase().includes('email') || !line.includes('@'))) {
        return;
      }
      const parts = line.split(',');
      const email = parts[0].trim().replace(/['"]/g, '');
      if (email && email.includes('@')) {
        emails.push(email);
      }
    });

    setPreviewData(emails);
    setResults([]);
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast.error('No valid emails found');
      return;
    }

    setIsImporting(true);
    setProgress(0);
    const importResults: ImportResult[] = [];

    for (let i = 0; i < previewData.length; i++) {
      const email = previewData[i];
      
      try {
        // Find student by email using the database function
        const { data: studentData, error: lookupError } = await supabase
          .rpc('get_student_by_email', { _email: email }) as { data: { user_id: string; name: string; email: string }[] | null; error: any };

        if (lookupError || !studentData || studentData.length === 0) {
          importResults.push({
            email,
            status: 'error',
            message: 'Student not found or not registered',
          });
          continue;
        }

        const student = studentData[0];

        // Check if already enrolled
        const { data: existingEnrollment } = await supabase
          .from('class_enrollments')
          .select('id')
          .eq('class_id', classId)
          .eq('student_id', student.user_id)
          .single();

        if (existingEnrollment) {
          importResults.push({
            email,
            status: 'error',
            message: 'Already enrolled',
          });
          continue;
        }

        // Enroll student
        const { error: enrollError } = await supabase
          .from('class_enrollments')
          .insert({
            class_id: classId,
            student_id: student.user_id,
          });

        if (enrollError) throw enrollError;

        importResults.push({
          email,
          status: 'success',
          message: 'Successfully enrolled',
        });
      } catch (error: any) {
        importResults.push({
          email,
          status: 'error',
          message: error.message || 'Failed to enroll',
        });
      }

      setProgress(Math.round(((i + 1) / previewData.length) * 100));
      setResults([...importResults]);
    }

    setIsImporting(false);
    
    const successCount = importResults.filter(r => r.status === 'success').length;
    if (successCount > 0) {
      toast.success(`Successfully enrolled ${successCount} students`);
      onSuccess();
    }
  };

  const downloadTemplate = () => {
    const template = 'email\nstudent1@university.edu\nstudent2@university.edu\nstudent3@university.edu';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetState = () => {
    setPreviewData([]);
    setResults([]);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Import Students
          </DialogTitle>
          <DialogDescription>
            Import multiple students to {className} via CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload CSV File</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="flex-1"
              />
              <Button variant="outline" size="icon" onClick={downloadTemplate} title="Download template">
                <Download className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              CSV should contain student emails (one per line or in first column)
            </p>
          </div>

          {/* Preview / Results */}
          {(previewData.length > 0 || results.length > 0) && (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-[150px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(results.length > 0 ? results : previewData.map(email => ({ 
                      email, 
                      status: 'pending' as const, 
                      message: 'Ready to import' 
                    }))).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{item.email}</TableCell>
                        <TableCell>
                          {item.status === 'success' && (
                            <Badge className="bg-success/20 text-success border-success/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Success
                            </Badge>
                          )}
                          {item.status === 'error' && (
                            <Badge variant="destructive" className="bg-destructive/20 text-destructive">
                              <XCircle className="w-3 h-3 mr-1" />
                              {item.message}
                            </Badge>
                          )}
                          {item.status === 'pending' && (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">{progress}% complete</p>
            </div>
          )}

          {/* Summary */}
          {results.length > 0 && !isImporting && (
            <div className="flex gap-4 p-3 bg-muted/50 rounded-lg text-sm">
              <span className="text-success">
                ✓ {results.filter(r => r.status === 'success').length} successful
              </span>
              <span className="text-destructive">
                ✗ {results.filter(r => r.status === 'error').length} failed
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {results.length > 0 ? 'Close' : 'Cancel'}
          </Button>
          {previewData.length > 0 && results.length === 0 && (
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import {previewData.length} Students
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
