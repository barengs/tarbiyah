import React, { useState, useMemo, useEffect } from 'react';
import { 
    useGetSchedulesQuery, 
    useCreateScheduleMutation, 
    useDeleteScheduleMutation 
} from '../store/slices/scheduleApi';
import { 
    useGetJournalsQuery, 
    useGetListWithPresenceQuery,
    useGetJournalQuery,
    useCreateJournalMutation, 
    useUpdatePresencesMutation, 
    useGetJournalRecapQuery 
} from '../store/slices/journalApi';
import { useGetClassGroupsQuery } from '../store/slices/classGroupApi';
import { useGetStudiesQuery } from '../store/slices/studyApi';
import { useGetTeachersQuery } from '../store/slices/teacherApi';
import { useGetLessonHoursQuery } from '../store/slices/lessonHourApi';
import { useGetAcademicYearsQuery, useGetAcademicQuartersQuery } from '../store/slices/academicApi';
import { useGetEducationsQuery } from '../store/slices/institutionApi';
import Modal from '../components/ui/Modal';
import FlatTabs from '../components/atoms/FlatTabs';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import CopyScheduleModal from '../components/organisms/CopyScheduleModal';
import PrintScheduleModal from '../components/organisms/PrintScheduleModal';
import ActionDropdown from '../components/molecules/ActionDropdown';
import { 
    Calendar, Plus, Clock, BookOpen, BarChart3, User, MapPin, 
    Trash2, Sun, Moon, Coffee, GraduationCap, Users, LayoutGrid, 
    Table as TableIcon, Columns, Search, Filter, AlertTriangle, CheckCircle2,
    School, ShieldAlert, ChevronLeft, ChevronRight, Printer, Layers, Copy
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function ScheduleKbmPage() {
    const [activeTab, setActiveTab] = useState('schedules'); // 'schedules' | 'journals' | 'recap'
    const [viewMode, setViewMode] = useState('inverted_matrix'); // 'inverted_matrix' | 'weekly_matrix' | 'list_table'

    // ═══════════════════════════════════════════════════════════
    // KALENDER AKADEMIK HIJRIYAH BERBASIS TRIWULAN
    // ═══════════════════════════════════════════════════════════
    const { data: yearsData } = useGetAcademicYearsQuery();
    const academicYears = yearsData?.data || [];
    const activeYearObj = useMemo(() => academicYears.find(y => y.active) || academicYears[0], [academicYears]);

    const [selectedYearId, setSelectedYearId] = useState('');
    useEffect(() => {
        if (activeYearObj?.id && !selectedYearId) {
            setSelectedYearId(String(activeYearObj.id));
        }
    }, [activeYearObj, selectedYearId]);

    const { data: quartersData } = useGetAcademicQuartersQuery(selectedYearId || undefined);
    const quarters = quartersData?.data || [];

    const [selectedQuarterId, setSelectedQuarterId] = useState('');
    useEffect(() => {
        if (quarters.length > 0 && !selectedQuarterId) {
            const activeQ = quarters.find(q => q.active) || quarters[0];
            if (activeQ) setSelectedQuarterId(String(activeQ.id));
        }
    }, [quarters, selectedQuarterId]);

    const { data: educationsData } = useGetEducationsQuery();
    const educations = educationsData?.data || [];

    const currentYear = useMemo(() => academicYears.find(y => String(y.id) === String(selectedYearId)) || activeYearObj, [academicYears, selectedYearId, activeYearObj]);
    const currentQuarter = useMemo(() => quarters.find(q => String(q.id) === String(selectedQuarterId)) || quarters[0], [quarters, selectedQuarterId]);

    const [copyModalOpen, setCopyModalOpen] = useState(false);
    const [printModalOpen, setPrintModalOpen] = useState(false);

    // ═══════════════════════════════════════════════════════════
    // FILTER DATA MASTER BERTINGKAT: PROGRAM -> JENJANG -> KELAS -> HARI
    // ═══════════════════════════════════════════════════════════
    const [selectedProgram, setSelectedProgram] = useState('all'); // 'all' | 'Kubar' | 'Tibyan'
    const [selectedEducation, setSelectedEducation] = useState('all'); // 'all' | 'Ula' | 'Wustha' | 'Ulya' | 'Takhossus'
    const [selectedEducationClass, setSelectedEducationClass] = useState('all'); // 'all' | '1' | '2' | '3'
    const [selectedDayFilter, setSelectedDayFilter] = useState(6); // Default: Sabtu (6)
    const [searchQuery, setSearchQuery] = useState('');
    const [showOnlyClashes, setShowOnlyClashes] = useState(false);

    // PAGINATION UNTUK ROMBEL (BARIS KE BAWAH)
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(8);

    // Fetch Master Data
    const { data: groupsData, isLoading: isLoadingGroups } = useGetClassGroupsQuery();
    const allGroups = groupsData?.data || [];

    const { data: hoursData } = useGetLessonHoursQuery();
    const lessonHours = useMemo(() => {
        const raw = hoursData?.data || [];
        return [...raw].sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [hoursData]);

    const { data: studiesData } = useGetStudiesQuery();
    const studies = studiesData?.data || [];

    const { data: teachersData } = useGetTeachersQuery();
    const teachers = teachersData?.data || [];

    // Fetch Schedules
    const scheduleParams = useMemo(() => {
        const params = {};
        if (selectedYearId) params.academic_year_id = selectedYearId;
        if (selectedQuarterId) params.academic_quarter_id = selectedQuarterId;
        return params;
    }, [selectedYearId, selectedQuarterId]);

    const { data: schedulesData, refetch: refetchSchedules } = useGetSchedulesQuery(scheduleParams);
    const allSchedules = schedulesData?.data || [];

    const [createSchedule, { isLoading: isCreatingSchedule }] = useCreateScheduleMutation();
    const [deleteSchedule] = useDeleteScheduleMutation();

    // ═══════════════════════════════════════════════════════════
    // FILTER ROMBEL BERDASARKAN HIERARKI DATA MASTER
    // ═══════════════════════════════════════════════════════════
    const filteredGroups = useMemo(() => {
        let result = allGroups;

        // 1. Filter Program Pesantren (Kubar / Tibyan)
        if (selectedProgram !== 'all') {
            result = result.filter(g => 
                g.program?.name?.toLowerCase() === selectedProgram.toLowerCase() ||
                g.educational_institution?.short_name?.toLowerCase() === selectedProgram.toLowerCase()
            );
        }

        // 2. Filter Jenjang Pendidikan (Ula, Wustha, Ulya, Takhossus)
        if (selectedEducation !== 'all') {
            result = result.filter(g => 
                g.education?.name?.toLowerCase() === selectedEducation.toLowerCase()
            );
        }

        // 3. Filter Tingkat/Kelas (Kelas 1, Kelas 2, Kelas 3)
        if (selectedEducationClass !== 'all') {
            result = result.filter(g => 
                g.education_class?.name?.includes(selectedEducationClass) ||
                g.education_class?.code?.includes(selectedEducationClass)
            );
        }

        // 4. Quick Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(g => 
                g.name?.toLowerCase().includes(q) ||
                g.code?.toLowerCase().includes(q) ||
                g.homeroom_teacher?.name?.toLowerCase().includes(q) ||
                g.classroom?.name?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [allGroups, selectedProgram, selectedEducation, selectedEducationClass, searchQuery]);

    // PAGINATION LOGIC
    const totalPages = Math.ceil(filteredGroups.length / itemsPerPage) || 1;
    const paginatedGroups = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredGroups.slice(start, start + itemsPerPage);
    }, [filteredGroups, currentPage, itemsPerPage]);

    // Rombel aktif jika switch ke mode mingguan
    const [selectedWeeklyGroupId, setSelectedWeeklyGroupId] = useState('');
    const currentWeeklyGroup = useMemo(() => {
        if (selectedWeeklyGroupId) {
            return allGroups.find(g => Number(g.id) === Number(selectedWeeklyGroupId)) || filteredGroups[0];
        }
        return filteredGroups[0] || allGroups[0];
    }, [allGroups, filteredGroups, selectedWeeklyGroupId]);

    // ═══════════════════════════════════════════════════════════
    // DETEKSI BENTROK OTOMATIS (LIVE CLASH DETECTOR)
    // ═══════════════════════════════════════════════════════════
    const clashesMap = useMemo(() => {
        const map = {};
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

    // Jurnal & Presensi States with presence summary
    const [journalFilterStudyId, setJournalFilterStudyId] = useState('');
    const [journalSearchQuery, setJournalSearchQuery] = useState('');

    const { 
        data: journalsData, 
        isLoading: isLoadingJournals,
        refetch: refetchJournals 
    } = useGetListWithPresenceQuery(
        currentWeeklyGroup?.id ? { class_group_id: currentWeeklyGroup.id } : undefined,
        { skip: !currentWeeklyGroup?.id }
    );
    const rawJournals = journalsData?.data || [];

    // Filtered journals
    const journals = useMemo(() => {
        return rawJournals.filter(j => {
            if (journalFilterStudyId && Number(j.study_id) !== Number(journalFilterStudyId)) {
                return false;
            }
            if (journalSearchQuery) {
                const q = journalSearchQuery.toLowerCase();
                const matchTopic = j.topic?.toLowerCase().includes(q);
                const matchStudy = j.study?.name?.toLowerCase().includes(q);
                const matchTeacher = j.teacher?.name?.toLowerCase().includes(q);
                if (!matchTopic && !matchStudy && !matchTeacher) return false;
            }
            return true;
        });
    }, [rawJournals, journalFilterStudyId, journalSearchQuery]);

    // View Mode & Pagination Jurnal Mengajar
    const [journalViewMode, setJournalViewMode] = useState('matrix_table'); // 'matrix_table' | 'cards'
    const [journalPage, setJournalPage] = useState(1);
    const [journalPerPage, setJournalPerPage] = useState(15);

    const totalJournalPages = Math.ceil(journals.length / journalPerPage) || 1;
    const paginatedJournals = useMemo(() => {
        const start = (journalPage - 1) * journalPerPage;
        return journals.slice(start, start + journalPerPage);
    }, [journals, journalPage, journalPerPage]);

    useEffect(() => {
        setJournalPage(1);
    }, [journalFilterStudyId, journalSearchQuery, currentWeeklyGroup?.id]);

    const [createJournal, { isLoading: isCreatingJournal }] = useCreateJournalMutation();
    const [updatePresences, { isLoading: isSavingPresences }] = useUpdatePresencesMutation();

    const { data: recapData, isLoading: isLoadingRecap } = useGetJournalRecapQuery(
        currentWeeklyGroup?.id ? { class_group_id: currentWeeklyGroup.id } : undefined,
        { skip: !currentWeeklyGroup?.id }
    );
    const recap = recapData?.data;

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
    // PETA HARI & JAM KBM PESANTREN (SABTU-KAMIS, JUMAT LIBUR)
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

    const hourIconMap = (order) => {
        if (order === 1) return Sun;
        if (order === 2) return GraduationCap;
        if (order === 3) return Coffee;
        if (order === 4) return Users;
        if (order === 5) return Moon;
        if (order === 6) return BookOpen;
        return Clock;
    };

    // Helper cari jadwal
    const getScheduleCell = (dayId, hourOrder, groupId) => {
        return allSchedules.find(s => 
            Number(s.day) === Number(dayId) && 
            Number(s.lesson_hour?.order) === Number(hourOrder) && 
            Number(s.class_group_id) === Number(groupId)
        ) || null;
    };

    const handleCellClick = (dayId, hourOrder, targetGroupId) => {
        setSchedDay(dayId);
        setSchedHourId(lessonHours.find(h => h.order === hourOrder)?.id || '');
        setSchedTargetGroupId(targetGroupId || paginatedGroups[0]?.id || '');
        setSchedStudyId(studies[0]?.id || '');
        setSchedTeacherId(teachers[0]?.id || '');
        setSchedClassroomId('');
        setScheduleModalOpen(true);
    };

    const handleCreateSchedule = async (e) => {
        e.preventDefault();
        try {
            await createSchedule({
                academic_year_id: Number(selectedYearId || 1),
                academic_quarter_id: Number(selectedQuarterId || 4),
                class_group_id: schedTargetGroupId || paginatedGroups[0]?.id,
                study_id: schedStudyId,
                teacher_id: schedTeacherId,
                lesson_hour_id: schedHourId,
                classroom_id: schedClassroomId || null,
                day: Number(schedDay),
            }).unwrap();
            toast.success('Jadwal pelajaran berhasil disimpan');
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
                academic_year_id: Number(selectedYearId || 1),
                class_group_id: currentWeeklyGroup?.id,
                study_id: jStudyId,
                teacher_id: jTeacherId,
                meeting_number: Number(jMeetingNo),
                date: jDate,
                topic: jTopic,
                notes: jNotes || null,
            }).unwrap();
            toast.success('Jurnal pertemuan dibuka');
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
                HEADER KALENDER HIJRIYAH BERBASIS TRIWULAN
                ═══════════════════════════════════════════════════════════ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-md p-4 shadow-xs">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#093c30] text-emerald-100 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Kalender Hijriyah: {currentYear?.year || '1446/1447'} H
                        </span>
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            {currentQuarter?.name || 'Triwulan IV (Syawal - Dzulhijjah)'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {currentQuarter?.active ? 'KBM Aktif' : 'Periode Terpilih'}
                        </span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                        Matriks Penjadwalan Pelajaran Pesantren
                    </h1>
                    <p className="text-xs text-slate-500">
                        Penyajian matriks terbalik (Jam KBM di Atas, Kelas & Rombel Berbaris ke Bawah dengan Pagination).
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={selectedQuarterId}
                        onChange={(e) => setSelectedQuarterId(e.target.value)}
                        className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded bg-white text-slate-800"
                    >
                        {quarters.length > 0 ? (
                            quarters.map((q) => (
                                <option key={q.id} value={q.id}>
                                    {q.name} {q.active ? '• Aktif' : ''}
                                </option>
                            ))
                        ) : (
                            <>
                                <option value="1">Triwulan I (Muharram - Rabi'ul Awwal)</option>
                                <option value="2">Triwulan II (Rabi'ul Akhir - Jumadil Akhir)</option>
                                <option value="3">Triwulan III (Rajab - Ramadhan)</option>
                                <option value="4">Triwulan IV (Syawal - Dzulhijjah) • Aktif</option>
                            </>
                        )}
                    </select>

                    <ActionDropdown
                        label="Aksi Jadwal"
                        icon={Layers}
                        variant="primary"
                        items={[
                            {
                                id: 'add_schedule',
                                label: 'Tambah Jadwal Baru',
                                description: 'Input KBM mata pelajaran, ustadz, jam, dan rombel',
                                icon: Plus,
                                iconColor: 'text-emerald-700',
                                onClick: () => {
                                    setSchedDay(6);
                                    setSchedHourId(lessonHours[0]?.id || '');
                                    setSchedTargetGroupId(paginatedGroups[0]?.id || '');
                                    setSchedStudyId(studies[0]?.id || '');
                                    setSchedTeacherId(teachers[0]?.id || '');
                                    setSchedClassroomId('');
                                    setScheduleModalOpen(true);
                                }
                            },
                            {
                                id: 'copy_schedule',
                                label: 'Salin Jadwal KBM',
                                description: 'Salin jadwal antar triwulan atau tahun ajaran baru',
                                icon: Copy,
                                iconColor: 'text-blue-600',
                                onClick: () => setCopyModalOpen(true)
                            },
                            {
                                id: 'print_schedule',
                                label: 'Cetak Jadwal Pelajaran (PDF)',
                                description: 'Download format resmi jadwal per rombel & periode',
                                icon: Printer,
                                iconColor: 'text-slate-700',
                                dividerBefore: true,
                                onClick: () => setPrintModalOpen(true)
                            }
                        ]}
                    />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                FILTER DATA MASTER RELASIONAL: PROGRAM -> JENJANG -> KELAS
                ═══════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-4">
                {/* 1. Filter Program Utama (Kubar / Tibyan) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
                        <button
                            onClick={() => { setSelectedProgram('all'); setSelectedEducation('all'); setSelectedEducationClass('all'); setCurrentPage(1); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition ${
                                selectedProgram === 'all'
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Semua Program
                        </button>
                        <button
                            onClick={() => { setSelectedProgram('Kubar'); setSelectedEducation('all'); setSelectedEducationClass('all'); setCurrentPage(1); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition flex items-center gap-1.5 ${
                                selectedProgram === 'Kubar'
                                    ? 'bg-[#093c30] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <School className="w-3.5 h-3.5" /> Program KUBAR (Mu'allimin)
                        </button>
                        <button
                            onClick={() => { setSelectedProgram('Tibyan'); setSelectedEducation('all'); setSelectedEducationClass('all'); setCurrentPage(1); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition flex items-center gap-1.5 ${
                                selectedProgram === 'Tibyan'
                                    ? 'bg-[#093c30] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <BookOpen className="w-3.5 h-3.5" /> Program TIBYAN (Takhossus)
                        </button>
                    </div>

                    {/* Status Bentrok Jadwal */}
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
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Bebas Bentrok Ustadz
                        </div>
                    )}
                </div>

                {/* 2. Sub-Filter: Jenjang Pendidikan -> Tingkat Kelas -> Pencarian */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Jenjang Pendidikan */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Jenjang Pendidikan
                        </label>
                        <select
                            value={selectedEducation}
                            onChange={(e) => { setSelectedEducation(e.target.value); setSelectedEducationClass('all'); setCurrentPage(1); }}
                            className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded bg-white text-slate-800"
                        >
                            <option value="all">Semua Jenjang</option>
                            {(selectedProgram === 'all' || selectedProgram === 'Kubar') && (
                                <>
                                    <option value="Ula">Jenjang Ula (Dasar)</option>
                                    <option value="Wustha">Jenjang Wustha (Menengah)</option>
                                    <option value="Ulya">Jenjang Ulya (Atas)</option>
                                </>
                            )}
                            {(selectedProgram === 'all' || selectedProgram === 'Tibyan') && (
                                <option value="Takhossus">Jenjang Takhossus (Dirasah Kitab)</option>
                            )}
                        </select>
                    </div>

                    {/* Tingkat / Kelas */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Tingkat / Kelas
                        </label>
                        <select
                            value={selectedEducationClass}
                            onChange={(e) => { setSelectedEducationClass(e.target.value); setCurrentPage(1); }}
                            className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded bg-white text-slate-800"
                        >
                            <option value="all">Semua Kelas</option>
                            <option value="1">Tingkat 1 (Kelas 1)</option>
                            <option value="2">Tingkat 2 (Kelas 2)</option>
                            <option value="3">Tingkat 3 (Kelas 3)</option>
                        </select>
                    </div>

                    {/* Hari KBM */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Hari Pembelajaran
                        </label>
                        <select
                            value={selectedDayFilter}
                            onChange={(e) => setSelectedDayFilter(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white text-slate-800 text-emerald-900"
                        >
                            {days.map(d => (
                                <option key={d.id} value={d.id}>{d.name} ({d.short})</option>
                            ))}
                        </select>
                    </div>

                    {/* Quick Search */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Pencarian Rombel / Guru
                        </label>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                            <input
                                type="text"
                                placeholder="Cari rombel, wali, ruang..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-800 placeholder-slate-400"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                TAB NAVIGASI & VIEW SWITCHER
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
                                onClick={() => setViewMode('inverted_matrix')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition ${
                                    viewMode === 'inverted_matrix'
                                        ? 'bg-white text-emerald-900 shadow-xs font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Matriks Terbalik: Jam di Atas, Rombel ke Bawah dengan Pagination"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" /> Matriks Jam di Atas
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
                                <Columns className="w-3.5 h-3.5" /> Mingguan per Rombel
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
                    TAB 1: JADWAL PELAJARAN (MATRIKS TERBALIK DENGAN PAGINATION)
                    ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'schedules' && (
                    <div className="space-y-4">

                        {/* ───────────────────────────────────────────────────────────
                            MODE 1: MATRIKS TERBALIK (JAM DI ATAS, ROMBEL KE BAWAH)
                            Sumbu X = 6 Jam KBM Tetap
                            Sumbu Y = Rombel Berbaris ke Bawah + Pagination
                            ─────────────────────────────────────────────────────────── */}
                        {viewMode === 'inverted_matrix' && (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-md p-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Matriks KBM Hari: <span className="text-emerald-800 font-extrabold">{days.find(d => d.id === selectedDayFilter)?.name}</span>
                                        </span>
                                        <span className="text-xs text-slate-400">&bull;</span>
                                        <span className="text-xs text-slate-500">
                                            Total <span className="font-bold text-slate-900">{filteredGroups.length} Rombel</span> Terdaftar
                                        </span>
                                    </div>

                                    {/* Pagination Controls Atas */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">
                                            Halaman {currentPage} dari {totalPages}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                disabled={currentPage <= 1}
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                className="p-1 border border-slate-200 rounded bg-white disabled:opacity-30 hover:bg-slate-50"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                disabled={currentPage >= totalPages}
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                className="p-1 border border-slate-200 rounded bg-white disabled:opacity-30 hover:bg-slate-50"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* TABEL MATRIKS INVERTED */}
                                <div className="border border-slate-200 rounded-md bg-white shadow-xs overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-[#093c30] text-white">
                                            <tr>
                                                {/* Kolom 1 Kiri: Identitas Rombel & Kelas */}
                                                <th className="sticky left-0 z-20 bg-[#093c30] px-4 py-3.5 text-left font-bold uppercase tracking-wider w-64 min-w-[15rem] border-r border-[#064e3b]">
                                                    <div className="text-[13px] text-emerald-100 font-extrabold">Kelas & Rombel</div>
                                                    <div className="text-[10px] text-emerald-300 font-medium normal-case mt-0.5">
                                                        Program &bull; Jenjang &bull; Ruang
                                                    </div>
                                                </th>

                                                {/* Kolom 2 s.d 7: 6 Sesi Jam Pelajaran Tetap */}
                                                {lessonHours.map((h) => {
                                                    const Icon = hourIconMap(h.order);
                                                    return (
                                                        <th key={h.id} className="px-3 py-3 text-left font-bold border-r border-[#064e3b] last:border-0 min-w-[11rem]">
                                                            <div className="flex items-center gap-1.5 text-emerald-100 text-[12px]">
                                                                <Icon className="w-3.5 h-3.5 text-emerald-300" />
                                                                <span>{h.name}</span>
                                                            </div>
                                                            <div className="text-[10px] text-emerald-300/80 font-mono font-normal mt-0.5">
                                                                {h.start_time?.substring(0, 5)} - {h.end_time?.substring(0, 5)}
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedGroups.length === 0 ? (
                                                <tr>
                                                    <td colSpan={lessonHours.length + 1} className="p-8 text-center text-slate-400 italic">
                                                        Tidak ada data rombel yang sesuai dengan filter yang dipilih.
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedGroups.map((g, idx) => (
                                                    <tr key={g.id} className={idx % 2 !== 0 ? 'bg-slate-50/30' : 'bg-white'}>
                                                        {/* Kolom Kiri: Identitas Rombel Berjenjang */}
                                                        <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-slate-200 min-w-[15rem] shadow-xs">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-extrabold text-slate-900 text-[13px]">
                                                                        {g.name}
                                                                    </span>
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                                        {g.code}
                                                                    </span>
                                                                </div>

                                                                <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                                                                    <span>{g.program?.name || 'Kubar'}</span>
                                                                    <span>&bull;</span>
                                                                    <span>{g.education?.name || 'Wustha'}</span>
                                                                    <span>&bull;</span>
                                                                    <span className="text-slate-500 font-normal">{g.education_class?.name || 'Kelas 1'}</span>
                                                                </div>

                                                                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5">
                                                                    <span className="truncate max-w-[120px]" title={g.homeroom_teacher?.name}>
                                                                        Wali: {g.homeroom_teacher?.name ? g.homeroom_teacher.name.split(',')[0] : '-'}
                                                                    </span>
                                                                    {g.classroom?.name && (
                                                                        <span className="text-slate-400 font-mono">
                                                                            {g.classroom.name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* 6 Kolom Jam KBM */}
                                                        {lessonHours.map((h) => {
                                                            const sched = getScheduleCell(selectedDayFilter, h.order, g.id);
                                                            const isClashing = sched && clashesMap.clashScheduleIds.has(sched.id);

                                                            return (
                                                                <td key={h.id} className="border-r border-slate-200 last:border-0 p-1.5 min-w-[11rem] align-top">
                                                                    {sched ? (
                                                                        <div className={`relative group p-2 rounded-md border transition h-full flex flex-col justify-between ${
                                                                            isClashing
                                                                                ? 'bg-rose-50 border-rose-300 hover:border-rose-400'
                                                                                : 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50'
                                                                        }`}>
                                                                            <div>
                                                                                {isClashing && (
                                                                                    <div className="mb-1 inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-600 text-white">
                                                                                        <AlertTriangle className="w-2.5 h-2.5" /> BENTROK USTADZ
                                                                                    </div>
                                                                                )}

                                                                                <p className={`font-bold text-[12px] leading-tight ${isClashing ? 'text-rose-950' : 'text-slate-900'}`}>
                                                                                    {sched.study?.name}
                                                                                </p>
                                                                                <p className={`text-[11px] mt-1 flex items-center gap-1 ${isClashing ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>
                                                                                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                                                                                    <span className="truncate">{sched.teacher?.name}</span>
                                                                                </p>
                                                                            </div>

                                                                            {sched.classroom?.name && (
                                                                                <div className="mt-1.5 text-[10px] text-emerald-800 font-semibold flex items-center gap-1">
                                                                                    <MapPin className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                                                                    <span className="truncate">{sched.classroom.name}</span>
                                                                                </div>
                                                                            )}

                                                                            <button
                                                                                onClick={() => setDeleteScheduleTarget(sched)}
                                                                                className="absolute top-1 right-1 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition p-1"
                                                                                title="Hapus Jadwal"
                                                                            >
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleCellClick(selectedDayFilter, h.order, g.id)}
                                                                            className="w-full h-full min-h-[55px] border-2 border-dashed border-slate-100 hover:border-[#093c30]/20 hover:bg-[#093c30]/[0.02] transition rounded-md flex items-center justify-center group"
                                                                        >
                                                                            <span className="text-[10px] font-medium text-slate-300 group-hover:text-[#093c30] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                                                <Plus className="w-3 h-3" /> Jadwalkan
                                                                            </span>
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* PAGINATION CONTROLS BAWAH */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-3">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span>Tampilkan:</span>
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                            className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                                        >
                                            <option value={5}>5 Rombel / Halaman</option>
                                            <option value={8}>8 Rombel / Halaman</option>
                                            <option value={12}>12 Rombel / Halaman</option>
                                            <option value={20}>20 Rombel / Halaman</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                                            <button
                                                key={pg}
                                                onClick={() => setCurrentPage(pg)}
                                                className={`px-3 py-1 text-xs font-semibold rounded ${
                                                    currentPage === pg
                                                        ? 'bg-[#093c30] text-white'
                                                        : 'text-slate-600 hover:bg-slate-100'
                                                }`}
                                            >
                                                {pg}
                                            </button>
                                        ))}
                                    </div>
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
                                            value={currentWeeklyGroup?.id || ''}
                                            onChange={(e) => setSelectedWeeklyGroupId(e.target.value)}
                                            className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white text-slate-900"
                                        >
                                            {filteredGroups.map(g => (
                                                <option key={g.id} value={g.id}>
                                                    {g.name} &bull; {g.program?.name} ({g.education?.name} - {g.education_class?.name})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        Wali Kelas: <span className="font-semibold text-slate-800">{currentWeeklyGroup?.homeroom_teacher?.name || '-'}</span> | Kapasitas: {currentWeeklyGroup?.capacity || 35} Santri
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-md bg-white shadow-xs overflow-x-auto">
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
                                                const Icon = hourIconMap(h.order);
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
                                                            const sched = getScheduleCell(d.id, h.order, currentWeeklyGroup?.id);
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
                                                                                    {sched.classroom?.name}
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
                                                                            onClick={() => handleCellClick(d.id, h.order, currentWeeklyGroup?.id)}
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
                                                                    Kegiatan mandiri santri.
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
                            MODE 3: TABEL DAFTAR LENGKAP
                            ─────────────────────────────────────────────────────────── */}
                        {viewMode === 'list_table' && (
                            <div className="space-y-4">
                                <div className="border border-slate-200 rounded-md bg-white shadow-xs overflow-x-auto">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold tracking-wider text-[11px]">
                                            <tr>
                                                <th className="px-3.5 py-2.5 text-left">Program</th>
                                                <th className="px-3.5 py-2.5 text-left">Jenjang</th>
                                                <th className="px-3.5 py-2.5 text-left">Kelas</th>
                                                <th className="px-3.5 py-2.5 text-left">Rombel</th>
                                                <th className="px-3.5 py-2.5 text-left">Hari</th>
                                                <th className="px-3.5 py-2.5 text-left">Mata Pelajaran</th>
                                                <th className="px-3.5 py-2.5 text-left">Ustadz Pengampu</th>
                                                <th className="px-3.5 py-2.5 text-left">Waktu KBM</th>
                                                <th className="px-3.5 py-2.5 text-left">Ruang</th>
                                                <th className="px-3.5 py-2.5 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {allSchedules.map((s, idx) => {
                                                const isClashing = clashesMap.clashScheduleIds.has(s.id);
                                                return (
                                                    <tr key={s.id || idx} className={`hover:bg-slate-50/60 transition ${isClashing ? 'bg-rose-50/40' : ''}`}>
                                                        <td className="px-3.5 py-2 font-bold text-slate-900">
                                                            {s.class_group?.program?.name || 'Kubar'}
                                                        </td>
                                                        <td className="px-3.5 py-2 text-slate-700">
                                                            {s.class_group?.education?.name || '-'}
                                                        </td>
                                                        <td className="px-3.5 py-2 text-slate-600">
                                                            {s.class_group?.education_class?.name || '-'}
                                                        </td>
                                                        <td className="px-3.5 py-2 font-bold text-[#093c30]">
                                                            {s.class_group?.name}
                                                        </td>
                                                        <td className="px-3.5 py-2 font-semibold text-emerald-800">
                                                            {getDayName(s.day)}
                                                        </td>
                                                        <td className="px-3.5 py-2 font-bold text-slate-900">
                                                            {s.study?.name}
                                                        </td>
                                                        <td className={`px-3.5 py-2 ${isClashing ? 'font-bold text-rose-700' : 'text-slate-600'}`}>
                                                            {s.teacher?.name}
                                                            {isClashing && <span className="ml-1 text-[10px] text-rose-600">(Bentrok)</span>}
                                                        </td>
                                                        <td className="px-3.5 py-2 font-mono text-slate-600">
                                                            {s.lesson_hour?.start_time?.substring(0, 5)} - {s.lesson_hour?.end_time?.substring(0, 5)}
                                                        </td>
                                                        <td className="px-3.5 py-2 text-slate-500">
                                                            {s.classroom?.name || '-'}
                                                        </td>
                                                        <td className="px-3.5 py-2 text-right">
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
                        {/* Control Bar: Pilih Rombel, Filter Mapel, Search & Tombol Buka Jurnal */}
                        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-3">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                            Rombel / Kelas Aktif
                                        </label>
                                        <select
                                            value={currentWeeklyGroup?.id || ''}
                                            onChange={(e) => setSelectedWeeklyGroupId(e.target.value)}
                                            className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white text-slate-900"
                                        >
                                            {allGroups.map(g => (
                                                <option key={g.id} value={g.id}>
                                                    {g.name} &bull; {g.program?.name} ({g.education?.name} - {g.education_class?.name})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                            Filter Mata Pelajaran
                                        </label>
                                        <select
                                            value={journalFilterStudyId}
                                            onChange={(e) => setJournalFilterStudyId(e.target.value)}
                                            className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded bg-white text-slate-800"
                                        >
                                            <option value="">Semua Mata Pelajaran</option>
                                            {studies.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end md:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setJMeetingNo((journals.length || 0) + 1);
                                            setJStudyId(studies[0]?.id || '');
                                            setJTeacherId(teachers[0]?.id || '');
                                            setJTopic('');
                                            setJNotes('');
                                            setJournalModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#093c30] text-white text-xs font-bold rounded-md hover:bg-[#064e3b] shadow-xs transition"
                                    >
                                        <Plus className="w-4 h-4 text-emerald-300" /> Buka Jurnal Pertemuan Baru
                                    </button>
                                </div>
                            </div>

                            {/* Status Bar Ringkasan & Switcher View Mode */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <span>
                                        Total Jurnal KBM: <b className="text-slate-900">{journals.length} Sesi</b>
                                    </span>
                                    <span>&bull;</span>
                                    <span>
                                        Wali Kelas: <b className="text-slate-900">{currentWeeklyGroup?.homeroom_teacher?.name || '-'}</b>
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Toggle View Mode: Tabel Matriks vs Kartu Detail */}
                                    <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200">
                                        <button
                                            type="button"
                                            onClick={() => setJournalViewMode('matrix_table')}
                                            className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition ${
                                                journalViewMode === 'matrix_table'
                                                    ? 'bg-white text-emerald-900 shadow-xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                            title="Tampilkan dalam bentuk tabel matriks kompak (tanpa scroll panjang)"
                                        >
                                            <TableIcon className="w-3.5 h-3.5" />
                                            <span>Tabel Matriks</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setJournalViewMode('cards')}
                                            className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition ${
                                                journalViewMode === 'cards'
                                                    ? 'bg-white text-emerald-900 shadow-xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                            title="Tampilkan dalam bentuk kartu per sesi"
                                        >
                                            <Columns className="w-3.5 h-3.5" />
                                            <span>Kartu Detail</span>
                                        </button>
                                    </div>

                                    <div className="w-48 sm:w-60">
                                        <input
                                            type="text"
                                            placeholder="Cari materi / nama guru..."
                                            value={journalSearchQuery}
                                            onChange={(e) => setJournalSearchQuery(e.target.value)}
                                            className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded bg-slate-50 text-slate-800 placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Konten Jurnal: Tabel Matriks (Default) vs Kartu Detail */}
                        {isLoadingJournals ? (
                            <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-md">
                                Memuat daftar riwayat jurnal mengajar...
                            </div>
                        ) : journals.length === 0 ? (
                            <div className="p-12 text-center bg-white border border-slate-200 rounded-md shadow-xs space-y-3">
                                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">
                                        Belum Ada Jurnal KBM untuk {currentWeeklyGroup?.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                                        Jurnal otomatis terisi ketika presensi jam pelajaran disimpan di menu <b>Presensi & Disiplin</b>, atau Anda dapat membuka sesi jurnal baru secara manual di sini.
                                    </p>
                                </div>
                                <div className="pt-2 flex items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setJMeetingNo(1);
                                            setJStudyId(studies[0]?.id || '');
                                            setJTeacherId(teachers[0]?.id || '');
                                            setJTopic('KBM Perdana Tatap Muka');
                                            setJournalModalOpen(true);
                                        }}
                                        className="px-3.5 py-2 bg-[#093c30] text-white text-xs font-semibold rounded hover:bg-[#064e3b] transition"
                                    >
                                        + Buka Jurnal Pertemuan Baru
                                    </button>
                                    <a
                                        href="/presensi"
                                        className="px-3.5 py-2 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded border border-emerald-200 hover:bg-emerald-100 transition"
                                    >
                                        Isi Presensi Harian &bull; 6 Jam
                                    </a>
                                </div>
                            </div>
                        ) : journalViewMode === 'matrix_table' ? (
                            /* ═══════════════════════════════════════════════════════════
                               TAMPILAN 1: TABEL MATRIKS JURNAL KBM (KOMPAK & RAPI)
                               ═══════════════════════════════════════════════════════════ */
                            <div className="space-y-3">
                                <div className="border border-slate-200 rounded-md bg-white shadow-xs overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-[#093c30] text-white">
                                            <tr>
                                                <th className="px-3 py-3 text-center w-12 border-r border-[#064e3b]">
                                                    No
                                                </th>
                                                <th className="px-3 py-3 text-center border-r border-[#064e3b] whitespace-nowrap">
                                                    Pertemuan
                                                </th>
                                                <th className="px-3.5 py-3 text-left border-r border-[#064e3b] whitespace-nowrap">
                                                    Hari & Tanggal
                                                </th>
                                                <th className="px-3 py-3 text-center border-r border-[#064e3b] whitespace-nowrap">
                                                    Jam KBM
                                                </th>
                                                <th className="px-3.5 py-3 text-left border-r border-[#064e3b] min-w-[10rem]">
                                                    Mata Pelajaran
                                                </th>
                                                <th className="px-3.5 py-3 text-left border-r border-[#064e3b] min-w-[14rem]">
                                                    Materi / Bahasan
                                                </th>
                                                <th className="px-3.5 py-3 text-left border-r border-[#064e3b] min-w-[10rem]">
                                                    Ustadz Pengampu
                                                </th>
                                                <th className="px-3 py-3 text-center border-r border-[#064e3b] whitespace-nowrap">
                                                    Kehadiran Santri
                                                </th>
                                                <th className="px-3 py-3 text-center whitespace-nowrap">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedJournals.map((j, idx) => {
                                                const totalStudents = (j.hadir_count || 0) + (j.sakit_count || 0) + (j.izin_count || 0) + (j.alpa_count || 0);
                                                const hadirPct = totalStudents > 0 ? Math.round(((j.hadir_count || 0) / totalStudents) * 100) : 0;
                                                const hourOrder = j.lesson_schedule?.lesson_hour?.order;
                                                const hourTime = j.lesson_schedule?.lesson_hour?.start_time ? 
                                                    `${j.lesson_schedule.lesson_hour.start_time.substring(0, 5)} - ${j.lesson_schedule.lesson_hour.end_time?.substring(0, 5)}` : null;

                                                return (
                                                    <tr key={j.id} className={idx % 2 !== 0 ? 'bg-slate-50/50 hover:bg-slate-100/70' : 'bg-white hover:bg-slate-50'}>
                                                        <td className="px-3 py-2.5 text-center text-slate-400 font-mono border-r border-slate-100">
                                                            {(journalPage - 1) * journalPerPage + idx + 1}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center border-r border-slate-100 whitespace-nowrap">
                                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#093c30] text-emerald-100">
                                                                Pertemuan Ke-{j.meeting_number}
                                                            </span>
                                                        </td>
                                                        <td className="px-3.5 py-2.5 border-r border-slate-100 whitespace-nowrap">
                                                            <div className="font-semibold text-slate-800">
                                                                {j.date ? new Date(j.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center border-r border-slate-100 whitespace-nowrap">
                                                            <span className="font-bold text-emerald-800">
                                                                Jam {hourOrder || '-'}
                                                            </span>
                                                            {hourTime && (
                                                                <div className="text-[10px] text-slate-400 font-mono">
                                                                    {hourTime}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-3.5 py-2.5 border-r border-slate-100">
                                                            <div className="font-bold text-slate-900">
                                                                {j.study?.name || '-'}
                                                            </div>
                                                            {j.study?.category && (
                                                                <span className="text-[10px] text-slate-400">
                                                                    {j.study.category}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-3.5 py-2.5 border-r border-slate-100">
                                                            <div className="text-slate-700 font-medium line-clamp-2" title={j.topic}>
                                                                {j.topic || 'KBM Reguler Sesuai Silabus'}
                                                            </div>
                                                            {j.notes && (
                                                                <div className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">
                                                                    Catatan: {j.notes}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-3.5 py-2.5 border-r border-slate-100">
                                                            <div className="font-semibold text-slate-800 truncate" title={j.teacher?.name}>
                                                                {j.teacher?.name || '-'}
                                                            </div>
                                                            {j.substitute_teacher && (
                                                                <div className="text-[10px] text-amber-700 font-medium">
                                                                    (Pengganti: {j.substitute_teacher.name})
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2.5 border-r border-slate-100 whitespace-nowrap">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <span className="font-bold font-mono text-emerald-700 text-xs w-9 text-right">
                                                                    {hadirPct}%
                                                                </span>
                                                                <div className="flex items-center gap-1 text-[10px]">
                                                                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold" title="Hadir">
                                                                        H:{j.hadir_count || 0}
                                                                    </span>
                                                                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold" title="Sakit">
                                                                        S:{j.sakit_count || 0}
                                                                    </span>
                                                                    <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold" title="Izin">
                                                                        I:{j.izin_count || 0}
                                                                    </span>
                                                                    <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold" title="Alpa">
                                                                        A:{j.alpa_count || 0}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenPresenceModal(j)}
                                                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-200 rounded transition inline-flex items-center gap-1 shadow-2xs"
                                                                title="Lihat & perbarui presensi santri pertemuan ini"
                                                            >
                                                                <Users className="w-3.5 h-3.5 text-emerald-700" />
                                                                <span>Detail Presensi</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Kontrol Tabel Matriks */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-3">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span>
                                            Menampilkan <b>{Math.min(journals.length, (journalPage - 1) * journalPerPage + 1)}</b> - <b>{Math.min(journals.length, journalPage * journalPerPage)}</b> dari <b>{journals.length} Sesi KBM</b>
                                        </span>
                                        <span>&bull;</span>
                                        <span>Tampilkan:</span>
                                        <select
                                            value={journalPerPage}
                                            onChange={(e) => { setJournalPerPage(Number(e.target.value)); setJournalPage(1); }}
                                            className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                                        >
                                            <option value={10}>10 Sesi / Hal</option>
                                            <option value={15}>15 Sesi / Hal</option>
                                            <option value={25}>25 Sesi / Hal</option>
                                            <option value={50}>50 Sesi / Hal</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">
                                            Halaman {journalPage} dari {totalJournalPages}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                disabled={journalPage <= 1}
                                                onClick={() => setJournalPage(p => Math.max(1, p - 1))}
                                                className="p-1 border border-slate-200 rounded bg-white disabled:opacity-30 hover:bg-slate-50"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                disabled={journalPage >= totalJournalPages}
                                                onClick={() => setJournalPage(p => Math.min(totalJournalPages, p + 1))}
                                                className="p-1 border border-slate-200 rounded bg-white disabled:opacity-30 hover:bg-slate-50"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* ═══════════════════════════════════════════════════════════
                               TAMPILAN 2: KARTU DETAIL (OPSIONAL)
                               ═══════════════════════════════════════════════════════════ */
                            <div className="space-y-3">
                                {paginatedJournals.map((j) => {
                                    const totalStudents = (j.hadir_count || 0) + (j.sakit_count || 0) + (j.izin_count || 0) + (j.alpa_count || 0);
                                    const hadirPct = totalStudents > 0 ? Math.round(((j.hadir_count || 0) / totalStudents) * 100) : 0;
                                    const hourOrder = j.lesson_schedule?.lesson_hour?.order;
                                    const hourTime = j.lesson_schedule?.lesson_hour?.start_time ? 
                                        `${j.lesson_schedule.lesson_hour.start_time.substring(0, 5)} - ${j.lesson_schedule.lesson_hour.end_time?.substring(0, 5)}` : null;

                                    return (
                                        <div 
                                            key={j.id} 
                                            className="p-4 bg-white border border-slate-200 rounded-md shadow-xs hover:border-slate-300 transition space-y-3"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#093c30] text-emerald-100">
                                                            Pertemuan Ke-{j.meeting_number}
                                                        </span>
                                                        {hourOrder && (
                                                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                                Jam Ke-{hourOrder} {hourTime ? `(${hourTime})` : ''}
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-slate-500 font-mono">
                                                            📅 {j.date ? new Date(j.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                                                        </span>
                                                    </div>

                                                    <h4 className="font-extrabold text-slate-900 text-sm">
                                                        {j.study?.name}
                                                    </h4>
                                                    
                                                    <p className="text-xs text-slate-600">
                                                        <span className="font-semibold text-slate-700">Materi / Bahasan:</span> {j.topic || 'KBM Reguler Sesuai Silabus'}
                                                    </p>
                                                    
                                                    <p className="text-xs text-slate-500">
                                                        Pengampu: <span className="font-medium text-slate-700">{j.teacher?.name || '-'}</span>
                                                        {j.substitute_teacher && (
                                                            <span className="ml-2 text-amber-700 font-medium">
                                                                (Guru Pengganti: {j.substitute_teacher.name})
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                                                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs space-y-1">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                Kehadiran Santri
                                                            </span>
                                                            <span className="font-mono font-bold text-emerald-700">
                                                                {hadirPct}%
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[11px]">
                                                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold" title="Hadir">
                                                                H: {j.hadir_count || 0}
                                                            </span>
                                                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold" title="Sakit">
                                                                S: {j.sakit_count || 0}
                                                            </span>
                                                            <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold" title="Izin">
                                                                I: {j.izin_count || 0}
                                                            </span>
                                                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold" title="Alpa">
                                                                A: {j.alpa_count || 0}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenPresenceModal(j)}
                                                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-200 rounded transition flex items-center gap-1"
                                                        >
                                                            <Users className="w-3.5 h-3.5 text-emerald-700" />
                                                            Detail Presensi
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Pagination Kontrol Kartu */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-3">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span>
                                            Menampilkan <b>{Math.min(journals.length, (journalPage - 1) * journalPerPage + 1)}</b> - <b>{Math.min(journals.length, journalPage * journalPerPage)}</b> dari <b>{journals.length} Sesi KBM</b>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">
                                            Halaman {journalPage} dari {totalJournalPages}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                disabled={journalPage <= 1}
                                                onClick={() => setJournalPage(p => Math.max(1, p - 1))}
                                                className="p-1 border border-slate-200 rounded bg-white disabled:opacity-30 hover:bg-slate-50"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                disabled={journalPage >= totalJournalPages}
                                                onClick={() => setJournalPage(p => Math.min(totalJournalPages, p + 1))}
                                                className="p-1 border border-slate-200 rounded bg-white disabled:opacity-30 hover:bg-slate-50"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'recap' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Rekapitulasi Kehadiran Santri &bull; {currentWeeklyGroup?.name}
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
                            value={schedTargetGroupId || paginatedGroups[0]?.id}
                            onChange={(e) => setSchedTargetGroupId(e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            {allGroups.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name} &bull; {g.program?.name} ({g.education?.name} - {g.education_class?.name})
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

            {/* Modal Salin Jadwal Antar Periode / Tahun Akademik */}
            <CopyScheduleModal
                open={copyModalOpen}
                onClose={() => setCopyModalOpen(false)}
                academicYears={academicYears}
                activeYearId={selectedYearId}
                quarters={quarters}
                activeQuarterId={selectedQuarterId}
                educations={educations}
                currentEducation={selectedEducation}
                onSuccess={(result) => {
                    if (result?.type === 'period' && result?.targetQuarterId) {
                        setSelectedQuarterId(String(result.targetQuarterId));
                    } else if (result?.type === 'year' && result?.targetYearId) {
                        setSelectedYearId(String(result.targetYearId));
                    }
                    refetchSchedules();
                }}
            />

            {/* Modal Cetak Jadwal Pelajaran (PDF Frontend) */}
            <PrintScheduleModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                allGroups={allGroups}
                filteredGroups={filteredGroups}
                currentGroup={currentWeeklyGroup || paginatedGroups[0]}
                schedules={allSchedules}
                lessonHours={lessonHours}
                academicYear={currentYear?.year ? `${currentYear.year} H` : '1446/1447 H'}
                quarterName={currentQuarter?.name || 'Triwulan IV (Syawal - Dzulhijjah)'}
                selectedEducation={selectedEducation}
            />
        </div>
    );
}

// Helper Nama Hari Pesantren
function getDayName(dayId) {
    const m = { 6: 'Sabtu', 7: 'Ahad', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat (Libur)' };
    return m[dayId] || 'Tidak Diketahui';
}
