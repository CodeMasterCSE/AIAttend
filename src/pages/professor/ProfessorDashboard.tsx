import { useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/common/StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClasses } from '@/hooks/useClasses';
import { useAttendanceRecords } from '@/hooks/useAttendanceRecords';
import { useAttendanceSessions } from '@/hooks/useAttendanceSessions';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Clock,
  Play,
  Download,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
} from 'recharts';
import { AttendanceChatbot } from '@/components/chatbot/AttendanceChatbot';

export default function ProfessorDashboard() {
  const { classes, isLoading } = useClasses();
  const { records } = useAttendanceRecords();
  const { sessions } = useAttendanceSessions();
  const firstClass = classes[0];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Calculate method distribution from real data
  const methodData = useMemo(() => {
    const total = records.length || 1;
    const face = records.filter((r) => r.method_used === 'face').length;
    const qr = records.filter((r) => r.method_used === 'qr').length;
    const proximity = records.filter((r) => r.method_used === 'proximity').length;
    const manual = records.filter((r) => r.method_used === 'manual').length;

    return [
      { method: 'Face Recognition', value: Math.round((face / total) * 100) || 0, fill: 'hsl(var(--primary))' },
      { method: 'QR Code', value: Math.round((qr / total) * 100) || 0, fill: 'hsl(var(--accent))' },
      { method: 'Proximity', value: Math.round((proximity / total) * 100) || 0, fill: 'hsl(var(--success))' },
      { method: 'Manual', value: Math.round((manual / total) * 100) || 0, fill: 'hsl(var(--muted-foreground))' },
    ];
  }, [records]);

  // Calculate attendance stats
  const attendanceStats = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const avgPercentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, avgPercentage };
  }, [records]);

  const activeSessions = sessions.filter((s) => s.is_active).length;

  // Weekly attendance chart data (placeholder - would need real date-based queries)
  const attendanceChartData = [
    { day: 'Mon', present: 0, absent: 0 },
    { day: 'Tue', present: 0, absent: 0 },
    { day: 'Wed', present: 0, absent: 0 },
    { day: 'Thu', present: 0, absent: 0 },
    { day: 'Fri', present: 0, absent: 0 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header / Hero */}
        <div className="rounded-2xl gradient-bg p-6 md:p-7 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />
          <div className="relative z-10 flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Play className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h1 className="text-xl md:text-2xl font-bold leading-tight">
                      Today&apos;s Teaching Overview
                    </h1>
                    <Badge className="bg-white/15 border-white/25 text-xs md:text-sm">
                      {today}
                    </Badge>
                  </div>
                  <p className="text-xs md:text-sm text-white/80 max-w-xl">
                    Monitor live attendance, start a new session, and keep track of how your classes are performing
                    in one place.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 md:gap-6">
                <div className="text-right">
                  <p className="text-2xl md:text-3xl font-bold">{classes.length}</p>
                  <p className="text-xs md:text-sm text-white/80">Active classes</p>
                </div>
                <Button
                  variant="glass"
                  asChild
                  className="bg-white/10 hover:bg-white/20 border-white/20"
                  disabled={!classes.length}
                >
                  <Link to="/professor/sessions">
                    Start Session
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>

            {firstClass ? (
              <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-white/85 border-t border-white/15 pt-3 mt-1">
                <span className="inline-flex items-center gap-2">
                  <Badge className="bg-white/15 border-white/20 text-xs">
                    Next class
                  </Badge>
                  <span className="font-medium">{firstClass.subject}</span>
                  <span className="opacity-80">({firstClass.code})</span>
                </span>
                <span className="opacity-80">• Room {firstClass.room}</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-white/85 border-t border-white/15 pt-3 mt-1">
                <span>No classes yet. Create a class to start taking attendance.</span>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="border-white/40 bg-white/10 hover:bg-white/20 text-xs md:text-sm h-8 px-3"
                >
                  <Link to="/professor/classes">
                    Manage Classes
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Records"
            value={attendanceStats.total.toString()}
            subtitle="Attendance entries"
            icon={Users}
            variant="primary"
          />
          <StatsCard
            title="Active Classes"
            value={isLoading ? '...' : classes.length.toString()}
            subtitle="This semester"
            icon={BookOpen}
            variant="default"
          />
          <StatsCard
            title="Avg. Attendance"
            value={`${attendanceStats.avgPercentage}%`}
            subtitle="Present rate"
            icon={TrendingUp}
            variant="success"
          />
          <StatsCard
            title="Active Sessions"
            value={activeSessions.toString()}
            subtitle={activeSessions > 0 ? 'In progress' : 'Start a session'}
            icon={Clock}
            variant="accent"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Classes + Weekly Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Classes List */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-semibold text-lg">Your Classes</h3>
                  <p className="text-sm text-muted-foreground">Quick view of your current courses</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/professor/classes">View All</Link>
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {isLoading ? (
                  <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">
                    Loading classes...
                  </div>
                ) : classes.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">
                    <p>No classes yet.</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <Link to="/professor/classes">Create Your First Class</Link>
                    </Button>
                  </div>
                ) : (
                  classes.slice(0, 4).map((cls) => (
                    <div
                      key={cls.id}
                      className="p-4 rounded-xl border border-border/80 hover:border-primary/60 hover:shadow-md transition-all duration-300 bg-secondary/30"
                    >
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div>
                          <Badge variant="outline" className="mb-1 text-xs">
                            {cls.code}
                          </Badge>
                          <h4 className="font-medium text-sm md:text-base">{cls.subject}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Room {cls.room} • {cls.semester}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Join Code</p>
                          <p className="text-sm font-mono font-semibold tracking-wide">
                            {cls.join_code}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Weekly Attendance Chart */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Weekly Overview</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Attendance breakdown by status
                  </p>
                </div>
                <Button variant="outline" size="sm" className="hidden md:inline-flex" asChild>
                  <Link to="/professor/reports">Full Report</Link>
                </Button>
              </div>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceChartData}>
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
                    <Bar dataKey="present" name="Present" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" name="Absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Check-in Methods */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold text-lg mb-4">Check-in Methods</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {methodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {methodData.map((item) => (
                  <div key={item.method} className="flex items-center gap-2 text-xs md:text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-muted-foreground truncate">{item.method}</span>
                    <span className="font-medium ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/professor/sessions">
                    <Calendar className="w-4 h-4 mr-2" />
                    Generate Session QR
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/professor/reports">
                    <Download className="w-4 h-4 mr-2" />
                    Export Today&apos;s Report
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/professor/classes">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Manage Classes
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <AttendanceChatbot />
    </DashboardLayout>
  );
}