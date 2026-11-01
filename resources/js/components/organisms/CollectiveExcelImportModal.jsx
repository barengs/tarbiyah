import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { useImportCollectiveExcelMutation } from '../../store/slices/assessmentApi';
import {
    FileSpreadsheet,
    Download,
    Upload,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    X,
    Lock,
    Unlock,
    RotateCcw,
    Layers,
    Users,
    Save,
    ArrowLeft,
    Check,
    FileText,
    Info,
    HelpCircle,
} from 'lucide-react';
import { toast } from 'react-toastify';

const STUDY_TYPE_BADGE = {
    khusus: {
        label: 'Khusus',
        cls: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    reguler: {
        label: 'Reguler',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    muatan_lokal: {
        label: 'Mulok',
        cls: 'bg-amber-50 text-amber-800 border-amber-200',
    },
};

export default function CollectiveExcelImportModal({
    open,
    onClose,
    currentGroup,
    academicYearId,
    academicQuarterId,
    academicYearName = '',
    quarterName = '',
    sheetStudies = [],
    isOpenGrading = true,
    onSuccess,
}) {
    const [step, setStep] = useState(1); // 1: Download & Upload | 2: Preview & Commit
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [lockAfterSave, setLockAfterSave] = useState(false);

    // Konfigurasi Unduh Template
    const [includeExistingScores, setIncludeExistingScores] = useState(true);
    const [selectedStudyIdsForTemplate, setSelectedStudyIdsForTemplate] = useState([]);
    const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

    // Hasil Pratinjau dari Backend
    const [previewData, setPreviewData] = useState(null);

    const [importCollectiveExcel, { isLoading: isProcessing }] = useImportCollectiveExcelMutation();

    // Reset state saat modal dibuka
    useEffect(() => {
        if (open) {
            setStep(1);
            setSelectedFile(null);
            setPreviewData(null);
            setLockAfterSave(false);
            if (sheetStudies && sheetStudies.length > 0) {
                setSelectedStudyIdsForTemplate(sheetStudies.map((s) => s.id));
            } else {
                setSelectedStudyIdsForTemplate([]);
            }
        }
    }, [open, sheetStudies]);

    const handleSelectAllStudies = () => {
        if (selectedStudyIdsForTemplate.length === sheetStudies.length) {
            setSelectedStudyIdsForTemplate([]);
        } else {
            setSelectedStudyIdsForTemplate(sheetStudies.map((s) => s.id));
        }
    };

    const handleToggleStudy = (id) => {
        setSelectedStudyIdsForTemplate((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    // Unduh Template Excel dari Backend
    const handleDownloadTemplate = async () => {
        if (!currentGroup?.id) {
            toast.error('Data kelas/rombel tidak valid.');
            return;
        }

        try {
            setIsDownloadingTemplate(true);
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                class_group_id: String(currentGroup.id),
                include_existing: String(includeExistingScores),
            });
            if (academicYearId) params.append('academic_year_id', String(academicYearId));
            if (academicQuarterId) params.append('academic_quarter_id', String(academicQuarterId));
            if (selectedStudyIdsForTemplate.length > 0 && selectedStudyIdsForTemplate.length < sheetStudies.length) {
                params.append('study_ids', selectedStudyIdsForTemplate.join(','));
            }

            const response = await fetch(`/api/main/assessments/collective-template?${params.toString()}`, {
                method: 'GET',
                headers: {
                    ...(token && { Authorization: `Bearer ${token}` }),
                    Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
            });

            if (!response.ok) {
                const errJson = await response.json().catch(() => null);
                throw new Error(errJson?.message || 'Gagal mengunduh template Excel');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;

            // Dapatkan filename dari header jika ada
            const disposition = response.headers.get('Content-Disposition');
            let filename = `Template_Nilai_Kolektif_${currentGroup.name || 'Rombel'}.xlsx`;
            if (disposition && disposition.includes('filename=')) {
                const match = disposition.match(/filename="?([^";]+)"?/);
                if (match && match[1]) filename = match[1];
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);

            toast.success('Template Excel berhasil diunduh. Silakan isi nilai dan unggah kembali.');
        } catch (err) {
            toast.error(err.message || 'Gagal mengunduh template');
        } finally {
            setIsDownloadingTemplate(false);
        }
    };

    // Handle Drag & Drop / Pilih File
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) validateAndSetFile(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) validateAndSetFile(file);
    };

    const validateAndSetFile = (file) => {
        const validExtensions = ['.xlsx', '.xls'];
        const isExcel = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
        if (!isExcel) {
            toast.error('Format file harus berupa lembar kerja Excel (.xlsx atau .xls)');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Ukuran file maksimal adalah 10 MB');
            return;
        }
        setSelectedFile(file);
    };

    // Jalankan Pratinjau & Validasi (Mode Preview)
    const handlePreview = async () => {
        if (!selectedFile) {
            toast.warning('Pilih file Excel rekap nilai terlebih dahulu.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('class_group_id', String(currentGroup.id));
        if (academicYearId) formData.append('academic_year_id', String(academicYearId));
        if (academicQuarterId) formData.append('academic_quarter_id', String(academicQuarterId));
        formData.append('mode', 'preview');

        try {
            const res = await importCollectiveExcel(formData).unwrap();
            setPreviewData(res.data);
            setStep(2);
            toast.success('File Excel berhasil divalidasi. Periksa pratinjau nilai.');
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal memvalidasi file Excel');
        }
    };

    // Eksekusi Simpan Nilai ke Database (Mode Commit)
    const handleCommit = async () => {
        if (!selectedFile) return;

        if (!isOpenGrading) {
            toast.warning('Masa penginputan nilai saat ini ditutup. Buka kembali di menu Pengaturan.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('class_group_id', String(currentGroup.id));
        if (academicYearId) formData.append('academic_year_id', String(academicYearId));
        if (academicQuarterId) formData.append('academic_quarter_id', String(academicQuarterId));
        formData.append('mode', 'commit');
        formData.append('lock_after_save', lockAfterSave ? '1' : '0');

        try {
            const res = await importCollectiveExcel(formData).unwrap();
            toast.success(
                res?.message || 'Nilai kolektif berhasil disimpan dan buku rapor telah disinkronkan!'
            );
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan nilai kolektif');
        }
    };

    const summary = previewData?.summary || {};
    const detectedStudies = previewData?.detected_studies || [];
    const studentPreviews = previewData?.student_previews || [];
    const invalidCells = previewData?.invalid_cells || [];
    const unmatchedRows = previewData?.unmatched_rows || [];

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Import Penilaian Kolektif (Multi-Mata Pelajaran)"
            maxWidth={step === 2 ? 'max-w-6xl' : 'max-w-3xl'}
            footer={
                <div className="flex items-center justify-between w-full">
                    {step === 2 ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xs shadow-2xs cursor-pointer"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Ganti File / Kembali
                            </button>

                            <div className="flex items-center gap-3">
                                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={lockAfterSave}
                                        onChange={(e) => setLockAfterSave(e.target.checked)}
                                        className="rounded-xs text-[#0b57d0] focus:ring-[#0b57d0] cursor-pointer"
                                    />
                                    <span className="flex items-center gap-1">
                                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                                        Kunci nilai otomatis setelah diimport
                                    </span>
                                </label>

                                <button
                                    type="button"
                                    onClick={handleCommit}
                                    disabled={isProcessing || !isOpenGrading || (summary?.valid_entries_count ?? 0) === 0}
                                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-xs shadow-2xs disabled:opacity-50 cursor-pointer"
                                >
                                    <Save className="w-4 h-4" />
                                    {isProcessing
                                        ? 'Menyimpan Nilai...'
                                        : `Simpan & Terapkan (${summary?.valid_entries_count ?? 0} Entri Nilai)`}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-xs text-slate-500">
                                Langkah 1 dari 2: Unduh Template &amp; Unggah Berkas
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xs cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePreview}
                                    disabled={!selectedFile || isProcessing}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-xs shadow-2xs disabled:opacity-50 cursor-pointer"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {isProcessing ? 'Memvalidasi File...' : 'Pratinjau & Validasi Data'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            }
        >
            <div className="space-y-4">
                {/* Info Baris Rombel & Periode */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                            {currentGroup?.name || 'Rombel'}
                        </span>
                        <span className="text-slate-500">
                            ({currentGroup?.program?.name || 'Program'} • {currentGroup?.education?.name || 'Jenjang'})
                        </span>
                        <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {academicYearName ? `TA ${academicYearName} H` : 'TA Aktif'} • {quarterName || 'Triwulan Aktif'}
                        </span>
                    </div>

                    {!isOpenGrading && (
                        <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                            <Lock className="w-3.5 h-3.5" />
                            Masa Input Ditutup (Read-Only)
                        </div>
                    )}
                </div>

                {/* ══════════════════════════════════════════════════════════════════
                    LANGKAH 1: UNDUH TEMPLATE & UNGGAH FILE
                   ══════════════════════════════════════════════════════════════════ */}
                {step === 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Kolom Kiri: Unduh Template Excel Resmi */}
                        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xs p-4 flex flex-col justify-between space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-xs">
                                        <FileSpreadsheet className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                        1. Unduh Template Excel
                                    </h4>
                                </div>

                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Unduh lembar kerja Excel berisi daftar seluruh santri rombel ini beserta kolom mata pelajaran terkait. Bagikan ke guru pengampu untuk diisi nilainya secara kolektif.
                                </p>

                                {/* Opsi Nilai yang Ada */}
                                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeExistingScores}
                                        onChange={(e) => setIncludeExistingScores(e.target.checked)}
                                        className="mt-0.5 rounded-xs text-[#0b57d0] focus:ring-[#0b57d0] cursor-pointer"
                                    />
                                    <span className="text-xs text-slate-700 font-medium">
                                        Sertakan nilai yang sudah pernah diinput sebelumnya (sebagai acuan)
                                    </span>
                                </label>

                                {/* Pilihan Mata Pelajaran */}
                                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-700">Mata Pelajaran ({selectedStudyIdsForTemplate.length}/{sheetStudies.length}):</span>
                                        <button
                                            type="button"
                                            onClick={handleSelectAllStudies}
                                            className="text-[11px] text-[#0b57d0] hover:underline font-bold cursor-pointer"
                                        >
                                            {selectedStudyIdsForTemplate.length === sheetStudies.length ? 'Batal Semua' : 'Pilih Semua'}
                                        </button>
                                    </div>

                                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xs p-2 space-y-1 bg-slate-50/50">
                                        {sheetStudies.map((s) => {
                                            const isChecked = selectedStudyIdsForTemplate.includes(s.id);
                                            const badge = STUDY_TYPE_BADGE[s.study_type] || STUDY_TYPE_BADGE.reguler;
                                            return (
                                                <label
                                                    key={s.id}
                                                    className="flex items-center justify-between p-1 hover:bg-white rounded-xs text-xs cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => handleToggleStudy(s.id)}
                                                            className="rounded-xs text-[#0b57d0] focus:ring-[#0b57d0] cursor-pointer"
                                                        />
                                                        <span className="truncate text-slate-800 font-medium">{s.name}</span>
                                                    </div>
                                                    <span className={`px-1.5 py-0.2 rounded-xs text-[9px] font-bold border ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleDownloadTemplate}
                                disabled={isDownloadingTemplate || selectedStudyIdsForTemplate.length === 0}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <Download className="w-4 h-4 text-emerald-800" />
                                {isDownloadingTemplate ? 'Mengunduh Template...' : 'Unduh Template Excel (.xlsx)'}
                            </button>
                        </div>

                        {/* Kolom Kanan: Upload File Rekap Nilai */}
                        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xs p-4 flex flex-col justify-between space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-sky-100 text-[#0b57d0] rounded-xs">
                                        <Upload className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                        2. Unggah Berkas Rekap Nilai
                                    </h4>
                                </div>

                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Unggah file Excel yang telah diisi oleh para guru. Sistem akan membaca nilai secara fleksibel (berdasarkan Tag Sistem, Kode Mapel, atau Nama Mapel) dan mencocokkan NIS santri.
                                </p>

                                {/* Drag and Drop Zone */}
                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    className={`border-2 border-dashed rounded-xs p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${
                                        isDragging
                                            ? 'border-[#0b57d0] bg-sky-50/50'
                                            : selectedFile
                                            ? 'border-emerald-300 bg-emerald-50/30'
                                            : 'border-slate-300 bg-slate-50/50 hover:border-slate-400'
                                    }`}
                                    onClick={() => document.getElementById('excelFileInput')?.click()}
                                >
                                    <input
                                        id="excelFileInput"
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />

                                    {selectedFile ? (
                                        <>
                                            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-full">
                                                <FileSpreadsheet className="w-6 h-6" />
                                            </div>
                                            <div className="text-xs font-bold text-slate-900 truncate max-w-sm">
                                                {selectedFile.name}
                                            </div>
                                            <div className="text-[11px] text-slate-500">
                                                {(selectedFile.size / 1024).toFixed(1)} KB • Klik untuk mengganti berkas
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-full">
                                                <Upload className="w-6 h-6" />
                                            </div>
                                            <div className="text-xs font-bold text-slate-800">
                                                Tarik &amp; Letakkan file Excel di sini
                                            </div>
                                            <div className="text-[11px] text-slate-500">
                                                atau klik untuk memilih file dari komputer (.xlsx, .xls)
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Tips & Aturan Pengisian */}
                                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xs text-[11px] text-amber-900 space-y-1">
                                    <div className="font-bold flex items-center gap-1.5">
                                        <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                        Informasi Penting:
                                    </div>
                                    <ul className="list-disc list-inside space-y-0.5 text-amber-800 pl-1">
                                        <li>Kolom nilai yang dibiarkan kosong tidak akan mengubah nilai yang telah ada sebelumnya.</li>
                                        <li>Nilai yang sudah dikunci oleh staf/guru tidak akan ditimpa (kecuali kuncinya dibuka terlebih dahulu).</li>
                                        <li>Anda dapat meninjau pratinjau perubahan nilai sebelum memutuskan untuk menyimpannya.</li>
                                    </ul>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handlePreview}
                                disabled={!selectedFile || isProcessing}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                {isProcessing ? 'Memvalidasi File...' : 'Pratinjau & Validasi Data'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════
                    LANGKAH 2: PRATINJAU & VERIFIKASI SEBELUM SIMPAN (COMMIT)
                   ══════════════════════════════════════════════════════════════════ */}
                {step === 2 && previewData && (
                    <div className="space-y-4">
                        {/* KPI Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xs text-center">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Santri Cocok</div>
                                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                                    {summary.matched_students_count} / {summary.total_students_in_class}
                                </div>
                            </div>
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xs text-center">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Mapel Terdeteksi</div>
                                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                                    {summary.detected_studies_count} Mapel
                                </div>
                            </div>
                            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xs text-center">
                                <div className="text-[10px] font-bold text-emerald-700 uppercase">Nilai Baru</div>
                                <div className="text-base font-extrabold text-emerald-800 mt-0.5">
                                    +{summary.new_entries_count || 0}
                                </div>
                            </div>
                            <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xs text-center">
                                <div className="text-[10px] font-bold text-sky-700 uppercase">Diperbarui</div>
                                <div className="text-base font-extrabold text-sky-800 mt-0.5">
                                    {summary.updated_entries_count || 0}
                                </div>
                            </div>
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xs text-center">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Nilai Tetap</div>
                                <div className="text-base font-extrabold text-slate-600 mt-0.5">
                                    {summary.unchanged_entries_count || 0}
                                </div>
                            </div>
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xs text-center">
                                <div className="text-[10px] font-bold text-amber-800 uppercase flex items-center justify-center gap-1">
                                    <Lock className="w-3 h-3 text-amber-700" />
                                    Terkunci
                                </div>
                                <div className="text-base font-extrabold text-amber-900 mt-0.5">
                                    {summary.locked_skipped_count || 0}
                                </div>
                            </div>
                            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xs text-center">
                                <div className="text-[10px] font-bold text-rose-700 uppercase">&lt; KKM</div>
                                <div className="text-base font-extrabold text-rose-800 mt-0.5">
                                    {summary.below_kkm_count || 0}
                                </div>
                            </div>
                        </div>

                        {/* Alert Peringatan bila ada sel invalid / baris tidak cocok */}
                        {invalidCells.length > 0 && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xs text-xs text-rose-900 space-y-1">
                                <div className="font-bold flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                    Terdapat {invalidCells.length} sel bernilai tidak valid (dilewati):
                                </div>
                                <div className="max-h-20 overflow-y-auto pl-5 space-y-0.5 text-[11px] text-rose-800 list-disc">
                                    {invalidCells.slice(0, 5).map((err, i) => (
                                        <div key={i}>
                                            Baris {err.row}: <strong>{err.student}</strong> — {err.study_name} ({err.raw_value}): {err.reason}
                                        </div>
                                    ))}
                                    {invalidCells.length > 5 && (
                                        <div className="font-semibold italic">...dan {invalidCells.length - 5} sel lainnya.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {unmatchedRows.length > 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xs text-xs text-amber-900 space-y-1">
                                <div className="font-bold flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                                    {unmatchedRows.length} baris pada file Excel tidak cocok dengan data santri rombel ini (dilewati).
                                </div>
                            </div>
                        )}

                        {/* Tabel Matriks Pratinjau Nilai */}
                        <div className="border border-slate-200 rounded-xs overflow-hidden">
                            <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="font-bold text-slate-800">
                                    Tabel Pratinjau Pembacaan Nilai ({studentPreviews.length} Santri):
                                </span>
                                <div className="flex items-center gap-3 text-[10px]">
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Nilai Baru
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Diperbarui
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Terkunci (Tetap)
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> &lt; KKM
                                    </span>
                                </div>
                            </div>

                            <div className="max-h-96 overflow-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="sticky top-0 z-10 bg-emerald-950 text-white uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="py-2.5 px-3 text-center w-10 sticky left-0 bg-emerald-950 border-r border-emerald-800 z-20">
                                                No.
                                            </th>
                                            <th className="py-2.5 px-3 min-w-[190px] sticky left-10 bg-emerald-950 border-r border-emerald-800 z-20">
                                                Nama Santri &amp; NIS
                                            </th>
                                            {detectedStudies.map((sub) => (
                                                <th
                                                    key={sub.study_id}
                                                    className="py-2.5 px-2 text-center min-w-[120px] border-r border-emerald-800"
                                                >
                                                    <div className="font-bold truncate max-w-[150px] mx-auto">{sub.study_name}</div>
                                                    <div className="text-[9px] text-amber-300">
                                                        [{STUDY_TYPE_BADGE[sub.study_type]?.label || 'Mapel'}] KKM {sub.kkm}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {studentPreviews.map((st, idx) => {
                                            return (
                                                <tr
                                                    key={st.student_id}
                                                    className={`hover:bg-slate-50 ${
                                                        !st.matched_row ? 'bg-amber-50/40' : ''
                                                    }`}
                                                >
                                                    <td className="py-2 px-3 text-center font-semibold text-slate-500 sticky left-0 bg-white border-r border-slate-200 z-10">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="py-2 px-3 sticky left-10 bg-white border-r border-slate-200 z-10">
                                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                            <span className="truncate max-w-[160px]">{st.name}</span>
                                                            {!st.matched_row && (
                                                                <span className="text-[9px] text-amber-700 bg-amber-100 px-1 rounded">
                                                                    Tidak ada di Excel
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-slate-500">
                                                            NIS: {st.nis}
                                                        </div>
                                                    </td>
                                                    {detectedStudies.map((sub) => {
                                                        const cell = st.cells[sub.study_id] || { status: 'empty' };
                                                        const isNew = cell.status === 'new';
                                                        const isUpdated = cell.status === 'updated';
                                                        const isLocked = cell.status === 'locked';
                                                        const isUnchanged = cell.status === 'unchanged';
                                                        const isBelow = cell.new_score !== null && cell.is_pass === false;

                                                        let cellStyle = 'bg-slate-50 text-slate-400';
                                                        let badgeText = '';

                                                        if (isNew) {
                                                            cellStyle = isBelow
                                                                ? 'bg-rose-50 text-rose-900 border border-rose-300 font-bold'
                                                                : 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold';
                                                            badgeText = 'Baru';
                                                        } else if (isUpdated) {
                                                            cellStyle = isBelow
                                                                ? 'bg-rose-50 text-rose-900 border border-rose-300 font-bold'
                                                                : 'bg-sky-50 text-sky-900 border border-sky-300 font-bold';
                                                            badgeText = 'Update';
                                                        } else if (isLocked) {
                                                            cellStyle = 'bg-amber-50/80 text-amber-900 border border-amber-200';
                                                            badgeText = 'Terkunci';
                                                        } else if (isUnchanged) {
                                                            cellStyle = 'bg-white text-slate-700';
                                                        }

                                                        return (
                                                            <td
                                                                key={sub.study_id}
                                                                className="py-1.5 px-2 text-center border-r border-slate-100"
                                                            >
                                                                {cell.new_score !== null ? (
                                                                    <div className={`p-1 rounded-xs ${cellStyle}`}>
                                                                        <div className="font-extrabold text-xs">
                                                                            {cell.new_score}
                                                                        </div>
                                                                        {isUpdated && cell.old_score !== null && (
                                                                            <div className="text-[9px] text-slate-500 line-through">
                                                                                Awal: {cell.old_score}
                                                                            </div>
                                                                        )}
                                                                        {badgeText && (
                                                                            <div className="text-[8px] font-bold uppercase tracking-wider mt-0.5">
                                                                                {badgeText}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : cell.old_score !== null ? (
                                                                    <div className="p-1 text-slate-400 text-xs">
                                                                        {cell.old_score} (tetap)
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300">-</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
