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
    // Judul Yayasan & Lembaga
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
 * Tahun Akademik, Caturwulan/Periode, Jenjang, Rombel, Wali Kelas
 */
function drawGroupHeaderInfo(doc, group, meta, startY, pageWidth) {
    // Judul Dokumen
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('JADWAL KEGIATAN BELAJAR MENGAJAR (KBM) PESANTREN', pageWidth / 2, startY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const subtitle = `Tahun Akademik: ${meta.academicYear || '-'} • Periode: ${meta.quarterName || '-'}`;
    doc.text(subtitle, pageWidth / 2, startY + 13, { align: 'center' });

    // Kotak Info Rombel & Jenjang
    const boxY = startY + 22;
    const boxWidth = pageWidth - 72;
    const boxHeight = 32;

    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.8);
    doc.roundedRect(36, boxY, boxWidth, boxHeight, 3, 3, 'FD');

    // Kolom Kiri
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Jenjang Pendidikan', 46, boxY + 13);
    doc.text('Rombongan Belajar', 46, boxY + 25);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`: ${group.education?.name || group.education_level || '-'} (${group.education?.description || 'Tarbiyah'})`, 135, boxY + 13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(9, 60, 48);
    doc.text(`: ${group.name} ${group.code ? `[${group.code}]` : ''}`, 135, boxY + 25);

    // Kolom Kanan
    const col2LabelX = pageWidth / 2 + 30;
    const col2ValX = col2LabelX + 75;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Wali Kelas / Musyrif', col2LabelX, boxY + 13);
    doc.text('Ruang Kelas / Kamar', col2LabelX, boxY + 25);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`: ${group.homeroomTeacher?.name || group.homeroom_teacher?.name || 'Ust. Pembina Rombel'}`, col2ValX, boxY + 13);
    doc.text(`: ${group.classroom?.name || 'Ruang Madrasah'}`, col2ValX, boxY + 25);

    return boxY + boxHeight + 12;
}

/**
 * Tanda Tangan Wali Kelas & Pengurus di Bagian Bawah
 */
function drawSignatures(doc, group, pageWidth, startY) {
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = Math.max(startY + 15, pageHeight - 85);

    // Jika melewati batas halaman, buat halaman baru khusus pengesahan
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
    doc.text(group.name, pageWidth - 170, sigY + 11, { align: 'center' });

    // Garis tanda tangan & nama
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
    const homeroomName = group.homeroomTeacher?.name || group.homeroom_teacher?.name || 'Ust. Pembina Rombel';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`( ${homeroomName} )`, pageWidth - 170, lineSignY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Wali Kelas Pesantren Mandiri', pageWidth - 170, lineSignY + 9, { align: 'center' });

    // Footer Watermark e-Panyeppen
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
        `Dicetak otomatis melalui e-Panyeppen Pro SIM Akademik Pesantren • Dicetak pada: ${new Date().toLocaleString('id-ID')}`,
        pageWidth / 2,
        pageHeight - 12,
        { align: 'center' }
    );
}

/**
 * Format 1: MATRIKS MINGGUAN (JADWAL DINDING KELAS) - LANDSCAPE A4
 * Paling disukai guru dan siswa karena seluruh jadwal satu minggu tampil dalam 1 lembar!
 */
export function generateScheduleMatrixPdf({
    groups = [],
    schedules = [],
    lessonHours = [],
    meta = {},
}) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const sortedHours = [...lessonHours].sort((a, b) => (a.order || 0) - (b.order || 0));

    groups.forEach((group, groupIndex) => {
        if (groupIndex > 0) {
            doc.addPage();
        }

        // Kop Pesantren
        const afterKopY = drawKopPesantren(doc, pageWidth, 22);

        // Header Info Rombel & Jenjang
        const tableStartY = drawGroupHeaderInfo(doc, group, meta, afterKopY, pageWidth);

        // Saring jadwal untuk rombel ini
        const groupSchedules = schedules.filter(s => Number(s.class_group_id) === Number(group.id));

        // Struktur Kolom: Jam KBM, Sabtu, Ahad, Senin, Selasa, Rabu, Kamis
        const head = [
            [
                { content: 'SESI / JAM KBM', styles: { halign: 'center', valign: 'middle' } },
                ...DAYS_PESANTREN.map(d => ({
                    content: `${d.name.toUpperCase()}\n(${d.short})`,
                    styles: { halign: 'center', valign: 'middle' },
                })),
            ],
        ];

        const body = sortedHours.map((hour) => {
            const timeStr = `${hour.name || `Jam Ke-${hour.order}`}\n${hour.start_time ? hour.start_time.substring(0, 5) : ''} - ${hour.end_time ? hour.end_time.substring(0, 5) : ''}`;
            const row = [{ content: timeStr, styles: { halign: 'center', fontStyle: 'bold' } }];

            DAYS_PESANTREN.forEach((day) => {
                const item = groupSchedules.find(s => 
                    Number(s.day) === Number(day.id) && 
                    Number(s.lesson_hour_id) === Number(hour.id)
                );

                if (item) {
                    const studyName = item.study?.name || 'Mata Pelajaran';
                    const teacherName = item.teacher?.name || 'Ustadz Pengajar';
                    const roomName = item.classroom?.name ? `[${item.classroom.name}]` : '';

                    row.push({
                        content: `${studyName}\n${teacherName}${roomName ? `\n${roomName}` : ''}`,
                        styles: {
                            halign: 'center',
                            valign: 'middle',
                            fontStyle: 'normal',
                        },
                    });
                } else {
                    row.push({
                        content: '-',
                        styles: { halign: 'center', valign: 'middle', textColor: [160, 174, 192] },
                    });
                }
            });

            return row;
        });

        autoTable(doc, {
            head,
            body,
            startY: tableStartY,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 4,
                lineColor: [203, 213, 225], // Slate-300
                lineWidth: 0.6,
            },
            headStyles: {
                fillColor: [9, 60, 48], // Emerald #093c30
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8.5,
                cellPadding: 6,
            },
            columnStyles: {
                0: { cellWidth: 90, fillColor: [241, 245, 249], textColor: [30, 41, 59] }, // Jam KBM
                1: { cellWidth: (pageWidth - 72 - 90) / 6 },
                2: { cellWidth: (pageWidth - 72 - 90) / 6 },
                3: { cellWidth: (pageWidth - 72 - 90) / 6 },
                4: { cellWidth: (pageWidth - 72 - 90) / 6 },
                5: { cellWidth: (pageWidth - 72 - 90) / 6 },
                6: { cellWidth: (pageWidth - 72 - 90) / 6 },
            },
            margin: { left: 36, right: 36 },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
        });

        const finalTableY = doc.lastAutoTable?.finalY || tableStartY + 150;

        // Tanda Tangan
        drawSignatures(doc, group, pageWidth, finalTableY);
    });

    return doc;
}

