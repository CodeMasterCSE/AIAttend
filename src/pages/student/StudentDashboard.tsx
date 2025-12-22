import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/common/StatsCard';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ScanFace,
  Calendar,
  CheckCircle2,
  BookOpen,
  TrendingUp,
  ArrowRight,
  Camera,
  AlertCircle,
  Play,
  CalendarClock,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStudentStats } from '@/hooks/useStudentStats';
import { ActiveSessionsBanner } from '@/components/student/ActiveSessionsBanner';
import { JoinClassCard } from '@/components/student/JoinClassCard';
import { AttendanceChatbot } from '@/components/chatbot/AttendanceChatbot';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { courses, stats, weeklyData, isLoading, faceRegistered, refreshStats, nextClass, scheduleChanges } = useStudentStats();

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Active Sessions Banner */}
        <ActiveSessionsBanner />

        {/* Schedule Changes Alert */}

        {/* Face Registration Status Banner */}
        {faceRegistered === false && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-orange-500/30 bg-orange-500/10">
            <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-orange-600 dark:text-orange-400">Face not registered</p>
              <p className="text-sm text-muted-foreground">Register your face to enable quick check-in for attendance.</p>
            </div>
            <Button size="sm" asChild>
              <Link to="/student/face-registration">
                <Camera className="w-4 h-4 mr-2" />
                Register Now
              </Link>
            </Button>
          </div>
        )}

        {/* Header / Hero */}
        <div className="rounded-2xl gradient-bg p-6 md:p-8 text-primary-foreground relative overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
                  <Play className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <h1 className="text-xl md:text-2xl font-bold leading-tight tracking-tight">
                      Today&apos;s Learning Overview
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-white/20 border-white/30 text-xs hover:bg-white/30 transition-colors">
                        {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Badge>
                      <Badge variant="outline" className="text-white/90 border-white/20 text-xs">
                        {stats.todayClasses} Scheduled Classes
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm md:text-base text-white/85 font-medium">
                    You have <span className="text-white font-bold">{stats.todayClasses}</span> classes scheduled for today.
                    {stats.todayClasses > 0 ? " Ready to learn?" : " Enjoy your day off!"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="glass"
                  size="lg"
                  asChild
                  className="bg-white/10 hover:bg-white/20 border-white/20 shadow-lg group transition-all duration-300 hover:scale-105"
                >
                  <Link to="/student/check-in">
                    <ScanFace className="w-5 h-5 mr-2" />
                    Quick Check-in
                    <div className="bg-white/20 rounded-full p-1 group-hover:bg-white/30 transition-colors ml-2">
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Next Class Card */}
            <div className="bg-white/10 rounded-xl p-4 md:p-5 border border-white/10 backdrop-blur-md">
              {nextClass ? (
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="text-xs text-white/60 uppercase tracking-wider font-semibold mb-1">Up Next</div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-lg md:text-xl font-bold">{nextClass.classes?.subject}</span>
                      <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none">
                        {nextClass.classes?.code}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 md:gap-8 text-sm md:text-base border-t md:border-t-0 border-white/10 pt-3 md:pt-0">
                    <div className="flex items-center gap-2 text-white/90">
                      <div className="p-1.5 rounded-lg bg-white/10">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="font-medium">
                        {new Date(`2000-01-01T${nextClass.start_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-white/90">
                      <div className="p-1.5 rounded-lg bg-white/10">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span>Room {nextClass.classes?.room}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-white/70">
                    <div className="p-2 rounded-full bg-white/5">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <span>No upcoming classes for today.</span>
                  </div>
                  <Button
                    variant="link"
                    asChild
                    className="text-white hover:text-white/80 p-0 h-auto font-medium"
                  >
                    <Link to="/student/timetable">
                      View Timetable <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Changes Alert */}
        {scheduleChanges && scheduleChanges.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 text-amber-700 dark:text-amber-400">
              <CalendarClock className="w-5 h-5" />
              Schedule Changes
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {scheduleChanges.map((change: any) => (
                <div key={change.id} className="bg-background/60 backdrop-blur-sm p-4 rounded-xl border border-border flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold  text-sm md:text-base">{change.classes?.subject}</span>
                      <Badge variant="outline">{change.classes?.code}</Badge>
                      <Badge variant={change.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize text-[10px] px-1.5 h-5">
                        {change.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {change.day} • {change.start_time?.slice(0, 5)} - {change.end_time?.slice(0, 5)}
                    </p>
                    {change.cancel_reason && (
                      <p className="text-xs mt-2 p-2 bg-muted/50 rounded-lg inline-block">
                        Reason: {change.cancel_reason}
                      </p>
                    )}
                  </div>
                  {change.status === 'cancelled' ? (
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  ) : (
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                      <CalendarClock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </>
          ) : (
            <>
              <StatsCard
                title="Overall Attendance"
                value={`${stats.overallAttendance}%`}
                subtitle="This semester"
                icon={TrendingUp}
                variant="primary"
              />
              <StatsCard
                title="Classes Today"
                value={stats.todayClasses.toString()}
                subtitle="Scheduled"
                icon={Calendar}
                variant="default"
              />
              <StatsCard
                title="Present Days"
                value={stats.totalPresent.toString()}
                subtitle={`of ${stats.totalSessions} sessions`}
                icon={CheckCircle2}
                variant="success"
              />
              <StatsCard
                title="Enrolled Courses"
                value={stats.enrolledCourses.toString()}
                subtitle="Active courses"
                icon={BookOpen}
                variant="accent"
              />
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Enrolled Courses & Attendance Chart */}
          <div className="lg:col-span-2 space-y-6">


            {/* Attendance Chart */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-lg">Attendance Trend</h3>
                  <p className="text-sm text-muted-foreground">Weekly attendance percentage</p>
                </div>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Attendance']}
                    />
                    <Area
                      type="monotone"
                      dataKey="attendance"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#attendanceGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold text-lg mb-4">Attendance Summary</h3>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 rounded-lg" />
                  <Skeleton className="h-12 rounded-lg" />
                </div>
              ) : stats.totalSessions > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Present</span>
                    </div>
                    <span className="font-semibold text-green-600">{stats.totalPresent}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm">Absent</span>
                    </div>
                    <span className="font-semibold text-red-600">{stats.totalSessions - stats.totalPresent}</span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Sessions</span>
                      <span className="font-medium">{stats.totalSessions}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No attendance data yet</p>
                </div>
              )}
            </div>

            {/* Course Status */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold text-lg mb-4">Course Status</h3>
              {isLoading ? (
                <Skeleton className="h-24 rounded-lg" />
              ) : courses.length > 0 ? (
                <div className="space-y-3">
                  {courses.slice(0, 3).map((course) => (
                    <div key={course.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${course.attendancePercentage >= 75 ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm truncate max-w-[120px]">{course.code}</span>
                      </div>
                      <span className={`text-sm font-medium ${course.attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                        {course.attendancePercentage}%
                      </span>
                    </div>
                  ))}
                  {courses.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{courses.length - 3} more courses
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No courses enrolled</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <AttendanceChatbot />
    </DashboardLayout>
  );
}
