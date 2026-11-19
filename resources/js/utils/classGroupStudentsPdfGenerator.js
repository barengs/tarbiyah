import jsPDFImport, { jsPDF as jsPDFNamed } from 'jspdf';
import autoTableImport, { autoTable as autoTableNamed } from 'jspdf-autotable';

const jsPDF = jsPDFNamed || jsPDFImport;
const autoTable = autoTableNamed || autoTableImport;

/**
 * Format tanggal lahir ke format Indonesia: "13 Mei 2008"
 */
function formatIndonesianDate(dateStr) {
    if (!dateStr) return '';
    try {
        const clean = String(dateStr).substring(0, 10);
        const parts = clean.split('-');
        if (parts.length !== 3) return clean;
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (isNaN(d.getTime())) return clean;
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    } catch {
        return String(dateStr);
    }
}

/**
 * Format Tempat, Tanggal Lahir
 */
export function formatStudentBirthInfo(student) {
    if (!student) return '-';
    const place = student.born_in ? String(student.born_in).trim() : '';
    const date = formatIndonesianDate(student.born_at);
    if (place && date) return `${place}, ${date}`;
    if (place) return place;
    if (date) return date;
    return '-';
}

/**
 * Format Alamat Lengkap siswa
 */
export function formatStudentAddress(student) {
    if (!student) return '-';
    const parts = [
        student.address,
        student.village,
        student.district,
    ]
        .map((v) => (v ? String(v).trim() : ''))
        .filter((v) => v && v !== '-');

    if (parts.length === 0) return '-';
    return parts.join(', ');
}

/**
 * Gambar Kop Surat Resmi Pesantren
 */
function drawKopPesantren(doc, pageWidth, startY = 26) {
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

    return lineY + 16;
}

/**
 * Generate PDF Daftar Data Siswa per Rombel
 * Kolom: No, NIS, Nama Lengkap, Tempat & Tanggal Lahir, Alamat, Nama Orang Tua
 */
export function generateClassGroupStudentsPdf({ group, studentClasses = [] }) {
    const doc = new jsPDF({
        orientation: 'landscape',
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
    doc.text('DAFTAR DATA SISWA / SANTRI ROMBONGAN BELAJAR', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 14;

    const yearLabel = group?.academic_year?.year ? `Tahun Akademik ${group.academic_year.year} H` : '';
    if (yearLabel) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(yearLabel, pageWidth / 2, cursorY, { align: 'center' });
        cursorY += 12;
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
    const col2X = marginX + boxWidth * 0.36;
    const col3X = marginX + boxWidth * 0.70;

    const rombelName = `${group?.name || '-'}${group?.code ? ` (${group.code})` : ''}`;
    const institutionName = group?.educational_institution?.name || group?.education?.name || '-';
    const classLevelName = group?.education_class?.name || '-';
    const homeroomName = group?.homeroom_teacher?.name || '-';
    const programName = group?.program?.name || group?.educational_institution?.program?.name || '-';
    const totalStudents = studentClasses.length;

    const drawMetaRow = (x, y, label, value) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(label, x, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`: ${value}`, x + 68, y);
    };

    drawMetaRow(col1X, boxY + 18, 'Rombel', rombelName);
    drawMetaRow(col1X, boxY + 34, 'Lembaga', institutionName);

    drawMetaRow(col2X, boxY + 18, 'Tingkat Kelas', classLevelName);
    drawMetaRow(col2X, boxY + 34, 'Program', programName);

    drawMetaRow(col3X, boxY + 18, 'Wali Kelas', homeroomName);
    drawMetaRow(col3X, boxY + 34, 'Jumlah Siswa', `${totalStudents} Santri`);

    // Urutkan siswa berdasarkan nama
    const sorted = [...studentClasses].sort((a, b) =>
        (a.student?.name || '').localeCompare(b.student?.name || '', 'id')
    );

    const tableBody = sorted.map((sc, idx) => {
        const st = sc.student || {};
        return [
            String(idx + 1),
            st.nis || '-',
            st.name || '-',
            formatStudentBirthInfo(st),
            formatStudentAddress(st),
            st.parent_name || '-',
        ];
    });

    autoTable(doc, {
        startY: boxY + boxHeight + 14,
        margin: { left: marginX, right: marginX, bottom: 44 },
        head: [[
            'No',
            'NIS',
            'Nama Lengkap',
            'Tempat, Tanggal Lahir',
            'Alamat',
            'Nama Orang Tua',
        ]],
        body: tableBody.length > 0 ? tableBody : [['-', '-', 'Belum ada data siswa pada rombel ini.', '-', '-', '-']],
        theme: 'grid',
        headStyles: {
            fillColor: [9, 60, 48],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
            halign: 'left',
            cellPadding: 6,
        },
        bodyStyles: {
            fontSize: 8.5,
            textColor: [30, 41, 59],
            cellPadding: 5.5,
            valign: 'middle',
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 32 },
            1: { fontStyle: 'bold', cellWidth: 85 },
            2: { fontStyle: 'bold', cellWidth: 155 },
            3: { cellWidth: 145 },
            4: { cellWidth: 215 },
            5: { cellWidth: 'auto' },
        },
        didDrawPage: (data) => {
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
                `Dicetak dari Sistem Akademik Tarbiyah pada ${printedAt} • Rombel ${group?.name || '-'}`,
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

    // Blok Tanda Tangan di akhir tabel
    let finalY = (doc.lastAutoTable?.finalY || boxY + boxHeight + 60) + 26;
    if (finalY + 80 > pageHeight - 36) {
        doc.addPage();
        finalY = 48;
    }

    const todayLabel = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const sigRightX = pageWidth - marginX - 180;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Pamekasan, ${todayLabel}`, sigRightX, finalY);
    doc.text('Wali Kelas,', sigRightX, finalY + 13);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(homeroomName !== '-' ? homeroomName : '( ........................................ )', sigRightX, finalY + 58);

    return doc;
}