/**
 * Format 2: TABEL RINCI BERURUTAN HARI & JAM - PORTRAIT A4
 * Menyajikan tabel daftar per hari, jam ke-, mapel, ustadz, dan ruang.
 */
export function generateScheduleDetailedTablePdf({
    groups = [],
    schedules = [],
    lessonHours = [],
    meta = {},
}) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    groups.forEach((group, groupIndex) => {
        if (groupIndex > 0) {
            doc.addPage();
        }

        // Kop Pesantren
        const afterKopY = drawKopPesantren(doc, pageWidth, 24);

        // Header Info Rombel & Jenjang
        const tableStartY = drawGroupHeaderInfo(doc, group, meta, afterKopY, pageWidth);

        // Saring jadwal untuk rombel ini
        const groupSchedules = schedules.filter(s => Number(s.class_group_id) === Number(group.id));

        const head = [
            [
                { content: 'NO', styles: { halign: 'center' } },
                { content: 'HARI', styles: { halign: 'center' } },
                { content: 'SESI & WAKTU', styles: { halign: 'center' } },
                { content: 'MATA PELAJARAN / KITAB KUNING' },
                { content: 'GURU PENGAMPU (USTADZ)' },
                { content: 'RUANGAN', styles: { halign: 'center' } },
            ],
        ];

        const body = [];
        let no = 1;

        DAYS_PESANTREN.forEach((day) => {
            const daySchedules = groupSchedules
                .filter(s => Number(s.day) === Number(day.id))
                .sort((a, b) => (a.lesson_hour?.order || 0) - (b.lesson_hour?.order || 0));

            if (daySchedules.length === 0) return;

            daySchedules.forEach((item, idx) => {
                const hourObj = item.lesson_hour || lessonHours.find(h => Number(h.id) === Number(item.lesson_hour_id));
                const timeStr = hourObj 
                    ? `${hourObj.name || `Jam ${hourObj.order}`} (${hourObj.start_time?.substring(0, 5) || ''} - ${hourObj.end_time?.substring(0, 5) || ''})`
                    : '-';

                body.push([
                    { content: String(no++), styles: { halign: 'center' } },
                    { 
                        content: idx === 0 ? `${day.name}\n(${day.short})` : '', 
                        styles: { halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252] } 
                    },
                    { content: timeStr, styles: { halign: 'center', fontSize: 7.5 } },
                    { content: item.study?.name || 'Mata Pelajaran', styles: { fontStyle: 'bold' } },
                    { content: item.teacher?.name || 'Ustadz Pengajar' },
                    { content: item.classroom?.name || group.classroom?.name || '-', styles: { halign: 'center' } },
                ]);
            });
        });

        if (body.length === 0) {
            body.push([
                { content: '1', styles: { halign: 'center' } },
                { content: 'Semua Hari', styles: { halign: 'center' } },
                { content: '-', styles: { halign: 'center' } },
                { content: 'Belum ada jadwal KBM yang dikonfigurasi untuk rombel ini.', colSpan: 3, styles: { halign: 'center', textColor: [148, 163, 184] } },
            ]);
        }

        autoTable(doc, {
            head,
            body,
            startY: tableStartY,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 4,
                lineColor: [203, 213, 225],
                lineWidth: 0.6,
            },
            headStyles: {
                fillColor: [9, 60, 48],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8.5,
                cellPadding: 5,
            },
            columnStyles: {
                0: { cellWidth: 26 }, // No
                1: { cellWidth: 55 }, // Hari
                2: { cellWidth: 90 }, // Sesi & Waktu
                3: { cellWidth: 'auto' }, // Mapel
                4: { cellWidth: 125 }, // Guru
                5: { cellWidth: 55 }, // Ruang
            },
            margin: { left: 36, right: 36 },
            alternateRowStyles: {
                fillColor: [255, 255, 255],
            },
        });

        const finalTableY = doc.lastAutoTable?.finalY || tableStartY + 200;

        // Tanda Tangan
        drawSignatures(doc, group, pageWidth, finalTableY);
    });

    return doc;
}
