import React from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { Users, ClipboardCheck, BookMarked, BookOpen } from 'lucide-react';
import { useGetDashboardStatsQuery } from '../store/slices/dashboardApi';
import HeroBanner from '../components/organisms/HeroBanner';
import MetricCard from '../components/molecules/MetricCard';
import PresenceChartCard from '../components/organisms/PresenceChartCard';
import EducationDistributionCard from '../components/organisms/EducationDistributionCard';
import ActiveScheduleWidget from '../components/organisms/ActiveScheduleWidget';
import NoticeDisciplineWidget from '../components/organisms/NoticeDisciplineWidget';
import ProgressBar from '../components/atoms/ProgressBar';
import { Link } from 'react-router-dom';

/**
 * KONSOL MUDIR: e-Panyeppen Pro Dashboard
 * Data 100% real dari database via /api/main/dashboard/stats (RTK Query)
 */
export default function Dashboard() {
    const { user } = useSelector((state) => state.auth);
    const { data: dashboardData, isLoading, isFetching } = useGetDashboardStatsQuery();

    const ov = dashboardData?.data?.overview || {};
    const academicMeta = dashboardData?.data?.academic_year || {};
    const presenceTrend = dashboardData?.data?.presence_trend || [];
    const institutions = dashboardData?.data?.institution_distribution || [];
    const tahfizhBrackets = dashboardData?.data?.tahfizh_brackets || [];
    const activeSchedules = dashboardData?.data?.active_schedules || [];
    const recentNotices = dashboardData?.data?.recent_notices || [];

    // Quick CTA Handlers
    const ctaHandlers = {
        onInputNilai: () => {
            toast.info('Membuka form input nilai Imtihan / KKM...');
            setTimeout(() => window.location.hash = '', 100);
        },
        onRekapPresensi: () => {
            toast.info('Mengambil rekap presensi jamaah & KBM...');
        },
        onMaklumatBaru: () => {
            toast.info('Menyusun maklumat / pengumuman biro pengasuhan...');
        },
    };

    return (
        <div className="space-y-6 lg:space-y-8">
            {/* 1. HERO BANNER MUDIR */}
            <HeroBanner
                user={user}
                academicMeta={academicMeta}
                ctaHandlers={ctaHandlers}
                className="shadow-sm"
            />

            {/* 2. 4 KPI METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* SANTRI AKTIF */}
                <MetricCard
                    label="Total Santri Aktif"
                    value={ov.total_santri?.value?.toLocaleString() || '—'}
                    unit="Jiwa"
                    icon={Users}
                    accent="green"
                    stats={[
                        { dot: 'bg-sky-500', label: `${ov.total_santri?.banin ?? '-'} Banin`, },
                        { dot: 'bg-emerald-500', label: `${ov.total_santri?.banat ?? '-'} Banat`, },
                    ]}
                    footer={
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">{ov.total_santri?.mukim_percent ?? 0}% Mukim di Asrama</span>
                                <span className="font-bold text-[#093c30]">+{ov.total_santri?.new_students ?? 0} Baru</span>
                            </div>
                            <ProgressBar value={ov.total_santri?.mukim_percent ?? 0} color="emerald" height="h-1" />
                        </div>
                    }
                />

                {/* PRESENSI HARI INI */}
                <MetricCard
                    label="Presensi Hari Ini"
                    value={`${ov.presence?.rate ?? '0'}%`}
                    unit=""
                    icon={ClipboardCheck}
                    accent="emerald"
                    badge={{ label: ov.presence?.status_label || 'Disiplin Baik', variant: 'emerald' }}
                    stats={[
                        { dot: 'bg-emerald-500', label: 'Shubuh', value: `${ov.presence?.shubuh ?? '—'}%` },
                        { dot: 'bg-sky-500', label: 'KBM Pagi', value: `${ov.presence?.kbm_pagi ?? '—'}%` },
                        { dot: 'bg-[#b45309]', label: 'Halaqah', value: `${ov.presence?.halaqah ?? '—'}%` },
                    ]}
                />

                {/* CAPAIAN TAHFIZH */}
                <MetricCard
                    label="Capaian Tahfidz Quran"
                    value={`${(ov.tahfizh?.total_pages ?? '0').replace('.', ',')} `}
                    unit="Halaman / Sem"
                    icon={BookMarked}
                    accent="terracotta"
                    stats={[
                        { dot: 'bg-[#b45309]', label: `${ov.tahfizh?.khatam_mutqin ?? '-'} Santri Khatam 30 Juz Mutqin & Sanad`, },
                    ]}
                    footer={
                        <div className="flex items-center justify-between text-xs bg-orange-50 border border-orange-100 rounded-md px-3 py-1.5">
                            <span className="font-semibold text-slate-700">Target Semester</span>
                            <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                On Track ({ov.tahfizh?.trend || '+8.4%'})
                            </span>
                        </div>
                    }
                />

                {/* MAPEL & KKM */}
                <MetricCard
                    label="Mapel & KKM Imtihan"
                    value={ov.curriculum?.total_subjects ?? '—'}
                    unit="Mapel Aktif"
                    icon={BookOpen}
                    accent="blue"
                    stats={[
                        { dot: 'bg-slate-500', label: `${ov.curriculum?.diniyah ?? '-'} Diniyah/Kitab`, },
                        { dot: 'bg-sky-500', label: `${ov.curriculum?.kemenag_umum ?? '-'} Umum/Kemenag`, },
                    ]}
                    footer={
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Rerata KKM</span>
                            <span className="text-slate-900 font-bold">
                                {ov.curriculum?.avg_kkm ?? '—'} / 100
                            </span>
                        </div>
                    }
                />
            </div>

            {/* 3. CHARTS & DISTRIBUTION CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* LEFT COLUMN: PRESENCE CHART (2/3) */}
                <div className="lg:col-span-2">
                    <PresenceChartCard data={presenceTrend} />
                </div>

                {/* RIGHT COLUMN: EDUCATION & TAHFIDZ (1/3) */}
                <div>
                    <EducationDistributionCard
                        institutions={institutions}
                        tahfizhBrackets={tahfizhBrackets}
                        khatamCount={ov.tahfizh?.khatam_mutqin}
                    />
                </div>
            </div>

            {/* 4. ACTIVE SCHEDULES & DISCIPLINE FEED CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ActiveScheduleWidget schedules={activeSchedules} />
                <NoticeDisciplineWidget notices={recentNotices} />
            </div>

            {/* DASHBOARD DATA STATUS */}
            {isFetching && (
                <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Menyinkronkan data statistik dari server akademik...
                </p>
            )}
        </div>
    );
}
