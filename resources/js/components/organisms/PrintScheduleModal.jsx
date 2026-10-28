import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { 
    generateScheduleMatrixPdf, 
    generateScheduleDetailedTablePdf 
} from '../../utils/schedulePdfGenerator';
import { 
    Printer, Download, ExternalLink, FileText, 
    LayoutGrid, Table as TableIcon, CheckCircle2, School, Sparkles, Loader2 
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function PrintScheduleModal({
    open,
    onClose,
    allGroups = [],
    filteredGroups = [],
    currentGroup = null,
    schedules = [],
    lessonHours = [],
    academicYear = '',
    quarterName = '',
    selectedEducation = 'all',
}) {
    // Scope cetak: 'current' | 'filtered' | 'all'
    const [printScope, setPrintScope] = useState(currentGroup ? 'current' : 'filtered');
    // Format tata letak: 'matrix' (Landscape) | 'detailed' (Portrait)
    const [layoutFormat, setLayoutFormat] = useState('matrix');
    const [isGenerating, setIsGenerating] = useState(false);

    // Hitung rombel yang akan dicetak berdasarkan scope
    const targetGroups = React.useMemo(() => {
        if (printScope === 'current' && currentGroup) {
            return [currentGroup];
        }
        if (printScope === 'filtered') {
            return filteredGroups.length > 0 ? filteredGroups : allGroups;
        }
        return allGroups;
    }, [printScope, currentGroup, filteredGroups, allGroups]);

    // Metadata untuk header jadwal
    const meta = {
        academicYear: academicYear || '1446/1447 H',
        quarterName: quarterName || 'Triwulan IV (Syawal - Dzulhijjah)',
    };

    // Fungsi membuat instance jsPDF
    const generateDoc = () => {
        if (targetGroups.length === 0) {
            toast.warning('Tidak ada rombel yang dipilih untuk dicetak.');
            return null;
        }

        const params = {
            groups: targetGroups,
            schedules,
            lessonHours,
            meta,
        };

        if (layoutFormat === 'matrix') {
            return generateScheduleMatrixPdf(params);
        } else {
            return generateScheduleDetailedTablePdf(params);
        }
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

                const scopeLabel = printScope === 'current' 
                    ? (currentGroup?.name || 'Rombel') 
                    : (printScope === 'filtered' ? `Jenjang_${selectedEducation}` : 'Semua_Rombel');

                const fileName = `Jadwal_KBM_${scopeLabel.replace(/\s+/g, '_')}_${meta.academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
                doc.save(fileName);
                toast.success('File PDF Jadwal berhasil diunduh');
                onClose();
            } catch (err) {
                console.error(err);
                toast.error('Gagal membuat file PDF jadwal: ' + err.message);
            } finally {
                setIsGenerating(false);
            }
        }, 150);
    };

    // Handler Buka Preview PDF di Tab Baru (bukan window.print)
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
                toast.info('Preview PDF telah dibuka di tab baru');
                onClose();
            } catch (err) {
                console.error(err);
                toast.error('Gagal membuka preview PDF: ' + err.message);
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
                    <span>Cetak Dokumen Jadwal Pelajaran (PDF)</span>
                </div>
            }
            onClose={onClose}
            maxWidth="max-w-xl"
        >
            <div className="space-y-5">
                <div className="p-3 bg-emerald-50/60 rounded-md border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                        Dokumen PDF dibuat langsung di frontend dengan tata letak resmi Pesantren Panyeppen, 
                        lengkap dengan <b>Kop Surat Pesantren</b>, <b>Header Identitas Pengelompokan</b>, dan <b>Tanda Tangan Wali Kelas</b> di bagian bawah.
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    1. PILIHAN CAKUPAN ROMBEL (SCOPE CETAK)
                    ═══════════════════════════════════════════════════════════ */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                        Pilih Cakupan Rombel yang Ingin Dicetak:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {currentGroup && (
                            <button
                                type="button"
                                onClick={() => setPrintScope('current')}
                                className={`p-2.5 rounded-md border text-left text-xs transition ${
                                    printScope === 'current'
                                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <span className="font-bold block">Rombel Aktif</span>
                                <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                                    {currentGroup.name}
                                </span>
                                <span className="text-[10px] text-emerald-700 font-semibold block mt-1">1 Halaman</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setPrintScope('filtered')}
                            className={`p-2.5 rounded-md border text-left text-xs transition ${
                                printScope === 'filtered'
                                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <span className="font-bold block">Rombel Terfilter</span>
                            <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                                {selectedEducation !== 'all' ? `Jenjang ${selectedEducation}` : 'Filter Saat Ini'}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold block mt-1">
                                {filteredGroups.length} Halaman Rombel
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setPrintScope('all')}
                            className={`p-2.5 rounded-md border text-left text-xs transition ${
                                printScope === 'all'
                                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <span className="font-bold block">Semua Rombel</span>
                            <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                                Seluruh Madrasah
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold block mt-1">
                                {allGroups.length} Halaman (Lengkap)
                            </span>
                        </button>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    2. PILIHAN TATA LETAK / FORMAT TABEL
                    ═══════════════════════════════════════════════════════════ */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                        Pilih Format Tata Letak (Layout):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition ${
                            layoutFormat === 'matrix'
                                ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-500'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}>
                            <input
                                type="radio"
                                name="layoutFormat"
                                value="matrix"
                                checked={layoutFormat === 'matrix'}
                                onChange={() => setLayoutFormat('matrix')}
                                className="mt-1 text-emerald-600"
                            />
                            <div>
                                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                                    <LayoutGrid className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Matriks Mingguan (Jadwal Dinding)</span>
                                </div>
                                <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold mt-1">
                                    Landscape A4 • Rekomendasi
                                </span>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Tabel kisi mingguan (Sabtu–Kamis) mudah ditempel di dinding kelas atau dipegang siswa & guru.
                                </p>
                            </div>
                        </label>

                        <label className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition ${
                            layoutFormat === 'detailed'
                                ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-500'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}>
                            <input
                                type="radio"
                                name="layoutFormat"
                                value="detailed"
                                checked={layoutFormat === 'detailed'}
                                onChange={() => setLayoutFormat('detailed')}
                                className="mt-1 text-emerald-600"
                            />
                            <div>
                                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                                    <TableIcon className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Tabel Detail Rinci (Agenda KBM)</span>
                                </div>
                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold mt-1">
                                    Portrait A4 • Agenda Harian
                                </span>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Daftar vertikal per hari, sesi waktu, nama mapel, guru pengampu, dan ruang kelas.
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    3. KOTAK INFORMASI HEADER & IDENTITAS DOKUMEN
                    ═══════════════════════════════════════════════════════════ */}
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs space-y-1.5">
                    <div className="font-bold text-slate-700 flex items-center justify-between border-b border-slate-200 pb-1">
                        <span>Informasi Header Dokumen</span>
                        <span className="text-[11px] text-emerald-700 font-semibold">{targetGroups.length} Berkas Rombel</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div>
                            <span className="text-slate-400 block">Tahun Akademik:</span>
                            <span className="font-semibold text-slate-800">{meta.academicYear}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">Periode / Caturwulan:</span>
                            <span className="font-semibold text-slate-800">{meta.quarterName}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">Lembaga Penyelenggara:</span>
                            <span className="font-semibold text-slate-800">PP. Miftahul Ulum Panyeppen</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">Bagian Pengesahan:</span>
                            <span className="font-semibold text-slate-800">Wali Kelas & Mudir Tarbiyah</span>
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
