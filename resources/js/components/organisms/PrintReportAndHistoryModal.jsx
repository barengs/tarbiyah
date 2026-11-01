import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import {
    buildReportCardPdfDoc,
    buildStudentHistoryPdfDoc,
    buildGradebookPdfDoc,
    normalizeStudentToReport,
} from '../../utils/reportCardPdfGenerator';
import {
    Printer,
    Download,
    ExternalLink,
    FileText,
    BookOpen,
    History,
    LayoutGrid,
    UserCheck,
    Users,
    Sparkles,
    Loader2,
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function PrintReportAndHistoryModal({
    open,
    onClose,
    initialDocType = 'history', // 'history' | 'rapor'
    initialHistoryFormat = 'gradebook', // 'gradebook' | 'student_sheet'
    initialStudentId = '', // '' (semua) atau ID santri tertentu
    currentGroup = null,
    sheetData = null,
    reports = [],
    academicYear = '',
    quarterName = '',
}) {
    const [docType, setDocType] = useState(initialDocType);
    const [historyFormat, setHistoryFormat] = useState(initialHistoryFormat);
    const [studentScope, setStudentScope] = useState(initialStudentId ? 'single' : 'all');
    const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId ? String(initialStudentId) : '');
    const [isGenerating, setIsGenerating] = useState(false);

    const sheetStudents = sheetData?.students || [];
    const sheetStudies = sheetData?.studies || [];

    // Sinkronkan state awal ketika modal dibuka
    useEffect(() => {
        if (open) {
            setDocType(initialDocType || 'history');
            setHistoryFormat(initialHistoryFormat || 'gradebook');
            if (initialStudentId) {
                setStudentScope('single');
                setSelectedStudentId(String(initialStudentId));
            } else {
                setStudentScope('all');
                if (sheetStudents.length > 0 && !selectedStudentId) {
                    setSelectedStudentId(String(sheetStudents[0].student_id));
                }
            }
        }
    }, [open, initialDocType, initialHistoryFormat, initialStudentId, sheetStudents]);

    const meta = useMemo(
        () => ({
            academicYear: academicYear || '1446/1447 H',
            quarterName: quarterName || 'Triwulan Aktif',
        }),
        [academicYear, quarterName]
    );

    // Daftar laporan rapor yang siap dicetak (ambil dari reports, atau fallback dari sheetStudents)
    const preparedReports = useMemo(() => {
        if (reports && reports.length > 0) {
            return reports;
        }
        return sheetStudents.map((st, idx) => normalizeStudentToReport(st, sheetStudies, idx + 1));
    }, [reports, sheetStudents, sheetStudies]);

    const targetStudentsForHistory = useMemo(() => {
        if (studentScope === 'single' && selectedStudentId) {
            return sheetStudents.filter((s) => String(s.student_id) === String(selectedStudentId));
        }
        return sheetStudents;
    }, [sheetStudents, studentScope, selectedStudentId]);

    const targetReportsForRapor = useMemo(() => {
        if (studentScope === 'single' && selectedStudentId) {
            const found = preparedReports.filter(
                (r) => String(r.student_id || r.student?.id) === String(selectedStudentId)
            );
            if (found.length > 0) return found;
            const st = sheetStudents.find((s) => String(s.student_id) === String(selectedStudentId));
            return st ? [normalizeStudentToReport(st, sheetStudies, 1)] : [];
        }
        return preparedReports;
    }, [preparedReports, sheetStudents, sheetStudies, studentScope, selectedStudentId]);

    const generateDoc = () => {
        if (!currentGroup) {
            toast.warning('Pilih kelas / rombel terlebih dahulu.');
            return null;
        }

        if (docType === 'history') {
            if (historyFormat === 'gradebook') {
                if (!sheetStudents.length) {
                    toast.warning('Belum ada data nilai santri pada rombel ini.');
                    return null;
                }
                return buildGradebookPdfDoc({
                    gradebook: sheetData,
                    group: currentGroup,
                    meta,
                });
            } else {
                if (!targetStudentsForHistory.length) {
                    toast.warning('Pilih santri yang akan dicetak riwayat nilainya.');
                    return null;
                }
                return buildStudentHistoryPdfDoc({
                    students: targetStudentsForHistory,
                    studies: sheetStudies,
                    group: currentGroup,
                    meta,
                });
            }
        } else {
            if (!targetReportsForRapor.length) {
                toast.warning('Belum ada data rapor santri untuk dicetak.');
                return null;
            }
            return buildReportCardPdfDoc({
                reports: targetReportsForRapor,
                group: currentGroup,
                meta,
            });
        }
    };

    const getOutputFileName = () => {
        const rombelName = (currentGroup?.name || 'Rombel').replace(/[^a-zA-Z0-9]/g, '_');
        if (docType === 'history') {
            if (historyFormat === 'gradebook') {
                return `Leger_Penilaian_Dan_Riwayat_Remidi_${rombelName}.pdf`;
            }
            if (studentScope === 'single' && targetStudentsForHistory[0]) {
                const st = targetStudentsForHistory[0];
                const nis = st.nis || st.student_nis || 'Santri';
                const name = (st.name || st.student_name || 'Siswa').replace(/[^a-zA-Z0-9]/g, '_');
                return `Riwayat_Nilai_${nis}_${name}.pdf`;
            }
            return `Riwayat_Nilai_Siswa_${rombelName}.pdf`;
        } else {
            if (studentScope === 'single' && targetReportsForRapor[0]) {
                const rep = targetReportsForRapor[0];
                const nis = rep.student?.nis || 'Santri';
                const name = (rep.student?.name || 'Siswa').replace(/[^a-zA-Z0-9]/g, '_');
                return `Buku_Rapor_${nis}_${name}.pdf`;
            }
            return `Buku_Rapor_Rombel_${rombelName}.pdf`;
        }
    };

    // Handler Buka Preview PDF di Tab Baru (seperti pada Cetak Jadwal)
    const handleOpenNewTabPreview = () => {
        setIsGenerating(true);
        setTimeout(() => {
            try {
                const doc = generateDoc();
                if (!doc) {
                    setIsGenerating(false);
                    return;
                }
                const pdfBlobUrl = doc.output('bloburl');
                window.open(pdfBlobUrl, '_blank');
                toast.info('Preview PDF telah dibuka di tab baru');
            } catch (err) {
                console.error(err);
                toast.error('Gagal membuka preview PDF: ' + err.message);
            } finally {
                setIsGenerating(false);
            }
        }, 100);
    };

    // Handler Unduh File PDF
    const handleDownload = () => {
        setIsGenerating(true);
        setTimeout(() => {
            try {
                const doc = generateDoc();
                if (!doc) {
                    setIsGenerating(false);
                    return;
                }
                doc.save(getOutputFileName());
                toast.success('Dokumen PDF berhasil diunduh');
                onClose();
            } catch (err) {
                console.error(err);
                toast.error('Gagal mengunduh PDF: ' + err.message);
            } finally {
                setIsGenerating(false);
            }
        }, 100);
    };

    const pageCountInfo = useMemo(() => {
        if (docType === 'history' && historyFormat === 'gradebook') {
            return '1 Berkas Leger Rombel';
        }
        if (studentScope === 'single') {
            return '1 Halaman Santri';
        }
        return `${sheetStudents.length} Halaman Santri`;
    }, [docType, historyFormat, studentScope, sheetStudents.length]);

    return (
        <Modal
            open={open}
            isOpen={open}
            onClose={onClose}
            maxWidth="max-w-xl"
            title={
                <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-md bg-emerald-100 text-emerald-800">
                        <Printer className="w-4 h-4" />
                    </span>
                    <span>Cetak &amp; Preview PDF — Riwayat Nilai &amp; Buku Rapor</span>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="p-3 bg-emerald-50/60 rounded-md border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                        Dokumen PDF diproses langsung di frontend dengan tata letak resmi <b>Pondok Pesantren Miftahul Ulum Panyeppen</b>. Anda dapat melihat <b>Preview PDF</b> terlebih dahulu sebelum mengunduh.
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    1. PILIH JENIS DOKUMEN (RIWAYAT NILAI ASLI vs BUKU RAPOR)
                    ═══════════════════════════════════════════════════════════ */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                        1. Pilih Jenis Dokumen yang Ingin Dicetak:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                            className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition ${
                                docType === 'history'
                                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-500'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <input
                                type="radio"
                                name="docType"
                                value="history"
                                checked={docType === 'history'}
                                onChange={() => setDocType('history')}
                                className="mt-1 text-emerald-600"
                            />
                            <div>
                                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                                    <History className="w-3.5 h-3.5 text-amber-700" />
                                    <span>Laporan Penilaian &amp; Riwayat Nilai</span>
                                </div>
                                <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold mt-1">
                                    Disertai Nilai Asli Sebelum Remidi
                                </span>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Mencantumkan <b>Nilai Asli (Awal)</b>, <b>Nilai Remidi</b>, dan <b>Nilai Akhir</b> sebagai dokumen evaluasi guru/akademik.
                                </p>
                            </div>
                        </label>

                        <label
                            className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition ${
                                docType === 'rapor'
                                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-500'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <input
                                type="radio"
                                name="docType"
                                value="rapor"
                                checked={docType === 'rapor'}
                                onChange={() => setDocType('rapor')}
                                className="mt-1 text-emerald-600"
                            />
                            <div>
                                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                                    <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Buku Rapor Akhir Triwulan</span>
                                </div>
                                <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold mt-1">
                                    Hanya Nilai Akhir Murni • Resmi
                                </span>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Lembar buku rapor resmi untuk santri &amp; wali santri (hanya menampilkan nilai akhir, predikat, &amp; absensi).
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    2. FORMAT TATA LETAK (KHUSUS RIWAYAT NILAI)
                    ═══════════════════════════════════════════════════════════ */}
                {docType === 'history' && (
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-800">
                            2. Pilih Format Laporan Riwayat Nilai:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setHistoryFormat('gradebook')}
                                className={`p-2.5 rounded-md border text-left text-xs transition cursor-pointer ${
                                    historyFormat === 'gradebook'
                                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-1.5 font-bold">
                                    <LayoutGrid className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Leger Rombel &amp; Berita Acara Remidi</span>
                                </div>
                                <span className="text-[11px] text-slate-500 block mt-0.5">
                                    Landscape A4 • Rekap matriks seluruh siswa + tabel Berita Acara Remidi
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setHistoryFormat('student_sheet')}
                                className={`p-2.5 rounded-md border text-left text-xs transition cursor-pointer ${
                                    historyFormat === 'student_sheet'
                                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-1.5 font-bold">
                                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Lembar Riwayat Nilai Per Siswa</span>
                                </div>
                                <span className="text-[11px] text-slate-500 block mt-0.5">
                                    Portrait A4 • Tabel rincian Nilai Asli Awal, Nilai Remidi, &amp; Nilai Akhir per mapel
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    3. CAKUPAN SANTRI (UNTUK RAPOR ATAU LEMBAR RIWAYAT INDIVIDU)
                    ═══════════════════════════════════════════════════════════ */}
                {(docType === 'rapor' || historyFormat === 'student_sheet') && (
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-800">
                            {docType === 'history' ? '3.' : '2.'} Pilih Cakupan Santri:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setStudentScope('all')}
                                className={`p-2.5 rounded-md border text-left text-xs transition cursor-pointer flex items-center gap-2.5 ${
                                    studentScope === 'all'
                                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <Users className="w-4 h-4 text-emerald-700 shrink-0" />
                                <div>
                                    <span className="font-bold block">Semua Santri Rombel</span>
                                    <span className="text-[11px] text-slate-500">
                                        Cetak sekaligus ({sheetStudents.length} santri)
                                    </span>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setStudentScope('single')}
                                className={`p-2.5 rounded-md border text-left text-xs transition cursor-pointer flex items-center gap-2.5 ${
                                    studentScope === 'single'
                                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                                <div>
                                    <span className="font-bold block">Pilih 1 Santri Tertentu</span>
                                    <span className="text-[11px] text-slate-500">
                                        Cetak khusus untuk 1 santri
                                    </span>
                                </div>
                            </button>
                        </div>

                        {studentScope === 'single' && (
                            <div className="pt-1">
                                <select
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:border-emerald-600"
                                >
                                    {sheetStudents.map((st) => (
                                        <option key={st.student_id} value={st.student_id}>
                                            {st.student_name || st.name} — NIS: {st.student_nis || st.nis}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    4. KOTAK INFORMASI HEADER DOKUMEN
                    ═══════════════════════════════════════════════════════════ */}
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs space-y-1.5">
                    <div className="font-bold text-slate-700 flex items-center justify-between border-b border-slate-200 pb-1">
                        <span>Informasi Header Dokumen</span>
                        <span className="text-[11px] text-emerald-700 font-semibold">{pageCountInfo}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div>
                            <span className="text-slate-400 block">Kelas / Rombongan Belajar:</span>
                            <span className="font-semibold text-slate-800">{currentGroup?.name || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">Tahun Akademik &amp; Triwulan:</span>
                            <span className="font-semibold text-slate-800">
                                {meta.academicYear} • {meta.quarterName}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">Wali Kelas / Musyrif:</span>
                            <span className="font-semibold text-slate-800">
                                {currentGroup?.homeroom_teacher?.name || currentGroup?.homeroomTeacher?.name || '-'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">Jenis Nilai Tercetak:</span>
                            <span className="font-semibold text-slate-800">
                                {docType === 'history'
                                    ? 'Nilai Asli Awal + Nilai Remidi + Nilai Akhir'
                                    : 'Nilai Akhir Rapor Murni'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    5. TOMBOL AKSI (PREVIEW DI TAB BARU & UNDUH DOKUMEN PDF)
                    ═══════════════════════════════════════════════════════════ */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
                    >
                        Tutup
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenNewTabPreview}
                        disabled={isGenerating}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded shadow-2xs transition cursor-pointer"
                        title="Buka pratinjau PDF di tab browser baru"
                    >
                        <ExternalLink className="w-3.5 h-3.5" /> Preview PDF
                    </button>

                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0b57d0] hover:bg-[#0842a0] text-white text-xs font-bold rounded shadow-2xs transition disabled:opacity-50 cursor-pointer"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Memproses PDF...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" /> Unduh Dokumen PDF
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

