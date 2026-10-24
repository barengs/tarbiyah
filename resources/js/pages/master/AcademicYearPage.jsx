import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
    Calendar,
    CalendarDays,
    Plus,
    CheckCircle2,
    Clock,
    Edit2,
    Trash2,
    Layers,
    AlertCircle,
    ChevronRight,
    Sparkles,
} from 'lucide-react';
import {
    useGetAcademicYearsQuery,
    useCreateAcademicYearMutation,
    useUpdateAcademicYearMutation,
    useSetActiveAcademicYearMutation,
    useDeleteAcademicYearMutation,
    useCreateAcademicQuarterMutation,
    useUpdateAcademicQuarterMutation,
    useSetActiveAcademicQuarterMutation,
    useDeleteAcademicQuarterMutation,
} from '../../store/slices/academicApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/atoms/Card';
import Badge from '../../components/atoms/Badge';
import Button from '../../components/atoms/Button';

export default function AcademicYearPage() {
    const { data: yearsResponse, isLoading } = useGetAcademicYearsQuery();
    const [createYear, { isLoading: isCreatingYear }] = useCreateAcademicYearMutation();
    const [updateYear, { isLoading: isUpdatingYear }] = useUpdateAcademicYearMutation();
    const [setActiveYear] = useSetActiveAcademicYearMutation();
    const [deleteYear] = useDeleteAcademicYearMutation();

    const [createQuarter, { isLoading: isCreatingQuarter }] = useCreateAcademicQuarterMutation();
    const [updateQuarter] = useUpdateAcademicQuarterMutation();
    const [setActiveQuarter] = useSetActiveAcademicQuarterMutation();
    const [deleteQuarter] = useDeleteAcademicQuarterMutation();

    // Modal state
    const [showYearModal, setShowYearModal] = useState(false);
    const [editingYear, setEditingYear] = useState(null);
    const [yearForm, setYearForm] = useState({
        year: '',
        start_date: '',
        end_date: '',
        description: '',
        active: false,
    });

    const [showQuarterModal, setShowQuarterModal] = useState(false);
    const [selectedYearForQuarter, setSelectedYearForQuarter] = useState(null);
    const [editingQuarter, setEditingQuarter] = useState(null);
    const [quarterForm, setQuarterForm] = useState({
        name: '',
        start_date: '',
        end_date: '',
        active: false,
    });

    const years = yearsResponse?.data || [];
    const activeYear = years.find((y) => y.active);
    const activeQuarter = activeYear?.quarters?.find((q) => q.active);

    // Handler Tahun Akademik
    const handleOpenCreateYear = () => {
        setEditingYear(null);
        setYearForm({
            year: '',
            start_date: '2026-07-08',
            end_date: '2027-06-26',
            description: 'Kalender Akademik Pesantren Berbasis Triwulan',
            active: years.length === 0,
        });
        setShowYearModal(true);
    };

    const handleOpenEditYear = (year) => {
        setEditingYear(year);
        setYearForm({
            year: year.year,
            start_date: year.start_date ? year.start_date.split('T')[0] : '',
            end_date: year.end_date ? year.end_date.split('T')[0] : '',
            description: year.description || '',
            active: Boolean(year.active),
        });
        setShowYearModal(true);
    };

    const handleSubmitYear = async (e) => {
        e.preventDefault();
        if (!yearForm.year) {
            toast.warning('Tahun akademik wajib diisi (contoh: 1446-1447)');
            return;
        }

        try {
            if (editingYear) {
                await updateYear({ id: editingYear.id, ...yearForm }).unwrap();
                toast.success('Tahun akademik berhasil diperbarui!');
            } else {
                await createYear(yearForm).unwrap();
                toast.success('Tahun akademik dan 4 periode Triwulan berhasil dibuat otomatis!');
            }
            setShowYearModal(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan tahun akademik');
        }
    };

    const handleSetActiveYear = async (yearId, yearLabel) => {
        try {
            await setActiveYear(yearId).unwrap();
            toast.success(`Tahun akademik ${yearLabel} berhasil diaktifkan!`);
        } catch (err) {
            toast.error('Gagal mengaktifkan tahun akademik');
        }
    };

    const handleDeleteYear = async (yearId, yearLabel) => {
        if (!confirm(`Hapus tahun akademik ${yearLabel} beserta seluruh periode triwulannya?`)) return;
        try {
            await deleteYear(yearId).unwrap();
            toast.success('Tahun akademik berhasil dihapus');
        } catch (err) {
            toast.error('Gagal menghapus tahun akademik');
        }
    };

    // Handler Periode Triwulan
    const handleOpenCreateQuarter = (year) => {
        setSelectedYearForQuarter(year);
        setEditingQuarter(null);
        setQuarterForm({
            name: '',
            start_date: year.start_date ? year.start_date.split('T')[0] : '',
            end_date: year.end_date ? year.end_date.split('T')[0] : '',
            active: false,
        });
        setShowQuarterModal(true);
    };

    const handleOpenEditQuarter = (quarter, year) => {
        setSelectedYearForQuarter(year);
        setEditingQuarter(quarter);
        setQuarterForm({
            name: quarter.name,
            start_date: quarter.start_date ? quarter.start_date.split('T')[0] : '',
            end_date: quarter.end_date ? quarter.end_date.split('T')[0] : '',
            active: Boolean(quarter.active),
        });
        setShowQuarterModal(true);
    };

    const handleSubmitQuarter = async (e) => {
        e.preventDefault();
        if (!quarterForm.name) {
            toast.warning('Nama periode triwulan wajib diisi');
            return;
        }

        try {
            if (editingQuarter) {
                await updateQuarter({
                    id: editingQuarter.id,
                    academic_year_id: selectedYearForQuarter.id,
                    ...quarterForm,
                }).unwrap();
                toast.success('Periode triwulan berhasil diperbarui!');
            } else {
                await createQuarter({
                    academic_year_id: selectedYearForQuarter.id,
                    ...quarterForm,
                }).unwrap();
                toast.success('Periode triwulan baru berhasil ditambahkan!');
            }
            setShowQuarterModal(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan periode triwulan');
        }
    };

    const handleSetActiveQuarter = async (quarterId, quarterName, yearName) => {
        try {
            await setActiveQuarter(quarterId).unwrap();
            toast.success(`Periode aktif ditetapkan: Tahun Akademik ${yearName} ${quarterName}!`);
        } catch (err) {
            toast.error('Gagal mengaktifkan periode triwulan');
        }
    };

    const handleDeleteQuarter = async (quarterId, quarterName) => {
        if (!confirm(`Hapus periode ${quarterName}?`)) return;
        try {
            await deleteQuarter(quarterId).unwrap();
            toast.success('Periode triwulan berhasil dihapus');
        } catch (err) {
            toast.error('Gagal menghapus periode triwulan');
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. HEADER SECTION */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <Calendar className="w-6 h-6 text-[#093c30]" />
                        Data Master Tahun Akademik &amp; Periode Triwulan
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                        Pengelolaan hierarki kalender pesantren: Tahun Akademik Hijriah dan Sub-Akademik Periode Triwulan.
                    </p>
                </div>

                <Button
                    variant="primary"
                    icon={Plus}
                    onClick={handleOpenCreateYear}
                    className="self-start sm:self-auto shrink-0 shadow-sm"
                >
                    + Tambah Tahun Akademik
                </Button>
            </div>

            {/* 2. BANNER PERIODE AKTIF SAAT INI */}
            <Card className="p-5 bg-gradient-to-r from-emerald-50 via-emerald-50/60 to-white border-emerald-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <span className="p-2.5 rounded-lg bg-[#093c30] text-white shrink-0 mt-0.5">
                            <CalendarDays className="w-5 h-5" />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                                    Periode Akademik Aktif Pesantren
                                </span>
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            </div>
                            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
                                {activeYear
                                    ? `Tahun Akademik ${activeYear.year} ${activeQuarter?.name || 'Triwulan IV'}`
                                    : 'Belum ada periode yang aktif'}
                            </h2>
                            <p className="text-xs text-slate-600 mt-1">
                                Digunakan sebagai acuan kalender KBM, input nilai, presensi jamaah, dan rapor santri.
                            </p>
                        </div>
                    </div>

                    {activeYear && (
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <Badge variant="darkGreen" size="sm" dot>
                                Sistem Triwulan Aktif
                            </Badge>
                        </div>
                    )}
                </div>
            </Card>

            {/* 3. DAFTAR TAHUN AKADEMIK & SUB-AKADEMIK TRIWULAN */}
            {isLoading ? (
                <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    Memuat data tahun akademik dan periode triwulan...
                </div>
            ) : years.length === 0 ? (
                <Card className="p-12 text-center text-slate-400 text-sm space-y-3">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                    <p>Belum ada data tahun akademik. Silakan klik tombol Tambah Tahun Akademik.</p>
                </Card>
            ) : (
                <div className="space-y-5">
                    {years.map((year) => {
                        const isThisYearActive = Boolean(year.active);
                        const quarters = year.quarters || [];

                        return (
                            <Card
                                key={year.id}
                                className={`border transition-all ${
                                    isThisYearActive
                                        ? 'border-emerald-300 ring-1 ring-emerald-200/80 shadow-sm'
                                        : 'border-slate-200/90'
                                }`}
                            >
                                {/* HEADER TAHUN AKADEMIK */}
                                <CardHeader className="bg-slate-50/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs">
                                            <Layers className="w-4 h-4 text-emerald-800" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2.5">
                                                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                                                    Tahun Akademik {year.year}
                                                </h3>
                                                {isThisYearActive ? (
                                                    <Badge variant="emerald" size="xs" dot>
                                                        Tahun Ajaran Aktif
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="slate" size="xs">
                                                        Arsip
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Rentang: {year.start_date ? year.start_date.split('T')[0] : '—'} s/d{' '}
                                                {year.end_date ? year.end_date.split('T')[0] : '—'} • {quarters.length} Periode Triwulan
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons Tahun Akademik */}
                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        {!isThisYearActive && (
                                            <button
                                                type="button"
                                                onClick={() => handleSetActiveYear(year.id, year.year)}
                                                className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 transition-colors shadow-2xs"
                                                title="Jadikan Tahun Akademik Ini Aktif"
                                            >
                                                Aktifkan Tahun
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenCreateQuarter(year)}
                                            className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-[#093c30] transition-colors"
                                            title="Tambah Sub-Triwulan Baru"
                                        >
                                            + Tambah Triwulan
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditYear(year)}
                                            className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200"
                                            title="Edit Tahun Akademik"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteYear(year.id, year.year)}
                                            className="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                            title="Hapus Tahun Akademik"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </CardHeader>

                                {/* SUB-AKADEMIK: DAFTAR PERIODE TRIWULAN */}
                                <CardContent className="p-4 sm:p-5">
                                    <div className="mb-2.5 flex items-center justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                                        <span>Sub-Akademik Periode Pendidikan Triwulan</span>
                                        <span>Status &amp; Aksi</span>
                                    </div>

                                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                                        {quarters.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-slate-400">
                                                Belum ada periode triwulan di tahun ini. Klik &ldquo;Tambah Triwulan&rdquo; untuk menyusunnya.
                                            </div>
                                        ) : (
                                            quarters.map((q) => {
                                                const isQuarterActive = Boolean(q.active && isThisYearActive);

                                                return (
                                                    <div
                                                        key={q.id}
                                                        className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                                                            isQuarterActive
                                                                ? 'bg-emerald-50/60 font-medium'
                                                                : 'hover:bg-slate-50/70 bg-white'
                                                        }`}
                                                    >
                                                        {/* Info Triwulan */}
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`w-2 h-2 rounded-full shrink-0 ${
                                                                    isQuarterActive ? 'bg-emerald-600 ring-4 ring-emerald-100' : 'bg-slate-300'
                                                                }`}
                                                            />
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-xs sm:text-sm font-bold text-slate-800">
                                                                        {q.name}
                                                                    </p>
                                                                    {isQuarterActive && (
                                                                        <Badge variant="emerald" size="xs">
                                                                            Sedang Berjalan
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                                    Rentang: {q.start_date ? q.start_date.split('T')[0] : '—'} s/d{' '}
                                                                    {q.end_date ? q.end_date.split('T')[0] : '—'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Action Buttons Triwulan */}
                                                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                                            {!isQuarterActive ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSetActiveQuarter(q.id, q.name, year.year)}
                                                                    className="px-2.5 py-1 text-xs font-semibold rounded bg-white hover:bg-[#093c30] text-slate-700 hover:text-white border border-slate-200 transition-colors shadow-2xs"
                                                                >
                                                                    Jadikan Aktif
                                                                </button>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-800 px-2 py-0.5 bg-white rounded border border-emerald-200 shadow-2xs">
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                    Aktif
                                                                </span>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditQuarter(q, year)}
                                                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                                                title="Edit Triwulan"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteQuarter(q.id, q.name)}
                                                                className="p-1 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                                                title="Hapus Triwulan"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* 4. MODAL FORM TAHUN AKADEMIK */}
            {showYearModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-[#093c30]" />
                                {editingYear ? 'Edit Tahun Akademik' : 'Tambah Tahun Akademik Baru'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowYearModal(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmitYear} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Tahun Akademik Hijriah <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: 1446-1447 atau 1447-1448"
                                    value={yearForm.year}
                                    onChange={(e) => setYearForm({ ...yearForm, year: e.target.value })}
                                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#093c30]/20 focus:border-[#093c30]"
                                    required
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Format baku pesantren: 1446-1447 (4 periode Triwulan akan dibuat otomatis).
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Tanggal Mulai <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={yearForm.start_date}
                                        onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })}
                                        className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-[#093c30]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Tanggal Selesai <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={yearForm.end_date}
                                        onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })}
                                        className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-[#093c30]"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi / Catatan</label>
                                <textarea
                                    rows={2}
                                    value={yearForm.description}
                                    onChange={(e) => setYearForm({ ...yearForm, description: e.target.value })}
                                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-[#093c30]"
                                    placeholder="Keterangan kalender akademik"
                                />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    checked={yearForm.active}
                                    onChange={(e) => setYearForm({ ...yearForm, active: e.target.checked })}
                                    className="rounded border-slate-300 text-[#093c30] focus:ring-[#093c30]"
                                />
                                <span className="text-xs text-slate-700 font-medium">
                                    Jadikan Tahun Akademik Aktif Langsung
                                </span>
                            </label>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowYearModal(false)}
                                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md font-medium"
                                >
                                    Batal
                                </button>
                                <Button variant="primary" type="submit" disabled={isCreatingYear || isUpdatingYear}>
                                    {editingYear ? 'Simpan Perubahan' : 'Buat Tahun Akademik'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 5. MODAL FORM PERIODE TRIWULAN */}
            {showQuarterModal && selectedYearForQuarter && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-emerald-700" />
                                    {editingQuarter ? 'Edit Periode Triwulan' : 'Tambah Periode Triwulan'}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Tahun Akademik: <strong>{selectedYearForQuarter.year}</strong>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowQuarterModal(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmitQuarter} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Nama Periode Triwulan <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Triwulan I (Muharram - Rabi'ul Awwal)"
                                    value={quarterForm.name}
                                    onChange={(e) => setQuarterForm({ ...quarterForm, name: e.target.value })}
                                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#093c30]/20 focus:border-[#093c30]"
                                    required
                                />
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                    {[
                                        "Triwulan I (Muharram - Rabi'ul Awwal)",
                                        "Triwulan II (Rabi'ul Akhir - Jumadil Akhir)",
                                        "Triwulan III (Rajab - Ramadhan)",
                                        "Triwulan IV (Syawal - Dzulhijjah)",
                                    ].map((preset) => (
                                        <button
                                            type="button"
                                            key={preset}
                                            onClick={() => setQuarterForm({ ...quarterForm, name: preset })}
                                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded transition-colors"
                                        >
                                            {preset.split(' ')[0]} {preset.split(' ')[1]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Mulai</label>
                                    <input
                                        type="date"
                                        value={quarterForm.start_date}
                                        onChange={(e) => setQuarterForm({ ...quarterForm, start_date: e.target.value })}
                                        className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-[#093c30]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Selesai</label>
                                    <input
                                        type="date"
                                        value={quarterForm.end_date}
                                        onChange={(e) => setQuarterForm({ ...quarterForm, end_date: e.target.value })}
                                        className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-[#093c30]"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    checked={quarterForm.active}
                                    onChange={(e) => setQuarterForm({ ...quarterForm, active: e.target.checked })}
                                    className="rounded border-slate-300 text-[#093c30] focus:ring-[#093c30]"
                                />
                                <span className="text-xs text-slate-700 font-medium">
                                    Jadikan Triwulan Aktif Berjalan
                                </span>
                            </label>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowQuarterModal(false)}
                                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md font-medium"
                                >
                                    Batal
                                </button>
                                <Button variant="primary" type="submit" disabled={isCreatingQuarter}>
                                    {editingQuarter ? 'Simpan Perubahan' : 'Tambah Triwulan'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
