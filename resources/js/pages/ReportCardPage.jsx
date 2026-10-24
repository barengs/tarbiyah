import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
    useGetReportsQuery,
    useGenerateReportsMutation,
    useUpdateReportNotesMutation,
} from '../store/slices/reportApi';
import { useGetClassGroupsQuery } from '../store/slices/classGroupApi';
import {
    FileSpreadsheet,
    Printer,
    Download,
    MessageSquare,
    Calculator,
    Award,
    CheckCircle2,
    Calendar,
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function ReportCardPage() {
    const academicContext = useSelector((state) => state.academicContext);
    const { selectedQuarterName, selectedYearName } = academicContext;

    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [selectedTriwulan, setSelectedTriwulan] = useState('triwulan_4');

    // Sinkronkan default dengan pilihan navbar jika ada
    useEffect(() => {
        if (selectedQuarterName) {
            if (selectedQuarterName.includes('I (')) setSelectedTriwulan('triwulan_1');
            else if (selectedQuarterName.includes('II (')) setSelectedTriwulan('triwulan_2');
            else if (selectedQuarterName.includes('III (')) setSelectedTriwulan('triwulan_3');
            else if (selectedQuarterName.includes('IV (')) setSelectedTriwulan('triwulan_4');
        }
    }, [selectedQuarterName]);

    const { data: groupsData } = useGetClassGroupsQuery();
    const groups = groupsData?.data || [];
    const currentGroup = groups.find((g) => g.id === Number(selectedGroupId)) || groups[0];
    const effectiveGroupId = selectedGroupId || currentGroup?.id;

    const { data: reportsData, isLoading: isLoadingReports } = useGetReportsQuery(
        effectiveGroupId
            ? { class_group_id: effectiveGroupId, semester: selectedTriwulan }
            : undefined,
        { skip: !effectiveGroupId }
    );
    const reports = reportsData?.data || [];

    const [generateReports, { isLoading: isGenerating }] = useGenerateReportsMutation();
    const [updateReportNotes, { isLoading: isUpdatingNotes }] = useUpdateReportNotesMutation();

    // Notes modal
    const [editingReport, setEditingReport] = useState(null);
    const [homeroomNotes, setHomeroomNotes] = useState('');
    const [tahfidzNotes, setTahfidzNotes] = useState('');

    const handleOpenNotes = (report) => {
        setEditingReport(report);
        setHomeroomNotes(report.homeroom_notes || '');
        setTahfidzNotes(report.tahfidz_notes || '');
    };

    const handleSaveNotes = async () => {
        if (!editingReport) return;
        try {
            await updateReportNotes({
                id: editingReport.id,
                homeroom_notes: homeroomNotes,
                tahfidz_notes: tahfidzNotes,
            }).unwrap();
            toast.success('Catatan wali kelas dan tahfidz berhasil disimpan!');
            setEditingReport(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan catatan');
        }
    };

    const handleCalculateReports = async () => {
        if (!effectiveGroupId) return;
        try {
            await generateReports({
                class_group_id: effectiveGroupId,
                semester: selectedTriwulan,
            }).unwrap();
            const triwulanLabel = selectedTriwulan.replace('_', ' ').toUpperCase();
            toast.success(`Rapor digital ${triwulanLabel} berhasil dikalkulasi!`);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghitung buku rapor');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Modul Rapor */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <FileSpreadsheet className="w-6 h-6 text-[#093c30]" />
                        Buku Rapor Digital Santri
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Kalkulasi nilai imtihan, rangkuman hafalan tahfidz, dan cetak lembar buku rapor resmi santri.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Triwulan Switcher */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-md">
                        <Calendar className="w-4 h-4 text-emerald-700" />
                        <select
                            value={selectedTriwulan}
                            onChange={(e) => setSelectedTriwulan(e.target.value)}
                            className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
                        >
                            <option value="triwulan_1">Triwulan I (Muharram - Rabi'ul Awwal)</option>
                            <option value="triwulan_2">Triwulan II (Rabi'ul Akhir - Jumadil Akhir)</option>
                            <option value="triwulan_3">Triwulan III (Rajab - Ramadhan)</option>
                            <option value="triwulan_4">Triwulan IV (Syawal - Dzulhijjah)</option>
                        </select>
                    </div>

                    {/* Class Group Selector */}
                    <select
                        value={effectiveGroupId || ''}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-md bg-white shadow-2xs focus:ring-2 focus:ring-emerald-500"
                    >
                        {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={handleCalculateReports}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#093c30] hover:bg-emerald-900 text-white rounded-md text-xs font-bold transition shadow-2xs"
                    >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>{isGenerating ? 'Menghitung...' : 'Kalkulasi Rapor'}</span>
                    </button>
                </div>
            </div>

            {/* Banner Konteks Periode */}
            <div className="p-3 bg-white rounded-lg border border-slate-200/90 text-xs text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                        {currentGroup?.name || 'Rombel Terpilih'}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>Tahun Akademik: <strong>{selectedYearName || '1446-1447'}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span className="text-emerald-700 font-bold uppercase">
                        {selectedTriwulan.replace('_', ' ')}
                    </span>
                </div>
                <span className="text-[11px] text-slate-400">
                    Sistem Rapor Triwulan Pesantren
                </span>
            </div>

            {/* List / Table Buku Rapor */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                    <h2 className="text-xs sm:text-sm font-extrabold text-slate-800">
                        Daftar Rapor Santri Terdaftar
                    </h2>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        {reports.length} Santri
                    </span>
                </div>

                {isLoadingReports ? (
                    <div className="p-12 text-center text-slate-400 text-sm">
                        Memuat data rapor digital santri...
                    </div>
                ) : reports.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm space-y-2">
                        <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
                        <p>Belum ada kalkulasi buku rapor pada periode triwulan ini.</p>
                        <p className="text-xs text-slate-400">
                            Silakan klik tombol <strong>&ldquo;Kalkulasi Rapor&rdquo;</strong> di atas untuk memproses data nilai.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Santri</th>
                                    <th className="py-3 px-3">Rerata Nilai</th>
                                    <th className="py-3 px-3">Peringkat</th>
                                    <th className="py-3 px-3">Tahfidz</th>
                                    <th className="py-3 px-3">Kehadiran (H / I / S / A)</th>
                                    <th className="py-3 px-3">Catatan</th>
                                    <th className="py-3 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3 px-4">
                                            <p className="font-bold text-slate-900 text-xs sm:text-sm">
                                                {report.student?.name || 'Santri'}
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                NIS: {report.student?.nis || '—'}
                                            </p>
                                        </td>
                                        <td className="py-3 px-3 font-extrabold text-slate-900 text-sm">
                                            {Number(report.average_score || 0).toFixed(1)}
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                                                <Award className="w-3 h-3 text-emerald-600" />
                                                Juara {report.rank || '—'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 font-medium">
                                            {report.tahfidz_progress || 'Mutqin'}
                                        </td>
                                        <td className="py-3 px-3 text-[11px] font-mono">
                                            <span className="text-emerald-700 font-bold">{report.attendance_h || 0}</span> /{' '}
                                            <span className="text-sky-700">{report.attendance_i || 0}</span> /{' '}
                                            <span className="text-amber-700">{report.attendance_s || 0}</span> /{' '}
                                            <span className="text-rose-700 font-bold">{report.attendance_a || 0}</span>
                                        </td>
                                        <td className="py-3 px-3 max-w-[200px] truncate text-[11px] text-slate-500">
                                            {report.homeroom_notes || '—'}
                                        </td>
                                        <td className="py-3 px-4 text-right space-x-1.5 shrink-0">
                                            <button
                                                onClick={() => handleOpenNotes(report)}
                                                className="p-1.5 text-slate-600 hover:text-[#093c30] hover:bg-slate-100 rounded"
                                                title="Tulis Catatan Wali Kelas"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => toast.info('Fitur cetak PDF rapor sedang disiapkan...')}
                                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded"
                                                title="Cetak Lembar Rapor PDF"
                                            >
                                                <Printer className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Catatan Wali Kelas */}
            {editingReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-sm">
                                    Catatan Wali Kelas &amp; Tahfidz
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Santri: <strong>{editingReport.student?.name}</strong>
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingReport(null)}
                                className="text-slate-400 hover:text-slate-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Catatan Wali Kelas &amp; Perkembangan Akhlaq
                                </label>
                                <textarea
                                    rows={3}
                                    value={homeroomNotes}
                                    onChange={(e) => setHomeroomNotes(e.target.value)}
                                    placeholder="Tuliskan catatan apresiasi, motivasi, dan evaluasi kepribadian santri..."
                                    className="w-full text-xs p-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#093c30]/20 focus:border-[#093c30]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Catatan Progres Tahfidz Al-Qur'an
                                </label>
                                <textarea
                                    rows={2}
                                    value={tahfidzNotes}
                                    onChange={(e) => setTahfidzNotes(e.target.value)}
                                    placeholder="Target hafalan mutqin, kelancaran tajwid, dan adab halaqah..."
                                    className="w-full text-xs p-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#093c30]/20 focus:border-[#093c30]"
                                />
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button
                                    onClick={() => setEditingReport(null)}
                                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={isUpdatingNotes}
                                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#093c30] hover:bg-emerald-900 rounded-md shadow-2xs"
                                >
                                    {isUpdatingNotes ? 'Menyimpan...' : 'Simpan Catatan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
