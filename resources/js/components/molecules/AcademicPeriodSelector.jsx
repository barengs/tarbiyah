import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
    CalendarDays,
    ChevronDown,
    Check,
    RotateCcw,
    Sparkles,
    Settings,
    Layers,
    Calendar,
} from 'lucide-react';
import { useGetAcademicYearsQuery } from '../../store/slices/academicApi';
import { setAcademicPeriod, resetToSystemActive } from '../../store/slices/academicContextSlice';

export default function AcademicPeriodSelector({ className = '' }) {
    const dispatch = useDispatch();
    const dropdownRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);

    // Ambil data tahun akademik & sub-triwulan dari API
    const { data: yearsResponse, isLoading } = useGetAcademicYearsQuery();
    const academicYears = yearsResponse?.data || [];

    // State Redux global terpilih
    const academicContext = useSelector((state) => state.academicContext);
    const { selectedYearId, selectedYearName, selectedQuarterId, selectedQuarterName, isSystemActive } =
        academicContext;

    // Cari tahu periode aktif sistem (live) dari API
    const systemActiveYear = academicYears.find((y) => y.active) || academicYears[0];
    const systemActiveQuarter =
        systemActiveYear?.quarters?.find((q) => q.active) || systemActiveYear?.quarters?.[0];

    // Inisialisasi awal jika Redux masih kosong
    useEffect(() => {
        if (!selectedYearId && systemActiveYear) {
            dispatch(
                resetToSystemActive({
                    activeYearId: systemActiveYear.id,
                    activeYearName: systemActiveYear.year,
                    activeQuarterId: systemActiveQuarter?.id || null,
                    activeQuarterName: systemActiveQuarter?.name || '',
                })
            );
        }
    }, [selectedYearId, systemActiveYear, systemActiveQuarter, dispatch]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handler memilih periode
    const handleSelectPeriod = (year, quarter) => {
        const isLive = Boolean(year.active && quarter.active);
        dispatch(
            setAcademicPeriod({
                selectedYearId: year.id,
                selectedYearName: year.year,
                selectedQuarterId: quarter.id,
                selectedQuarterName: quarter.name,
                isSystemActive: isLive,
                fullLabel: `Tahun Akademik ${year.year} ${quarter.name}`,
            })
        );
        setIsOpen(false);
    };

    // Handler reset ke live
    const handleResetToLive = () => {
        if (systemActiveYear && systemActiveQuarter) {
            dispatch(
                resetToSystemActive({
                    activeYearId: systemActiveYear.id,
                    activeYearName: systemActiveYear.year,
                    activeQuarterId: systemActiveQuarter.id,
                    activeQuarterName: systemActiveQuarter.name,
                })
            );
        }
        setIsOpen(false);
    };

    // Teks ringkas untuk pill tombol
    const displayYear = selectedYearName || systemActiveYear?.year || '1446-1447';
    const displayQuarter = selectedQuarterName
        ? selectedQuarterName.split('(')[0].trim()
        : systemActiveQuarter?.name?.split('(')[0]?.trim() || 'Triwulan IV';

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* BUTTON SELECTOR TRIGGER */}
            <div className="hidden sm:flex items-center gap-2">
                {/* Tanggal Hijriah Baku */}
                <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-[#093c30] bg-emerald-50/70 border border-emerald-100/90 rounded-md px-2.5 py-1">
                    <CalendarDays className="w-3.5 h-3.5 text-emerald-700" />
                    <span>14 Syawal 1446 H</span>
                </div>

                {/* Dropdown Button Periode Akademik */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all duration-150 shadow-2xs ${
                        isSystemActive
                            ? 'bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200 text-[#093c30]'
                            : 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-900 ring-1 ring-amber-300/60'
                    }`}
                    title="Klik untuk memilih Tahun Akademik & Periode Triwulan"
                >
                    <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                            isSystemActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                        }`}
                    />
                    <span className="flex items-center gap-1 tracking-tight">
                        <span className="font-extrabold">{displayYear}</span>
                        <span className="text-slate-400 font-normal">•</span>
                        <span>{displayQuarter}</span>
                        {!isSystemActive && (
                            <span className="text-[10px] bg-amber-200/80 text-amber-800 px-1 rounded font-bold uppercase">
                                Arsip
                            </span>
                        )}
                    </span>
                    <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                        }`}
                    />
                </button>
            </div>

            {/* POPOVER DROPDOWN MENU */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95">
                    {/* Header Popover */}
                    <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#093c30]">
                                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Pilih Periode Akademik</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Seluruh data dashboard &amp; modul akan menyesuaikan pilihan ini.
                            </p>
                        </div>

                        {!isSystemActive && (
                            <button
                                type="button"
                                onClick={handleResetToLive}
                                className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shadow-2xs transition-colors shrink-0"
                                title="Kembalikan ke Triwulan Aktif (Live)"
                            >
                                <RotateCcw className="w-3 h-3 text-emerald-600" />
                                <span>Live</span>
                            </button>
                        )}
                    </div>

                    {/* Body Popover: List Tahun & Sub-Triwulan */}
                    <div className="max-h-80 overflow-y-auto p-3 space-y-3 divide-y divide-slate-100">
                        {isLoading ? (
                            <div className="p-6 text-center text-xs text-slate-400">
                                Memuat daftar tahun akademik...
                            </div>
                        ) : academicYears.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">
                                Belum ada data tahun akademik.
                            </div>
                        ) : (
                            academicYears.map((year) => {
                                const isYearSelected = selectedYearId === year.id;
                                const quarters = year.quarters || [];

                                return (
                                    <div key={year.id} className="pt-2 first:pt-0">
                                        {/* Header Grup Tahun */}
                                        <div className="flex items-center justify-between mb-1.5 px-2">
                                            <div className="flex items-center gap-1.5">
                                                <Layers className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-xs font-extrabold text-slate-800">
                                                    Tahun Akademik {year.year}
                                                </span>
                                            </div>
                                            {year.active && (
                                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded">
                                                    Tahun Aktif
                                                </span>
                                            )}
                                        </div>

                                        {/* Sub-Triwulan Options */}
                                        <div className="grid grid-cols-1 gap-1">
                                            {quarters.map((quarter) => {
                                                const isQuarterSelected =
                                                    isYearSelected && selectedQuarterId === quarter.id;
                                                const isLiveActive = Boolean(year.active && quarter.active);

                                                return (
                                                    <button
                                                        type="button"
                                                        key={quarter.id}
                                                        onClick={() => handleSelectPeriod(year, quarter)}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-all ${
                                                            isQuarterSelected
                                                                ? 'bg-[#093c30] text-white shadow-xs font-semibold'
                                                                : 'hover:bg-slate-100/80 text-slate-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div
                                                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                                    isQuarterSelected
                                                                        ? 'bg-emerald-300 ring-2 ring-emerald-400/40'
                                                                        : isLiveActive
                                                                        ? 'bg-emerald-500'
                                                                        : 'bg-slate-300'
                                                                }`}
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="truncate font-medium">
                                                                    {quarter.name}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                            {isLiveActive && !isQuarterSelected && (
                                                                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                                                                    Live
                                                                </span>
                                                            )}
                                                            {isQuarterSelected && (
                                                                <Check className="w-3.5 h-3.5 text-emerald-300" />
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer Popover: Shortcut Kelola Master */}
                    <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Konteks Redux Global</span>
                        <Link
                            to="/kurikulum/tahun-akademik"
                            onClick={() => setIsOpen(false)}
                            className="font-bold text-[#093c30] hover:text-emerald-700 flex items-center gap-1 hover:underline"
                        >
                            <Settings className="w-3 h-3 text-emerald-700" />
                            <span>Kelola Master Triwulan &rarr;</span>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
