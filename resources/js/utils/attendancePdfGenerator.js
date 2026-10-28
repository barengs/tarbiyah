import jsPDFImport, { jsPDF as jsPDFNamed } from 'jspdf';
import autoTableImport, { autoTable as autoTableNamed } from 'jspdf-autotable';

const jsPDF = jsPDFNamed || jsPDFImport;
const autoTable = autoTableNamed || autoTableImport;

/**
 * Peta Hari Pesantren Panyeppen (Sabtu s.d Kamis, Jumat Libur)
 */
export const DAYS_PESANTREN = [
    { id: 6, name: 'Sabtu', short: 'SAB' },
    { id: 7, name: 'Ahad', short: 'AHD' },
    { id: 1, name: 'Senin', short: 'SEN' },
    { id: 2, name: 'Selasa', short: 'SEL' },
    { id: 3, name: 'Rabu', short: 'RAB' },
    { id: 4, name: 'Kamis', short: 'KMI' },
];

/**
 * Gambar Kop Surat Resmi Pesantren Miftahul Ulum Panyeppen
 */
function drawKopPesantren(doc, pageWidth, startY = 24) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(9, 60, 48); // Emerald #093c30
    doc.text('PONDOK PESANTREN MIFTAHUL ULUM PANYEPPEN', pageWidth / 2, startY, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text('BAGIAN PENDIDIKAN DAN PENGAJARAN (TARBIYAH WA TA\'LIM)', pageWidth / 2, startY + 14, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('Jl. Raya Panyeppen, Potoan Daya, Palengaan, Pamekasan, Jawa Timur 69362 | Website: panyeppen.id', pageWidth / 2, startY + 26, { align: 'center' });

    // Garis Kop Ganda (Double Line)
    const lineY = startY + 34;
    doc.setDrawColor(9, 60, 48);
    doc.setLineWidth(1.8);
    doc.line(36, lineY, pageWidth - 36, lineY);

    doc.setDrawColor(148, 163, 184); // Slate-400
    doc.setLineWidth(0.6);
    doc.line(36, lineY + 3, pageWidth - 36, lineY + 3);

    return lineY + 12;
}

/**
 * Header Identitas Dokumen & Pengelompokan:
 * Tahun Akademik, Caturwulan/Periode, Jenjang, Rombel, Wali Kelas, Tanggal Absen
 */
function drawAttendanceHeaderInfo(doc, group, meta, startY, pageWidth) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('LEMBAR PRESENSI KEGIATAN BELAJAR MENGAJAR (KBM)', pageWidth / 2, startY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const subtitle = `Tahun Akademik: ${meta.academicYear || '-'} • Periode: ${meta.quarterName || '-'}`;
    doc.text(subtitle, pageWidth / 2, startY + 13, { align: 'center' });

    // Kotak Info Identitas Rombel
    const boxY = startY + 20;
    const boxWidth = pageWidth - 72;
    const boxHeight = 34;

    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.8);
    doc.roundedRect(36, boxY, boxWidth, boxHeight, 3, 3, 'FD');

    // Kolom Kiri
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Jenjang Pendidikan', 46, boxY + 13);
    doc.text('Rombongan Belajar', 46, boxY + 26);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const eduName = group?.education?.name || group?.program?.name || 'Tarbiyah Pesantren';
    doc.text(`: ${eduName} (${group?.education?.description || 'Dirasah'})`, 135, boxY + 13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(9, 60, 48);
    doc.text(`: ${group?.name || '-'} ${group?.code ? `[${group.code}]` : ''}`, 135, boxY + 26);

    // Kolom Kanan
    const col2LabelX = pageWidth / 2 + 25;
    const col2ValX = col2LabelX + 75;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Wali Kelas / Musyrif', col2LabelX, boxY + 13);
    doc.text('Tanggal / Periode', col2LabelX, boxY + 26);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const teacherName = group?.homeroom_teacher?.name || group?.homeroomTeacher?.name || 'Ust. Pembina Rombel';
    doc.text(`: ${teacherName}`, col2ValX, boxY + 13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`: ${meta.dateLabel || 'Presensi KBM'}`, col2ValX, boxY + 26);

    return boxY + boxHeight + 10;
}

/**
 * Tanda Tangan Pengesahan (Wali Kelas & Mudir Tarbiyah)
 */
function drawSignatures(doc, group, pageWidth, startY) {
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = Math.max(startY + 15, pageHeight - 85);

    if (y + 65 > pageHeight) {
        doc.addPage();
        y = 50;
    }

    const todayStr = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date());

    const dateText = `Pamekasan, ${todayStr}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    // Tanggal di sisi kanan
    doc.text(dateText, pageWidth - 170, y, { align: 'center' });

    const sigY = y + 14;

    // Kiri: Mengetahui Mudir / Kepala Bagian
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Mengetahui,', 110, sigY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('Kepala Bagian Pendidikan & KBM', 110, sigY + 11, { align: 'center' });

    // Kanan: Wali Kelas
    doc.setFont('helvetica', 'normal');
    doc.text('Wali Kelas / Musyrif Rombel,', pageWidth - 170, sigY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(group?.name || 'Rombel', pageWidth - 170, sigY + 11, { align: 'center' });

    const lineSignY = sigY + 45;

    // Nama Kiri
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('( Ust. Dr. Muhammad Ridwan, M.A. )', 110, lineSignY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('NIP: 19820412.200801.1.003', 110, lineSignY + 9, { align: 'center' });

    // Nama Kanan (Wali Kelas Rombel)
    const homeroomName = group?.homeroom_teacher?.name || group?.homeroomTeacher?.name || 'Ust. Pembina Rombel';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`( ${homeroomName} )`, pageWidth - 170, lineSignY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Wali Kelas Pesantren Mandiri', pageWidth - 170, lineSignY + 9, { align: 'center' });

    // Footer Watermark
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
        `Dicetak otomatis melalui e-Panyeppen Pro SIM Presensi & KBM • Dicetak pada: ${new Date().toLocaleString('id-ID')}`,
        pageWidth / 2,
        pageHeight - 12,
        { align: 'center' }
    );
}

/**
 * Format 1: PRESENSI HARIAN (PER JAM) - PORTRAIT A4
 * Menampilkan tabel santri dengan kolom jam: 1, 2, 3, 4, 5, 6... dan keterangan
 */
export function generateDailyAttendancePdf({
    group = {},
    dayData = {},
    studentRows = [],
    notesMap = {},
    meta = {},
    isBlank = false,
}) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Kop Pesantren
    const afterKopY = drawKopPesantren(doc, pageWidth, 22);

    // Metadata tanggal
    const dayName = dayData.day_name || 'Hari Belajar';
    const dateFormatted = dayData.date || meta.date || '-';
    meta.dateLabel = `${dayName}, ${dateFormatted}`;

    // Header Info Rombel & Jenjang
    const tableStartY = drawAttendanceHeaderInfo(doc, group, meta, afterKopY, pageWidth);

    // Daftar Jam Pelajaran pada Hari Ini
    const hours = (dayData.hours && dayData.hours.length > 0)
        ? dayData.hours
        : [
            { order: 1, hour_name: 'Jam Ke-1', study_name: 'Pelajaran 1' },
            { order: 2, hour_name: 'Jam Ke-2', study_name: 'Pelajaran 2' },
            { order: 3, hour_name: 'Jam Ke-3', study_name: 'Pelajaran 3' },
            { order: 4, hour_name: 'Jam Ke-4', study_name: 'Pelajaran 4' },
            { order: 5, hour_name: 'Jam Ke-5', study_name: 'Pelajaran 5' },
            { order: 6, hour_name: 'Jam Ke-6', study_name: 'Pelajaran 6' },
        ];

    // Banner Keterangan Mapel per Jam (Ringkas & Informatif)
    let legendY = tableStartY;
    if (hours.length > 0) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(9, 60, 48);
        doc.text('Keterangan Jam Pembelajaran Hari Ini:', 36, legendY + 2);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const mapelItems = hours.map(h => `Jam ${h.order}: ${h.study_name || h.hour_name || `Jam ${h.order}`}`).join('   •   ');
        const splitLines = doc.splitTextToSize(mapelItems, pageWidth - 72);
        doc.text(splitLines, 36, legendY + 12);
        legendY += (splitLines.length * 9) + 8;
    }

    // Struktur Kolom: No, NIS, Nama Santri, Jam 1, 2, 3... (cukup angka 1, 2, 3), Catatan
    const head = [
        [
            { content: 'NO', styles: { halign: 'center' } },
            { content: 'NIS', styles: { halign: 'center' } },
            { content: 'NAMA SANTRI / SISWA', styles: { halign: 'left' } },
            ...hours.map(h => ({
                content: `${h.order}`, // User requirement: "untuk jam cukup angka 1, 2, 3, dan seterusnya"
                styles: { halign: 'center', fontStyle: 'bold' },
            })),
            { content: 'CATATAN / ALASAN', styles: { halign: 'left' } },
        ],
    ];

    const body = studentRows.map((st, idx) => {
        const row = [
            { content: String(idx + 1), styles: { halign: 'center' } },
            { content: st.nis || '-', styles: { halign: 'center', fontStyle: 'normal' } },
            { content: st.name || '-', styles: { fontStyle: 'bold' } },
        ];

        hours.forEach(h => {
            if (isBlank) {
                row.push({ content: '', styles: { halign: 'center' } });
            } else {
                const att = st.attendances?.[h.order];
                const rawStatus = typeof att === 'object' ? att?.status : att;
                let display = 'H';
                let textColor = [9, 60, 48]; // Emerald (Hadir)

                if (rawStatus === 'sakit') {
                    display = 'S';
                    textColor = [180, 83, 9]; // Amber
                } else if (rawStatus === 'izin') {
                    display = 'I';
                    textColor = [2, 132, 199]; // Sky/Blue
                } else if (rawStatus === 'alpa') {
                    display = 'A';
                    textColor = [225, 29, 72]; // Rose
                }

                row.push({
                    content: display,
                    styles: {
                        halign: 'center',
                        fontStyle: 'bold',
                        textColor,
                    },
                });
            }
        });

        const noteText = notesMap[st.student_id] || '';
        row.push({ content: isBlank ? '' : noteText, styles: { fontSize: 7.5 } });

        return row;
    });

    // Hitung lebar kolom
    const colStyles = {
        0: { cellWidth: 26 }, // No
        1: { cellWidth: 65 }, // NIS
        2: { cellWidth: 'auto' }, // Nama
    };

    let colIndex = 3;
    hours.forEach(() => {
        colStyles[colIndex++] = { cellWidth: 26 }; // Jam 1, 2, 3...
    });
    colStyles[colIndex] = { cellWidth: 95 }; // Catatan

    autoTable(doc, {
        head,
        body,
        startY: legendY,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 3.5,
            lineColor: [203, 213, 225],
            lineWidth: 0.6,
        },
        headStyles: {
            fillColor: [9, 60, 48], // Emerald #093c30
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
            cellPadding: 5,
        },
        columnStyles: colStyles,
        margin: { left: 36, right: 36 },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
    });

    const finalTableY = doc.lastAutoTable?.finalY || legendY + 200;

    // Tanda Tangan Pengesahan
    drawSignatures(doc, group, pageWidth, finalTableY);

    return doc;
}

/**
 * Format 2: PRESENSI SEPEKAN PENUH (REKAP PEKAN SABTU - KAMIS) - LANDSCAPE A4
 * Menampilkan data siswa, hari, dan sub-kolom jam 1, 2, 3... untuk setiap hari
 */
export function generateWeeklyAttendancePdf({
    group = {},
    daysList = [],
    studentList = [],
    multiDayState = {},
    meta = {},
    isBlank = false,
}) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Kop Pesantren
    const afterKopY = drawKopPesantren(doc, pageWidth, 20);

    // Metadata tanggal
    meta.dateLabel = `Pekan Pembelajaran (Sabtu s.d. Kamis)`;

    // Header Info Rombel & Jenjang
    const tableStartY = drawAttendanceHeaderInfo(doc, group, meta, afterKopY, pageWidth);

    // Ambil daftar hari yang tersedia dalam range (Sabtu s.d. Kamis)
    const validDays = daysList.length > 0 ? daysList : DAYS_PESANTREN.map(d => ({
        day_name: d.name,
        short: d.short,
        hours: [1, 2, 3, 4, 5, 6].map(o => ({ order: o })),
    }));

    // Header Baris 1: No, NIS, Nama Santri, [HARI-HARI], Rekapitulasi
    const headRow1 = [
        { content: 'NO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'NIS', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'NAMA SANTRI / SISWA', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
    ];

    // Header Baris 2: Sub-kolom jam 1, 2, 3... per hari
    const headRow2 = [];

    validDays.forEach(day => {
        const hours = (day.hours && day.hours.length > 0) ? day.hours : [{ order: 1 }, { order: 2 }, { order: 3 }, { order: 4 }, { order: 5 }, { order: 6 }];
        headRow1.push({
            content: `${day.day_name ? day.day_name.toUpperCase() : 'HARI'}\n(${day.date ? day.date.substring(5) : ''})`,
            colSpan: hours.length,
            styles: { halign: 'center', valign: 'middle' },
        });

        hours.forEach(h => {
            headRow2.push({
                content: `${h.order}`, // User requirement: "untuk jam cukup angka 1, 2, 3, dan seterusnya"
                styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' },
            });
        });
    });

    // Total Kolom Rekapitulasi Sepekan
    headRow1.push({
        content: 'TOTAL',
        colSpan: 4,
        styles: { halign: 'center', valign: 'middle' },
    });
    headRow2.push(
        { content: 'H', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'S', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'I', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'A', styles: { halign: 'center', fontStyle: 'bold' } }
    );

    const head = [headRow1, headRow2];

    // Dapatkan data baris santri
    const students = studentList.length > 0
        ? studentList
        : (validDays[0]?.students || []);

    const body = students.map((st, idx) => {
        const row = [
            { content: String(idx + 1), styles: { halign: 'center' } },
            { content: st.nis || '-', styles: { halign: 'center' } },
            { content: st.name || '-', styles: { fontStyle: 'bold' } },
        ];

        let totalH = 0;
        let totalS = 0;
        let totalI = 0;
        let totalA = 0;

        validDays.forEach(day => {
            const dateKey = day.date;
            const hours = (day.hours && day.hours.length > 0) ? day.hours : [{ order: 1 }, { order: 2 }, { order: 3 }, { order: 4 }, { order: 5 }, { order: 6 }];
            const dayStudents = multiDayState[dateKey] || day.students || [];
            const stDay = dayStudents.find(s => Number(s.student_id) === Number(st.student_id || st.id));

            hours.forEach(h => {
                if (isBlank) {
                    row.push({ content: '', styles: { halign: 'center' } });
                } else {
                    const att = stDay?.attendances?.[h.order];
                    const rawStatus = typeof att === 'object' ? att?.status : att;
                    let display = 'H';
                    let textColor = [9, 60, 48];

                    if (rawStatus === 'sakit') {
                        display = 'S';
                        textColor = [180, 83, 9];
                        totalS++;
                    } else if (rawStatus === 'izin') {
                        display = 'I';
                        textColor = [2, 132, 199];
                        totalI++;
                    } else if (rawStatus === 'alpa') {
                        display = 'A';
                        textColor = [225, 29, 72];
                        totalA++;
                    } else {
                        totalH++;
                    }

                    row.push({
                        content: display,
                        styles: { halign: 'center', fontStyle: 'bold', textColor },
                    });
                }
            });
        });

        // Kolom Rekapitulasi Sepekan
        if (isBlank) {
            row.push({ content: '' }, { content: '' }, { content: '' }, { content: '' });
        } else {
            row.push(
                { content: String(totalH), styles: { halign: 'center', fontStyle: 'bold', textColor: [9, 60, 48] } },
                { content: String(totalS), styles: { halign: 'center', textColor: [180, 83, 9] } },
                { content: String(totalI), styles: { halign: 'center', textColor: [2, 132, 199] } },
                { content: String(totalA), styles: { halign: 'center', textColor: [225, 29, 72] } }
            );
        }

        return row;
    });

    autoTable(doc, {
        head,
        body,
        startY: tableStartY,
        theme: 'grid',
        styles: {
            fontSize: 7.5,
            cellPadding: 2.5,
            lineColor: [203, 213, 225],
            lineWidth: 0.5,
        },
        headStyles: {
            fillColor: [9, 60, 48],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.5,
            cellPadding: 4,
        },
        columnStyles: {
            0: { cellWidth: 22 }, // No
            1: { cellWidth: 55 }, // NIS
            2: { cellWidth: 'auto' }, // Nama
        },
        margin: { left: 36, right: 36 },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
    });

    const finalTableY = doc.lastAutoTable?.finalY || tableStartY + 200;

    // Tanda Tangan Pengesahan
    drawSignatures(doc, group, pageWidth, finalTableY);

    return doc;
}
