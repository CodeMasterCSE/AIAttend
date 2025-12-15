import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentStats {
  name: string;
  rollNumber: string;
  present: number;
  late: number;
  absent: number;
  total: number;
  percentage: number;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  class_id: string;
  status: string;
  timestamp: string;
  method_used: string;
  student?: {
    name: string;
    roll_number: string | null;
  };
  class?: {
    code: string;
    subject: string;
  };
}

interface AttendanceReportPDFProps {
  records: AttendanceRecord[];
  className?: string;
  classCode?: string;
  disabled?: boolean;
}

export function AttendanceReportPDF({ 
  records, 
  className = 'All Classes', 
  classCode,
  disabled = false 
}: AttendanceReportPDFProps) {
  
  const generatePDF = () => {
    if (records.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(99, 102, 241); // Primary color
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Report', 14, 22);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${classCode ? `${classCode} - ` : ''}${className}`, 14, 32);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Report Info
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')}`, 14, 50);
    doc.text(`Total Records: ${records.length}`, 14, 56);

    // Stats Summary
    const stats = {
      present: records.filter(r => r.status === 'present').length,
      late: records.filter(r => r.status === 'late').length,
      absent: records.filter(r => r.status === 'absent').length,
    };

    const methodStats = {
      face: records.filter(r => r.method_used === 'face').length,
      qr: records.filter(r => r.method_used === 'qr').length,
      proximity: records.filter(r => r.method_used === 'proximity').length,
      manual: records.filter(r => r.method_used === 'manual').length,
    };

    // Summary Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, 70);

    // Status Chart (simple bars)
    const barY = 78;
    const barHeight = 8;
    const maxBarWidth = 80;
    const total = stats.present + stats.late + stats.absent || 1;

    // Present bar
    doc.setFillColor(34, 197, 94); // Green
    const presentWidth = (stats.present / total) * maxBarWidth;
    doc.rect(14, barY, presentWidth, barHeight, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Present: ${stats.present} (${Math.round((stats.present / total) * 100)}%)`, 100, barY + 6);

    // Late bar
    doc.setFillColor(234, 179, 8); // Yellow
    const lateWidth = (stats.late / total) * maxBarWidth;
    doc.rect(14, barY + 12, lateWidth, barHeight, 'F');
    doc.text(`Late: ${stats.late} (${Math.round((stats.late / total) * 100)}%)`, 100, barY + 18);

    // Absent bar
    doc.setFillColor(239, 68, 68); // Red
    const absentWidth = (stats.absent / total) * maxBarWidth;
    doc.rect(14, barY + 24, absentWidth, barHeight, 'F');
    doc.text(`Absent: ${stats.absent} (${Math.round((stats.absent / total) * 100)}%)`, 100, barY + 30);

    // Method Distribution
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Check-in Methods', 14, 125);

    autoTable(doc, {
      startY: 130,
      head: [['Method', 'Count', 'Percentage']],
      body: [
        ['Face Recognition', methodStats.face.toString(), `${Math.round((methodStats.face / total) * 100)}%`],
        ['QR Code', methodStats.qr.toString(), `${Math.round((methodStats.qr / total) * 100)}%`],
        ['Proximity', methodStats.proximity.toString(), `${Math.round((methodStats.proximity / total) * 100)}%`],
        ['Manual', methodStats.manual.toString(), `${Math.round((methodStats.manual / total) * 100)}%`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: 14, right: 14 },
    });

    // Student Statistics
    const studentMap = new Map<string, StudentStats>();
    records.forEach(record => {
      const studentId = record.student_id;
      const existing = studentMap.get(studentId);
      
      if (existing) {
        existing.total++;
        if (record.status === 'present') existing.present++;
        else if (record.status === 'late') existing.late++;
        else existing.absent++;
        existing.percentage = Math.round(((existing.present + existing.late) / existing.total) * 100);
      } else {
        studentMap.set(studentId, {
          name: record.student?.name || 'Unknown',
          rollNumber: record.student?.roll_number || '-',
          present: record.status === 'present' ? 1 : 0,
          late: record.status === 'late' ? 1 : 0,
          absent: record.status === 'absent' ? 1 : 0,
          total: 1,
          percentage: record.status !== 'absent' ? 100 : 0,
        });
      }
    });

    const studentStats = Array.from(studentMap.values()).sort((a, b) => b.percentage - a.percentage);

    // Add new page for student statistics
    doc.addPage();
    
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Student Statistics', 14, 17);
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: 35,
      head: [['Name', 'Roll No.', 'Present', 'Late', 'Absent', 'Total', 'Attendance %']],
      body: studentStats.map(s => [
        s.name,
        s.rollNumber,
        s.present.toString(),
        s.late.toString(),
        s.absent.toString(),
        s.total.toString(),
        `${s.percentage}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
      columnStyles: {
        6: { 
          fontStyle: 'bold',
          cellWidth: 25,
        },
      },
      didParseCell: (data) => {
        if (data.column.index === 6 && data.section === 'body') {
          const percentage = parseInt(data.cell.raw as string);
          if (percentage >= 75) {
            data.cell.styles.textColor = [34, 197, 94];
          } else if (percentage >= 50) {
            data.cell.styles.textColor = [234, 179, 8];
          } else {
            data.cell.styles.textColor = [239, 68, 68];
          }
        }
      },
    });

    // Detailed Records
    doc.addPage();
    
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Attendance Records', 14, 17);
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: 35,
      head: [['Student', 'Roll No.', 'Class', 'Date', 'Time', 'Method', 'Status']],
      body: records.map(r => [
        r.student?.name || 'Unknown',
        r.student?.roll_number || '-',
        r.class?.code || '-',
        format(new Date(r.timestamp), 'MMM d, yyyy'),
        format(new Date(r.timestamp), 'HH:mm'),
        r.method_used.charAt(0).toUpperCase() + r.method_used.slice(1),
        r.status.charAt(0).toUpperCase() + r.status.slice(1),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
      didParseCell: (data) => {
        if (data.column.index === 6 && data.section === 'body') {
          const status = (data.cell.raw as string).toLowerCase();
          if (status === 'present') {
            data.cell.styles.textColor = [34, 197, 94];
          } else if (status === 'late') {
            data.cell.styles.textColor = [234, 179, 8];
          } else {
            data.cell.styles.textColor = [239, 68, 68];
          }
        }
      },
    });

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${pageCount} | Generated by AttendEase`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Save PDF
    const filename = `attendance-report-${classCode || 'all-classes'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  return (
    <Button onClick={generatePDF} disabled={disabled} variant="outline">
      <FileDown className="w-4 h-4 mr-2" />
      Export PDF
    </Button>
  );
}
