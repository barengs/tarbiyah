import jsPDFImport, { jsPDF as jsPDFNamed } from 'jspdf';
import autoTableImport, { autoTable as autoTableNamed } from 'jspdf-autotable';

const jsPDF = jsPDFNamed || jsPDFImport;
const autoTable = autoTableNamed || autoTableImport;

/**
 * Gambar Kop Surat Resmi Pesantren
 */
function drawKopPesantren(doc, pageWidth, startY = 26) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(9, 60, 48); // Emerald #093c30
    doc.text('PONDOK PESANTREN MIFTAHUL ULUM PANYEPPEN', pageWidth / 2, startY, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text("BAGIAN PENDIDIKAN DAN PENGAJARAN (TARBIYAH WA TA'LIM)", pageWidth / 2, startY + 14, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Jl. Raya Panyeppen, Potoan Daya, Palengaan, Pamekasan, Jawa Timur 69362 | Website: panyeppen.id', pageWidth / 2, startY + 25, { align: 'center' });

    const lineY = startY + 33;
    doc.setDrawColor(9, 60, 48);
    doc.setLineWidth(1.6);
    doc.line(36, lineY, pageWidth - 36, lineY);

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(36, lineY + 3, pageWidth - 36, lineY + 3);

    return lineY + 16;
}

/**
 * Generate PDF Rekapitulasi Kehadiran Santri per Rombel
 */
export function generateAttendanceRecapPdf({
    group = null,
    students = [],
    totalMeetings = 0,
    meta = {},
}) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 36;

    let cursorY = drawKopPesantren(doc, pageWidth, 26);

    // Judul Dokumen
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    doc.text('REKAPITULASI KEHADIRAN SANTRI', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 13;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const subtitle = `Tahun Akademik: ${meta.academicYear || '-'}  •  Periode: ${meta.quarterName || '-'}`;
    doc.text(subtitle, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 10;

    if (meta.dateRangeLabel) {
        cursorY += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(9, 60, 48);
        doc.text(`Rentang Tanggal: ${meta.dateRangeLabel}`, pageWidth / 2, cursorY, { align: 'center' });
        cursorY += 10;
    }

    // Kotak Info Rombel
    const boxY = cursorY + 4;
    const boxHeight = 46;
    const boxWidth = pageWidth - marginX * 2;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.8);
    doc.roundedRect(marginX, boxY, boxWidth, boxHeight, 4, 4, 'FD');

    const col1X = marginX + 12;
    const col2X = marginX + boxWidth * 0.52;

    const rombelLabel = `${group?.name || '-'}${group?.code ? ` (${group.code})` : ''}`;
    const jenjangLabel = group?.educational_institution?.name || group?.education?.name || '-';
    const waliLabel = group?.homeroom_teacher?.name || '-';

    const drawMeta = (x, y, label, val) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(label, x, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`: ${val}`, x + 76, y);
    };

    drawMeta(col1X, boxY + 17, 'Rombel / Kelas', rombelLabel);
    drawMeta(col1X, boxY + 33, 'Lembaga / Jenjang', jenjangLabel);
    drawMeta(col2X, boxY + 17, 'Wali Kelas', waliLabel);
    drawMeta(col2X, boxY + 33, 'Total Pertemuan', `${totalMeetings} Sesi KBM (${students.length} Santri)`);

    // Ringkasan Total
    const sumH = students.reduce((acc, s) => acc + (Number(s.hadir) || 0), 0);
    const sumS = students.reduce((acc, s) => acc + (Number(s.sakit) || 0), 0);
    const sumI = students.reduce((acc, s) => acc + (Number(s.izin) || 0), 0);
    const sumA = students.reduce((acc, s) => acc + (Number(s.alpa) || 0), 0);
    const avgPct = students.length > 0
        ? Math.round(students.reduce((acc, s) => acc + (Number(s.percentage) || 0), 0) / students.length)
        : 0;

    const bodyRows = students.map((st, idx) => [
        String(idx + 1),
        st.nis || '-',
        st.name || '-',
        String(st.hadir ?? 0),
        String(st.sakit ?? 0),
        String(st.izin ?? 0),
        String(st.alpa ?? 0),
        `${st.percentage ?? 0}%`,
    ]);

    if (bodyRows.length > 0) {
        bodyRows.push([
            '',
            '',
            'TOTAL / RATA-RATA KEHADIRAN ROMBEL',
            String(sumH),
            String(sumS),
            String(sumI),
            String(sumA),
            `${avgPct}%`,
        ]);
    }

    autoTable(doc, {
        startY: boxY + boxHeight + 12,
        margin: { left: marginX, right: marginX, bottom: 44 },
        head: [[
            'No',
            'NIS',
            'Nama Lengkap Santri',
            'Hadir',
            'Sakit',
            'Izin',
            'Alpa',
            'Persentase',
        ]],
        body: bodyRows.length > 0 ? bodyRows : [['-', '-', 'Belum ada data rekapitulasi kehadiran.', '-', '-', '-', '-', '-']],
        theme: 'grid',
        headStyles: {
            fillColor: [9, 60, 48],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center',
            cellPadding: 5,
        },
        bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59],
            cellPadding: 4,
            valign: 'middle',
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 28 },
            1: { halign: 'center', cellWidth: 78 },
            2: { halign: 'left', fontStyle: 'bold', cellWidth: 'auto' },
            3: { halign: 'center', cellWidth: 40, textColor: [4, 120, 87], fontStyle: 'bold' },
            4: { halign: 'center', cellWidth: 40, textColor: [180, 83, 9], fontStyle: 'bold' },
            5: { halign: 'center', cellWidth: 40, textColor: [29, 78, 216], fontStyle: 'bold' },
            6: { halign: 'center', cellWidth: 40, textColor: [190, 18, 60], fontStyle: 'bold' },
            7: { halign: 'center', cellWidth: 58, fontStyle: 'bold' },
        },
        didParseCell: (data) => {
            if (data.section === 'head' && data.column.index === 2) {
                data.cell.styles.halign = 'left';
            }
            if (data.section === 'body' && bodyRows.length > 0 && data.row.index === bodyRows.length - 1) {
                data.cell.styles.fillColor = [236, 253, 245];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [9, 60, 48];
            }
        },
        didDrawPage: () => {
            const pageCount = doc.internal.getNumberOfPages();
            const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
            const printedAt = new Date().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text(
                `Dicetak dari Sistem Akademik Tarbiyah pada ${printedAt} • Rekap Kehadiran ${group?.name || '-'}`,
                marginX,
                pageHeight - 20
            );
            doc.text(
                `Halaman ${currentPage} dari ${pageCount}`,
                pageWidth - marginX,
                pageHeight - 20,
                { align: 'right' }
            );
        },
    });

    // Blok Tanda Tangan
    let finalY = (doc.lastAutoTable?.finalY || boxY + boxHeight + 60) + 24;
    if (finalY + 75 > pageHeight - 36) {
        doc.addPage();
        finalY = 48;
    }

    const todayLabel = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    const sigRightX = pageWidth - marginX - 170;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Pamekasan, ${todayLabel}`, sigRightX, finalY);
    doc.text('Wali Kelas,', sigRightX, finalY + 13);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(waliLabel !== '-' ? waliLabel : '( .................................... )', sigRightX, finalY + 56);

    return doc;
}
