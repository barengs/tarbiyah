import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import {
    Users,
    ClipboardCheck,
    Layers,
    Calendar,
    RotateCcw,
    AlertCircle,
} from 'lucide-react';
import { useGetDashboardStatsQuery } from '../store/slices/dashboardApi';
import { resetToSystemActive } from '../store/slices/academicContextSlice';
import HeroBanner from '../components/organisms/HeroBanner';
import MetricCard from '../components/molecules/MetricCard';
import PresencePieChartCard from '../components/organisms/PresencePieChartCard';
import ProgramDistributionCard from '../components/organisms/ProgramDistributionCard';
import AcademicPeriodStudentsCard from '../components/organisms/AcademicPeriodStudentsCard';
import ActiveScheduleWidget from '../components/organisms/ActiveScheduleWidget';
import NoticeDisciplineWidget from '../components/organisms/NoticeDisciplineWidget';
import ProgressBar from '../components/atoms/ProgressBar';

/**
 * KONSOL MUDIR: e-Panyeppen Pro Dashboard
 * Terhubung penuh dengan Redux Toolkit Academic Context (Navbar Dropdown)
 * Menampilkan data spesifik sesuai Tahun Akademik & Triwulan yang dipilih
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
    const presencePie = dashboardData?.data?.presence_pie || [];
    const studentsByPeriod = dashboardData?.data?.students_by_period || [];
    const programsDistribution = dashboardData?.data?.programs_distribution || [];
    const activeSchedules = dashboardData?.data?.active_schedules || [];
    const recentNotices = dashboardData?.data?.recent_notices || [];

    // Quick CTA Handlers
    const ctaHandlers = {
        onInputNilai: () => {
            toast.info('Membuka modul input nilai Imtihan / KKM...');
        },
        onRekapPresensi: () => {
            toast.info('Mengambil rekap presensi santri...');
        },
        onMaklumatBaru: () => {
            toast.info('Menyusun maklumat / pengumuman biro pengasuhan...');
        },
    };

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
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
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
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition-colors shadow-2xs self-start sm:self-auto shrink-0"
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
                ctaHandlers={ctaHandlers}
                className="shadow-sm"
            />

            {/* 2. 4 KPI METRIC CARDS (DATA REAL DARI DATABASE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* 1. TOTAL SANTRI AKTIF */}
                <MetricCard
                    label="Total Santri di Periode Ini"
                    value={ov.total_santri?.value?.toLocaleString() || '0'}
                    unit="Jiwa"
                    icon={Users}
                    accent="green"
                    stats={[
                        { dot: 'bg-emerald-600', label: `${ov.total_santri?.banin ?? 0} Banin` },
                        { dot: 'bg-sky-500', label: `${ov.total_santri?.banat ?? 0} Banat` },
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

                {/* 2. PRESENSI SANTRI */}
                <MetricCard
                    label="Presensi Santri"
                    value={`${ov.presence?.rate ?? '0'}%`}
                    unit=""
                    icon={ClipboardCheck}
                    accent="emerald"
                    badge={{ label: ov.presence?.status_label || 'Disiplin Sangat Baik', variant: 'emerald' }}
                    stats={[
                        { dot: 'bg-emerald-500', label: 'Hadir', value: `${ov.presence?.hadir ?? 0}` },
                        { dot: 'bg-sky-500', label: 'Izin', value: `${ov.presence?.izin ?? 0}` },
                        { dot: 'bg-amber-500', label: 'Sakit', value: `${ov.presence?.sakit ?? 0}` },
                    ]}
                    footer={
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Total Log Presensi</span>
                            <span className="text-slate-800 font-bold">{ov.presence?.total_log ?? 0} Catatan</span>
                        </div>
                    }
                />

                {/* 3. PROGRAM TIBYAN & KUBAR */}
                <MetricCard
                    label="Program Pesantren"
                    value={ov.programs?.total_programs ?? 2}
                    unit="Program Utama"
                    icon={Layers}
                    accent="terracotta"
                    stats={[
                        { dot: 'bg-[#093c30]', label: `Kubar: ${ov.programs?.kubar_students ?? 160} Santri` },
                        { dot: 'bg-[#b45309]', label: `Tibyan: ${ov.programs?.tibyan_students ?? 80} Santri` },
                    ]}
                    footer={
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Struktur Jenjang</span>
                            <span className="text-slate-800 font-bold">Ula, Wustho, Ulya, Takhossus</span>
                        </div>
                    }
                />

                {/* 4. PERIODE TRIWULAN TERPILIH */}
                <MetricCard
                    label="Periode Terpilih"
                    value={ov.total_santri?.value ?? 0}
                    unit="Santri"
                    icon={Calendar}
                    accent="blue"
                    stats={[
                        { dot: isSystemActive ? 'bg-emerald-500' : 'bg-amber-500', label: academicMeta?.triwulan || 'Triwulan IV' },
                    ]}
                    footer={
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Tahun Akademik</span>
                            <span className="text-slate-900 font-bold">
                                {academicMeta?.year || '1446-1447'}
                            </span>
                        </div>
                    }
                />
            </div>

            {/* 3. CHARTS ROW: PRESENSI PIECHART (1/2) & PROGRAM TIBYAN/KUBAR (1/2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* STATISTIK PRESENSI DALAM BENTUK PIECHART */}
                <div>
                    <PresencePieChartCard
                        pieData={presencePie}
                        summary={ov.presence || {}}
                    />
                </div>

                {/* STATISTIK SANTRI PER PROGRAM (TIBYAN & KUBAR) & JENJANG */}
                <div>
                    <ProgramDistributionCard
                        programs={programsDistribution}
                        totalStudents={ov.total_santri?.value || 0}
                    />
                </div>
            </div>

            {/* 4. JUMLAH SISWA TIAP PERIODE TRIWULAN & MAKLUMAT DISIPLIN */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* 1 Kolom: Periode Triwulan */}
                <div className="lg:col-span-1">
                    <AcademicPeriodStudentsCard periods={studentsByPeriod} />
                </div>

                {/* 2 Kolom: Jadwal KBM & Maklumat Disiplin */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <ActiveScheduleWidget schedules={activeSchedules} />
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
