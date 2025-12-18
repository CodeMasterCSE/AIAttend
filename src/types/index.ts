export type UserRole = 'student' | 'professor' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  photoURL?: string;
  department?: string;
  createdAt: Date;
}

export interface Student extends User {
  role: 'student';
  rollNumber: string;
  faceEmbedding?: number[];
  enrolledClasses: string[];
  attendanceHistory: AttendanceRecord[];
}

export interface Professor extends User {
  role: 'professor';
  employeeId: string;
  classes: string[];
}

export interface Admin extends User {
  role: 'admin';
  permissions: string[];
}

export interface Class {
  id: string;
  subject: string;
  code: string;
  professorId: string;
  professorName: string;
  schedule: ClassSchedule[];
  enrolledStudents: string[];
  department: string;
  semester: string;
  room: string;
}

export interface ClassSchedule {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  startTime: string;
  endTime: string;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  studentId: string;
  timestamp: Date;
  methodUsed: 'face' | 'qr' | 'proximity' | 'manual';
  status: 'present' | 'absent';
  verificationScore?: number;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  date: Date;
  startTime: string;
  endTime: string;
  qrCode?: string;
  isActive: boolean;
  records: AttendanceRecord[];
}

export interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  averageAttendance: number;
  todayCheckIns: number;
}

export interface AttendanceReport {
  classId: string;
  className: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalSessions: number;
  averageAttendance: number;
  studentStats: StudentAttendanceStats[];
}

export interface StudentAttendanceStats {
  studentId: string;
  studentName: string;
  rollNumber: string;
  totalPresent: number;
  totalAbsent: number;
  attendancePercentage: number;
}
