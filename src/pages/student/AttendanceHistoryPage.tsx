import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useEnrollments } from '@/hooks/useEnrollments';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Calendar, CheckCircle, XCircle, Loader2, ScanFace, QrCode, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  timestamp: string;
  status: string;
  method_used: string;
  class_id: string;
  classes?: {
    subject: string;
    code: string;
  };
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AttendanceHistoryPage() {
  const { user } = useAuth();
  const { enrollments } = useEnrollments();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      if (!user?.id) return;

      try {
        let query = supabase
          .from('attendance_records')
          .select(`
            id,
            timestamp,
            status,
            method_used,
            class_id,
            classes (
              subject,
              code
            )
          `)
          .eq('student_id', user.id)
          .order('timestamp', { ascending: false });

        if (selectedClassId !== 'all') {
          query = query.eq('class_id', selectedClassId);
        }

        const { data, error } = await query;
        if (error) throw error;
        setRecords(data || []);
      } catch (error) {
        console.error('Error fetching attendance records:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceRecords();
  }, [user?.id,selectedClassId]);

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'face':
        return <ScanFace className="h-4 w-4" />;
      case 'qr':
        return <QrCode className="h-4 w-4" />;
      case 'proximity':
        return <MapPin className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'present') {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Present</Badge>;
    }
    return <Badge variant="destructive">Absent</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Attendance History</h1>
            <p className="text-muted-foreground">View your attendance records across all classes</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {enrollments.map((e) => (
                  e.classes ? (
                    <SelectItem key={e.classes.code} value={e.classes.code}>
                      {e.classes.subject}
                    </SelectItem>
                  ) : null
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Attendance Records</h3>
              <p className="text-muted-foreground text-center">
                You don't have any attendance records yet. Check in to a class to see your history.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance</CardTitle>
              <CardDescription>Your check-in history sorted by date</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-primary/10">
                        {getMethodIcon(record.method_used)}
                      </div>
                      <div>
                        <p className="font-medium">{record.classes?.subject}</p>
                        <p className="text-sm text-muted-foreground">{record.classes?.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(record.timestamp), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(record.timestamp), 'h:mm a')}
                        </p>
                      </div>
                      {getStatusBadge(record.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
