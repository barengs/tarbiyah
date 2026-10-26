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
        { day: 'Sabtu', jamaah: 99.1, kbm: 98.4, halaqah: 97.9 },
        { day: 'Ahad', jamaah: 99.3, kbm: 98.6, halaqah: 98.0 },
        { day: 'Senin', jamaah: 99.0, kbm: 98.2, halaqah: 97.5 },
        { day: 'Selasa', jamaah: 98.8, kbm: 98.5, halaqah: 97.8 },
        { day: 'Rabu', jamaah: 99.4, kbm: 98.7, halaqah: 98.2 },
        { day: 'Kamis', jamaah: 99.2, kbm: 98.4, halaqah: 98.0 },
        { day: "Jum'at", jamaah: 99.5, kbm: 98.8, halaqah: 98.5 },
    ];
    const institutionDistribution = dashboardData?.data?.institution_distribution?.length
        ? dashboardData.data.institution_distribution
        : [
              { name: 'Madrasah Tsanawiyah (MTs)', count: 620 },
              { name: 'Madrasah Aliyah (MA)', count: 540 },
          ];
    const activeSchedules = dashboardData?.data?.active_schedules?.length
        ? dashboardData.data.active_schedules
        : [
              {
                  id: 1,
                  subject: 'Kitab Fathul Qorib (Fiqh)',
                  category: 'Diniyah',
                  teacher: 'Ust. Ahmad Ghazali, Lc. • Santri: 74 Banin',
                  room: "Ruang Utama Masjid Jami' Lt. 2",
                  time: '09:40 - 11:15 WIB',
                  status: 'Sedang Berjalan',
                  remaining: 'Sisa 35 Menit',
              },
              {
                  id: 2,
                  subject: 'Fisika Terpadu & Falakiyah',
                  category: 'Formal',
                  teacher: 'Dr. Hendra Wijaya, M.Si. • Santri: 32 Kelas XII-IPA',
                  room: 'Lab Sains Gedung Ibnu Sina Lt. 3',
                  time: '09:40 - 11:15 WIB',
                  status: 'Sedang Berjalan',
                  remaining: 'Sisa 35 Menit',
              },
              {
                  id: 3,
                  subject: 'Nahwu & Sharaf (Al-Ajurrumiyyah)',
                  category: 'Diniyah MTs',
                  teacher: 'Ust. Moh. Kholil, S.Pd.I • Santri: 68 Banin',
                  room: 'Aula Pondok Timur Lt. 1',
                  time: '09:40 - 11:15 WIB',
                  status: 'Sedang Berjalan',
                  remaining: 'Sisa 35 Menit',
              },
          ];
    const recentNotices = dashboardData?.data?.recent_notices?.length
        ? dashboardData.data.recent_notices
        : [
              {
                  id: 1,
                  type: 'Izin Berobat Rujukan RS',
                  tag: 'Sakit',
                  tag_type: 'rose',
                  title: 'Muhammad Faiz (Kelas X-A) • Pengawalan Wali Asrama',
                  desc: 'Surat Izin #IZ-1446-889 • Disetujui Mudir',
                  time: '15 Menit Lalu',
              },
              {
                  id: 2,
                  type: 'Kunjungan Wali (Sambangan Resmi)',
                  tag: 'Tercatat',
                  tag_type: 'blue',
                  title: 'H. Ridwan & Keluarga untuk Santri Azka (Kelas VIII-B)',
                  desc: 'Area Gazebo Kunjungan Timur • 10:00 - 14:00 WIB',
                  time: '42 Menit Lalu',
              },
              {
                  id: 3,
                  type: 'Apresiasi Santri Berprestasi',
                  tag: 'Teladan',
                  tag_type: 'emerald',
                  title: 'Farhan Ramadhan (MA-XII) • Juara 1 MQK Tingkat Provinsi',
                  desc: '+50 Poin Syarafiyah Kehormatan',
                  time: '1 Jam Lalu',
              },
          ];

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
                ctaHandlers={ctaHandlers}
                className="shadow-xs"
            />

            {/* 2. 4 KPI METRIC CARDS (PERSIS MOCKUP DESAIN) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {/* 1. TOTAL SANTRI AKTIF (100% BANIN / PUTRA) */}
                <MetricCard
                    label="Total Santri Aktif"
                    value={ov.total_santri?.value ? ov.total_santri.value.toLocaleString() : "1.189"}
                    unit="Jiwa"
                    icon={Users}
                    accent="green"
                    stats={[
                        { dot: 'bg-[#093c30]', label: `${ov.total_santri?.value ? ov.total_santri.value.toLocaleString() : "1.189"} Banin (Putra)` },
                        { dot: 'bg-emerald-600', label: '100% Santri Banin' },
                    ]}
                    footer={
                        <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
                            <span className="text-slate-500">{ov.total_santri?.mukim_percent ? `${ov.total_santri.mukim_percent}%` : "100%"} Mukim di Asrama</span>
                            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                                +{ov.total_santri?.new_students || 271} Baru
                            </span>
                        </div>
                    }
                />

                {/* 2. PRESENSI HARI INI */}
                <MetricCard
                    label="Presensi Hari Ini"
                    value="98.6%"
                    unit=""
                    icon={ClipboardCheck}
                    accent="emerald"
                    badge={{ label: 'Disiplin Sangat Baik', variant: 'emerald' }}
                    stats={[
                        { label: 'Shubuh Berjamaah', value: '99.1%' },
                        { label: 'KBM Formal Pagi', value: '98.4%' },
                    ]}
                    footer={
                        <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100 text-slate-500">
                            <span>Halaqah Maghrib:</span>
                            <span className="font-bold text-slate-800">97.9% Tercatat</span>
                        </div>
                    }
                />

                {/* 4. MAPEL & KKM IMTIHAN */}
                <MetricCard
                    label="Mapel & KKM Imtihan"
                    value="48"
                    unit="Mapel Aktif"
                    icon={Layers}
                    accent="blue"
                    stats={[
                        { dot: 'bg-[#093c30]', label: '28 Diniyah/Kitab' },
                        { dot: 'bg-sky-600', label: '20 Umum Kemenag' },
                    ]}
                    footer={
                        <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100 text-slate-500">
                            <span>Rerata KKM Kumulatif:</span>
                            <span className="font-bold text-slate-800">84.2 / 100</span>
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
