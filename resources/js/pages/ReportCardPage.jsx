import React, { useState } from 'react';
import { 
    useGetReportsQuery, 
    useGenerateReportsMutation, 
    useUpdateReportNotesMutation 
} from '../store/slices/reportApi';
import { useGetClassGroupsQuery } from '../store/slices/classGroupApi';
import Modal from '../components/ui/Modal';
import { GraduationCap, Printer, RefreshCw, FileText, CheckCircle2, Award, Edit3 } from 'lucide-react';
import { toast } from 'react-toastify';

export default function ReportCardPage() {
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('ganjil');

    const { data: groupsData } = useGetClassGroupsQuery();
    const groups = groupsData?.data || [];
    const currentGroup = groups.find(g => g.id === Number(selectedGroupId)) || groups[0];
    const effectiveGroupId = selectedGroupId || currentGroup?.id;

    const { data: reportsData, isLoading: isLoadingReports } = useGetReportsQuery(
        effectiveGroupId ? { class_group_id: effectiveGroupId, semester: selectedSemester } : undefined,
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

    const handleSaveNotes = async (e) => {
        e.preventDefault();
        try {
            await updateReportNotes({
                id: editingReport.id,
                homeroom_notes: homeroomNotes,
                tahfidz_notes: tahfidzNotes,
            }).unwrap();
            toast.success('Catatan rapor berhasil diperbarui');
            setEditingReport(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan catatan');
        }
    };

    const handleGenerate = async () => {
        if (!effectiveGroupId) return;
        try {
            await generateReports({
                class_group_id: effectiveGroupId,
                semester: selectedSemester,
            }).unwrap();
            toast.success(`Rapor digital semester ${selectedSemester} berhasil dikalkulasi!`);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal meng-generate rapor');
        }
    };

    const handlePrintPdf = (reportId) => {
        window.open(`/api/main/reports/${reportId}/pdf`, '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Buku Rapor Digital Siswa</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Kalkulasi nilai akhir, rangkuman hafalan tahfidz, dan cetak lembar buku rapor resmi format PDF.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Semester Switcher */}
                    <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        className="px-3 py-2 text-sm font-semibold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="ganjil">Semester Ganjil</option>
                        <option value="genap">Semester Genap</option>
                    </select>

                    {/* Class Selector */}
                    <select
                        value={effectiveGroupId || ''}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="px-3.5 py-2 text-sm font-semibold border border-slate-300 rounded-xl bg-white shadow-xs focus:ring-2 focus:ring-emerald-500"
                    >
                        {groups.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold text-sm rounded-xl hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                        {isGenerating ? 'Menghitung...' : 'Kalkulasi Rapor'}
                    </button>
                </div>
            </div>

            {/* List Rapor Siswa */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Daftar Rapor: {currentGroup?.name || 'Rombel'} — {selectedSemester.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {reports.length} Santri Terdaftar
                    </span>
                </div>

                <div className="divide-y divide-slate-100">
                    {reports.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <GraduationCap className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p className="text-sm font-medium">Belum ada rapor yang di-generate untuk kelas ini</p>
                            <p className="text-xs text-slate-400 mt-1">Klik tombol "Kalkulasi Rapor" di atas untuk memproses nilai santri</p>
                        </div>
                    ) : (
                        reports.map((r) => (
                            <div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                                <div className="flex items-center gap-3">
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                        r.rank === 1 ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300' :
                                        r.rank <= 3 ? 'bg-emerald-100 text-emerald-800' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                        {r.rank || '-'}
                                    </span>
                                    <div>
                                        <h3 className="font-bold text-sm text-slate-900">{r.student?.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                            <span>NIS: {r.student?.nis}</span>
                                            <span>•</span>
                                            <span>{r.student?.is_mukim ? 'Santri Mukim' : 'Siswa Luar'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    {/* Score recap */}
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400">Rata-Rata Nilai</p>
                                        <p className="text-base font-bold text-slate-900">{r.average_score || 0}</p>
                                    </div>

                                    {/* Attendance mini recap */}
                                    <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                        Hadir: <strong>{r.attendance_summary?.hadir || 0}</strong> • Sakit: <strong>{r.attendance_summary?.sakit || 0}</strong> • Izin: <strong>{r.attendance_summary?.izin || 0}</strong>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleOpenNotes(r)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-xs"
                                            title="Beri Catatan Wali Kelas / Tahfidz"
                                        >
                                            <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Catatan
                                        </button>
                                        <button
                                            onClick={() => handlePrintPdf(r.id)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition shadow-xs"
                                            title="Cetak PDF Rapor Resmi"
                                        >
                                            <Printer className="w-3.5 h-3.5 text-emerald-400" /> Cetak PDF
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal Input Catatan Rapor */}
            <Modal
                open={!!editingReport}
                title={`Catatan Rapor: ${editingReport?.student?.name || ''}`}
                onClose={() => setEditingReport(null)}
            >
                <form onSubmit={handleSaveNotes} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Capaian Tahfidz Al-Qur'an (Hafalan)
                        </label>
                        <textarea
                            rows={3}
                            value={tahfidzNotes}
                            onChange={(e) => setTahfidzNotes(e.target.value)}
                            placeholder="Contoh: Telah menyelesaikan setoran Juz 30 predikat Jayyid Jiddan, lancar dalam tajwid dan makharijul huruf..."
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Catatan & Motivasi Wali Kelas
                        </label>
                        <textarea
                            rows={3}
                            value={homeroomNotes}
                            onChange={(e) => setHomeroomNotes(e.target.value)}
                            placeholder="Contoh: Ananda memiliki akhlak terpuji dan kedisiplinan belajar yang tinggi. Pertahankan prestasimu..."
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setEditingReport(null)}
                            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isUpdatingNotes}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                        >
                            Simpan Catatan
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
