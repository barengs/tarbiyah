import React, { useState, useMemo } from 'react';
import { 
    useGetSchedulesQuery, 
    useCreateScheduleMutation, 
    useDeleteScheduleMutation 
} from '../store/slices/scheduleApi';
import { 
    useGetJournalsQuery, 
    useGetJournalQuery,
    useCreateJournalMutation, 
    useUpdatePresencesMutation, 
    useGetJournalRecapQuery 
} from '../store/slices/journalApi';
import { useGetInstitutionsQuery } from '../store/slices/institutionApi';
import { useGetClassGroupsQuery } from '../store/slices/classGroupApi';
import { useGetStudiesQuery } from '../store/slices/studyApi';
import { useGetTeachersQuery } from '../store/slices/teacherApi';
import { useGetLessonHoursQuery } from '../store/slices/lessonHourApi';
import Modal from '../components/ui/Modal';
import FlatTabs from '../components/atoms/FlatTabs';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { 
    Calendar, Plus, Clock, BookOpen, BarChart3, User, MapPin, 
    Trash2, Sun, Moon, Coffee, GraduationCap, Users, LayoutGrid, 
    Table as TableIcon, Columns, Search, Filter, AlertTriangle, CheckCircle2,
    Layers, School, ShieldAlert, Sparkles, Printer, Download
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function ScheduleKbmPage() {
    const [activeTab, setActiveTab] = useState('schedules'); // 'schedules' | 'journals' | 'recap'
    const [viewMode, setViewMode] = useState('daily_master'); // 'daily_master' | 'weekly_matrix' | 'list_table'

    // ═══════════════════════════════════════════════════════════
    // KALENDER AKADEMIK HIJRIYAH BERBASIS TRIWULAN
    // ═══════════════════════════════════════════════════════════
    const [hijriYear, setHijriYear] = useState('1446/1447');
    const [selectedQuarter, setSelectedQuarter] = useState('triwulan_4'); // Triwulan I - IV

    // ═══════════════════════════════════════════════════════════
    // FILTER PROGRAM: KUBAR (Ula, Wustha, Ulya) & TIBYAN (Takhossus)
    // ═══════════════════════════════════════════════════════════
    const [selectedProgram, setSelectedProgram] = useState('all'); // 'all' | 'Kubar' | 'Tibyan'
    const [selectedLevel, setSelectedLevel] = useState('all'); // 'all' | 'Ula' | 'Wustha' | 'Ulya' | 'Takhossus'
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [selectedDayFilter, setSelectedDayFilter] = useState(6); // Default: Sabtu
    const [searchQuery, setSearchQuery] = useState('');
    const [showOnlyClashes, setShowOnlyClashes] = useState(false);

    // Fetch Master Data
    const { data: institutionsData } = useGetInstitutionsQuery();
    const institutions = institutionsData?.data || [];

    const { data: groupsData } = useGetClassGroupsQuery();
    const allGroups = groupsData?.data || [];

    const { data: hoursData } = useGetLessonHoursQuery();
    const lessonHours = hoursData?.data || [];

    const { data: studiesData } = useGetStudiesQuery();
    const studies = studiesData?.data || [];

    const { data: teachersData } = useGetTeachersQuery();
    const teachers = teachersData?.data || [];

    // Fetch All Schedules
    const { data: schedulesData } = useGetSchedulesQuery({});
    const allSchedules = schedulesData?.data || [];

    const [createSchedule, { isLoading: isCreatingSchedule }] = useCreateScheduleMutation();
    const [deleteSchedule] = useDeleteScheduleMutation();

    // ═══════════════════════════════════════════════════════════
    // FILTER ROMBEL BERDASARKAN PROGRAM & JENJANG
    // ═══════════════════════════════════════════════════════════
    const filteredGroups = useMemo(() => {
        let result = allGroups;

        // Filter Program (Kubar / Tibyan)
        if (selectedProgram !== 'all') {
            result = result.filter(g => 
                g.educational_institution?.short_name?.toLowerCase() === selectedProgram.toLowerCase() ||
                g.educational_institution?.name?.toLowerCase().includes(selectedProgram.toLowerCase())
            );
        }

        // Filter Jenjang (Ula, Wustha, Ulya, Takhossus)
        if (selectedLevel !== 'all') {
            result = result.filter(g => 
                g.education?.name?.toLowerCase() === selectedLevel.toLowerCase() ||
                g.name?.toLowerCase().startsWith(selectedLevel.toLowerCase())
            );
        }

        // Search Filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(g => 
                g.name.toLowerCase().includes(q) || 
                g.code.toLowerCase().includes(q) ||
                g.education?.name?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [allGroups, selectedProgram, selectedLevel, searchQuery]);

    // Rombel yang terpilih jika mode weekly matrix
    const currentGroup = useMemo(() => {
        if (selectedGroupId) {
            return allGroups.find(g => Number(g.id) === Number(selectedGroupId)) || filteredGroups[0];
        }
        return filteredGroups[0] || allGroups[0];
    }, [allGroups, filteredGroups, selectedGroupId]);

    const effectiveGroupId = currentGroup?.id;

    // ═══════════════════════════════════════════════════════════
    // DETEKSI BENTROK OTOMATIS (LIVE CLASH DETECTION)
    // ═══════════════════════════════════════════════════════════
    // Memeriksa apakah seorang ustadz mengajar di 2 rombel pada jam dan hari yang sama
    const clashesMap = useMemo(() => {
        const map = {}; // key: `${day}_${hourId}_${teacherId}` => [scheduleId1, scheduleId2...]
        const clashScheduleIds = new Set();

        allSchedules.forEach(s => {
            if (!s.day || !s.lesson_hour_id || !s.teacher_id) return;
            const key = `${s.day}_${s.lesson_hour_id}_${s.teacher_id}`;
            if (!map[key]) {
                map[key] = [];
            }
            map[key].push(s);
            if (map[key].length > 1) {
                map[key].forEach(item => clashScheduleIds.add(item.id));
            }
        });

        return {
            clashScheduleIds,
            totalClashes: clashScheduleIds.size,
        };
    }, [allSchedules]);

    // Data for Journals & Presences
    const { data: journalsData } = useGetJournalsQuery(
        effectiveGroupId ? { class_group_id: effectiveGroupId } : undefined,
        { skip: !effectiveGroupId }
    );
    const journals = journalsData?.data || [];

    const [createJournal, { isLoading: isCreatingJournal }] = useCreateJournalMutation();
    const [updatePresences, { isLoading: isSavingPresences }] = useUpdatePresencesMutation();

    // Recap Data
    const { data: recapData, isLoading: isLoadingRecap } = useGetJournalRecapQuery(
        effectiveGroupId ? { class_group_id: effectiveGroupId } : undefined,
        { skip: !effectiveGroupId }
    );
    const recap = recapData?.data;

    // Modal States
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [journalModalOpen, setJournalModalOpen] = useState(false);
    const [presenceModalJournal, setPresenceModalJournal] = useState(null);
    const [deleteScheduleTarget, setDeleteScheduleTarget] = useState(null);

    // Form Schedule
    const [schedDay, setSchedDay] = useState(6);
    const [schedHourId, setSchedHourId] = useState('');
    const [schedStudyId, setSchedStudyId] = useState('');
    const [schedTeacherId, setSchedTeacherId] = useState('');
    const [schedTargetGroupId, setSchedTargetGroupId] = useState('');
    const [schedClassroomId, setSchedClassroomId] = useState('');

    // Form Journal
    const [jMeetingNo, setJMeetingNo] = useState(1);
    const [jDate, setJDate] = useState(new Date().toISOString().substring(0, 10));
    const [jStudyId, setJStudyId] = useState('');
    const [jTeacherId, setJTeacherId] = useState('');
    const [jTopic, setJTopic] = useState('');
    const [jNotes, setJNotes] = useState('');
    const [presencesMap, setPresencesMap] = useState({});

    const { data: singleJournalData } = useGetJournalQuery(presenceModalJournal?.id, {
        skip: !presenceModalJournal,
    });
    const singleJournal = singleJournalData?.data;

    // ═══════════════════════════════════════════════════════════
    // PETA HARI & JAM MINGGUAN KHAS PESANTREN (SABTU-KAMIS, JUMAT LIBUR)
    // ═══════════════════════════════════════════════════════════
    const days = [
        { id: 6, name: 'Sabtu', short: 'SAB' },
        { id: 7, name: 'Ahad', short: 'AHD' },
        { id: 1, name: 'Senin', short: 'SEN' },
        { id: 2, name: 'Selasa', short: 'SEL' },
        { id: 3, name: 'Rabu', short: 'RAB' },
        { id: 4, name: 'Kamis', short: 'KMI' },
    ];
    const friday = { id: 5, name: 'Jumat', short: 'JUM', is_offday: true };

    const hourIconMap = (h) => {
        const order = h.order;
        if (order === 1) return Sun;
        if (order === 2) return GraduationCap;
        if (order === 3) return Coffee;
        if (order === 4) return Users;
        if (order === 5) return Moon;
        if (order === 6) return BookOpen;
        return Clock;
    };

    // Helper cari jadwal di slot (Day, HourOrder, GroupId)
    const getScheduleCell = (dayId, hourOrder, groupId) => {
        return allSchedules.find(s => 
            Number(s.day) === Number(dayId) && 
            Number(s.lesson_hour?.order) === Number(hourOrder) && 
            Number(s.class_group_id) === Number(groupId)
        ) || null;
    };

    // Handle Quick Slot Click to Add Schedule
    const handleCellClick = (dayId, hourOrder, targetGroupId) => {
        setSchedDay(dayId);
        setSchedHourId(lessonHours.find(h => h.order === hourOrder)?.id || '');
        setSchedTargetGroupId(targetGroupId || effectiveGroupId || filteredGroups[0]?.id || '');
        setSchedStudyId(studies[0]?.id || '');
        setSchedTeacherId(teachers[0]?.id || '');
        setSchedClassroomId('');
        setScheduleModalOpen(true);
    };

    const handleCreateSchedule = async (e) => {
        e.preventDefault();
        try {
            await createSchedule({
                academic_year_id: 1,
                class_group_id: schedTargetGroupId || effectiveGroupId,
                study_id: schedStudyId,
                teacher_id: schedTeacherId,
                lesson_hour_id: schedHourId,
                classroom_id: schedClassroomId || null,
                day: Number(schedDay),
            }).unwrap();
            toast.success('Jadwal pelajaran berhasil ditambahkan ke matriks');
            setScheduleModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menambahkan jadwal');
        }
    };

    const handleOpenPresenceModal = (journal) => {
        setPresenceModalJournal(journal);
        const initial = {};
        if (journal.presences) {
            journal.presences.forEach(p => {
                initial[p.student_id] = { status: p.status, notes: p.notes || '' };
            });
        }
        setPresencesMap(initial);
    };

    const handleCreateJournal = async (e) => {
        e.preventDefault();
        try {
            const res = await createJournal({
                academic_year_id: 1,
                class_group_id: effectiveGroupId,
                study_id: jStudyId,
                teacher_id: jTeacherId,
                meeting_number: Number(jMeetingNo),
                date: jDate,
                topic: jTopic,
                notes: jNotes || null,
            }).unwrap();
            toast.success('Jurnal pertemuan dibuka & presensi disiapkan');
            setJournalModalOpen(false);
            if (res?.data) {
                handleOpenPresenceModal(res.data);
            }
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal membuat jurnal KBM');
        }
    };

    const handleSavePresences = async (e) => {
        e.preventDefault();
        const payload = Object.keys(presencesMap).map((sId) => ({
            student_id: Number(sId),
            status: presencesMap[sId]?.status || 'hadir',
            notes: presencesMap[sId]?.notes || null,
        }));

        try {
            await updatePresences({
                journal_id: presenceModalJournal?.id,
                presences: payload,
            }).unwrap();
            toast.success('Presensi santri berhasil disimpan');
            setPresenceModalJournal(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan presensi');
        }
    };

    return (
        <div className="space-y-6">
            {/* ═══════════════════════════════════════════════════════════
                HEADER KALENDER HIJRIYAH BERBASIS TRIWULAN & PROGRAM
                ═══════════════════════════════════════════════════════════ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-md p-4 shadow-xs">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#093c30] text-emerald-100 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Kalender Hijriyah: {hijriYear} H
                        </span>
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            Triwulan IV (Syawal - Dzulhijjah)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> KBM Aktif
                        </span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                        Matriks Jadwal Pelajaran Pesantren (Triwulan)
                    </h1>
                    <p className="text-xs text-slate-500">
                        Penjadwalan KBM serempak Program <b>Kubar</b> (Ula, Wustha, Ulya) dan <b>Tibyan</b> (Takhossus) dari Sabtu s.d. Kamis.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Pilihan Triwulan */}
                    <select
                        value={selectedQuarter}
                        onChange={(e) => setSelectedQuarter(e.target.value)}
                        className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded bg-white text-slate-800"
                    >
                        <option value="triwulan_1">Triwulan I (Muharram - Rabi'ul Awwal)</option>
                        <option value="triwulan_2">Triwulan II (Rabi'ul Akhir - Jumadil Akhir)</option>
                        <option value="triwulan_3">Triwulan III (Rajab - Ramadhan)</option>
                        <option value="triwulan_4">Triwulan IV (Syawal - Dzulhijjah) &bull; Aktif</option>
                    </select>

                    <button
                        onClick={() => {
                            setSchedDay(6);
                            setSchedHourId(lessonHours[0]?.id || '');
                            setSchedTargetGroupId(effectiveGroupId || filteredGroups[0]?.id || '');
                            setSchedStudyId(studies[0]?.id || '');
                            setSchedTeacherId(teachers[0]?.id || '');
                            setSchedClassroomId('');
                            setScheduleModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#093c30] text-white text-xs font-semibold rounded-md hover:bg-[#064e3b] shadow-xs transition"
                    >
                        <Plus className="w-3.5 h-3.5" /> Tambah Jadwal
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                FILTER PROGRAM & JENJANG BERTINGKAT (KUBAR & TIBYAN)
                ═══════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-4">
                {/* 1. Pemilih Program Utama */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
                        <button
                            onClick={() => { setSelectedProgram('all'); setSelectedLevel('all'); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition ${
                                selectedProgram === 'all'
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Semua Program
                        </button>
                        <button
                            onClick={() => { setSelectedProgram('Kubar'); setSelectedLevel('all'); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition flex items-center gap-1.5 ${
                                selectedProgram === 'Kubar'
                                    ? 'bg-[#093c30] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <School className="w-3.5 h-3.5" /> Program KUBAR (Mu'allimin)
                        </button>
                        <button
                            onClick={() => { setSelectedProgram('Tibyan'); setSelectedLevel('all'); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition flex items-center gap-1.5 ${
                                selectedProgram === 'Tibyan'
                                    ? 'bg-[#093c30] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <BookOpen className="w-3.5 h-3.5" /> Program TIBYAN (Takhossus)
                        </button>
                    </div>

                    {/* Alert Banner jika Terdeteksi Jadwal Bentrok */}
                    {clashesMap.totalClashes > 0 ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
                            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>
                                <b>{clashesMap.totalClashes} Jadwal Ustadz Bentrok</b> di jam yang sama!
                            </span>
                            <button
                                onClick={() => setShowOnlyClashes(!showOnlyClashes)}
                                className="underline font-bold text-rose-900 hover:text-rose-700 ml-1 text-[11px]"
                            >
                                {showOnlyClashes ? 'Tampilkan Semua' : 'Sorot Bentrok'}
                            </button>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Matriks Rapi: Bebas Bentrok Ustadz
                        </div>
                    )}
                </div>

                {/* 2. Sub-Filter Jenjang & Pencarian */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Jenjang Selector */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                            Jenjang:
                        </span>
                        <button
                            onClick={() => setSelectedLevel('all')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded border transition ${
                                selectedLevel === 'all'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Semua Jenjang
                        </button>

                        {(selectedProgram === 'all' || selectedProgram === 'Kubar') && (
                            <>
                                <button
                                    onClick={() => setSelectedLevel('Ula')}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded border transition ${
                                        selectedLevel === 'Ula'
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    Ula (Dasar)
                                </button>
                                <button
                                    onClick={() => setSelectedLevel('Wustha')}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded border transition ${
                                        selectedLevel === 'Wustha'
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    Wustha (Menengah)
                                </button>
                                <button
                                    onClick={() => setSelectedLevel('Ulya')}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded border transition ${
                                        selectedLevel === 'Ulya'
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    Ulya (Atas)
                                </button>
                            </>
                        )}

                        {(selectedProgram === 'all' || selectedProgram === 'Tibyan') && (
                            <button
                                onClick={() => setSelectedLevel('Takhossus')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded border transition ${
                                    selectedLevel === 'Takhossus'
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                Takhossus (Dirasah Kitab)
                            </button>
                        )}
                    </div>

                    {/* Quick Search */}
                    <div className="relative min-w-[240px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                            type="text"
                            placeholder="Cari rombel, mapel, atau ustadz..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                NAVIGASI TAB & VIEW SWITCHER
                ═══════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
                    <FlatTabs
                        tabs={[
                            { id: 'schedules', name: 'Matriks Jadwal Pelajaran', icon: Calendar },
                            { id: 'journals', name: 'Jurnal Mengajar & Presensi', icon: BookOpen },
                            { id: 'recap', name: 'Rekapitulasi Kehadiran', icon: BarChart3 },
                        ]}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                    />

                    {activeTab === 'schedules' && (
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md self-start sm:self-auto">
                            <button
                                onClick={() => setViewMode('daily_master')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition ${
                                    viewMode === 'daily_master'
                                        ? 'bg-white text-emerald-900 shadow-xs font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Matriks Komparasi Seluruh Rombel Berdampingan (Pencegah Bentrok)"
                            >
                                <Columns className="w-3.5 h-3.5" /> Matriks Lintas Rombel
                            </button>

                            <button
                                onClick={() => setViewMode('weekly_matrix')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition ${
                                    viewMode === 'weekly_matrix'
                                        ? 'bg-white text-emerald-900 shadow-xs font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Matriks Mingguan Spesifik 1 Rombel"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" /> Matriks Mingguan
                            </button>

                            <button
                                onClick={() => setViewMode('list_table')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition ${
                                    viewMode === 'list_table'
                                        ? 'bg-white text-emerald-900 shadow-xs font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Tabel Daftar Lengkap"
                            >
                                <TableIcon className="w-3.5 h-3.5" /> Tabel Daftar
                            </button>
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    TAB 1: JADWAL PELAJARAN (MATRIKS REVOLUSIONER)
                    ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'schedules' && (
                    <div className="space-y-4">

                        {/* ───────────────────────────────────────────────────────────
                            MODE 1: MATRIKS LINTAS ROMBEL PER HARI (DAILY MASTER)
                            Solusi utama: Semua rombel ditampilkan berdampingan per jam!
                            ─────────────────────────────────────────────────────────── */}
                        {viewMode === 'daily_master' && (
                            <div className="space-y-4">
                                {/* Selector Hari Pesantren (Sabtu s.d Kamis) */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-3 shadow-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Hari KBM:
                                        </span>
                                        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-md">
                                            {days.map(d => (
                                                <button
                                                    key={d.id}
                                                    onClick={() => setSelectedDayFilter(d.id)}
                                                    className={`px-3 py-1 text-xs font-bold rounded transition ${
                                                        Number(selectedDayFilter) === Number(d.id)
                                                            ? 'bg-[#093c30] text-white shadow-xs'
                                                            : 'text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {d.name} ({d.short})
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="text-xs text-slate-500">
                                        Menampilkan <span className="font-bold text-slate-900">{filteredGroups.length} Rombel</span> &bull; Hari <span className="font-bold text-emerald-800">{days.find(d => d.id === selectedDayFilter)?.name}</span>
                                    </div>
                                </div>

                                {/* Tabel Matriks Sumbu Y = 6 Jam, Sumbu X = Seluruh Rombel */}
                                <div className="overflow-x-auto border border-slate-200 rounded-md bg-white shadow-xs">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                                            <tr>
                                                <th className="sticky left-0 z-20 bg-slate-100 px-4 py-3 text-left font-bold uppercase tracking-wider border-r border-slate-200 w-44 min-w-[11rem]">
                                                    Jam Pelajaran
                                                </th>
                                                {filteredGroups.map(g => (
                                                    <th key={g.id} className="px-3 py-3 text-left font-bold border-r border-slate-200 min-w-[12rem] bg-slate-50">
                                                        <div className="text-[#093c30] text-[13px] font-extrabold">{g.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                                                            {g.educational_institution?.short_name} &bull; {g.education?.name}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lessonHours.map((h, idx) => {
                                                const Icon = hourIconMap(h);
                                                return (
                                                    <tr key={h.id} className={idx % 2 !== 0 ? 'bg-slate-50/25' : ''}>
                                                        {/* Sticky Left: Sesi Jam */}
                                                        <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-b border-slate-200 min-w-[11rem]">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded bg-[#093c30]/5 text-[#093c30] flex items-center justify-center shrink-0">
                                                                    <Icon className="w-3.5 h-3.5" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-900 text-xs">{h.name}</div>
                                                                    <div className="text-[10px] text-slate-500 font-mono">
                                                                        {h.start_time?.substring(0, 5)} - {h.end_time?.substring(0, 5)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Sel Matriks per Rombel */}
                                                        {filteredGroups.map(g => {
                                                            const sched = getScheduleCell(selectedDayFilter, h.order, g.id);
                                                            const isClashing = sched && clashesMap.clashScheduleIds.has(sched.id);

                                                            if (showOnlyClashes && !isClashing) {
                                                                return (
                                                                    <td key={g.id} className="border-b border-r border-slate-200 p-1.5 opacity-30">
                                                                        <div className="h-10 bg-slate-50 rounded" />
                                                                    </td>
                                                                );
                                                            }

                                                            return (
                                                                <td key={g.id} className="border-b border-r border-slate-200 p-1.5 min-w-[12rem]">
                                                                    {sched ? (
                                                                        <div className={`relative group block p-2.5 rounded-md border transition h-full ${
                                                                            isClashing
                                                                                ? 'bg-rose-50 border-rose-300 hover:border-rose-400'
                                                                                : 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50'
                                                                        }`}>
                                                                            {/* Badge Peringatan Bentrok */}
                                                                            {isClashing && (
                                                                                <div className="mb-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white">
                                                                                    <AlertTriangle className="w-2.5 h-2.5" /> BENTROK USTADZ
                                                                                </div>
                                                                            )}

                                                                            <p className={`font-bold text-xs leading-tight ${isClashing ? 'text-rose-950' : 'text-slate-900'}`}>
                                                                                {sched.study?.name}
                                                                            </p>
                                                                            <p className={`text-[11px] mt-1 flex items-center gap-1 font-medium ${isClashing ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>
                                                                                <User className="w-3 h-3 text-slate-400" />
                                                                                {sched.teacher?.name}
                                                                            </p>
                                                                            {sched.classroom?.name && (
                                                                                <div className="mt-1 text-[10px] text-emerald-800 font-semibold flex items-center gap-1">
                                                                                    <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                                                                                    Ruang {sched.classroom?.name}
                                                                                </div>
                                                                            )}

                                                                            {/* Tombol Hapus */}
                                                                            <button
                                                                                onClick={() => setDeleteScheduleTarget(sched)}
                                                                                className="absolute top-1.5 right-1.5 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition p-1"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleCellClick(selectedDayFilter, h.order, g.id)}
                                                                            className="w-full h-full min-h-[55px] border-2 border-dashed border-slate-100 hover:border-[#093c30]/20 hover:bg-[#093c30]/[0.02] transition rounded-md flex items-center justify-center group"
                                                                        >
                                                                            <span className="text-[10px] font-medium text-slate-300 group-hover:text-[#093c30] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                                                <Plus className="w-3 h-3" /> Isi
                                                                            </span>
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ───────────────────────────────────────────────────────────
                            MODE 2: MATRIKS MINGGUAN PER ROMBEL TERPILIH
                            ─────────────────────────────────────────────────────────── */}
                        {viewMode === 'weekly_matrix' && (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Pilih Rombel:
                                        </span>
                                        <select
                                            value={effectiveGroupId || ''}
                                            onChange={(e) => setSelectedGroupId(e.target.value)}
                                            className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white text-slate-900"
                                        >
                                            {filteredGroups.map(g => (
                                                <option key={g.id} value={g.id}>
                                                    {g.name} &bull; {g.educational_institution?.short_name} ({g.education?.name})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        Wali Kelas: <span className="font-semibold text-slate-800">{currentGroup?.homeroom_teacher?.name || '-'}</span> | Kapasitas: {currentGroup?.capacity || 35} Santri
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-slate-200 rounded-md bg-white shadow-xs">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                                            <tr>
                                                <th className="sticky left-0 z-10 bg-slate-100 px-4 py-3 text-left font-bold uppercase tracking-wider border-r border-slate-200 w-44 min-w-[11rem]">
                                                    Jam Pelajaran
                                                </th>
                                                {days.map((d) => (
                                                    <th key={d.id} className="px-3 py-3 text-left font-bold uppercase tracking-wider border-r border-slate-200 min-w-[11rem]">
                                                        <span className="text-[#093c30]">{d.name}</span>
                                                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 uppercase">{d.short}</span>
                                                    </th>
                                                ))}
                                                <th className="px-3 py-3 text-left font-bold uppercase tracking-wider min-w-[11rem] bg-slate-100/60 text-slate-500">
                                                    <span className="text-slate-600">{friday.name}</span>
                                                    <span className="block text-[10px] text-slate-400 font-medium mt-0.5 uppercase">Libur Ma'had</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lessonHours.map((h, idx) => {
                                                const Icon = hourIconMap(h);
                                                return (
                                                    <tr key={h.id} className={idx % 2 !== 0 ? 'bg-slate-50/20' : ''}>
                                                        <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-b border-slate-200 min-w-[11rem]">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded bg-[#093c30]/5 text-[#093c30] flex items-center justify-center shrink-0">
                                                                    <Icon className="w-3.5 h-3.5" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-900 text-xs">{h.name}</div>
                                                                    <div className="text-[10px] text-slate-500 font-mono">
                                                                        {h.start_time?.substring(0, 5)} - {h.end_time?.substring(0, 5)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {days.map((d) => {
                                                            const sched = getScheduleCell(d.id, h.order, effectiveGroupId);
                                                            const isClashing = sched && clashesMap.clashScheduleIds.has(sched.id);

                                                            return (
                                                                <td key={d.id} className="border-b border-r border-slate-200 p-1.5 min-w-[11rem]">
                                                                    {sched ? (
                                                                        <div className={`relative group block p-2.5 rounded-md border transition h-full ${
                                                                            isClashing
                                                                                ? 'bg-rose-50 border-rose-300'
                                                                                : 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50'
                                                                        }`}>
                                                                            {isClashing && (
                                                                                <div className="mb-1 text-[9px] font-bold text-rose-600 flex items-center gap-1">
                                                                                    <AlertTriangle className="w-2.5 h-2.5" /> BENTROK JAM
                                                                                </div>
                                                                            )}
                                                                            <p className="font-bold text-slate-900 text-xs leading-tight">
                                                                                {sched.study?.name}
                                                                            </p>
                                                                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                                                                <User className="w-3 h-3 text-slate-400" />
                                                                                {sched.teacher?.name}
                                                                            </p>
                                                                            {sched.classroom?.name && (
                                                                                <div className="mt-1 text-[10px] text-emerald-800 font-semibold flex items-center gap-1">
                                                                                    <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                                                                                    Ruang {sched.classroom?.name}
                                                                                </div>
                                                                            )}
                                                                            <button
                                                                                onClick={() => setDeleteScheduleTarget(sched)}
                                                                                className="absolute top-1.5 right-1.5 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition p-1"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleCellClick(d.id, h.order, effectiveGroupId)}
                                                                            className="w-full h-full min-h-[55px] border-2 border-dashed border-slate-100 hover:border-[#093c30]/20 hover:bg-[#093c30]/[0.02] transition rounded-md flex items-center justify-center group"
                                                                        >
                                                                            <span className="text-[10px] font-medium text-slate-300 group-hover:text-[#093c30] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                                                <Plus className="w-3 h-3" /> Isi Slot
                                                                            </span>
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}

                                                        <td className="border-b border-slate-200 p-1.5 min-w-[11rem]">
                                                            <div className="h-full w-full bg-slate-50/50 border border-slate-100 rounded-md p-2.5 text-slate-400 italic text-[11px] leading-relaxed flex flex-col justify-center">
                                                                <div className="flex items-center gap-1 text-slate-500 not-italic font-semibold text-xs">
                                                                    <Clock className="w-3 h-3 text-slate-400" /> Libur / Shalat Jumat
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 not-italic mt-0.5">
                                                                    Kegiatan mandiri santri & shalat berjamaah.
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ───────────────────────────────────────────────────────────
                            MODE 3: TABEL DAFTAR LENGKAP (SEPERTI SISTEM SEBELUMNYA)
                            ─────────────────────────────────────────────────────────── */}
                        {viewMode === 'list_table' && (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-3">
                                    <div className="text-xs text-slate-500">
                                        Total Data: <span className="font-bold text-slate-900">{allSchedules.length} Sesi Terjadwal</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => window.print()}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-700"
                                        >
                                            <Printer className="w-3.5 h-3.5 text-slate-500" /> Cetak Jadwal
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-slate-200 rounded-md bg-white shadow-xs">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold tracking-wider text-[11px]">
                                            <tr>
                                                <th className="px-3 py-2.5 text-left">Program</th>
                                                <th className="px-3 py-2.5 text-left">Jenjang</th>
                                                <th className="px-3 py-2.5 text-left">Rombel</th>
                                                <th className="px-3 py-2.5 text-left">Hari</th>
                                                <th className="px-3 py-2.5 text-left">Mata Pelajaran</th>
                                                <th className="px-3 py-2.5 text-left">Ustadz Pengampu</th>
                                                <th className="px-3 py-2.5 text-left">Waktu KBM</th>
                                                <th className="px-3 py-2.5 text-left">Ruang</th>
                                                <th className="px-3 py-2.5 text-center">Status</th>
                                                <th className="px-3 py-2.5 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {allSchedules.map((s, idx) => {
                                                const isClashing = clashesMap.clashScheduleIds.has(s.id);
                                                return (
                                                    <tr key={s.id || idx} className={`hover:bg-slate-50/60 transition ${isClashing ? 'bg-rose-50/40' : ''}`}>
                                                        <td className="px-3 py-2 font-bold text-slate-900">
                                                            {s.class_group?.educational_institution?.short_name || 'Kubar'}
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-700">
                                                            {s.class_group?.education?.name || '-'}
                                                        </td>
                                                        <td className="px-3 py-2 font-bold text-[#093c30]">
                                                            {s.class_group?.name}
                                                        </td>
                                                        <td className="px-3 py-2 font-semibold text-emerald-800">
                                                            {getDayName(s.day)}
                                                        </td>
                                                        <td className="px-3 py-2 font-bold text-slate-900">
                                                            {s.study?.name}
                                                        </td>
                                                        <td className={`px-3 py-2 ${isClashing ? 'font-bold text-rose-700' : 'text-slate-600'}`}>
                                                            {s.teacher?.name}
                                                            {isClashing && <span className="ml-1 text-[10px] text-rose-600">(Bentrok)</span>}
                                                        </td>
                                                        <td className="px-3 py-2 font-mono text-slate-600">
                                                            {s.lesson_hour?.start_time?.substring(0, 5)} - {s.lesson_hour?.end_time?.substring(0, 5)}
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-500">
                                                            {s.classroom?.name ? `Ruang ${s.classroom?.name}` : '-'}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                Aktif
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            <button
                                                                onClick={() => setDeleteScheduleTarget(s)}
                                                                className="text-slate-300 hover:text-rose-600 p-1 transition"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    TAB 2: JURNAL & PRESENSI KBM
                    ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'journals' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Riwayat Jurnal Pertemuan KBM &bull; {currentGroup?.name}
                            </span>
                            <button
                                onClick={() => {
                                    setJMeetingNo((journals.length || 0) + 1);
                                    setJStudyId(studies[0]?.id || '');
                                    setJTeacherId(teachers[0]?.id || '');
                                    setJTopic('');
                                    setJNotes('');
                                    setJournalModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#093c30] text-white text-xs font-semibold rounded-md hover:bg-[#064e3b] shadow-xs"
                            >
                                <Plus className="w-4 h-4" /> Buka Jurnal Pertemuan Baru
                            </button>
                        </div>

                        <div className="space-y-3">
                            {journals.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-md">
                                    Belum ada jurnal pertemuan KBM yang dibuka untuk rombel ini.
                                </div>
                            ) : (
                                journals.map((j) => (
                                    <div key={j.id} className="p-4 bg-white border border-slate-200 rounded-md shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                                                    Pertemuan Ke-{j.meeting_number}
                                                </span>
                                                <span className="text-xs text-slate-400 font-mono">
                                                    {j.date ? new Date(j.date).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}
                                                </span>
                                            </div>
                                            <p className="font-semibold text-slate-800 text-sm">{j.study?.name}</p>
                                            <p className="text-xs text-slate-500">Materi: {j.topic}</p>
                                            <p className="text-xs text-slate-500">Diampu oleh: {j.teacher?.name || '-'}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleOpenPresenceModal(j)}
                                                className="px-3.5 py-2 bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-100 hover:bg-emerald-100 rounded-md"
                                            >
                                                Absensi Santri
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    TAB 3: REKAP PRESENSI SANTRI
                    ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'recap' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Rekapitulasi Kehadiran Santri &bull; {currentGroup?.name}
                            </span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-xs overflow-x-auto">
                            {isLoadingRecap ? (
                                <div className="p-12 text-center text-slate-400">Memuat rekap kehadiran...</div>
                            ) : recap?.students ? (
                                <div className="space-y-3">
                                    <div className="text-sm text-slate-500 mb-2">
                                        Total Pertemuan KBM: <span className="font-bold text-slate-900">{journals.length}</span>
                                    </div>
                                    {recap.students.map((st) => (
                                        <div key={st.student_id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 last:border-0">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{st.name}</p>
                                                <p className="text-slate-400 font-mono text-xs">NIS: {st.nis}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex gap-2 text-xs">
                                                    <span className="text-emerald-700 font-semibold">{st.hadir} Hadir</span>
                                                    <span className="text-blue-700 font-semibold">{st.izin} Izin</span>
                                                    <span className="text-amber-700 font-semibold">{st.sakit} Sakit</span>
                                                    <span className="text-rose-700 font-semibold">{st.alpa} Alpa</span>
                                                </div>
                                                <div className="w-32 flex items-center gap-2">
                                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500"
                                                            style={{ width: `${st.percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-bold w-10 ${st.percentage >= 80 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                        {st.percentage}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 py-6 text-center">Belum ada data rekap presensi untuk rombel ini.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Tambah / Edit Jadwal */}
            <Modal
                open={scheduleModalOpen}
                title="Jadwalkan Mata Pelajaran Baru"
                onClose={() => setScheduleModalOpen(false)}
            >
                <form onSubmit={handleCreateSchedule} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Rombel / Kelas Target
                        </label>
                        <select
                            value={schedTargetGroupId || effectiveGroupId}
                            onChange={(e) => setSchedTargetGroupId(e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            {allGroups.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name} &bull; {g.educational_institution?.short_name} ({g.education?.name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Hari KBM (Sabtu - Kamis)
                            </label>
                            <select
                                value={schedDay}
                                onChange={(e) => setSchedDay(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                            >
                                {days.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Sesi / Jam Pelajaran
                            </label>
                            <select
                                value={schedHourId}
                                onChange={(e) => setSchedHourId(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                            >
                                {lessonHours.map((h) => (
                                    <option key={h.id} value={h.id}>
                                        {h.name} ({h.start_time?.substring(0, 5)} - {h.end_time?.substring(0, 5)})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Mata Pelajaran
                            </label>
                            <select
                                value={schedStudyId}
                                onChange={(e) => setSchedStudyId(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                            >
                                {studies.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name} {s.category ? `(${s.category})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Ruang (Opsional)
                            </label>
                            <select
                                value={schedClassroomId}
                                onChange={(e) => setSchedClassroomId(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                            >
                                <option value="">Tanpa Ruangan Khusus</option>
                                <option value="1">Ruang Ula 1</option>
                                <option value="2">Ruang Wustha 1</option>
                                <option value="3">Ruang Ulya 1</option>
                                <option value="4">Ruang Takhossus 1</option>
                                <option value="5">Ruang Takhossus 2</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Ustadz / Guru Pengampu
                        </label>
                        <select
                            value={schedTeacherId}
                            onChange={(e) => setSchedTeacherId(e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => setScheduleModalOpen(false)}
                            className="px-3.5 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-md"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreatingSchedule || !schedStudyId || !schedTeacherId || !schedHourId}
                            className="px-4 py-2 bg-[#093c30] text-white text-sm font-semibold rounded-md disabled:opacity-50 hover:bg-[#064e3b]"
                        >
                            Simpan Jadwal
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Buka Jurnal */}
            <Modal
                open={journalModalOpen}
                title="Buka Jurnal Pertemuan KBM Baru"
                onClose={() => setJournalModalOpen(false)}
            >
                <form onSubmit={handleCreateJournal} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Pertemuan Ke-
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={jMeetingNo}
                                onChange={(e) => setJMeetingNo(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Tanggal KBM
                            </label>
                            <input
                                type="date"
                                value={jDate}
                                onChange={(e) => setJDate(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Mata Pelajaran
                        </label>
                        <select
                            value={jStudyId}
                            onChange={(e) => setJStudyId(e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            {studies.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Ustadz / Guru Pengajar
                        </label>
                        <select
                            value={jTeacherId}
                            onChange={(e) => setJTeacherId(e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Materi / Topik Hari Ini
                        </label>
                        <input
                            type="text"
                            placeholder="Contoh: Kajian Kitab Fathul Qorib Bab Thaharah"
                            value={jTopic}
                            onChange={(e) => setJTopic(e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Catatan Tambahan (Opsional)
                        </label>
                        <textarea
                            rows={3}
                            value={jNotes}
                            onChange={(e) => setJNotes(e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => setJournalModalOpen(false)}
                            className="px-3.5 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-md"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreatingJournal}
                            className="px-4 py-2 bg-[#093c30] text-white text-sm font-semibold rounded-md disabled:opacity-50 hover:bg-[#064e3b]"
                        >
                            Buka Jurnal & Absensi
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Absensi Santri */}
            <Modal
                open={!!presenceModalJournal}
                title={`Presensi Santri - Pertemuan ${singleJournal?.meeting_number || 'Ke-?'} (${singleJournal?.study?.name})`}
                onClose={() => setPresenceModalJournal(null)}
            >
                {singleJournal?.students ? (
                    <form onSubmit={handleSavePresences} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="text-xs text-slate-500 border border-slate-100 bg-slate-50 rounded p-2">
                            Status: <b className="text-emerald-700">Hadir</b> / <b className="text-blue-700">Izin</b> / <b className="text-amber-700">Sakit</b> / <b className="text-rose-700">Alpa</b>
                        </div>
                        {singleJournal.students.map((st) => (
                            <div key={st.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 border border-slate-200 rounded-md">
                                <div className="flex-1">
                                    <div className="font-semibold text-sm">{st.name}</div>
                                    <div className="text-xs text-slate-400">NIS: {st.nis}</div>
                                </div>
                                <select
                                    value={presencesMap[st.id]?.status || singleJournal.presences?.find(p => p.student_id === st.id)?.status || 'hadir'}
                                    onChange={(e) => setPresencesMap((m) => ({ ...m, [st.id]: { ...m[st.id], status: e.target.value } }))}
                                    className="px-2 py-1.5 border border-slate-300 rounded text-xs sm:w-32"
                                >
                                    <option value="hadir">Hadir</option>
                                    <option value="izin">Izin</option>
                                    <option value="sakit">Sakit</option>
                                    <option value="alpa">Alpa</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Catatan (opsional)"
                                    value={presencesMap[st.id]?.notes || ''}
                                    onChange={(e) => setPresencesMap((m) => ({ ...m, [st.id]: { ...m[st.id], notes: e.target.value } }))}
                                    className="px-2 py-1.5 border border-slate-300 rounded text-xs flex-1"
                                />
                            </div>
                        ))}
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="submit"
                                disabled={isSavingPresences}
                                className="px-4 py-2 bg-[#093c30] text-white text-sm font-semibold rounded-md disabled:opacity-50 hover:bg-[#064e3b]"
                            >
                                Simpan Absensi Santri
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="p-6 text-center text-slate-400">Memuat daftar santri...</div>
                )}
            </Modal>

            {/* Confirm Dialog Hapus Jadwal */}
            <ConfirmDialog
                open={!!deleteScheduleTarget}
                title="Hapus Jadwal Pelajaran"
                message={`Yakin ingin menghapus jadwal "${deleteScheduleTarget?.study?.name}" pada hari ${getDayName(deleteScheduleTarget?.day)} di ${deleteScheduleTarget?.lesson_hour?.name}?`}
                confirmLabel="Ya, Hapus Jadwal"
                onConfirm={async () => {
                    try {
                        await deleteSchedule(deleteScheduleTarget.id).unwrap();
                        toast.success('Jadwal berhasil dihapus');
                        setDeleteScheduleTarget(null);
                    } catch (err) {
                        toast.error(err?.data?.message || 'Gagal menghapus jadwal');
                    }
                }}
                onCancel={() => setDeleteScheduleTarget(null)}
            />
        </div>
    );
}

// Helper Nama Hari Pesantren
function getDayName(dayId) {
    const m = { 6: 'Sabtu', 7: 'Ahad', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat (Libur)' };
    return m[dayId] || 'Tidak Diketahui';
}
