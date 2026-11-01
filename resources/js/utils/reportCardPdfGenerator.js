import jsPDFImport, { jsPDF as jsPDFNamed } from 'jspdf';
import autoTableImport, { autoTable as autoTableNamed } from 'jspdf-autotable';

const jsPDF = jsPDFNamed || jsPDFImport;
const autoTable = autoTableNamed || autoTableImport;

const STUDY_TYPE_LABEL = {
    khusus: 'Mapel Khusus (Inti)',
    reguler: 'Mapel Reguler',
    muatan_lokal: 'Muatan Lokal (Penunjang)',
};

const PROMOTION_STATUS_LABEL = {
    layak_naik: 'LAYAK NAIK KELAS',
    tuntas_remidi: 'LAYAK NAIK KELAS (TUNTAS REMIDI)',
    remidi_khusus: 'WAJIB REMIDI MAPEL KHUSUS',
    belum_dinilai: 'BELUM DINILAI',
};

/**
 * Konversi data santri dari sheet evaluasi menjadi struktur report card
 * apabila data buku rapor belum disinkronkan dari backend.
 */
export function normalizeStudentToReport(st, studies = [], rankFallback = 1) {
    if (st?.grades_summary && Array.isArray(st.grades_summary)) {
        return st;
    }

    const gradesMap = st?.grades || st?.scores || {};
    const gradesSummary = studies.map((sub) => {
        const cell = gradesMap[sub.id] || {};
        return {
            study_id: sub.id,
            study_name: sub.name,
            study_code: sub.code,
            study_type: sub.study_type || 'reguler',
            kkm: Number(sub.kkm || 65),
            original_score: cell.original_score ?? null,
            remedial_score: cell.remedial_score ?? null,
            score: cell.score ?? cell.final_score ?? cell.original_score ?? null,
            is_remedial: Boolean(cell.is_remedial),
            predicate: cell.predicate || '-',
            notes: cell.notes || null,
        };
    });

    return {
        id: st?.id || st?.student_id,
        student_id: st?.student_id || st?.id,
        student: {
            id: st?.student_id || st?.id,
            name: st?.student_name || st?.name || '-',
            nis: st?.student_nis || st?.nis || '-',
            gender: st?.gender || 'L',
            is_mukim: st?.is_mukim ?? true,
        },
        average_score: st?.average ?? st?.average_score ?? null,
        previous_average: st?.previous_average ?? null,
        rank: st?.rank || rankFallback,
        promotion_status: st?.promotion_status || 'belum_dinilai',
        grades_summary: gradesSummary,
        attendance_summary: st?.attendance || st?.attendance_summary || { hadir: 0, izin: 0, sakit: 0, alpa: 0 },
        homeroom_notes: st?.homeroom_notes || null,
    };
}

/**
 * Gambar Kop Surat Resmi Pondok Pesantren Miftahul Ulum Panyeppen
 */
function drawKopPesantren(doc, pageWidth, startY = 24) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(9, 60, 48); // Emerald #093c30
    doc.text('PONDOK PESANTREN MIFTAHUL ULUM PANYEPPEN', pageWidth / 2, startY, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("BAGIAN PENDIDIKAN DAN PENGAJARAN (TARBIYAH WA TA'LIM)", pageWidth / 2, startY + 14, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Jl. Raya Panyeppen, Potoan Daya, Palengaan, Pamekasan, Jawa Timur 69362 | Website: panyeppen.id', pageWidth / 2, startY + 26, { align: 'center' });

    const lineY = startY + 34;
    doc.setDrawColor(9, 60, 48);
    doc.setLineWidth(1.8);
    doc.line(36, lineY, pageWidth - 36, lineY);

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.6);
    doc.line(36, lineY + 3, pageWidth - 36, lineY + 3);

    return lineY + 14;
}

/**
 * Render 1 halaman Rapor Akhir Triwulan Santri (HANYA NILAI AKHIR) pada objek jsPDF
 */
