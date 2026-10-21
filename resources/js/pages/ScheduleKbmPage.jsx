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
    Table as TableIcon, Columns, Search, Filter, Printer, Download,
    CheckCircle2
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function ScheduleKbmPage() {
    const [activeTab, setActiveTab] = useState('schedules'); // 'schedules' | 'journals' | 'recap'
    const [viewMode, setViewMode] = useState('weekly_matrix'); // 'weekly_matrix' | 'daily_cross' | 'list_table'

    // ═══════════════════════════════════════════════════════════
    // FILTER BERTINGKAT: JENJANG -> KELAS -> ROMBEL & SEARCH
    // ═══════════════════════════════════════════════════════════
    const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
    const [selectedEducationId, setSelectedEducationId] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [selectedDayFilter, setSelectedDayFilter] = useState(6); // Default Sabtu untuk Daily Cross Matrix
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch Master Data
    const { data: institutionsData } = useGetInstitutionsQuery();
    const institutions = institutionsData?.data || [];

    const { data: groupsData } = useGetClassGroupsQuery();
    const allGroups = groupsData?.data || [];

    // Filter Rombel berdasarkan Jenjang & Kelas
    const filteredGroupsByInstitution = useMemo(() => {
        if (!selectedInstitutionId) return allGroups;
        return allGroups.filter(g => Number(g.educational_institution_id) === Number(selectedInstitutionId));
    }, [allGroups, selectedInstitutionId]);

    // Opsi Kelas unik yang tersedia berdasarkan Jenjang yang dipilih
    const availableEducations = useMemo(() => {
        const map = new Map();
        filteredGroupsByInstitution.forEach(g => {
            if (g.education) {
                map.set(g.education.id, g.education);
            }
        });
        return Array.from(map.values());
    }, [filteredGroupsByInstitution]);

    const filteredGroups = useMemo(() => {
        let result = filteredGroupsByInstitution;
        if (selectedEducationId) {
            result = result.filter(g => Number(g.education_id) === Number(selectedEducationId));
        }
        return result;
    }, [filteredGroupsByInstitution, selectedEducationId]);

    // Current Active Group (Rombel yang dipilih untuk Weekly Matrix)
    const currentGroup = useMemo(() => {
        if (selectedGroupId) {
            return filteredGroups.find(g => Number(g.id) === Number(selectedGroupId)) || filteredGroups[0];
        }
        return filteredGroups[0] || allGroups[0];
    }, [filteredGroups, selectedGroupId, allGroups]);

    const effectiveGroupId = currentGroup?.id;

    // Fetch Schedules (Ambil semua jika view mode cross rombel / list table, atau filter rombel jika weekly matrix)
    const { data: schedulesData, isLoading: isLoadingSchedules } = useGetSchedulesQuery(
        viewMode === 'weekly_matrix' && effectiveGroupId ? { class_group_id: effectiveGroupId } : {}
    );
    const rawSchedules = schedulesData?.data || [];

    // Master pendukung
    const { data: hoursData } = useGetLessonHoursQuery();
    const lessonHours = hoursData?.data || [];

    const { data: studiesData } = useGetStudiesQuery();
    const studies = studiesData?.data || [];

    const { data: teachersData } = useGetTeachersQuery();
    const teachers = teachersData?.data || [];

    const [createSchedule, { isLoading: isCreatingSchedule }] = useCreateScheduleMutation();
    const [deleteSchedule] = useDeleteScheduleMutation();

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

    // Ambil jadwal di slot (Day, HourOrder, GroupId)
    const getScheduleWeekly = (dayId, hourOrder) => {
        if (!effectiveGroupId) return null;
        return rawSchedules.find(s => 
            Number(s.day) === Number(dayId) && 
            Number(s.lesson_hour?.order) === Number(hourOrder) && 
            Number(s.class_group_id) === Number(effectiveGroupId)
        ) || null;
    };

    const getScheduleCross = (groupId, hourOrder) => {
        return rawSchedules.find(s => 
            Number(s.day) === Number(selectedDayFilter) && 
            Number(s.lesson_hour?.order) === Number(hourOrder) && 
            Number(s.class_group_id) === Number(groupId)
        ) || null;
    };

    // Filtered list data for List Table View
    const filteredListSchedules = useMemo(() => {
        let list = rawSchedules;
        if (selectedInstitutionId) {
            list = list.filter(s => Number(s.class_group?.educational_institution_id) === Number(selectedInstitutionId));
        }
        if (selectedEducationId) {
            list = list.filter(s => Number(s.class_group?.education_id) === Number(selectedEducationId));
        }
        if (selectedGroupId) {
            list = list.filter(s => Number(s.class_group_id) === Number(selectedGroupId));
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(s => 
                s.study?.name?.toLowerCase().includes(q) ||
                s.teacher?.name?.toLowerCase().includes(q) ||
                s.class_group?.name?.toLowerCase().includes(q) ||
                s.class_group?.code?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [rawSchedules, selectedInstitutionId, selectedEducationId, selectedGroupId, searchQuery]);

    // Handle Quick Slot Click to Add Schedule
    const handleCellClick = (dayId, hourOrder, targetGroupId = null) => {
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
            toast.error(err?.data?.message || 'Gagal menambahkan jadwal ke matriks');
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
            {/* Header Laman & Aksi Utama */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Jadwal & Matriks Pelajaran</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Penyajian matriks terpadu berjenjang: Tingkat Pendidikan, Kelas, dan Rombel (Sabtu s.d Kamis, libur hari Jumat).
                    </p>
                </div>

                <div className="flex items-center gap-2">
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
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#093c30] text-white text-xs font-semibold rounded-md hover:bg-[#064e3b] shadow-xs transition"
                    >
                        <Plus className="w-4 h-4" /> Tambah Jadwal Pelajaran
                    </button>
                </div>
            </div>

            {/* BAR FILTER BERJENJANG (CASCADING FILTER) */}
            <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-emerald-600" /> Filter Hierarki Pendidikan
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                        Tahun Ajaran: 1447/1448 H (Genap)
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* 1. Tingkat / Jenjang Pendidikan */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Tingkat Pendidikan
                        </label>
                        <select
                            value={selectedInstitutionId}
                            onChange={(e) => {
                                setSelectedInstitutionId(e.target.value);
                                setSelectedEducationId('');
                                setSelectedGroupId('');
                            }}
                            className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
                        >
                            <option value="">Semua Tingkat Pendidikan</option>
                            {institutions.map(inst => (
                                <option key={inst.id} value={inst.id}>{inst.name} ({inst.short_name})</option>
                            ))}
                        </select>
                    </div>

                    {/* 2. Kelas */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Kelas / Tingkat
                        </label>
                        <select
                            value={selectedEducationId}
                            onChange={(e) => {
                                setSelectedEducationId(e.target.value);
                                setSelectedGroupId('');
                            }}
                            className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
                        >
                            <option value="">Semua Kelas</option>
                            {availableEducations.map(ed => (
                                <option key={ed.id} value={ed.id}>{ed.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Rombel */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Rombel (Rombongan Belajar)
                        </label>
                        <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
                        >
                            <option value="">{viewMode === 'weekly_matrix' ? 'Pilih Rombel Tertentu' : 'Semua Rombel Tersaring'}</option>
                            {filteredGroups.map(g => (
                                <option key={g.id} value={g.id}>
                                    {g.name} ({g.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 4. Pencarian Cepat */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Pencarian Cepat
                        </label>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                            <input
                                type="text"
                                placeholder="Cari ustadz, mapel, atau rombel..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB NAVIGASI & MODE PENYAJIAN VIEW SWITCHER */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
                    <FlatTabs
                        tabs={[
                            { id: 'schedules', name: 'Jadwal & Matriks KBM', icon: Calendar },
                            { id: 'journals', name: 'Jurnal Mengajar & Presensi', icon: BookOpen },
                            { id: 'recap', name: 'Rekap Kehadiran Santri', icon: BarChart3 },
                        ]}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                    />

                    {/* View Mode Switcher Khusus Tab Jadwal */}
                    {activeTab === 'schedules' && (
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md self-start sm:self-auto">
                            <button
                                onClick={() => setViewMode('weekly_matrix')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition ${
                                    viewMode === 'weekly_matrix'
                                        ? 'bg-white text-emerald-900 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Matriks Mingguan per Rombel (Sabtu - Kamis)"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" /> Matriks Mingguan
                            </button>

                            <button
                                onClick={() => setViewMode('daily_cross')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition ${
                                    viewMode === 'daily_cross'
                                        ? 'bg-white text-emerald-900 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Matriks Komparasi Antar-Rombel per Hari"
                            >
                                <Columns className="w-3.5 h-3.5" /> Matriks Lintas Rombel
                            </button>

                            <button
                                onClick={() => setViewMode('list_table')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition ${
                                    viewMode === 'list_table'
                                        ? 'bg-white text-emerald-900 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Tabel Daftar Lengkap seperti Sistem Sebelumnya"
                            >
                                <TableIcon className="w-3.5 h-3.5" /> Tabel Daftar
                            </button>
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    TAB 1: JADWAL PELAJARAN (3 MODE PENYAJIAN)
                    ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'schedules' && (
                    <div className="space-y-4">

                        {/* MODE 1: MATRIKS MINGGUAN PER ROMBEL */}
                        {viewMode === 'weekly_matrix' && (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50/50 border border-emerald-100 rounded-md p-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                                        <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                                            Matriks Mingguan: {currentGroup?.educational_institution?.short_name || 'Ma\'had'} &bull; {currentGroup?.education?.name || 'Kelas'} &bull; <span className="text-emerald-700">{currentGroup?.name}</span>
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        Wali Kelas: <span className="font-semibold text-slate-800">{currentGroup?.homeroom_teacher?.name || 'Ust. Ahmad Zaki'}</span> | Kapasitas: {currentGroup?.capacity || 30} Santri
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-slate-200 rounded-md bg-white shadow-xs">
                                    <table className="min-w-full text-xs sm:text-sm">
                                        <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700">
                                            <tr>
                                                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-bold uppercase tracking-wider border-r border-slate-200 w-48 min-w-[12rem]">
                                                    Sesi / Jam KBM
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
                                                        <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-b border-slate-200 min-w-[12rem]">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-8 h-8 rounded-md bg-[#093c30]/5 text-[#093c30] flex items-center justify-center">
                                                                    <Icon className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-900 text-[13px]">{h.name}</div>
                                                                    <div className="text-[11px] text-slate-500 font-mono">
                                                                        {h.start_time?.substring(0, 5)} - {h.end_time?.substring(0, 5)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {days.map((d) => {
                                                            const sched = getScheduleWeekly(d.id, h.order);
                                                            return (
                                                                <td key={d.id} className="border-b border-r border-slate-200 p-1.5 min-w-[11rem]">
                                                                    {sched ? (
                                                                        <div className="relative group block p-2.5 border border-emerald-100 bg-emerald-50/40 hover:border-emerald-300 hover:bg-emerald-50 transition rounded-md h-full">
                                                                            <p className="font-bold text-slate-900 text-[13px] leading-tight">
                                                                                {sched.study?.name || 'Tidak Diketahui'}
                                                                            </p>
                                                                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                                                                <User className="w-3 h-3 text-slate-400" />
                                                                                {sched.teacher?.name || 'Belum Ditetapkan'}
                                                                            </p>
                                                                            {sched.classroom?.name && (
                                                                                <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-800 font-semibold">
                                                                                    <MapPin className="w-3 h-3" />
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
                                                                            className="w-full h-full min-h-[60px] border-2 border-dashed border-slate-100 hover:border-[#093c30]/20 hover:bg-[#093c30]/[0.02] transition rounded-md flex items-center justify-center group"
                                                                        >
                                                                            <span className="text-[11px] font-medium text-slate-300 group-hover:text-[#093c30] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                                                <Plus className="w-3.5 h-3.5" /> Isi Slot
                                                                            </span>
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}

                                                        <td className="border-b border-slate-200 p-1.5 min-w-[11rem]">
                                                            <div className="h-full w-full bg-slate-50/50 border border-slate-100 rounded-md p-2.5 text-slate-400 italic text-[11px] leading-relaxed flex flex-col justify-center">
                                                                <div className="flex items-center gap-1.5 text-slate-500 not-italic font-semibold text-xs">
                                                                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Libur / Shalat Jumat
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

                        {/* MODE 2: MATRIKS KOMPARASI LINTAS ROMBEL PER HARI */}
                        {viewMode === 'daily_cross' && (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-md p-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Pilih Hari Pembelajaran:
                                        </span>
                                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-1">
                                            {days.map(d => (
                                                <button
                                                    key={d.id}
                                                    onClick={() => setSelectedDayFilter(d.id)}
                                                    className={`px-2.5 py-1 text-xs font-semibold rounded ${
                                                        Number(selectedDayFilter) === Number(d.id)
                                                            ? 'bg-[#093c30] text-white'
                                                            : 'text-slate-600 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {d.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        Menampilkan <span className="font-bold text-slate-900">{filteredGroups.length} Rombel</span> pada hari <span className="font-bold text-emerald-800">{days.find(d => d.id === selectedDayFilter)?.name}</span>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-slate-200 rounded-md bg-white shadow-xs">
                                    <table className="min-w-full text-xs sm:text-sm">
                                        <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700">
                                            <tr>
                                                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-bold uppercase tracking-wider border-r border-slate-200 w-48 min-w-[12rem]">
                                                    Jam / Sesi KBM
                                                </th>
                                                {filteredGroups.map(g => (
                                                    <th key={g.id} className="px-3 py-3 text-left font-bold uppercase tracking-wider border-r border-slate-200 min-w-[11rem]">
                                                        <div className="text-[#093c30] text-[13px]">{g.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                            {g.education?.name || g.code} &bull; {g.educational_institution?.short_name}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lessonHours.map((h, idx) => {
                                                const Icon = hourIconMap(h);
                                                return (
                                                    <tr key={h.id} className={idx % 2 !== 0 ? 'bg-slate-50/20' : ''}>
                                                        <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-b border-slate-200 min-w-[12rem]">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-8 h-8 rounded-md bg-[#093c30]/5 text-[#093c30] flex items-center justify-center">
                                                                    <Icon className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-900 text-[13px]">{h.name}</div>
                                                                    <div className="text-[11px] text-slate-500 font-mono">
                                                                        {h.start_time?.substring(0, 5)} - {h.end_time?.substring(0, 5)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {filteredGroups.map(g => {
                                                            const sched = getScheduleCross(g.id, h.order);
                                                            return (
                                                                <td key={g.id} className="border-b border-r border-slate-200 p-1.5 min-w-[11rem]">
                                                                    {sched ? (
                                                                        <div className="relative group block p-2.5 border border-emerald-100 bg-emerald-50/40 hover:border-emerald-300 hover:bg-emerald-50 transition rounded-md h-full">
                                                                            <p className="font-bold text-slate-900 text-[13px] leading-tight">
                                                                                {sched.study?.name || 'Tidak Diketahui'}
                                                                            </p>
                                                                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                                                                <User className="w-3 h-3 text-slate-400" />
                                                                                {sched.teacher?.name || 'Belum Ditetapkan'}
                                                                            </p>
                                                                            {sched.classroom?.name && (
                                                                                <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-800 font-semibold">
                                                                                    <MapPin className="w-3 h-3" />
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
                                                                            onClick={() => handleCellClick(selectedDayFilter, h.order, g.id)}
                                                                            className="w-full h-full min-h-[60px] border-2 border-dashed border-slate-100 hover:border-[#093c30]/20 hover:bg-[#093c30]/[0.02] transition rounded-md flex items-center justify-center group"
                                                                        >
                                                                            <span className="text-[11px] font-medium text-slate-300 group-hover:text-[#093c30] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                                                <Plus className="w-3.5 h-3.5" /> Isi Slot
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

                        {/* MODE 3: TABEL DAFTAR LENGKAP (SEPERTI SISTEM SEBELUMNYA) */}
                        {viewMode === 'list_table' && (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-3">
                                    <div className="text-xs text-slate-500">
                                        Total Data Jadwal: <span className="font-bold text-slate-900">{filteredListSchedules.length} Sesi Terjadwal</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => window.print()}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-700"
                                        >
                                            <Printer className="w-3.5 h-3.5 text-slate-500" /> Cetak Jadwal
                                        </button>
                                        <button
                                            onClick={() => toast.info('Fitur ekspor Excel dalam pengembangan')}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-700"
                                        >
                                            <Download className="w-3.5 h-3.5 text-slate-500" /> Ekspor Data
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-slate-200 rounded-md bg-white shadow-xs">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold tracking-wider text-[11px]">
                                            <tr>
                                                <th className="px-3.5 py-3 text-left">Tingkat Pendidikan</th>
                                                <th className="px-3.5 py-3 text-left">Kelas</th>
                                                <th className="px-3.5 py-3 text-left">Rombel</th>
                                                <th className="px-3.5 py-3 text-left">Hari</th>
                                                <th className="px-3.5 py-3 text-left">Mata Pelajaran</th>
                                                <th className="px-3.5 py-3 text-left">Ustadz / Guru Pengampu</th>
                                                <th className="px-3.5 py-3 text-left">Waktu KBM</th>
                                                <th className="px-3.5 py-3 text-left">Ruang</th>
                                                <th className="px-3.5 py-3 text-center">Status</th>
                                                <th className="px-3.5 py-3 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredListSchedules.length === 0 ? (
                                                <tr>
                                                    <td colSpan="10" className="px-4 py-8 text-center text-slate-400 italic">
                                                        Tidak ada data jadwal yang sesuai dengan filter yang dipilih.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredListSchedules.map((s, idx) => (
                                                    <tr key={s.id || idx} className="hover:bg-slate-50/60 transition">
                                                        <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                                                            {s.class_group?.educational_institution?.short_name || 'Ma\'had'}
                                                        </td>
                                                        <td className="px-3.5 py-2.5 text-slate-700">
                                                            {s.class_group?.education?.name || '-'}
                                                        </td>
                                                        <td className="px-3.5 py-2.5 font-bold text-slate-900">
                                                            {s.class_group?.name || s.class_group?.code}
                                                        </td>
                                                        <td className="px-3.5 py-2.5 font-semibold text-emerald-800">
                                                            {getDayName(s.day)}
                                                        </td>
                                                        <td className="px-3.5 py-2.5 font-bold text-slate-900">
                                                            {s.study?.name}
                                                        </td>
                                                        <td className="px-3.5 py-2.5 text-slate-600">
                                                            {s.teacher?.name}
                                                        </td>
                                                        <td className="px-3.5 py-2.5 font-mono text-slate-600">
                                                            {s.lesson_hour?.start_time?.substring(0, 5)} - {s.lesson_hour?.end_time?.substring(0, 5)}
                                                        </td>
                                                        <td className="px-3.5 py-2.5 text-slate-500">
                                                            {s.classroom?.name ? `Ruang ${s.classroom?.name}` : '-'}
                                                        </td>
                                                        <td className="px-3.5 py-2.5 text-center">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                Aktif
                                                            </span>
                                                        </td>
                                                        <td className="px-3.5 py-2.5 text-right">
                                                            <button
                                                                onClick={() => setDeleteScheduleTarget(s)}
                                                                className="text-slate-300 hover:text-rose-600 p-1 transition"
                                                                title="Hapus Jadwal"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
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
                                        Total Pertemuan KBM Terlaksana: <span className="font-bold text-slate-900">{journals.length}</span>
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
                            {filteredGroups.map((g) => (
                                <option key={g.id} value={g.id}>{g.name} ({g.code}) &bull; {g.educational_institution?.short_name}</option>
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
                                <option value="1">Ruang Takhossus 2-A</option>
                                <option value="2">Ruang Takhossus 2-B</option>
                                <option value="3">Ruang Kelas 7-A</option>
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
