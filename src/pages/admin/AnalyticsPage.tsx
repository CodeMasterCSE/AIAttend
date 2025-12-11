import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen,
  GraduationCap,
  UserCog,
  Calendar,
  Loader2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

interface AnalyticsData {
  totalStudents: number;
  totalProfessors: number;
  totalClasses: number;
  totalSessions: number;
  totalRecords: number;
  methodDistribution: { name: string; value: number }[];
  departmentStats: { name: string; classes: number; students: number }[];
  weeklyTrend: { day: string; records: number }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch all counts in parallel
      const [
        { count: studentCount },
        { count: professorCount },
        { count: classCount },
        { count: sessionCount },
        { data: recordsData },
        { data: classesData },
        { data: enrollmentsData }
      ] = await Promise.all([
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'professor'),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('attendance_sessions').select('*', { count: 'exact', head: true }),
        supabase.from('attendance_records').select('method_used, timestamp'),
        supabase.from('classes').select('department'),
        supabase.from('class_enrollments').select('class_id')
      ]);

      // Calculate method distribution
      const methodCounts = (recordsData || []).reduce((acc, r) => {
        const method = r.method_used || 'unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const methodDistribution = Object.entries(methodCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

      // Calculate department stats
      const deptClasses = (classesData || []).reduce((acc, c) => {
        acc[c.department] = (acc[c.department] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const departmentStats = Object.entries(deptClasses).map(([name, classes]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        classes,
        students: Math.floor(Math.random() * 50) + 10 // Placeholder
      }));

      // Calculate weekly trend (last 7 days)
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentRecords = (recordsData || []).filter(r => 
        new Date(r.timestamp) >= weekAgo
      );

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyTrend = dayNames.map((day, index) => {
        const count = recentRecords.filter(r => 
          new Date(r.timestamp).getDay() === index
        ).length;
        return { day, records: count };
      });

      setData({
        totalStudents: studentCount || 0,
        totalProfessors: professorCount || 0,
        totalClasses: classCount || 0,
        totalSessions: sessionCount || 0,
        totalRecords: recordsData?.length || 0,
        methodDistribution,
        departmentStats,
        weeklyTrend
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Institution-wide attendance analytics and insights</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <GraduationCap className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold">{data?.totalStudents}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <UserCog className="h-8 w-8 mx-auto text-accent mb-2" />
                <p className="text-2xl font-bold">{data?.totalProfessors}</p>
                <p className="text-xs text-muted-foreground">Faculty</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <BookOpen className="h-8 w-8 mx-auto text-success mb-2" />
                <p className="text-2xl font-bold">{data?.totalClasses}</p>
                <p className="text-xs text-muted-foreground">Classes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Calendar className="h-8 w-8 mx-auto text-warning mb-2" />
                <p className="text-2xl font-bold">{data?.totalSessions}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold">{data?.totalRecords}</p>
                <p className="text-xs text-muted-foreground">Records</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 mx-auto text-success mb-2" />
                <p className="text-2xl font-bold">
                  {data?.totalRecords && data?.totalSessions 
                    ? Math.round((data.totalRecords / Math.max(data.totalSessions, 1)) * 10) / 10
                    : 0}
                </p>
                <p className="text-xs text-muted-foreground">Avg/Session</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Check-in Method Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Check-in Method Distribution</CardTitle>
              <CardDescription>Breakdown of attendance methods used</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.methodDistribution && data.methodDistribution.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.methodDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.methodDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No attendance data yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Attendance Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Attendance Trend</CardTitle>
              <CardDescription>Check-ins per day this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.weeklyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="records"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Department Overview</CardTitle>
            <CardDescription>Classes per department</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.departmentStats && data.departmentStats.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.departmentStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="classes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No department data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