function renderSingleStudentReportPage(doc, report, group, meta = {}) {
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = drawKopPesantren(doc, pageWidth, 24);

    // Judul Dokumen
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    doc.text('LAPORAN EVALUASI AKHIR TRIWULAN & KENAIKAN KELAS (BUKU RAPOR)', pageWidth / 2, y, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const yearLabel = meta.academicYear || report?.academic_year?.year || group?.academic_year?.year || '1446/1447 H';
    const quarterLabel = meta.quarterName || report?.academic_quarter?.name || String(report?.semester || 'Triwulan Aktif').replace('_', ' ').toUpperCase();
    doc.text(`Tahun Akademik: ${yearLabel} • Periode: ${quarterLabel}`, pageWidth / 2, y + 12, { align: 'center' });

    // Kotak Identitas Santri & Rombel
    const boxY = y + 20;
    const boxWidth = pageWidth - 72;
    const boxHeight = 68;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.8);
    doc.roundedRect(36, boxY, boxWidth, boxHeight, 3, 3, 'FD');

    const student = report?.student || {
        name: report?.student_name || report?.name || '-',
        nis: report?.student_nis || report?.nis || '-',
        is_mukim: report?.is_mukim ?? true,
    };
    const programName = group?.program?.name || group?.educational_institution?.short_name || 'Kubar';
    const eduName = group?.education?.name || 'Tarbiyah';
    const teacherName = group?.homeroom_teacher?.name || group?.homeroomTeacher?.name || 'Wali Kelas';

    const hasAvg = report?.average_score !== null && report?.average_score !== undefined;
    const avgNow = hasAvg ? Number(report.average_score) : null;
    const avgPrev = report?.previous_average !== null && report?.previous_average !== undefined
        ? Number(report.previous_average)
        : null;
    const delta = (avgNow !== null && avgPrev !== null) ? (avgNow - avgPrev) : null;
    const progressText = (avgNow !== null && avgPrev !== null)
        ? `${avgPrev.toFixed(1)} -> ${avgNow.toFixed(1)} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)})`
        : (avgNow !== null ? `${avgNow.toFixed(1)}` : '-');

    const promoStatus = report?.promotion_status || 'layak_naik';
    const promoLabel = PROMOTION_STATUS_LABEL[promoStatus] || 'LAYAK NAIK KELAS';

    // Kolom Kiri
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Nama Santri', 46, boxY + 14);
    doc.text('Nomor Induk (NIS)', 46, boxY + 28);
    doc.text('Status Kesiswaan', 46, boxY + 42);
    doc.text('Progres Rerata Nilai', 46, boxY + 56);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`: ${student.name || '-'}`, 140, boxY + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${student.nis || '-'}`, 140, boxY + 28);
    doc.text(`: ${student.is_mukim !== false ? 'Santri Mukim Pesantren' : 'Siswa Reguler Luar'}`, 140, boxY + 42);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(9, 60, 48);
    doc.text(`: ${progressText}`, 140, boxY + 56);

    // Kolom Kanan
    const col2LabelX = pageWidth / 2 + 10;
    const col2ValX = col2LabelX + 90;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Program / Jenjang', col2LabelX, boxY + 14);
    doc.text('Rombongan Belajar', col2LabelX, boxY + 28);
    doc.text('Peringkat Kelas', col2LabelX, boxY + 42);
    doc.text('Status Evaluasi', col2LabelX, boxY + 56);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`: ${programName} — ${eduName}`, col2ValX, boxY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(9, 60, 48);
    doc.text(`: ${group?.name || '-'}`, col2ValX, boxY + 28);
    doc.text(`: Peringkat #${report?.rank || '-'}`, col2ValX, boxY + 42);
    doc.setTextColor(promoStatus === 'remidi_khusus' ? 190 : 9, promoStatus === 'remidi_khusus' ? 18 : 60, promoStatus === 'remidi_khusus' ? 60 : 48);
    doc.text(`: ${promoLabel}`, col2ValX, boxY + 56);

    let currentY = boxY + boxHeight + 16;

    // Bagian A: Tabel Nilai Akhir Triwulan (Khusus, Reguler, & Penunjang Muatan Lokal)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(9, 60, 48);
    doc.text('A. CAPAIAN NILAI AKHIR TRIWULAN (MAPEL KHUSUS, REGULER, & PENUNJANG MUATAN LOKAL)', 36, currentY);

    const grades = Array.isArray(report?.grades_summary) ? report.grades_summary : [];
    const tableBody = grades.map((g, idx) => {
        const hasSc = g.score !== null && g.score !== undefined && g.score !== '';
        const score = hasSc ? Number(g.score) : null;
        const kkm = Number(g.kkm || 70);
        const isPass = score !== null ? score >= kkm : false;
        const sType = g.study_type || 'reguler';
        const typeLabel = STUDY_TYPE_LABEL[sType] || 'Mapel Reguler';
        const pred = score === null ? '-' : (g.predicate || (score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D'));

        let ket = '-';
        if (score !== null) {
            ket = isPass ? 'Tuntas' : (sType === 'khusus' ? 'Belum Tuntas' : 'Perlu Bimbingan');
            if (sType === 'muatan_lokal') {
                ket = 'Penunjang Nilai';
            }
        }

        return [
            idx + 1,
            g.study_name || '-',
            typeLabel,
            kkm.toFixed(0),
            score !== null ? score.toFixed(1) : '-',
            pred,
            ket,
        ];
    });

    if (tableBody.length === 0) {
        tableBody.push(['-', 'Belum ada nilai mata pelajaran yang terinput', '-', '-', '-', '-', '-']);
    } else {
        tableBody.push([
            { content: 'Rata-Rata Nilai Akhir Triwulan (Termasuk Penunjang Muatan Lokal)', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: avgNow !== null ? avgNow.toFixed(1) : '-', styles: { halign: 'center', fontStyle: 'bold', textColor: [9, 60, 48], fillColor: [241, 245, 249] } },
            { content: promoLabel, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] } },
        ]);
    }

    autoTable(doc, {
        startY: currentY + 6,
        margin: { left: 36, right: 36 },
        head: [['No.', 'Mata Pelajaran / Fan Kitab', 'Kategori Mapel', 'KKM', 'Nilai Akhir', 'Predikat', 'Keterangan']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
            fillColor: [9, 60, 48],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 4.5,
        },
        bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59],
            cellPadding: 4.5,
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 24 },
            1: { halign: 'left' },
            2: { halign: 'left', cellWidth: 105 },
            3: { halign: 'center', cellWidth: 36 },
            4: { halign: 'center', cellWidth: 52, fontStyle: 'bold' },
            5: { halign: 'center', cellWidth: 42 },
            6: { halign: 'center', cellWidth: 105 },
        },
    });

    currentY = (doc.lastAutoTable?.finalY || currentY + 120) + 16;

    // Bagian B: Rekapitulasi Kehadiran & Bagian C: Catatan Wali Kelas
    const att = report?.attendance_summary || {};
    const hadir = att.hadir ?? report?.attendance_h ?? 0;
    const izin  = att.izin ?? report?.attendance_i ?? 0;
    const sakit = att.sakit ?? report?.attendance_s ?? 0;
    const alpa  = att.alpa ?? report?.attendance_a ?? 0;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(9, 60, 48);
    doc.text('B. REKAPITULASI KEHADIRAN KBM', 36, currentY);
    doc.text('C. CATATAN WALI KELAS & KEPUTUSAN TRIWULAN', pageWidth / 2 + 10, currentY);

    autoTable(doc, {
        startY: currentY + 6,
        margin: { left: 36, right: pageWidth / 2 + 10 },
        head: [['Status Kehadiran', 'Jumlah']],
        body: [
            ['Hadir (H)', `${hadir} Pertemuan`],
            ['Izin (I)', `${izin} Pertemuan`],
            ['Sakit (S)', `${sakit} Pertemuan`],
            ['Alpa / Tanpa Keterangan (A)', `${alpa} Pertemuan`],
        ],
        theme: 'grid',
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [30, 41, 59],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 4,
        },
        bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59],
            cellPadding: 4,
        },
        columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'center', fontStyle: 'bold', cellWidth: 85 },
        },
    });

    const notesBoxX = pageWidth / 2 + 10;
    const notesBoxY = currentY + 6;
    const notesBoxW = pageWidth - 36 - notesBoxX;
    const notesBoxH = (doc.lastAutoTable?.finalY || currentY + 86) - notesBoxY;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.7);
    doc.roundedRect(notesBoxX, notesBoxY, notesBoxW, Math.max(notesBoxH, 76), 3, 3, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const notesText = report?.homeroom_notes || "Tingkatkan terus semangat belajar, muthala'ah kitab, dan kedisiplinan dalam menuntut ilmu di pesantren.";
    const splitNotes = doc.splitTextToSize(notesText, notesBoxW - 16);
    doc.text(splitNotes, notesBoxX + 8, notesBoxY + 14);

    currentY = Math.max(doc.lastAutoTable?.finalY || 0, notesBoxY + Math.max(notesBoxH, 76)) + 28;

    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const colW = (pageWidth - 72) / 3;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    doc.text('Mengetahui,', 36 + colW * 0.5, currentY, { align: 'center' });
    doc.text('Orang Tua / Wali Santri', 36 + colW * 0.5, currentY + 12, { align: 'center' });
    doc.text('( ........................................... )', 36 + colW * 0.5, currentY + 60, { align: 'center' });

    doc.text('Mengesahkan,', 36 + colW * 1.5, currentY, { align: 'center' });
    doc.text("Mudir Tarbiyah Wa Ta'lim", 36 + colW * 1.5, currentY + 12, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    const headmaster = group?.educational_institution?.headmaster_name || '( ........................................... )';
    doc.text(headmaster, 36 + colW * 1.5, currentY + 60, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.text(`Pamekasan, ${dateStr}`, 36 + colW * 2.5, currentY, { align: 'center' });
    doc.text('Wali Kelas / Musyrif Rombel', 36 + colW * 2.5, currentY + 12, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(teacherName, 36 + colW * 2.5, currentY + 60, { align: 'center' });
}

/**
 * Render 1 halaman Lembar Riwayat Penilaian & Evaluasi Remidi Siswa (Portrait A4)
 * Menampilkan Nilai Asli Sebelum Remidi, Nilai Remidi, dan Nilai Akhir
 */
function renderSingleStudentHistoryPage(doc, st, studies = [], group, meta = {}) {
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = drawKopPesantren(doc, pageWidth, 24);

    // Judul Dokumen
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('LAPORAN RIWAYAT PENILAIAN TRIWULAN & EVALUASI REMIDI SISWA', pageWidth / 2, y, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const yearLabel = meta.academicYear || group?.academic_year?.year || '1446/1447 H';
    const quarterLabel = meta.quarterName || 'Triwulan Aktif';
    doc.text(`Tahun Akademik: ${yearLabel} • Periode: ${quarterLabel}`, pageWidth / 2, y + 12, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text('* Dokumen Riwayat Penilaian Akademik disertai Nilai Asli Sebelum Remidi (Bukan Buku Rapor Santri)', pageWidth / 2, y + 22, { align: 'center' });

    // Kotak Identitas Santri & Ringkasan Evaluasi
    const boxY = y + 29;
    const boxWidth = pageWidth - 72;
    const boxHeight = 68;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.8);
    doc.roundedRect(36, boxY, boxWidth, boxHeight, 3, 3, 'FD');

    const studentName = st?.student_name || st?.name || st?.student?.name || '-';
    const studentNis = st?.student_nis || st?.nis || st?.student?.nis || '-';
    const programName = group?.program?.name || group?.educational_institution?.short_name || 'Kubar';
    const eduName = group?.education?.name || 'Tarbiyah';
    const teacherName = group?.homeroom_teacher?.name || group?.homeroomTeacher?.name || 'Wali Kelas';

    const avgNow = st?.average !== null && st?.average !== undefined ? Number(st.average) : null;
    const avgPrev = st?.previous_average !== null && st?.previous_average !== undefined ? Number(st.previous_average) : null;
    const delta = st?.progress_delta !== null && st?.progress_delta !== undefined ? Number(st.progress_delta) : null;
    const progressText = (avgNow !== null && avgPrev !== null)
        ? `${avgPrev.toFixed(1)} -> ${avgNow.toFixed(1)} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)})`
        : (avgNow !== null ? `${avgNow.toFixed(1)}` : 'Belum Ada Nilai');

    const promoStatus = st?.promotion_status || 'belum_dinilai';
    const promoLabel = st?.promotion_label || PROMOTION_STATUS_LABEL[promoStatus] || 'BELUM DINILAI';

    // Kolom Kiri
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Nama Santri', 46, boxY + 14);
    doc.text('Nomor Induk (NIS)', 46, boxY + 28);
    doc.text('Rombongan Belajar', 46, boxY + 42);
    doc.text('Wali Kelas / Musyrif', 46, boxY + 56);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`: ${studentName}`, 140, boxY + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${studentNis}`, 140, boxY + 28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(9, 60, 48);
    doc.text(`: ${group?.name || '-'} (${programName} • ${eduName})`, 140, boxY + 42);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`: ${teacherName}`, 140, boxY + 56);

    // Kolom Kanan
    const col2LabelX = pageWidth / 2 + 15;
    const col2ValX = col2LabelX + 95;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Progres Rerata', col2LabelX, boxY + 14);
    doc.text('Rerata Mapel Khusus', col2LabelX, boxY + 28);
    doc.text('Penunjang Mulok', col2LabelX, boxY + 42);
    doc.text('Status Evaluasi', col2LabelX, boxY + 56);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`: ${progressText}`, col2ValX, boxY + 14);
    doc.text(`: ${st?.khusus_average !== null && st?.khusus_average !== undefined ? Number(st.khusus_average).toFixed(1) : '-'}`, col2ValX, boxY + 28);
    doc.text(`: ${st?.mulok_average !== null && st?.mulok_average !== undefined ? Number(st.mulok_average).toFixed(1) : '-'}`, col2ValX, boxY + 42);
    doc.setTextColor(promoStatus === 'remidi_khusus' ? 190 : 9, promoStatus === 'remidi_khusus' ? 18 : 60, promoStatus === 'remidi_khusus' ? 60 : 48);
    doc.text(`: ${promoLabel.toUpperCase()}`, col2ValX, boxY + 56);

    let currentY = boxY + boxHeight + 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(9, 60, 48);
    doc.text('RINCIAN NILAI ASLI (AWAL), NILAI REMIDI, & NILAI AKHIR TRIWULAN', 36, currentY);

    const gradesMap = st?.grades || st?.scores || {};
    const tableBody = studies.map((sub, idx) => {
        const g = gradesMap[sub.id] || {};
        const kkm = Number(sub.kkm || 65);
        const sType = sub.study_type || 'reguler';
        const typeLabel = STUDY_TYPE_LABEL[sType] || 'Mapel Reguler';

        const hasOrig = g.original_score !== null && g.original_score !== undefined && g.original_score !== '';
        const hasFinal = g.score !== null && g.score !== undefined && g.score !== '';
        const origVal = hasOrig ? Number(g.original_score) : (hasFinal ? Number(g.score) : null);
        const remVal = g.remedial_score !== null && g.remedial_score !== undefined && g.remedial_score !== '' ? Number(g.remedial_score) : null;
        const finalVal = hasFinal ? Number(g.score) : origVal;

        let statusKet = 'Belum Input Nilai';
        if (origVal !== null) {
            if (g.is_remedial && remVal !== null) {
                statusKet = `Tuntas Remidi (Asal ${origVal.toFixed(0)} -> ${remVal.toFixed(0)})`;
                if (g.notes) statusKet += `\nCatatan: ${g.notes}`;
            } else if (finalVal < kkm && sType === 'khusus') {
                statusKet = `Wajib Remidi (Kurang ${(kkm - finalVal).toFixed(1)} poin)`;
            } else if (finalVal >= kkm) {
                statusKet = 'Tuntas Murni';
            } else {
                statusKet = 'Di Bawah KKM';
            }
        }

        return [
            idx + 1,
            sub.name || '-',
            typeLabel,
            kkm.toFixed(0),
            origVal !== null ? origVal.toFixed(1) : '-',
            remVal !== null ? remVal.toFixed(1) : '-',
            finalVal !== null ? finalVal.toFixed(1) : '-',
            statusKet,
        ];
    });

    if (tableBody.length === 0) {
        tableBody.push(['-', 'Belum ada mata pelajaran pada rombel ini', '-', '-', '-', '-', '-', '-']);
    } else {
        tableBody.push([
            { content: 'Rata-Rata Akhir Triwulan', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: avgNow !== null ? avgNow.toFixed(1) : '-', styles: { halign: 'center', fontStyle: 'bold', textColor: [9, 60, 48], fillColor: [241, 245, 249] } },
            { content: promoLabel, styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] } },
        ]);
    }

    autoTable(doc, {
        startY: currentY + 6,
        margin: { left: 36, right: 36 },
        head: [['No.', 'Mata Pelajaran', 'Kategori', 'KKM', 'Nilai Asli (Awal)', 'Nilai Remidi', 'Nilai Akhir', 'Status & Riwayat']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
            fillColor: [9, 60, 48],
            textColor: [255, 255, 255],
            fontSize: 7.5,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 4,
        },
        bodyStyles: {
            fontSize: 7.5,
            textColor: [30, 41, 59],
            cellPadding: 4,
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 22 },
            1: { halign: 'left', fontStyle: 'bold' },
            2: { halign: 'left', cellWidth: 88 },
            3: { halign: 'center', cellWidth: 32 },
            4: { halign: 'center', cellWidth: 52 },
            5: { halign: 'center', cellWidth: 48, textColor: [180, 83, 9], fontStyle: 'bold' },
            6: { halign: 'center', cellWidth: 48, textColor: [9, 60, 48], fontStyle: 'bold' },
            7: { halign: 'left', cellWidth: 120 },
        },
    });

    currentY = (doc.lastAutoTable?.finalY || currentY + 150) + 28;
    if (currentY > doc.internal.pageSize.getHeight() - 90) {
        doc.addPage();
        currentY = 48;
    }

    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const colW = (pageWidth - 72) / 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    doc.text('Mengetahui,', 36 + colW * 0.5, currentY, { align: 'center' });
    doc.text("Mudir Tarbiyah Wa Ta'lim", 36 + colW * 0.5, currentY + 12, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    const headmaster = group?.educational_institution?.headmaster_name || '( ........................................... )';
    doc.text(headmaster, 36 + colW * 0.5, currentY + 60, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.text(`Pamekasan, ${dateStr}`, 36 + colW * 1.5, currentY, { align: 'center' });
    doc.text('Wali Kelas / Penguji Remidi', 36 + colW * 1.5, currentY + 12, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(teacherName, 36 + colW * 1.5, currentY + 60, { align: 'center' });
}

/**
 * Buat objek jsPDF untuk Buku Rapor Santri (1 atau Banyak Santri)
 */
export function buildReportCardPdfDoc({ reports = [], group = {}, meta = {} }) {
    if (!reports || reports.length === 0) return null;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    reports.forEach((rep, idx) => {
        if (idx > 0) doc.addPage();
        renderSingleStudentReportPage(doc, rep, group, meta);
    });
    return doc;
}

/**
 * Buat objek jsPDF untuk Lembar Riwayat Nilai & Evaluasi Remidi Siswa (Portrait A4 per Siswa)
 */
export function buildStudentHistoryPdfDoc({ students = [], studies = [], group = {}, meta = {} }) {
    if (!students || students.length === 0) return null;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    students.forEach((st, idx) => {
        if (idx > 0) doc.addPage();
        renderSingleStudentHistoryPage(doc, st, studies, group, meta);
    });
    return doc;
}

/**
 * Buat objek jsPDF untuk Leger Penilaian Akhir Triwulan & Berita Acara Riwayat Remidi (Landscape A4)
 */
export function buildGradebookPdfDoc({ gradebook, group = {}, meta = {} }) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = drawKopPesantren(doc, pageWidth, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`LEGER PENILAIAN AKHIR TRIWULAN & RIWAYAT REMIDI — ${(group?.name || '').toUpperCase()}`, pageWidth / 2, y, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const yearLabel = meta.academicYear || group?.academic_year?.year || '1446/1447 H';
    const quarterLabel = meta.quarterName || gradebook?.quarter_name || 'Triwulan Aktif';
    const teacherName = group?.homeroom_teacher?.name || group?.homeroomTeacher?.name || '-';
    doc.text(`Tahun Akademik: ${yearLabel} • Periode: ${quarterLabel} • Wali Kelas: ${teacherName}`, pageWidth / 2, y + 12, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('* Dokumen Rekapitulasi Penilaian Akademik & Riwayat Remidi Guru — Nilai pada Buku Rapor Santri adalah Nilai Akhir murni.', pageWidth / 2, y + 23, { align: 'center' });

    const studies = gradebook?.studies || [];
    const students = gradebook?.students || [];

    const headRow = [
        'No.',
        'NIS',
        'Nama Santri',
        ...studies.map((s) => {
            const tag = s.study_type === 'khusus' ? '[Khusus]' : s.study_type === 'muatan_lokal' ? '[Mulok]' : '[Reg]';
            return `${s.name}\n${tag}`;
        }),
        'Progres',
        'Rerata',
        'Status Kenaikan / Remidi',
        'Rank',
    ];

    const remedialDetails = [];

    const bodyRows = students.map((st, idx) => {
        const studyCells = studies.map((s) => {
            const g = st.grades?.[s.id] || st.scores?.[s.id];
            if (!g || g.score === null || g.score === undefined) return '-';
            if (g.is_remedial && g.remedial_score !== null) {
                const orig = g.original_score !== null && g.original_score !== undefined
                    ? Number(g.original_score).toFixed(0)
                    : '-';
                const finalSc = Number(g.score).toFixed(0);

                if (s.study_type === 'khusus') {
                    remedialDetails.push({
                        nis: st.nis || st.student_nis || '-',
                        name: st.name || st.student_name || '-',
                        study_name: s.name,
                        kkm: Number(s.kkm || 65).toFixed(0),
                        original_score: g.original_score !== null ? Number(g.original_score).toFixed(1) : '-',
                        remedial_score: Number(g.remedial_score).toFixed(1),
                        final_score: Number(g.score).toFixed(1),
                        status: Number(g.score) >= Number(s.kkm || 65) ? 'Tuntas Remidi' : 'Belum Tuntas',
                        notes: g.notes || 'Tuntas ujian remidi mapel khusus',
                    });
                }

                return `${finalSc}\n(Awal: ${orig})`;
            }
            return Number(g.score).toFixed(0);
        });
        const delta = st.progress_delta;
        const progStr = delta !== null && delta !== undefined
            ? `${delta >= 0 ? '+' : ''}${Number(delta).toFixed(1)}`
            : '-';

        return [
            idx + 1,
            st.nis || st.student_nis || '-',
            st.name || st.student_name || '-',
            ...studyCells,
            progStr,
            st.average !== null && st.average !== undefined ? Number(st.average).toFixed(1) : '-',
            st.promotion_label || '-',
            `#${st.rank || idx + 1}`,
        ];
    });

    autoTable(doc, {
        startY: y + 32,
        margin: { left: 24, right: 24 },
        head: [headRow],
        body: bodyRows,
        theme: 'grid',
        headStyles: {
            fillColor: [9, 60, 48],
            textColor: [255, 255, 255],
            fontSize: 7,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 3.5,
        },
        bodyStyles: {
            fontSize: 7,
            textColor: [30, 41, 59],
            cellPadding: 3.5,
            halign: 'center',
        },
        columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            1: { cellWidth: 55, halign: 'center' },
            2: { cellWidth: 110, halign: 'left', fontStyle: 'bold' },
        },
    });

    // Jika terdapat riwayat remidi mapel khusus, tambahkan tabel Berita Acara Remidi
    if (remedialDetails.length > 0) {
        let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 18 : y + 200;
        if (finalY > doc.internal.pageSize.getHeight() - 140) {
            doc.addPage();
            finalY = 36;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text('BERITA ACARA & RIWAYAT REMIDI MATA PELAJARAN KHUSUS', 24, finalY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Daftar santri yang mengikuti ujian remidi mapel khusus beserta nilai asli awal sebelum remidi dan nilai akhir:', 24, finalY + 11);

        const remHead = [
            'No.',
            'NIS',
            'Nama Santri',
            'Mata Pelajaran Khusus',
            'KKM',
            'Nilai Awal (Asli)',
            'Nilai Remidi',
            'Nilai Akhir Rapor',
            'Status',
            'Catatan Penguji Remidi',
        ];

        const remBody = remedialDetails.map((rd, i) => [
            i + 1,
            rd.nis,
            rd.name,
            rd.study_name,
            rd.kkm,
            rd.original_score,
            rd.remedial_score,
            rd.final_score,
            rd.status,
            rd.notes,
        ]);

        autoTable(doc, {
            startY: finalY + 16,
            margin: { left: 24, right: 24 },
            head: [remHead],
            body: remBody,
            theme: 'grid',
            headStyles: {
                fillColor: [180, 83, 9], // amber-700
                textColor: [255, 255, 255],
                fontSize: 7,
                fontStyle: 'bold',
                halign: 'center',
                cellPadding: 3,
            },
            bodyStyles: {
                fontSize: 7,
                textColor: [30, 41, 59],
                cellPadding: 3,
                halign: 'center',
            },
            columnStyles: {
                0: { cellWidth: 20, halign: 'center' },
                1: { cellWidth: 55, halign: 'center' },
                2: { cellWidth: 105, halign: 'left', fontStyle: 'bold' },
                3: { cellWidth: 110, halign: 'left' },
                9: { halign: 'left' },
            },
        });
    }

    return doc;
}

/**
 * 1. Cetak / Preview PDF Buku Rapor 1 Santri
 */
export function generateStudentReportCardPdf(reportOrOpts, group, meta = {}, options = {}) {
    let report = reportOrOpts;
    let targetGroup = group;
    let targetMeta = meta;
    let opts = options;

    if (reportOrOpts && reportOrOpts.report && !group) {
        report = reportOrOpts.report;
        targetGroup = reportOrOpts.classGroup || reportOrOpts.group;
        targetMeta = {
            academicYear: reportOrOpts.academicYear?.year || reportOrOpts.academicYear,
            quarterName: reportOrOpts.quarter?.name || reportOrOpts.quarterName,
        };
        opts = { ...options, ...reportOrOpts };
    }

    const doc = buildReportCardPdfDoc({ reports: [report], group: targetGroup, meta: targetMeta });
    if (!doc) return null;

    if (opts.preview) {
        window.open(doc.output('bloburl'), '_blank');
        return doc;
    }
    if (opts.returnDoc) {
        return doc;
    }

    const nis = report?.student?.nis || report?.student_nis || 'Santri';
    const name = (report?.student?.name || report?.student_name || 'Rapor').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Rapor_${nis}_${name}.pdf`);
    return doc;
}

/**
 * 2. Cetak / Preview PDF Buku Rapor Massal 1 Rombel
 */
export function generateBulkReportCardsPdf(reportsOrOpts = [], group, meta = {}, options = {}) {
    let reports = reportsOrOpts;
    let targetGroup = group;
    let targetMeta = meta;
    let opts = options;

    if (!Array.isArray(reportsOrOpts) && reportsOrOpts?.reports) {
        reports = reportsOrOpts.reports;
        targetGroup = reportsOrOpts.classGroup || reportsOrOpts.group;
        targetMeta = {
            academicYear: reportsOrOpts.academicYear?.year || reportsOrOpts.academicYear,
            quarterName: reportsOrOpts.quarter?.name || reportsOrOpts.quarterName,
        };
        opts = { ...options, ...reportsOrOpts };
    }

    if (!reports || !reports.length) return null;
    const doc = buildReportCardPdfDoc({ reports, group: targetGroup, meta: targetMeta });
    if (!doc) return null;

    if (opts.preview) {
        window.open(doc.output('bloburl'), '_blank');
        return doc;
    }
    if (opts.returnDoc) {
        return doc;
    }

    const rombelName = (targetGroup?.name || 'Rombel').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Buku_Rapor_Rombel_${rombelName}.pdf`);
    return doc;
}

/**
 * 3. Cetak / Preview PDF Leger Nilai Akhir Triwulan & Riwayat Remidi (Landscape A4)
 */
export function generateGradebookPdf(gradebook, group, meta = {}, options = {}) {
    const doc = buildGradebookPdfDoc({ gradebook, group, meta });
    if (!doc) return null;

    if (options.preview) {
        window.open(doc.output('bloburl'), '_blank');
        return doc;
    }
    if (options.returnDoc) {
        return doc;
    }

    const rombelName = (group?.name || 'Rombel').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Laporan_Penilaian_Dan_Riwayat_Remidi_${rombelName}.pdf`);
    return doc;
}

/**
 * 4. Cetak PDF Daftar Kelayakan Peserta Ujian (Integrasi Bank Santri)
 */
export function generateExamEligibilityPdf(eligibilityList = [], group, meta = {}) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = drawKopPesantren(doc, pageWidth, 24);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`DAFTAR KELAYAKAN PESERTA IMTIHAN / UJIAN — ${(group?.name || '').toUpperCase()}`, pageWidth / 2, y, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const yearLabel = meta.academicYear || group?.academic_year?.year || '1446/1447';
    const quarterLabel = meta.quarterName || 'Triwulan Aktif';
    doc.text(`Tahun Akademik: ${yearLabel} • Periode: ${quarterLabel} • Verifikasi Administrasi Bank Santri`, pageWidth / 2, y + 12, { align: 'center' });

    const bodyRows = eligibilityList.map((item, idx) => {
        const el = item.eligibility || {};
        const arrears = Number(el.total_arrears || item.unpaid_amount || 0);
        const isEligible = item.eligible !== undefined ? item.eligible : el.eligible;
        return [
            idx + 1,
            item.nis || '-',
            item.name || '-',
            item.is_mukim ? 'Santri Mukim' : 'Siswa Luar',
            item.reason || el.reason || '-',
            arrears > 0 ? `Rp ${arrears.toLocaleString('id-ID')}` : 'Rp 0',
            isEligible ? 'LAYAK UJIAN' : 'TERTAHAN',
        ];
    });

    autoTable(doc, {
        startY: y + 22,
        margin: { left: 36, right: 36 },
        head: [['No.', 'NIS', 'Nama Santri', 'Tipe', 'Keterangan Administrasi', 'Tunggakan', 'Status Kartu']],
        body: bodyRows,
        theme: 'grid',
        headStyles: {
            fillColor: [9, 60, 48],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 5,
        },
        bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59],
            cellPadding: 4.5,
        },
        columnStyles: {
            0: { cellWidth: 26, halign: 'center' },
            1: { cellWidth: 68, halign: 'center' },
            2: { halign: 'left', fontStyle: 'bold' },
            3: { cellWidth: 65, halign: 'center' },
            4: { halign: 'left' },
            5: { cellWidth: 72, halign: 'right' },
            6: { cellWidth: 68, halign: 'center', fontStyle: 'bold' },
        },
    });

    const rombelName = (group?.name || 'Rombel').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Kelayakan_Ujian_${rombelName}.pdf`);
    return doc;
}
