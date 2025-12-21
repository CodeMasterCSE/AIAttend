import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

interface StudentAttendanceReportPDFProps {
    records: AttendanceRecord[];
    className?: string; // e.g. "All Classes" or specific class name
    classCode?: string;
    disabled?: boolean;
}

export function StudentAttendanceReportPDF({
    records,
    className = 'All Classes',
    classCode,
    disabled = false
}: StudentAttendanceReportPDFProps) {
    // Ideally, we'd have the student's name/roll number details.
    // Since we might not have it readily in props, we can query or just use "My Attendance".
    // The professor's report query had student details in the records. Here records don't have student details, just class details.

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
        doc.text('My Attendance Report', 14, 22);

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
            absent: records.filter(r => r.status === 'absent' || r.status === 'late').length,
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
        const total = stats.present + stats.absent || 1;

        // Present bar
        doc.setFillColor(34, 197, 94); // Green
        const presentWidth = (stats.present / total) * maxBarWidth;
        doc.rect(14, barY, presentWidth, barHeight, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Present: ${stats.present} (${Math.round((stats.present / total) * 100)}%)`, 100, barY + 6);

        // Absent bar
        doc.setFillColor(239, 68, 68); // Red
        const absentWidth = (stats.absent / total) * maxBarWidth;
        doc.rect(14, barY + 12, absentWidth, barHeight, 'F');
        doc.text(`Absent: ${stats.absent} (${Math.round((stats.absent / total) * 100)}%)`, 100, barY + 18);

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
            head: [['Class', 'Code', 'Date', 'Time', 'Method', 'Status']],
            body: records.map(r => [
                r.classes?.subject || 'Unknown',
                r.classes?.code || '-',
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
                if (data.column.index === 5 && data.section === 'body') {
                    const status = (data.cell.raw as string).toLowerCase();
                    if (status === 'present') {
                        data.cell.styles.textColor = [34, 197, 94];
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
        const filename = `my-attendance-report-${classCode || 'all-classes'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        doc.save(filename);
    };

    return (
        <Button onClick={generatePDF} disabled={disabled} variant="outline" size="sm">
            <FileDown className="w-4 h-4 mr-2" />
            PDF
        </Button>
    );
}
