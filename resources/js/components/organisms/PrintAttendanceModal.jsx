import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { 
    generateDailyAttendancePdf, 
    generateWeeklyAttendancePdf 
} from '../../utils/attendancePdfGenerator';
import { 
    Printer, Download, ExternalLink, FileText, 
    Calendar, CalendarDays, CheckCircle2, Sparkles, Loader2, Users 
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function PrintAttendanceModal({
    open,
    onClose,
    currentGroup = {},
    currentDayObj = {},
    studentRows = [],
    notesMap = {},
    daysList = [],
    multiDayState = {},
    academicYear = '',
    quarterName = '',
    defaultMode = 'daily',
}) {
    // Mode format cetak: 'daily' (Presensi Harian) | 'weekly' (Presensi Sepekan)
    const [attendanceMode, setAttendanceMode] = useState(defaultMode || 'daily');
    // Status isian: 'filled' (terisi data H,S,I,A) | 'blank' (lembar kosong untuk manual)
    const [fillType, setFillType] = useState('filled');
    const [isGenerating, setIsGenerating] = useState(false);

    const meta = {
        academicYear: academicYear || '1446/1447 H',
        quarterName: quarterName || 'Triwulan IV (Syawal - Dzulhijjah)',
        date: currentDayObj?.date,
    };

    const generateDoc = () => {
        const isBlank = fillType === 'blank';

        if (attendanceMode === 'daily') {
            return generateDailyAttendancePdf({
                group: currentGroup,
                dayData: currentDayObj,
                studentRows,
                notesMap,
                meta,
                isBlank,
            });
        } else {
            return generateWeeklyAttendancePdf({
                group: currentGroup,
                daysList,
                studentList: studentRows,
                multiDayState,
                meta,
                isBlank,
            });
        }
    };

    const handleDownload = () => {
        setIsGenerating(true);
        setTimeout(() => {
            try {
                const doc = generateDoc();
                if (!doc) {
                    setIsGenerating(false);
                    return;
                }

                const dateStr = attendanceMode === 'daily' 
                    ? (currentDayObj?.date || 'Harian') 
                    : 'Sepekan';
                const groupName = currentGroup?.name ? currentGroup.name.replace(/\s+/g, '_') : 'Rombel';
                const fileName = `Presensi_KBM_${groupName}_${dateStr}_${fillType}.pdf`;

                doc.save(fileName);
                toast.success('Lembar presensi PDF berhasil diunduh');
                onClose();
            } catch (err) {
                console.error(err);
                toast.error('Gagal mencetak presensi: ' + err.message);
            } finally {
                setIsGenerating(false);
            }
        }, 150);
    };

    const handlePreview = () => {
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
                toast.info('Pratinjau PDF telah dibuka di tab baru');
                onClose();
            } catch (err) {
                console.error(err);
                toast.error('Gagal membuka preview presensi: ' + err.message);
            } finally {
                setIsGenerating(false);
            }
        }, 150);
    };

    return (
        <Modal
            open={open}
            title={
                <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-md bg-emerald-100 text-emerald-800">
                        <Printer className="w-4 h-4" />
                    </span>
                    <span>Cetak Lembar Presensi KBM (PDF)</span>
                </div>
            }
            onClose={onClose}
            maxWidth="max-w-xl"
        >
            <div className="space-y-5">
                <div className="p-3 bg-emerald-50/60 rounded-md border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                        Dokumen PDF diproses langsung di frontend dengan <b>Kop Resmi Pesantren Panyeppen</b>, 
                        header identitas rombel & tahun ajaran, tabel presensi dengan penomoran jam (<b>1, 2, 3...</b>), serta tanda tangan wali kelas di bagian bawah.
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    1. PILIHAN CAKUPAN PERIODE PRESENSI
                    ═══════════════════════════════════════════════════════════ */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                        Pilih Periode Lembar Presensi:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition ${
                            attendanceMode === 'daily'
                                ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-500'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}>
                            <input
                                type="radio"
                                name="attendanceMode"
                                value="daily"
                                checked={attendanceMode === 'daily'}
                                onChange={() => setAttendanceMode('daily')}
                                className="mt-1 text-emerald-600"
                            />
                            <div>
                                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Presensi Harian (Hari Aktif)</span>
                                </div>
                                <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold mt-1">
                                    Portrait A4 • Detail Jam 1 s.d 6
                                </span>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Hari: <b>{currentDayObj?.day_name || 'Sabtu'}</b> ({currentDayObj?.date || 'Hari Ini'}) lengkap dengan catatan/alasan santri.
                                </p>
                            </div>
                        </label>

                        <label className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition ${
                            attendanceMode === 'weekly'
                                ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-500'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}>
                            <input
                                type="radio"
                                name="attendanceMode"
                                value="weekly"
                                checked={attendanceMode === 'weekly'}
                                onChange={() => setAttendanceMode('weekly')}
                                className="mt-1 text-emerald-600"
                            />
                            <div>
                                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                                    <CalendarDays className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Presensi Sepekan Penuh</span>
                                </div>
                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold mt-1">
                                    Landscape A4 • Sabtu s.d Kamis
                                </span>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Rekap seluruh hari belajar sepekan dengan sub-kolom jam 1..6 dan total kehadiran (H, S, I, A).
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    2. PILIHAN ISIAN DATA (TERISI vs LEMBAR KOSONG)
                    ═══════════════════════════════════════════════════════════ */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                        Format Isian Kehadiran:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <label className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition ${
                            fillType === 'filled'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}>
                            <input
                                type="radio"
                                name="fillType"
                                value="filled"
                                checked={fillType === 'filled'}
                                onChange={() => setFillType('filled')}
                                className="text-emerald-600"
                            />
                            <div>
                                <span className="font-bold">Cetak Status Terisi (H, S, I, A)</span>
                                <span className="block text-[11px] text-slate-500 font-normal">Sesuai data presensi yang sedang tampil di layar</span>
                            </div>
                        </label>

                        <label className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition ${
                            fillType === 'blank'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}>
                            <input
                                type="radio"
                                name="fillType"
                                value="blank"
                                checked={fillType === 'blank'}
                                onChange={() => setFillType('blank')}
                                className="text-emerald-600"
                            />
                            <div>
                                <span className="font-bold">Cetak Lembar Kosong (Blank Sheet)</span>
                                <span className="block text-[11px] text-slate-500 font-normal">Kolom jam kosong untuk paraf / absen manual guru di kelas</span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    3. KOTAK INFORMASI HEADER DOKUMEN
                    ═══════════════════════════════════════════════════════════ */}
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs space-y-1.5">
                    <div className="font-bold text-slate-700 flex items-center justify-between border-b border-slate-200 pb-1">
                        <span>Ringkasan Lembar Presensi</span>
                        <span className="text-[11px] text-emerald-700 font-semibold">{studentRows.length} Santri Terdaftar</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div>
                            <span className="text-slate-400 block">Rombongan Belajar:</span>
                            <span className="font-semibold text-slate-800">{currentGroup?.name || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">Wali Kelas:</span>
                            <span className="font-semibold text-slate-800">
                                {currentGroup?.homeroom_teacher?.name || currentGroup?.homeroomTeacher?.name || 'Ust. Pembina'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">Tahun Akademik:</span>
                            <span className="font-semibold text-slate-800">{meta.academicYear}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">Periode / Caturwulan:</span>
                            <span className="font-semibold text-slate-800">{meta.quarterName}</span>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    4. TOMBOL AKSI
                    ═══════════════════════════════════════════════════════════ */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition order-3 sm:order-1"
                    >
                        Tutup
                    </button>

                    <button
                        type="button"
                        onClick={handlePreview}
                        disabled={isGenerating}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded shadow-xs transition order-2"
                        title="Buka pratinjau PDF di tab browser baru"
                    >
                        <ExternalLink className="w-3.5 h-3.5" /> Buka Preview PDF
                    </button>

                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#093c30] hover:bg-[#064e3b] text-white text-xs font-bold rounded shadow-xs transition order-1 sm:order-3 disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan Dokumen...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" /> Unduh Lembar Presensi PDF
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
