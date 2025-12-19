import { useState, useEffect } from 'react';
import { subWeeks, startOfWeek, endOfWeek, isWithinInterval, format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/common/StatsCard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Users,
  BookOpen,
  GraduationCap,
  UserCog,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Plus,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AttendanceChatbot } from '@/components/chatbot/AttendanceChatbot';



const lowAttendanceStudents = [
  { id: '1', name: 'No alerts', rollNumber: '-', attendance: 0, photoURL: '' },
];

const recentActivity = [
  { action: 'System started', user: 'Admin', time: 'Just now', type: 'report' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    activeClasses: 0,
    classesToday: 0,
    departments: [] as { name: string, students: number, faculty: number, attendance: number }[],
    recentActivity: [] as { action: string, user: string, time: string, type: string }[],
    trendData: [] as { week: string, attendance: number }[],
    isLoading: true
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [studentsRes, facultyRes, classesRes, profilesRes, rolesRes, recentProfiles, recentClasses, sessionsRes, recordsRes] = await Promise.all([
          supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'professor'),
          supabase.from('classes').select('id, department', { count: 'exact' }),
          supabase.from('profiles').select('department, user_id, name'),
          supabase.from('user_roles').select('user_id, role'),
          supabase.from('profiles').select('name, created_at, user_id').order('created_at', { ascending: false }).limit(3),
          supabase.from('classes').select('subject, created_at').order('created_at', { ascending: false }).limit(2),
          supabase.from('attendance_sessions').select('id, date').gte('date', format(subWeeks(new Date(), 4), 'yyyy-MM-dd')),
          supabase.from('attendance_records').select('session_id, status, class_id').gte('timestamp', subWeeks(new Date(), 4).toISOString())
        ]);

        const rolesMap = (rolesRes.data || []).reduce((acc, r) => {
          acc[r.user_id] = r.role;
          return acc;
        }, {} as Record<string, string>);

        const deptMap = (profilesRes.data || []).reduce((acc, p) => {
          const dept = p.department || 'Other';
          if (!acc[dept]) acc[dept] = { students: 0, faculty: 0 };

          if (rolesMap[p.user_id] === 'student') acc[dept].students++;
          if (rolesMap[p.user_id] === 'professor') acc[dept].faculty++;

          return acc;
        }, {} as Record<string, { students: number, faculty: number }>);

        const classDeptMap = (classesRes.data || []).reduce((acc, cls) => {
          acc[cls.id] = cls.department;
          return acc;
        }, {} as Record<string, string>);

        const deptAttendance = {} as Record<string, { total: number, present: number }>;
        (recordsRes.data || []).forEach(record => {
          const dept = classDeptMap[record.class_id];
          if (dept) {
            if (!deptAttendance[dept]) deptAttendance[dept] = { total: 0, present: 0 };
            deptAttendance[dept].total++;
            if (record.status === 'present' || record.status === 'late') {
              deptAttendance[dept].present++;
            }
          }
        });

        const departmentData = Object.entries(deptMap).map(([name, counts]) => {
          const att = deptAttendance[name];
          const attendancePct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;
          return {
            name,
            ...counts,
            attendance: attendancePct
          };
        }).sort((a, b) => b.students - a.students).slice(0, 4);

        // Map recent activity
        const activities = [
          ...(recentProfiles.data || []).map(p => ({
            action: `New ${rolesMap[p.user_id] || 'user'} registered: ${p.name}`,
            user: 'System',
            time: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: rolesMap[p.user_id] === 'professor' ? 'faculty' : 'student'
          })),
          ...(recentClasses.data || []).map(c => ({
            action: `New class created: ${c.subject}`,
            user: 'Admin',
            time: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'class'
          }))
        ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5);

        // Calculate trends
        const sessions = sessionsRes.data || [];
        const records = recordsRes.data || [];
        const trends = [];

        for (let i = 3; i >= 0; i--) {
          const weekStart = startOfWeek(subWeeks(new Date(), i));
          const weekEnd = endOfWeek(subWeeks(new Date(), i));

          const weekSessionIds = sessions
            .filter(s => isWithinInterval(new Date(s.date), { start: weekStart, end: weekEnd }))
            .map(s => s.id);

          const weekRecords = records.filter(r => weekSessionIds.includes(r.session_id));
          const presentCount = weekRecords.filter(r => r.status === 'present' || r.status === 'late').length;
          const totalCount = weekRecords.length;

          const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
          trends.push({ week: `Week ${4 - i}`, attendance: percentage });
        }

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const todayCount = sessions.filter(s => s.date === todayStr).length;

        setStats({
          totalStudents: studentsRes.count || 0,
          totalFaculty: facultyRes.count || 0,
          activeClasses: classesRes.count || 0,
          classesToday: todayCount,
          departments: departmentData.length > 0 ? departmentData : [
            { name: 'Computer Science', students: 0, faculty: 0, attendance: 0 },
            { name: 'Electrical Engineering', students: 0, faculty: 0, attendance: 0 }
          ],
          recentActivity: activities,
          trendData: trends,
          isLoading: false
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    }

    fetchStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your institution's attendance system</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link to="/admin/analytics">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Link>
            </Button>
            <Button variant="gradient" asChild>
              <Link to="/admin/students">
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Students"
            value={stats.isLoading ? "--" : stats.totalStudents}
            subtitle="Active enrollments"
            icon={GraduationCap}
            variant="primary"
          />
          <StatsCard
            title="Faculty Members"
            value={stats.isLoading ? "--" : stats.totalFaculty}
            subtitle="Across departments"
            icon={UserCog}
            variant="accent"
          />
          <StatsCard
            title="Active Classes"
            value={stats.isLoading ? "--" : stats.activeClasses}
            subtitle="This semester"
            icon={BookOpen}
            variant="default"
          />
          <StatsCard
            title="Classes Today"
            value={stats.isLoading ? "--" : stats.classesToday}
            subtitle="Scheduled sessions"
            icon={Calendar}
            variant="success"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Attendance Trend */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-lg">Institution Attendance Trend</h3>
                <p className="text-sm text-muted-foreground">Average attendance across all classes</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/analytics">Detailed View</Link>
              </Button>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trendData.length > 0 ? stats.trendData : [{ week: 'No Data', attendance: 0 }]}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[70, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Low Attendance Alert */}
          <div className="rounded-2xl border border-warning/50 bg-warning/5 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h3 className="font-semibold text-lg">Low Attendance Alert</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Students with attendance below 75%
            </p>
            <div className="space-y-3">
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No low attendance alerts</p>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/admin/students">
                View All Students
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Stats & Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Department Overview */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold text-lg mb-4">Department Overview</h3>
            <div className="space-y-4">
              {stats.departments.map((dept) => (
                <div key={dept.name} className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
                  <div className="flex-1">
                    <p className="font-medium">{dept.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5" />
                        {dept.students} Students
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCog className="w-3.5 h-3.5" />
                        {dept.faculty} Faculty
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-muted-foreground">{dept.attendance}%</p>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {stats.isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
              ) : stats.recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No recent activity</div>
              ) : (
                stats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activity.type === 'student' ? 'bg-primary/10 text-primary' :
                      activity.type === 'class' ? 'bg-accent/10 text-accent' :
                        activity.type === 'faculty' ? 'bg-success/10 text-success' :
                          'bg-secondary text-muted-foreground'
                      }`}>
                      {activity.type === 'student' && <GraduationCap className="w-5 h-5" />}
                      {activity.type === 'class' && <BookOpen className="w-5 h-5" />}
                      {activity.type === 'faculty' && <UserCog className="w-5 h-5" />}
                      {activity.type === 'report' && <BarChart3 className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">by {activity.user}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: GraduationCap, label: 'Manage Students', path: '/admin/students', color: 'primary' },
            { icon: UserCog, label: 'Manage Faculty', path: '/admin/faculty', color: 'accent' },
            { icon: BookOpen, label: 'Manage Classes', path: '/admin/classes', color: 'success' },
            { icon: BarChart3, label: 'View Analytics', path: '/admin/analytics', color: 'warning' },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.path}
              className="p-6 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${action.color === 'primary' ? 'gradient-bg' :
                action.color === 'accent' ? 'bg-accent' :
                  action.color === 'success' ? 'bg-success' :
                    'bg-warning'
                }`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <p className="font-medium group-hover:text-primary transition-colors">{action.label}</p>
            </Link>
          ))}
        </div>
      </div>
      <AttendanceChatbot />
    </DashboardLayout>
  );
}