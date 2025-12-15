import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WeeklyTimetable } from '@/components/student/WeeklyTimetable';
import { useProfessorSchedules } from '@/hooks/useProfessorSchedules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Clock, MapPin } from 'lucide-react';

export default function ProfessorTimetablePage() {
  const { schedules, isLoading } = useProfessorSchedules();

  // Count unique classes and total weekly hours
  const uniqueClasses = [...new Set(schedules.map(s => s.class_id))].length;
  const totalHours = schedules.reduce((acc, s) => {
    const start = parseInt(s.start_time.split(':')[0]);
    const end = parseInt(s.end_time.split(':')[0]);
    return acc + (end - start);
  }, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">My Timetable</h1>
          <p className="text-muted-foreground">View your weekly teaching schedule</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{uniqueClasses}</p>
                  <p className="text-sm text-muted-foreground">Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalHours}</p>
                  <p className="text-sm text-muted-foreground">Hours/Week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <MapPin className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{schedules.length}</p>
                  <p className="text-sm text-muted-foreground">Sessions/Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timetable */}
        <WeeklyTimetable schedules={schedules} isLoading={isLoading} />
      </div>
    </DashboardLayout>
  );
}
