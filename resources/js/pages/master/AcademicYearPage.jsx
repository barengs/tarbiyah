import React, { useState, useEffect, useMemo } from 'react';
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
import Button from '../../components/atoms/Button';
import {
    Calendar,
    Clock,
    Plus,
    Edit2,
    Trash2,
    CheckCircle2,
    Layers,
    ChevronRight,
    Search,
    Inbox,
    PlusCircle,
    CornerDownRight,
    X,
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function AcademicYearPage() {
    const { data: response, isLoading } = useGetAcademicYearsQuery();
    const years = response?.data || [];

    const [createYear, { isLoading: isCreatingYear }] = useCreateAcademicYearMutation();
    const [updateYear, { isLoading: isUpdatingYear }] = useUpdateAcademicYearMutation();
    const [setActiveYear] = useSetActiveAcademicYearMutation();
    const [deleteYear] = useDeleteAcademicYearMutation();

    const [createQuarter, { isLoading: isCreatingQuarter }] = useCreateAcademicQuarterMutation();
    const [updateQuarter] = useUpdateAcademicQuarterMutation();
    const [setActiveQuarter] = useSetActiveAcademicQuarterMutation();
    const [deleteQuarter] = useDeleteAcademicQuarterMutation();

    // State Expand/Collapse baris tahun akademik
    const [expandedYearIds, setExpandedYearIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal Tahun Akademik
    const [showYearModal, setShowYearModal] = useState(false);
    const [editingYear, setEditingYear] = useState(null);
    const [yearForm, setYearForm] = useState({
        year: '',
        start_date: '',
        end_date: '',
        description: '',
        active: false,
    });

    // Modal Periode Triwulan
    const [showQuarterModal, setShowQuarterModal] = useState(false);
    const [selectedYearForQuarter, setSelectedYearForQuarter] = useState(null);
    const [editingQuarter, setEditingQuarter] = useState(null);
    const [quarterForm, setQuarterForm] = useState({
        name: '',
        start_date: '',
        end_date: '',
        active: false,
    });

    // Buka baris tahun aktif secara default saat pertama kali dimuat
    useEffect(() => {
        if (years.length > 0 && expandedYearIds.length === 0) {
            const active = years.find((y) => y.active);
            if (active) {
                setExpandedYearIds([active.id]);
            } else if (years[0]) {
                setExpandedYearIds([years[0].id]);
            }
        }
    }, [years]);

    // Filter daftar tahun berdasarkan pencarian
    const filteredYears = useMemo(() => {
        if (!searchQuery.trim()) return years;
        const q = searchQuery.toLowerCase();
        return years.filter(
            (y) =>
                y.year?.toLowerCase().includes(q) ||
                y.description?.toLowerCase().includes(q) ||
                (y.quarters || []).some((qt) => qt.name?.toLowerCase().includes(q))
        );
    }, [years, searchQuery]);

    const toggleExpandYear = (yearId) => {
        setExpandedYearIds((prev) =>
            prev.includes(yearId) ? prev.filter((id) => id !== yearId) : [...prev, yearId]
        );
    };

    const handleExpandAll = () => {
        setExpandedYearIds(years.map((y) => y.id));
    };

    const handleCollapseAll = () => {
        setExpandedYearIds([]);
    };

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
                const res = await createYear(yearForm).unwrap();
                toast.success('Tahun akademik dan 4 periode Triwulan berhasil dibuat otomatis!');
                if (res?.data?.id) {
                    setExpandedYearIds((prev) => [...prev, res.data.id]);
                }
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
            if (!expandedYearIds.includes(yearId)) {
                setExpandedYearIds((prev) => [...prev, yearId]);
            }
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
        <div className="space-y-4">
            {/* 1. HEADER SECTION */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <Calendar className="w-6 h-6 text-[#093c30]" />
                        Data Master Tahun Akademik &amp; Periode Triwulan
                    </h1>
                    <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
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

            {/* 2. TABEL HIERARKI TAHUN AKADEMIK (TERINTEGRASI DENGAN TOOLBAR PENCARIAN) */}
            <div className="bg-white border border-slate-200/90 rounded-md shadow-2xs overflow-hidden">
                {/* TOOLBAR PENCARIAN & KONTROL (BAGIAN DARI TABEL) */}
                <div className="p-3 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari tahun akademik atau triwulan..."
                            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#093c30] focus:border-[#093c30]"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
                                title="Bersihkan pencarian"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Tombol Expand/Collapse All */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-[11px] text-slate-500 mr-1">
                            Total: <strong className="text-slate-800">{years.length}</strong> Tahun
                        </span>
                        <button
                            type="button"
                            onClick={handleExpandAll}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-[#093c30] bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors shadow-2xs"
                            title="Buka seluruh sub-data triwulan"
                        >
                            Buka Semua
                        </button>
                        <button
                            type="button"
                            onClick={handleCollapseAll}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors shadow-2xs"
                            title="Tutup seluruh sub-data triwulan"
                        >
                            Tutup Semua
                        </button>
                    </div>
                </div>

                {/* TABEL HIERARKI */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        {/* THEAD */}
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none border-b border-slate-200">
                            <tr>
                                <th className="w-10 px-3 py-2.5 text-center"></th>
                                <th className="w-14 px-3 py-2.5 text-center">No.</th>
                                <th className="px-3.5 py-2.5">Tahun Akademik &amp; Periode</th>
                                <th className="px-3.5 py-2.5">Rentang Kalender</th>
                                <th className="px-3.5 py-2.5">Sub-Triwulan</th>
                                <th className="px-3.5 py-2.5">Status</th>
                                <th className="px-3.5 py-2.5 text-right">Aksi</th>
                            </tr>
                        </thead>

                        {/* TBODY */}
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 px-4 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <div className="w-6 h-6 border-2 border-[#093c30] border-t-transparent rounded-full animate-spin mb-2" />
                                            <span className="text-xs font-medium text-slate-500">
                                                Memuat data tahun akademik &amp; triwulan...
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredYears.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 px-4 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <Inbox className="w-8 h-8 mb-2 text-slate-300" strokeWidth={1.5} />
                                            <p className="text-xs font-semibold text-slate-600">
                                                {searchQuery
                                                    ? `Tidak ditemukan data untuk kata kunci "${searchQuery}"`
                                                    : 'Belum ada tahun akademik terdaftar'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredYears.map((year, index) => {
                                    const isExpanded = expandedYearIds.includes(year.id);
                                    const isThisYearActive = Boolean(year.active);
                                    const quarters = year.quarters || [];

                                    return (
                                        <React.Fragment key={year.id}>
                                            {/* BARIS INDUK: TAHUN AKADEMIK */}
                                            <tr
                                                onClick={() => toggleExpandYear(year.id)}
                                                className={`transition-colors cursor-pointer select-none ${
                                                    isThisYearActive
                                                        ? isExpanded
                                                            ? 'bg-emerald-50/70 hover:bg-emerald-50/90'
                                                            : 'bg-emerald-50/40 hover:bg-emerald-50/60'
                                                        : isExpanded
                                                        ? 'bg-slate-50/80 hover:bg-slate-100/70'
                                                        : 'hover:bg-slate-50/80'
                                                }`}
                                            >
                                                {/* Kolom Toggle Expand/Collapse */}
                                                <td className="w-10 px-3 py-2.5 text-center text-slate-400">
                                                    <span
                                                        className={`inline-flex p-1 rounded-md transition-transform duration-200 ${
                                                            isExpanded ? 'rotate-90 text-[#093c30]' : 'rotate-0 text-slate-400'
                                                        }`}
                                                    >
                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                    </span>
                                                </td>

                                                {/* Kolom No. Induk */}
                                                <td className="w-14 px-3 py-2.5 text-center font-mono font-bold text-xs text-slate-500">
                                                    {index + 1}
                                                </td>

                                                {/* Kolom Tahun Akademik */}
                                                <td className="px-3.5 py-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="p-1 rounded bg-white border border-slate-200 text-[#093c30] shadow-2xs">
                                                            <Layers className="w-3.5 h-3.5" />
                                                        </span>
                                                        <div>
                                                            <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                                                Tahun Akademik {year.year}
                                                            </p>
                                                            {year.description && (
                                                                <p className="text-[11px] text-slate-400 line-clamp-1">
                                                                    {year.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Kolom Rentang Kalender */}
                                                <td className="px-3.5 py-2.5 text-slate-600">
                                                    <div className="text-[11px] font-medium">
                                                        <span>{year.start_date ? year.start_date.split('T')[0] : '—'}</span>
                                                        <span className="text-slate-400 mx-1">s/d</span>
                                                        <span>{year.end_date ? year.end_date.split('T')[0] : '—'}</span>
                                                    </div>
                                                </td>

                                                {/* Kolom Sub-Triwulan */}
                                                <td className="px-3.5 py-2.5">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                        <Clock className="w-3 h-3 text-slate-500" />
                                                        {quarters.length} Triwulan
                                                    </span>
                                                </td>

                                                {/* Kolom Status */}
                                                <td className="px-3.5 py-2.5">
                                                    {isThisYearActive ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-[#093c30] border border-emerald-300">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                                            Tahun Aktif
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                                            Arsip
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Kolom Aksi Tahun */}
                                                <td className="px-3.5 py-2.5 text-right">
                                                    <div
                                                        className="flex items-center justify-end gap-1.5"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {!isThisYearActive && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetActiveYear(year.id, year.year)}
                                                                className="px-2 py-1 text-[11px] font-semibold rounded bg-white hover:bg-[#093c30] text-slate-700 hover:text-white border border-slate-200 transition-colors shadow-2xs"
                                                                title="Jadikan Tahun Akademik Ini Aktif"
                                                            >
                                                                Aktifkan
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenCreateQuarter(year)}
                                                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded bg-emerald-50 hover:bg-emerald-100 text-[#093c30] border border-emerald-200 transition-colors shadow-2xs"
                                                            title="Tambah Triwulan ke tahun ini"
                                                        >
                                                            <PlusCircle className="w-3 h-3" />
                                                            + Triwulan
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditYear(year)}
                                                            className="p-1.5 rounded text-slate-500 hover:text-[#093c30] hover:bg-slate-100 transition-colors"
                                                            title="Edit Tahun Akademik"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteYear(year.id, year.year)}
                                                            className="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                                            title="Hapus Tahun Akademik"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* BARIS-BARIS TURUNAN TRIWULAN (MODEL DATA HIRARKI LANGSUNG) */}
                                            {isExpanded &&
                                                (quarters.length === 0 ? (
                                                    <tr className="bg-slate-50/50">
                                                        <td className="w-10 px-3 py-2 text-center text-slate-300">
                                                            <CornerDownRight className="w-3.5 h-3.5 mx-auto" />
                                                        </td>
                                                        <td className="w-14 px-3 py-2 text-center font-mono text-[11px] text-slate-400">
                                                            {index + 1}.1
                                                        </td>
                                                        <td colSpan={5} className="px-3.5 py-2 text-slate-400 text-xs italic">
                                                            Belum ada periode triwulan. Klik tombol{' '}
                                                            <strong className="text-[#093c30] font-bold not-italic">
                                                                + Triwulan
                                                            </strong>{' '}
                                                            di atas untuk menyusun kalender pendidikan.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    quarters.map((q, qIndex) => {
                                                        const isQuarterActive = Boolean(
                                                            q.active && isThisYearActive
                                                        );

                                                        return (
                                                            <tr
                                                                key={q.id}
                                                                className={`transition-colors border-l-2 ${
                                                                    isQuarterActive
                                                                        ? 'bg-emerald-50/40 hover:bg-emerald-50/60 border-l-[#093c30]'
                                                                        : 'bg-slate-50/40 hover:bg-slate-100/60 border-l-slate-300'
                                                                }`}
                                                            >
                                                                {/* Tree Branch Icon */}
                                                                <td className="w-10 px-3 py-2 text-center text-slate-400">
                                                                    <CornerDownRight className="w-3.5 h-3.5 mx-auto" />
                                                                </td>

                                                                {/* Sub No. Hierarki: 1.1, 1.2, dll */}
                                                                <td className="w-14 px-3 py-2 text-center font-mono text-[11px] text-slate-400">
                                                                    {index + 1}.{qIndex + 1}
                                                                </td>

                                                                {/* Nama Periode Triwulan */}
                                                                <td className="px-3.5 py-2">
                                                                    <div className="flex items-center gap-2 pl-1">
                                                                        <span
                                                                            className={`w-2 h-2 rounded-full shrink-0 ${
                                                                                isQuarterActive
                                                                                    ? 'bg-emerald-600 ring-2 ring-emerald-200'
                                                                                    : 'bg-slate-300'
                                                                            }`}
                                                                        />
                                                                        <span
                                                                            className={`text-xs ${
                                                                                isQuarterActive
                                                                                    ? 'font-bold text-slate-900'
                                                                                    : 'font-medium text-slate-700'
                                                                            }`}
                                                                        >
                                                                            {q.name}
                                                                        </span>
                                                                    </div>
                                                                </td>

                                                                {/* Rentang Tanggal Triwulan */}
                                                                <td className="px-3.5 py-2 text-slate-600">
                                                                    <div className="text-[11px] font-medium">
                                                                        <span>
                                                                            {q.start_date ? q.start_date.split('T')[0] : '—'}
                                                                        </span>
                                                                        <span className="text-slate-400 mx-1">s/d</span>
                                                                        <span>
                                                                            {q.end_date ? q.end_date.split('T')[0] : '—'}
                                                                        </span>
                                                                    </div>
                                                                </td>

                                                                {/* Indikator Sub-Triwulan */}
                                                                <td className="px-3.5 py-2 text-slate-400 text-[11px]">
                                                                    Triwulan Ke-{qIndex + 1}
                                                                </td>

                                                                {/* Status Triwulan */}
                                                                <td className="px-3.5 py-2">
                                                                    {isQuarterActive ? (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 px-2 py-0.5 bg-emerald-100 rounded border border-emerald-300">
                                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                            Sedang Berjalan
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                                            Tidak Aktif
                                                                        </span>
                                                                    )}
                                                                </td>

                                                                {/* Aksi Triwulan */}
                                                                <td className="px-3.5 py-2 text-right">
                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                        {!isQuarterActive && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleSetActiveQuarter(
                                                                                        q.id,
                                                                                        q.name,
                                                                                        year.year
                                                                                    )
                                                                                }
                                                                                className="px-2 py-0.5 text-[11px] font-semibold rounded bg-white hover:bg-[#093c30] text-slate-700 hover:text-white border border-slate-300 transition-colors shadow-2xs"
                                                                            >
                                                                                Jadikan Aktif
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenEditQuarter(q, year)}
                                                                            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
                                                                            title="Edit Triwulan"
                                                                        >
                                                                            <Edit2 className="w-3 h-3" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteQuarter(q.id, q.name)}
                                                                            className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                                                            title="Hapus Triwulan"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                ))}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3. MODAL FORM TAHUN AKADEMIK */}
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
                                    Label Tahun Akademik (Hijriah) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: 1446-1447 atau 1447/1448"
                                    value={yearForm.year}
                                    onChange={(e) => setYearForm({ ...yearForm, year: e.target.value })}
                                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#093c30]/20 focus:border-[#093c30]"
                                    required
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Format Hijriah standar pesantren, misal: 1446-1447.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Mulai</label>
                                    <input
                                        type="date"
                                        value={yearForm.start_date}
                                        onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })}
                                        className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-[#093c30]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Selesai</label>
                                    <input
                                        type="date"
                                        value={yearForm.end_date}
                                        onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })}
                                        className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-[#093c30]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan / Catatan</label>
                                <textarea
                                    rows={2}
                                    value={yearForm.description}
                                    onChange={(e) => setYearForm({ ...yearForm, description: e.target.value })}
                                    className="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-[#093c30]"
                                    placeholder="Catatan kalender..."
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

            {/* 4. MODAL FORM PERIODE TRIWULAN */}
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
