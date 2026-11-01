import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import {
    Users,
    ClipboardCheck,
    Layers,
    RotateCcw,
    AlertCircle,
} from 'lucide-react';
import { useGetDashboardStatsQuery } from '../store/slices/dashboardApi';
import { resetToSystemActive } from '../store/slices/academicContextSlice';
import HeroBanner from '../components/organisms/HeroBanner';
import MetricCard from '../components/molecules/MetricCard';
import PresenceChartCard from '../components/organisms/PresenceChartCard';
import EducationDistributionCard from '../components/organisms/EducationDistributionCard';
import ActiveScheduleWidget from '../components/organisms/ActiveScheduleWidget';
import NoticeDisciplineWidget from '../components/organisms/NoticeDisciplineWidget';

/**
 * KONSOL MUDIR: e-Panyeppen Pro Dashboard
 * Desain UI/UX presisi mengikuti mockup gambar.
 * Terhubung penuh dengan Redux Toolkit Academic Context (Navbar Dropdown).
 */
export default function Dashboard() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);

    // Ambil pilihan periode akademik dari Redux Toolkit
    const academicContext = useSelector((state) => state.academicContext);
    const { selectedYearId, selectedQuarterId, isSystemActive } = academicContext;

    // Fetch dashboard stats sesuai tahun dan triwulan yang dipilih di Navbar
    const {
        data: dashboardData,
        isLoading,
        isFetching,
    } = useGetDashboardStatsQuery({
        academic_year_id: selectedYearId,
        academic_quarter_id: selectedQuarterId,
    });

    const ov = dashboardData?.data?.overview || {};
    const academicMeta = dashboardData?.data?.academic_year || {};
    const presenceTrend = dashboardData?.data?.presence_trend || [
        { day: 'Sabtu', jamaah: 0, kbm: 0, halaqah: 0 },
        { day: 'Ahad', jamaah: 0, kbm: 0, halaqah: 0 },
        { day: 'Senin', jamaah: 0, kbm: 0, halaqah: 0 },
        { day: 'Selasa', jamaah: 0, kbm: 0, halaqah: 0 },
        { day: 'Rabu', jamaah: 0, kbm: 0, halaqah: 0 },
        { day: 'Kamis', jamaah: 0, kbm: 0, halaqah: 0 },
        { day: "Jum'at", jamaah: 0, kbm: 0, halaqah: 0 },
    ];
    const institutionDistribution = dashboardData?.data?.institution_distribution || [];
    const activeSchedules = dashboardData?.data?.active_schedules || [];
    const recentNotices = dashboardData?.data?.recent_notices || [];

    // Handler reset ke live
    const handleResetLive = () => {
        dispatch(
            resetToSystemActive({
                activeYearId: null,
                activeYearName: '',
                activeQuarterId: null,
                activeQuarterName: '',
            })
        );
        toast.success('Konteks dashboard dikembalikan ke Triwulan Aktif (Live)!');
    };

    return (
        <div className="space-y-6 lg:space-y-8">
            {/* ALERT BANNER: JIKA USER SEDANG MELIHAT ARSIP PERIODE HISTORIS */}
            {!isSystemActive && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                            <p className="text-xs sm:text-sm font-bold">
                                Mode Tinjauan Arsip: {academicMeta?.full_label || 'Periode Sebelumnya'}
                            </p>
                            <p className="text-[11px] text-amber-800">
                                Anda sedang meninjau data historis. Seluruh data di layar disaring berdasarkan periode ini.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleResetLive}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition-colors shadow-2xs self-start sm:self-auto shrink-0"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Kembali ke Periode Live</span>
                    </button>
                </div>
            )}

            {/* 1. HERO BANNER MUDIR */}
            <HeroBanner
                user={user}
                academicMeta={academicMeta}
                className="shadow-xs"
            />

            {/* 2. 4 KPI METRIC CARDS (PERSIS MOCKUP DESAIN) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {/* 1. TOTAL SANTRI AKTIF (100% PUTRA) */}
                <MetricCard
                    label="Total Santri Aktif"
                    value={ov.total_santri?.value !== undefined ? ov.total_santri.value.toLocaleString() : '0'}
                    unit="Jiwa"
                    icon={Users}
                    accent="green"
                    stats={[
                        { dot: 'bg-[#093c30]', label: `${ov.total_santri?.value !== undefined ? ov.total_santri.value.toLocaleString() : '0'} Putra` },
                        { dot: 'bg-emerald-600', label: `${ov.total_santri?.value > 0 ? '100%' : '0%'} Santri Putra` },
                    ]}
                    footer={
                        <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
                            <span className="text-slate-500">{ov.total_santri?.mukim_percent !== undefined ? `${ov.total_santri.mukim_percent}%` : '0%'} Mukim di Asrama</span>
                            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                                +{ov.total_santri?.new_students ?? 0} Baru
                            </span>
                        </div>
                    }
                />

                {/* 2. PRESENSI HARI INI */}
                <MetricCard
                    label="Presensi Hari Ini"
                    value={`${ov.presence?.rate ?? 0}%`}
                    unit=""
                    icon={ClipboardCheck}
                    accent="emerald"
                    badge={{
                        label: ov.presence?.status_label || (ov.presence?.total_log > 0 ? 'Disiplin Sangat Baik' : 'Belum Ada Data'),
                        variant: ov.presence?.total_log > 0 ? 'emerald' : 'slate',
                    }}
                    stats={[
                        { label: 'Shubuh Berjamaah', value: `${ov.presence?.shubuh_rate ?? ov.presence?.rate ?? 0}%` },
                        { label: 'KBM Formal Pagi', value: `${ov.presence?.kbm_rate ?? ov.presence?.rate ?? 0}%` },
                    ]}
                    footer={
                        <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100 text-slate-500">
                            <span>Halaqah Maghrib:</span>
                            <span className="font-bold text-slate-800">{ov.presence?.halaqah_rate ?? ov.presence?.rate ?? 0}% Tercatat</span>
                        </div>
                    }
                />

                {/* 4. MAPEL & KKM IMTIHAN */}
                <MetricCard
                    label="Mapel & KKM Imtihan"
                    value={String(ov.curriculum?.total_subjects ?? 0)}
                    unit="Mapel Aktif"
                    icon={Layers}
                    accent="blue"
                    stats={[
                        { dot: 'bg-[#093c30]', label: `${ov.curriculum?.diniyah ?? 0} Diniyah/Kitab` },
                        { dot: 'bg-sky-600', label: `${ov.curriculum?.kemenag_umum ?? 0} Umum Kemenag` },
                    ]}
                    footer={
                        <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100 text-slate-500">
                            <span>Rerata KKM Kumulatif:</span>
                            <span className="font-bold text-slate-800">{ov.curriculum?.avg_kkm ?? 0} / 100</span>
                        </div>
                    }
                />
            </div>

            {/* 3. CHARTS ROW (GRID 2 KOLOM): STATISTIK PRESENSI 7 HARI & DISTRIBUSI JENJANG */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* 7/12 Kolom: Grafik Line 7 Hari */}
                <div className="lg:col-span-7">
                    <PresenceChartCard data={presenceTrend} />
                </div>

                {/* 5/12 Kolom: Distribusi Jenjang */}
                <div className="lg:col-span-5">
                    <EducationDistributionCard
                        institutions={institutionDistribution}
                    />
                </div>
            </div>

            {/* 4. WIDGETS ROW (GRID 2 KOLOM): JADWAL KBM REAL-TIME & MAKLUMAT DISIPLIN */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* 7/12 Kolom: Jadwal KBM Sedang Berjalan */}
                <div className="lg:col-span-7">
                    <ActiveScheduleWidget schedules={activeSchedules} />
                </div>

                {/* 5/12 Kolom: Maklumat & Disiplin Biro Pengasuhan */}
                <div className="lg:col-span-5">
                    <NoticeDisciplineWidget notices={recentNotices} />
                </div>
            </div>

            {/* STATUS RE-FETCHING DATA DARI SERVER */}
            {isFetching && (
                <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Menyinkronkan data statistik riil untuk {academicMeta?.full_label || 'periode terpilih'}...
                </p>
            )}
        </div>
    );
}
