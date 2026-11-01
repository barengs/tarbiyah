import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
    useGetGradingPeriodQuery,
    useUpdateGradingPeriodMutation,
} from '../../store/slices/assessmentApi';
import {
    CalendarCheck2,
    Calendar,
    Clock,
    Lock,
    Unlock,
    Save,
    CheckCircle2,
    AlertTriangle,
    Info,
    Edit3,
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { toast } from 'react-toastify';

export default function GradingPeriodPage() {
    const { selectedYearId, selectedQuarterId } = useSelector((state) => state.academicContext || {});
    const { data: periodData, isLoading, refetch } = useGetGradingPeriodQuery({
        ...(selectedYearId && { academic_year_id: selectedYearId }),
        ...(selectedQuarterId && { academic_quarter_id: selectedQuarterId }),
    });
    const period = periodData?.data || null;

    const activeYear = period?.active_academic_year;
    const activeQuarter = period?.active_quarter;
    const quarters = period?.quarters_archive || [];
    const isOpen = period?.is_open ?? true;

    // State Edit Modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [targetQuarter, setTargetQuarter] = useState(null);
    const [formData, setFormData] = useState({
        grading_start_date: '',
        grading_end_date: '',
    });

    const [updateGradingPeriod, { isLoading: isUpdating }] = useUpdateGradingPeriodMutation();

    const openEditModal = (quarter) => {
        setTargetQuarter(quarter);
        setFormData({
            grading_start_date: quarter.grading_start_date ? quarter.grading_start_date.substring(0, 10) : '',
            grading_end_date: quarter.grading_end_date ? quarter.grading_end_date.substring(0, 10) : '',
        });
        setEditModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!targetQuarter?.id) return;

        try {
            await updateGradingPeriod({
                academic_quarter_id: targetQuarter.id,
                grading_start_date: formData.grading_start_date,
                grading_end_date: formData.grading_end_date,
            }).unwrap();

            toast.success(`Masa input nilai untuk ${targetQuarter.name} berhasil diperbarui!`);
            setEditModalOpen(false);
            refetch();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan pengaturan masa input nilai');
        }
    };

    const handleQuickSetDays = (days) => {
        const today = new Date();
        const future = new Date();
        future.setDate(today.getDate() + days);

        const formatDate = (d) => d.toISOString().split('T')[0];

        setFormData({
            grading_start_date: formatDate(today),
            grading_end_date: formatDate(future),
        });
    };

    return (
        <div className="space-y-5">
            {/* Header Halaman */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="p-2 bg-emerald-50 text-emerald-800 rounded-md">
                            <CalendarCheck2 className="w-5 h-5" />
                        </span>
                        Pengaturan Masa Penginputan Nilai
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Atur jadwal dan batas waktu penginputan nilai akhir triwulan oleh guru/pendidik. Form nilai otomatis terkunci setelah batas akhir terlewati.
                    </p>
                </div>
            </div>

            {/* Status Triwulan Aktif Card */}
            {isLoading ? (
                <div className="p-10 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-xs">
                    Memuat data periode...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Info Card Triwulan Aktif */}
                    <div className="md:col-span-2 p-5 bg-white border border-slate-200 rounded-xs shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Periode Berjalan Saat Ini
                            </span>
                            <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs text-xs font-bold border ${
                                    isOpen
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}
                            >
                                {isOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                {isOpen ? 'Masa Input Terbuka' : 'Masa Input Ditutup'}
                            </span>
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                {activeQuarter?.name || 'Triwulan Aktif'}
                            </h2>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Tahun Akademik {activeYear?.year || '-'} H • Kalender Triwulan Pesantren
                            </p>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-slate-500 font-medium">Tanggal Mulai Input:</span>
                                <div className="font-bold text-slate-900 text-sm mt-0.5">
                                    {period?.grading_start_date || 'Belum diatur'}
                                </div>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">Batas Akhir Input:</span>
                                <div className="font-bold text-slate-900 text-sm mt-0.5">
                                    {period?.grading_end_date || 'Belum diatur'}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-1">
                            <button
                                type="button"
                                onClick={() => activeQuarter && openEditModal(activeQuarter)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-xs shadow-2xs cursor-pointer"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                Ubah Jadwal Triwulan Aktif
                            </button>
                        </div>
                    </div>

                    {/* Panduan Ringkas */}
                    <div className="p-5 bg-emerald-50/60 border border-emerald-200/80 rounded-xs space-y-2.5 text-xs text-emerald-950">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                            <Info className="w-4 h-4 shrink-0" />
                            Ketentuan Sistem Masa Nilai
                        </div>
                        <ul className="space-y-1.5 text-[11px] text-emerald-850 list-disc list-inside">
                            <li>
                                <strong>Masa Terbuka:</strong> Pendidik dapat mengisi dan mengedit nilai akhir triwulan pada rombel masing-masing.
                            </li>
                            <li>
                                <strong>Masa Ditutup:</strong> Setelah tanggal batas akhir terlewati, lembar nilai terkunci dalam mode baca saja (Read-Only).
                            </li>
                            <li>
                                <strong>Perpanjangan:</strong> Admin dapat sewaktu-waktu memperpanjang tanggal batas akhir jika terdapat nilai susulan.
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Tabel Riwayat Semua Triwulan */}
            <div className="bg-white border border-slate-200 rounded-xs shadow-2xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <h2 className="text-sm font-bold text-slate-900">
                        Daftar Jadwal Masa Input Nilai per Triwulan
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Kelola tanggal penginputan nilai untuk seluruh triwulan pada tahun akademik berjalan.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr className="bg-emerald-950 text-white uppercase text-[10px] tracking-wider">
                                <th className="py-2.5 px-3 text-center w-12">No.</th>
                                <th className="py-2.5 px-3">Nama Triwulan</th>
                                <th className="py-2.5 px-3 text-center">Status Periode</th>
                                <th className="py-2.5 px-3 text-center">Masa Penginputan Nilai</th>
                                <th className="py-2.5 px-3 text-center">Status Input</th>
                                <th className="py-2.5 px-3 text-center w-28">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {quarters.map((q, idx) => {
                                const isCurrent = q.id === activeQuarter?.id;
                                const hasDates = q.grading_start_date && q.grading_end_date;
                                const todayStr = new Date().toISOString().split('T')[0];
                                const isItemOpen = hasDates && todayStr >= q.grading_start_date.substring(0, 10) && todayStr <= q.grading_end_date.substring(0, 10);

                                return (
                                    <tr key={q.id} className={isCurrent ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}>
                                        <td className="py-3 px-3 text-center font-semibold text-slate-500">
                                            {idx + 1}
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                <span>{q.name}</span>
                                                {isCurrent && (
                                                    <span className="px-1.5 py-0.2 rounded-xs text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                        Sedang Berjalan
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold ${
                                                q.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {q.active ? 'Aktif' : 'Tidak Aktif'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-center font-medium">
                                            {hasDates ? (
                                                <span className="font-mono text-slate-800">
                                                    {q.grading_start_date.substring(0, 10)} s/d {q.grading_end_date.substring(0, 10)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic">Belum diatur</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {isItemOpen ? (
                                                <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    Terbuka
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                    Terkunci / Selesai
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(q)}
                                                className="px-3 py-1 text-xs font-semibold text-emerald-800 bg-white border border-emerald-600 rounded-xs hover:bg-emerald-50 cursor-pointer"
                                            >
                                                Ubah Jadwal
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Edit Rentang Tanggal Masa Nilai */}
            <Modal
                open={editModalOpen}
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title={`Atur Masa Input Nilai — ${targetQuarter?.name || ''}`}
            >
                {targetQuarter && (
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs text-xs space-y-1">
                            <div className="font-bold text-slate-800">Bantuan Pengaturan Cepat:</div>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                <button
                                    type="button"
                                    onClick={() => handleQuickSetDays(14)}
                                    className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-300 rounded-xs hover:bg-slate-100 cursor-pointer"
                                >
                                    Mulai Hari Ini s/d 14 Hari
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickSetDays(30)}
                                    className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-300 rounded-xs hover:bg-slate-100 cursor-pointer"
                                >
                                    Mulai Hari Ini s/d 30 Hari
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Tanggal Mulai Penginputan
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.grading_start_date}
                                    onChange={(e) =>
                                        setFormData((p) => ({ ...p, grading_start_date: e.target.value }))
                                    }
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xs focus:outline-none focus:border-emerald-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Batas Akhir Penginputan
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.grading_end_date}
                                    onChange={(e) =>
                                        setFormData((p) => ({ ...p, grading_end_date: e.target.value }))
                                    }
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xs focus:outline-none focus:border-emerald-700"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setEditModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-xs hover:bg-slate-50 cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isUpdating}
                                className="px-4 py-2 text-xs font-bold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-xs cursor-pointer disabled:opacity-50"
                            >
                                {isUpdating ? 'Menyimpan...' : 'Simpan Pengaturan'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
