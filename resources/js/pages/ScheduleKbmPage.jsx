import React, { useState, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
    useGetSchedulePeriodsQuery,
    useCreateSchedulePeriodMutation,
    useUpdateSchedulePeriodMutation,
    useDeleteSchedulePeriodMutation,
    useActivateSchedulePeriodMutation,
    useDeactivateSchedulePeriodMutation,
    useResetSchedulePeriodMutation,
    useGetSchedulesQuery, 
    useCreateScheduleMutation, 
    useUpdateScheduleMutation,
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
import { useGetInstitutionsQuery, useGetProgramsQuery } from '../store/slices/institutionApi';
import { useGetEducationClassesQuery } from '../store/slices/educationClassApi';
import { useGetClassroomsQuery } from '../store/slices/classroomApi';
import Modal from '../components/ui/Modal';
import FlatTabs from '../components/atoms/FlatTabs';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import CopyScheduleModal from '../components/organisms/CopyScheduleModal';
import PrintScheduleModal from '../components/organisms/PrintScheduleModal';
import PrintRecapModal from '../components/organisms/PrintRecapModal';
import ActionDropdown from '../components/molecules/ActionDropdown';
import { 
    Calendar, Plus, Clock, BookOpen, BarChart3, User, MapPin, 
    Trash2, Pencil, Sun, Moon, Coffee, GraduationCap, Users, LayoutGrid, 
    Table as TableIcon, Columns, Search, Filter, AlertTriangle, CheckCircle2,
    School, ShieldAlert, ChevronLeft, ChevronRight, Printer, Layers, Copy, RotateCcw,
    FileSpreadsheet, Loader2, Power, CalendarCheck, CalendarClock, FileEdit
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getUserProgramId, getUserProgram, hasPermission, hasAnyPermission } from '../utils/access';

export default function ScheduleKbmPage() {
    const user = useSelector((state) => state.auth?.user);
    const userProgramId = getUserProgramId(user);

    const canViewSchedules = hasAnyPermission(user, ['kbm.view', 'kbm.create', 'kbm.update', 'kbm.delete', 'kbm.print']);
    const canCreateSchedule = hasPermission(user, 'kbm.create');
    const canUpdateSchedule = hasPermission(user, 'kbm.update');
    const canDeleteSchedule = hasPermission(user, 'kbm.delete');
    const canPrintSchedule = hasPermission(user, 'kbm.print');
    const canViewJournals = hasAnyPermission(user, ['presensi.view', 'presensi.create', 'presensi.update', 'presensi.print']);
    const canCreateJournal = hasPermission(user, 'presensi.create');
    const canPrintPresence = hasPermission(user, 'presensi.print');

    const scheduleTabs = useMemo(() => {
        const list = [];
        if (canViewSchedules) {
            list.push({ id: 'schedules', name: 'Matriks Jadwal Pelajaran', icon: Calendar });
        }
        if (canViewJournals) {
            list.push({ id: 'journals', name: 'Jurnal Mengajar & Presensi', icon: BookOpen });
            list.push({ id: 'recap', name: 'Rekapitulasi Kehadiran', icon: BarChart3 });
        }
        return list;
    }, [canViewSchedules, canViewJournals]);

    const [activeTab, setActiveTab] = useState(() => (canViewSchedules ? 'schedules' : 'journals')); // 'schedules' | 'journals' | 'recap'
    useEffect(() => {
        if (scheduleTabs.length > 0 && !scheduleTabs.some((t) => t.id === activeTab)) {
            setActiveTab(scheduleTabs[0].id);
        }
    }, [scheduleTabs, activeTab]);

    const [viewMode, setViewMode] = useState('inverted_matrix'); // 'inverted_matrix' | 'weekly_matrix' | 'list_table'

    // ═══════════════════════════════════════════════════════════
    // KALENDER AKADEMIK HIJRIYAH BERBASIS TRIWULAN (SINKRON DENGAN NAVBAR)
    // ═══════════════════════════════════════════════════════════
    const { selectedYearId: globalYearId, selectedQuarterId: globalQuarterId } = useSelector(
        (state) => state.academicContext || {}
    );
    const { data: yearsData } = useGetAcademicYearsQuery();
    const academicYears = yearsData?.data || [];
    const activeYearObj = useMemo(() => academicYears.find(y => y.active) || academicYears[0], [academicYears]);

    const [selectedYearId, setSelectedYearId] = useState('');
    useEffect(() => {
        if (globalYearId) {
            setSelectedYearId(String(globalYearId));
        } else if (activeYearObj?.id && !selectedYearId) {
            setSelectedYearId(String(activeYearObj.id));
        }
    }, [globalYearId, activeYearObj]);

    const { data: quartersData } = useGetAcademicQuartersQuery(selectedYearId || undefined);
    const quarters = quartersData?.data || [];

    const [selectedQuarterId, setSelectedQuarterId] = useState('');
    useEffect(() => {
        if (globalQuarterId && quarters.some(q => String(q.id) === String(globalQuarterId))) {
            setSelectedQuarterId(String(globalQuarterId));
        } else if (quarters.length > 0) {
            const activeQ = quarters.find(q => q.active) || quarters[0];
            if (activeQ) setSelectedQuarterId(String(activeQ.id));
        } else {
            setSelectedQuarterId('');
        }
    }, [globalQuarterId, quarters]);

    const { data: programsData } = useGetProgramsQuery();
    const programs = programsData?.data || [];

    const { data: institutionsData } = useGetInstitutionsQuery();
    const institutions = institutionsData?.data || [];

    const { data: educationClassesData } = useGetEducationClassesQuery();
    const allEducationClasses = educationClassesData?.data || [];

    const { data: classroomsData } = useGetClassroomsQuery();
    const classrooms = classroomsData?.data || [];

    const currentYear = useMemo(() => academicYears.find(y => String(y.id) === String(selectedYearId)) || activeYearObj, [academicYears, selectedYearId, activeYearObj]);
    const currentQuarter = useMemo(() => quarters.find(q => String(q.id) === String(selectedQuarterId)) || quarters[0], [quarters, selectedQuarterId]);

    const [copyModalOpen, setCopyModalOpen] = useState(false);
    const [printModalOpen, setPrintModalOpen] = useState(false);

    // ═══════════════════════════════════════════════════════════
    // FILTER DATA MASTER BERTINGKAT: PROGRAM -> JENJANG -> KELAS -> HARI
    // ═══════════════════════════════════════════════════════════
    const [selectedProgram, setSelectedProgram] = useState(() => (userProgramId ? String(userProgramId) : 'all')); // 'all' | program_id
    useEffect(() => {
        if (userProgramId) {
            setSelectedProgram(String(userProgramId));
        }
    }, [userProgramId]);
    const [selectedEducation, setSelectedEducation] = useState('all'); // 'all' | educational_institution_id
    const [selectedEducationClass, setSelectedEducationClass] = useState('all'); // 'all' | education_class_id
    const [selectedDayFilter, setSelectedDayFilter] = useState(6); // Default: Sabtu (6)
    const [searchQuery, setSearchQuery] = useState('');
    const [showOnlyClashes, setShowOnlyClashes] = useState(false);

    // PAGINATION UNTUK ROMBEL (BARIS KE BAWAH)
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(8);

    // Fetch Master Data
    const { data: groupsData, isLoading: isLoadingGroups } = useGetClassGroupsQuery(
        selectedYearId ? { academic_year_id: selectedYearId } : undefined
    );
    const allGroups = groupsData?.data || [];

    const userProgram = useMemo(() => getUserProgram(user, programs), [user, programs]);

    // Daftar Program Dinamis (terbatas sesuai cakupan program role pengguna bila ada)
    const availablePrograms = useMemo(() => {
        let list = [];
        if (programs.length > 0) {
            list = programs;
        } else {
            const map = new Map();
            institutions.forEach(inst => {
                if (inst.program?.id) map.set(String(inst.program.id), inst.program);
            });
            allGroups.forEach(g => {
                if (g.program?.id) map.set(String(g.program.id), g.program);
            });
            list = Array.from(map.values());
        }

        if (userProgramId) {
            const scoped = list.filter((p) => Number(p.id) === userProgramId);
            if (scoped.length > 0) return scoped;
            return userProgram ? [userProgram] : [];
        }

        return list;
    }, [programs, institutions, allGroups, userProgramId, userProgram]);

    // Daftar Jenjang Pendidikan Dinamis (dari master institutions, terfilter oleh Program)
    const filteredInstitutions = useMemo(() => {
        if (selectedProgram === 'all') return institutions;
        return institutions.filter(inst =>
            String(inst.program_id) === String(selectedProgram) ||
            String(inst.program?.id) === String(selectedProgram) ||
            inst.program?.name?.toLowerCase() === String(selectedProgram).toLowerCase()
        );
    }, [institutions, selectedProgram]);

    // Daftar Tingkat Kelas Dinamis (dari master education-classes, terfilter oleh Jenjang & Program)
    const filteredEducationClasses = useMemo(() => {
        let list = allEducationClasses;
        if (selectedEducation !== 'all') {
            list = list.filter(cls =>
                String(cls.educational_institution_id) === String(selectedEducation) ||
                String(cls.institution?.id) === String(selectedEducation) ||
                String(cls.education?.educational_institution_id) === String(selectedEducation)
            );
        } else if (selectedProgram !== 'all') {
            const validInstIds = new Set(filteredInstitutions.map(i => String(i.id)));
            list = list.filter(cls =>
                validInstIds.has(String(cls.educational_institution_id)) ||
                validInstIds.has(String(cls.institution?.id)) ||
                validInstIds.has(String(cls.education?.educational_institution_id)) ||
                String(cls.education?.program_id) === String(selectedProgram)
            );
        }
        return list;
    }, [allEducationClasses, selectedEducation, selectedProgram, filteredInstitutions]);

    const selectedEducationLabel = useMemo(() => {
        if (selectedEducation === 'all') return 'all';
        const inst = institutions.find(i => String(i.id) === String(selectedEducation));
        return inst ? (inst.short_name || inst.name) : selectedEducation;
    }, [selectedEducation, institutions]);

    const { data: hoursData } = useGetLessonHoursQuery();
    const allLessonHours = useMemo(() => {
        const raw = hoursData?.data || [];
        return [...raw].sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [hoursData]);

    // Filter jam pelajaran sesuai Program aktif (Tibyan / Kubar / Umum)
    const lessonHours = useMemo(() => {
        let activeProgId = selectedProgram !== 'all' ? selectedProgram : null;
        if (!activeProgId && selectedEducation !== 'all') {
            const inst = institutions.find((i) => String(i.id) === String(selectedEducation));
            activeProgId = inst?.program_id || inst?.program?.id || null;
        }
        if (!activeProgId) return allLessonHours;
        const filtered = allLessonHours.filter(
            (h) => !h.program_id || String(h.program_id) === String(activeProgId)
        );
        return filtered.length > 0 ? filtered : allLessonHours;
    }, [allLessonHours, selectedProgram, selectedEducation, institutions]);

    const { data: studiesData } = useGetStudiesQuery({ for_schedule: 1 });
    const studies = useMemo(() => {
        const raw = studiesData?.data || [];
        return raw.filter(s => s.study_type !== 'muatan_lokal');
    }, [studiesData]);

    const { data: teachersData } = useGetTeachersQuery();
    const teachers = teachersData?.data || [];

    // ═══════════════════════════════════════════════════════════
    // PERIODE & MASA BERLAKU JADWAL (NAMA JADWAL, STATUS AKTIF, RESET)
    // ═══════════════════════════════════════════════════════════
    const schedulePeriodQueryParams = useMemo(() => {
        const params = {};
        if (selectedYearId) params.academic_year_id = selectedYearId;
        if (selectedQuarterId) params.academic_quarter_id = selectedQuarterId;
        return params;
    }, [selectedYearId, selectedQuarterId]);

    const { data: schedulePeriodsData, refetch: refetchSchedulePeriods } = useGetSchedulePeriodsQuery(
        schedulePeriodQueryParams,
        { skip: !selectedYearId }
    );
    const schedulePeriods = schedulePeriodsData?.data || [];

    const [selectedSchedulePeriodId, setSelectedSchedulePeriodId] = useState('');
    useEffect(() => {
        if (schedulePeriods.length === 0) {
            setSelectedSchedulePeriodId('');
            return;
        }
        const exists = schedulePeriods.some(p => String(p.id) === String(selectedSchedulePeriodId));
        if (!exists) {
            const activeP = schedulePeriods.find(p => p.is_active) || schedulePeriods[0];
            setSelectedSchedulePeriodId(String(activeP.id));
        }
    }, [schedulePeriods, selectedSchedulePeriodId]);

    const currentSchedulePeriod = useMemo(
        () => schedulePeriods.find(p => String(p.id) === String(selectedSchedulePeriodId)) || null,
        [schedulePeriods, selectedSchedulePeriodId]
    );

    const [createSchedulePeriod, { isLoading: isCreatingPeriod }] = useCreateSchedulePeriodMutation();
    const [updateSchedulePeriod, { isLoading: isUpdatingPeriod }] = useUpdateSchedulePeriodMutation();
    const [deleteSchedulePeriod, { isLoading: isDeletingPeriod }] = useDeleteSchedulePeriodMutation();
    const [activateSchedulePeriod, { isLoading: isActivatingPeriod }] = useActivateSchedulePeriodMutation();
    const [deactivateSchedulePeriod, { isLoading: isDeactivatingPeriod }] = useDeactivateSchedulePeriodMutation();
    const [resetSchedulePeriod, { isLoading: isResettingPeriod }] = useResetSchedulePeriodMutation();

    // Modal & Confirm States untuk Periode Jadwal
    const [periodModalOpen, setPeriodModalOpen] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState(null);
    const [periodFormName, setPeriodFormName] = useState('');
    const [periodFormQuarterId, setPeriodFormQuarterId] = useState('');
    const [periodFormProgramId, setPeriodFormProgramId] = useState('');
    const [periodFormStartDate, setPeriodFormStartDate] = useState('');
    const [periodFormEndDate, setPeriodFormEndDate] = useState('');
    const [periodFormDesc, setPeriodFormDesc] = useState('');

    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [resetScope, setResetScope] = useState('all'); // 'all' | 'group'
    const [resetTargetGroupId, setResetTargetGroupId] = useState('');

    const [periodConfirmAction, setPeriodConfirmAction] = useState(null); // { type: 'activate' | 'deactivate' | 'delete', period }

    // Fetch Schedules
    const scheduleParams = useMemo(() => {
        const params = {};
        if (selectedYearId) params.academic_year_id = selectedYearId;
        if (selectedQuarterId) params.academic_quarter_id = selectedQuarterId;
        if (selectedSchedulePeriodId) params.schedule_period_id = selectedSchedulePeriodId;
        return params;
    }, [selectedYearId, selectedQuarterId, selectedSchedulePeriodId]);

    const { data: schedulesData, refetch: refetchSchedules } = useGetSchedulesQuery(
        scheduleParams,
        { skip: !selectedSchedulePeriodId }
    );
    const allSchedules = useMemo(() => {
        if (!selectedSchedulePeriodId) return [];
        const list = schedulesData?.data || [];
        return list.filter((s) => String(s.schedule_period_id) === String(selectedSchedulePeriodId));
    }, [selectedSchedulePeriodId, schedulesData]);

    const [createSchedule, { isLoading: isCreatingSchedule }] = useCreateScheduleMutation();
    const [updateSchedule, { isLoading: isUpdatingSchedule }] = useUpdateScheduleMutation();
    const [deleteSchedule] = useDeleteScheduleMutation();

    // ═══════════════════════════════════════════════════════════
    // FILTER ROMBEL BERDASARKAN HIERARKI DATA MASTER
    // ═══════════════════════════════════════════════════════════
    const filteredGroups = useMemo(() => {
        let result = allGroups;

        // 1. Filter Program Pesantren
        if (selectedProgram !== 'all') {
            result = result.filter(g => 
                String(g.program_id) === String(selectedProgram) ||
                String(g.program?.id) === String(selectedProgram) ||
                String(g.educational_institution?.program_id) === String(selectedProgram) ||
                g.program?.name?.toLowerCase() === String(selectedProgram).toLowerCase() ||
                g.educational_institution?.short_name?.toLowerCase() === String(selectedProgram).toLowerCase()
            );
        }

        // 2. Filter Jenjang Pendidikan (dari master EducationalInstitution)
        if (selectedEducation !== 'all') {
            result = result.filter(g => 
                String(g.educational_institution_id) === String(selectedEducation) ||
                String(g.educational_institution?.id) === String(selectedEducation) ||
                String(g.education_id) === String(selectedEducation) ||
                g.educational_institution?.name?.toLowerCase() === String(selectedEducation).toLowerCase() ||
                g.education?.name?.toLowerCase() === String(selectedEducation).toLowerCase()
            );
        }

        // 3. Filter Tingkat/Kelas (dari master EducationClass)
        if (selectedEducationClass !== 'all') {
            result = result.filter(g => 
                String(g.education_class_id) === String(selectedEducationClass) ||
                String(g.education_class?.id) === String(selectedEducationClass) ||
                g.education_class?.name?.toLowerCase() === String(selectedEducationClass).toLowerCase() ||
                g.education_class?.code?.toLowerCase() === String(selectedEducationClass).toLowerCase()
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
    const [editingSchedule, setEditingSchedule] = useState(null);
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

    const [recapStartDate, setRecapStartDate] = useState('');
    const [recapEndDate, setRecapEndDate] = useState('');

    const formatLocalYmd = (dateObj) => {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const applyRecapPreset = (preset) => {
        const now = new Date();
        if (preset === 'today') {
            const today = formatLocalYmd(now);
            setRecapStartDate(today);
            setRecapEndDate(today);
        } else if (preset === 'week') {
            // Pekan pesantren: Sabtu s.d. Kamis
            const day = now.getDay(); // 0=Sun .. 6=Sat
            const diffToSat = day === 6 ? 0 : -(day + 1);
            const sat = new Date(now);
            sat.setDate(now.getDate() + diffToSat);
            const thu = new Date(sat);
            thu.setDate(sat.getDate() + 5);
            setRecapStartDate(formatLocalYmd(sat));
            setRecapEndDate(formatLocalYmd(thu));
        } else if (preset === 'month') {
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setRecapStartDate(formatLocalYmd(first));
            setRecapEndDate(formatLocalYmd(last));
        } else {
            setRecapStartDate('');
            setRecapEndDate('');
        }
    };

    const recapParams = useMemo(() => {
        if (!currentWeeklyGroup?.id) return undefined;
        return {
            class_group_id: currentWeeklyGroup.id,
            ...(recapStartDate ? { start_date: recapStartDate } : {}),
            ...(recapEndDate ? { end_date: recapEndDate } : {}),
        };
    }, [currentWeeklyGroup?.id, recapStartDate, recapEndDate]);

    const { data: recapData, isLoading: isLoadingRecap } = useGetJournalRecapQuery(
        recapParams,
        { skip: !recapParams }
    );
    const recap = recapData?.data;

    // Pagination, Search, Export Excel & Print Preview untuk Rekapitulasi Kehadiran
    const [recapSearchQuery, setRecapSearchQuery] = useState('');
    const [recapPage, setRecapPage] = useState(1);
    const [recapPerPage, setRecapPerPage] = useState(10);
    const [printRecapModalOpen, setPrintRecapModalOpen] = useState(false);
    const [isExportingRecap, setIsExportingRecap] = useState(false);

    const handleExportRecapExcel = async () => {
        if (!currentWeeklyGroup?.id) {
            toast.error('Pilih rombel terlebih dahulu');
            return;
        }

        setIsExportingRecap(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                class_group_id: String(currentWeeklyGroup.id),
            });
            if (recapStartDate) params.set('start_date', recapStartDate);
            if (recapEndDate) params.set('end_date', recapEndDate);
            if (selectedYearId) params.set('academic_year_id', String(selectedYearId));
            if (selectedQuarterId) params.set('academic_quarter_id', String(selectedQuarterId));

            const headers = {
                Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json',
            };
            if (token) headers.Authorization = `Bearer ${token}`;
            if (selectedYearId) headers['X-Academic-Year-Id'] = String(selectedYearId);
            if (selectedQuarterId) headers['X-Academic-Quarter-Id'] = String(selectedQuarterId);

            const res = await fetch(`/api/main/journals/recap/export?${params.toString()}`, {
                headers,
            });

            if (!res.ok) {
                let errMsg = 'Gagal mengekspor file Excel rekapitulasi kehadiran';
                try {
                    const errJson = await res.json();
                    if (errJson?.message) errMsg = errJson.message;
                } catch {
                    // abaikan bila response error bukan JSON
                }
                throw new Error(errMsg);
            }

            const blob = await res.blob();
            const contentDisposition = res.headers.get('Content-Disposition') || '';
            const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);

            const safeGroup = (currentWeeklyGroup.name || 'Rombel').replace(/[^a-zA-Z0-9_-]+/g, '_');
            const rangeSlug = recapStartDate && recapEndDate
                ? (recapStartDate === recapEndDate
                    ? recapStartDate.replace(/-/g, '')
                    : `${recapStartDate.replace(/-/g, '')}_sd_${recapEndDate.replace(/-/g, '')}`)
                : recapStartDate
                ? `mulai_${recapStartDate.replace(/-/g, '')}`
                : recapEndDate
                ? `sampai_${recapEndDate.replace(/-/g, '')}`
                : 'Semua_Waktu';

            const fileName = filenameMatch?.[1] || `Rekap_Kehadiran_${safeGroup}_${rangeSlug}.xlsx`;

            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);

            toast.success('File Excel rekapitulasi kehadiran berhasil diunduh');
        } catch (err) {
            toast.error(err?.message || 'Gagal mengekspor Excel');
        } finally {
            setIsExportingRecap(false);
        }
    };

    const filteredRecapStudents = useMemo(() => {
        const list = recap?.students || [];
        if (!recapSearchQuery.trim()) return list;
        const q = recapSearchQuery.toLowerCase();
        return list.filter(
            (st) =>
                st.name?.toLowerCase().includes(q) ||
                st.nis?.toLowerCase().includes(q)
        );
    }, [recap?.students, recapSearchQuery]);

    const totalRecapPages = Math.ceil(filteredRecapStudents.length / recapPerPage) || 1;
    const paginatedRecapStudents = useMemo(() => {
        const start = (recapPage - 1) * recapPerPage;
        return filteredRecapStudents.slice(start, start + recapPerPage);
    }, [filteredRecapStudents, recapPage, recapPerPage]);

    useEffect(() => {
        setRecapPage(1);
    }, [recapSearchQuery, recapPerPage, currentWeeklyGroup?.id, recapStartDate, recapEndDate]);

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
    const getScheduleCell = (dayId, hourOrder, groupId, hourId = null) => {
        return allSchedules.find(s => 
            Number(s.day) === Number(dayId) && 
            ((hourId && Number(s.lesson_hour_id) === Number(hourId)) || Number(s.lesson_hour?.order) === Number(hourOrder)) && 
            Number(s.class_group_id) === Number(groupId)
        ) || null;
    };

    const openCreatePeriodModal = () => {
        setEditingPeriod(null);
        setPeriodFormName('');
        setPeriodFormQuarterId(selectedQuarterId || '');
        setPeriodFormProgramId(userProgramId ? String(userProgramId) : (selectedProgram !== 'all' ? String(selectedProgram) : ''));
        setPeriodFormStartDate(currentQuarter?.start_date ? String(currentQuarter.start_date).substring(0, 10) : '');
        setPeriodFormEndDate(currentQuarter?.end_date ? String(currentQuarter.end_date).substring(0, 10) : '');
        setPeriodFormDesc('');
        setPeriodModalOpen(true);
    };

    const openEditPeriodModal = (period) => {
        if (!period) return;
        setEditingPeriod(period);
        setPeriodFormName(period.name || '');
        setPeriodFormQuarterId(period.academic_quarter_id ? String(period.academic_quarter_id) : '');
        setPeriodFormProgramId(userProgramId ? String(userProgramId) : (period.program_id ? String(period.program_id) : ''));
        setPeriodFormStartDate(period.effective_start_date ? String(period.effective_start_date).substring(0, 10) : '');
        setPeriodFormEndDate(period.effective_end_date ? String(period.effective_end_date).substring(0, 10) : '');
        setPeriodFormDesc(period.description || '');
        setPeriodModalOpen(true);
    };

    const handleSaveSchedulePeriod = async (e) => {
        e.preventDefault();
        if (!periodFormName.trim()) {
            toast.warning('Nama jadwal wajib diisi (misal: Jadwal Periode 1447).');
            return;
        }
        const payload = {
            name: periodFormName.trim(),
            academic_year_id: Number(selectedYearId || activeYearObj?.id || 1),
            academic_quarter_id: periodFormQuarterId ? Number(periodFormQuarterId) : null,
            program_id: userProgramId ? Number(userProgramId) : (periodFormProgramId ? Number(periodFormProgramId) : null),
            effective_start_date: periodFormStartDate || null,
            effective_end_date: periodFormEndDate || null,
            description: periodFormDesc.trim() || null,
        };

        try {
            if (editingPeriod?.id) {
                await updateSchedulePeriod({ id: editingPeriod.id, ...payload }).unwrap();
                toast.success('Nama dan masa berlaku jadwal berhasil diperbarui');
            } else {
                const res = await createSchedulePeriod(payload).unwrap();
                if (res?.data?.id) {
                    setSelectedSchedulePeriodId(String(res.data.id));
                }
                toast.success('Jadwal baru berhasil dibuat (berstatus Draft hingga diberlakukan)');
            }
            setPeriodModalOpen(false);
            setEditingPeriod(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan periode jadwal');
        }
    };

    const handleResetScheduleConfirm = async (e) => {
        e.preventDefault();
        if (!currentSchedulePeriod) return;
        try {
            const payload = {
                id: currentSchedulePeriod.id,
                ...(resetScope === 'group' && resetTargetGroupId ? { class_group_id: Number(resetTargetGroupId) } : {}),
            };
            const res = await resetSchedulePeriod(payload).unwrap();
            toast.success(res?.message || 'Jadwal berhasil direset');
            setResetModalOpen(false);
            refetchSchedules();
            refetchSchedulePeriods();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal mereset jadwal');
        }
    };

    const handleCellClick = (dayId, hourOrder, targetGroupId) => {
        if (!canCreateSchedule) return;
        if (!selectedSchedulePeriodId) {
            toast.info('Silakan buat atau pilih nama jadwal terlebih dahulu (misal: Jadwal Periode 1447).');
            openCreatePeriodModal();
            return;
        }
        setEditingSchedule(null);
        setSchedDay(dayId);
        setSchedHourId(lessonHours.find(h => h.order === hourOrder)?.id || '');
        setSchedTargetGroupId(targetGroupId || paginatedGroups[0]?.id || '');
        setSchedStudyId(studies[0]?.id || '');
        setSchedTeacherId(teachers[0]?.id || '');
        setSchedClassroomId('');
        setScheduleModalOpen(true);
    };

    const handleEditScheduleClick = (sched) => {
        if (!sched || !canUpdateSchedule) return;
        setEditingSchedule(sched);
        setSchedDay(Number(sched.day) || 6);
        setSchedHourId(sched.lesson_hour_id || sched.lesson_hour?.id || '');
        setSchedTargetGroupId(sched.class_group_id || sched.class_group?.id || '');
        setSchedStudyId(sched.study_id || sched.study?.id || '');
        setSchedTeacherId(sched.teacher_id || sched.teacher?.id || '');
        setSchedClassroomId(sched.classroom_id || sched.classroom?.id || '');
        setScheduleModalOpen(true);
    };

    const handleSaveSchedule = async (e) => {
        e.preventDefault();
        if (!selectedSchedulePeriodId && !editingSchedule?.schedule_period_id) {
            toast.error('Pilih atau buat nama jadwal terlebih dahulu.');
            return;
        }
        const payload = {
            schedule_period_id: Number(editingSchedule?.schedule_period_id || selectedSchedulePeriodId),
            academic_year_id: Number(selectedYearId || editingSchedule?.academic_year_id || 1),
            academic_quarter_id: Number(selectedQuarterId || editingSchedule?.academic_quarter_id || 4),
            class_group_id: Number(schedTargetGroupId || paginatedGroups[0]?.id),
            study_id: Number(schedStudyId),
            teacher_id: Number(schedTeacherId),
            lesson_hour_id: Number(schedHourId),
            classroom_id: schedClassroomId ? Number(schedClassroomId) : null,
            day: Number(schedDay),
        };

        try {
            if (editingSchedule?.id) {
                await updateSchedule({
                    id: editingSchedule.id,
                    ...payload,
                }).unwrap();
                toast.success('Jadwal pelajaran berhasil diperbarui');
            } else {
                await createSchedule(payload).unwrap();
                toast.success('Jadwal pelajaran berhasil disimpan');
            }
            setScheduleModalOpen(false);
            setEditingSchedule(null);
        } catch (err) {
            toast.error(err?.data?.message || (editingSchedule ? 'Gagal memperbarui jadwal' : 'Gagal menambahkan jadwal'));
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

                    {(canCreateSchedule || (canPrintSchedule && selectedSchedulePeriodId)) && (
                        <ActionDropdown
                            label="Aksi Jadwal"
                            icon={Layers}
                            variant="primary"
                            items={[
                                ...(canCreateSchedule
                                    ? [
                                          {
                                              id: 'add_schedule',
                                              label: 'Tambah Jadwal Baru',
                                              description: 'Input KBM mata pelajaran, ustadz, jam, dan rombel',
                                              icon: Plus,
                                              iconColor: 'text-emerald-700',
                                              onClick: () => {
                                                  if (!selectedSchedulePeriodId) {
                                                      toast.info('Silakan buat nama jadwal terlebih dahulu (misal: Jadwal Periode 1447).');
                                                      openCreatePeriodModal();
                                                      return;
                                                  }
                                                  setEditingSchedule(null);
                                                  setSchedDay(selectedDayFilter || 6);
                                                  setSchedHourId(lessonHours[0]?.id || '');
                                                  setSchedTargetGroupId(paginatedGroups[0]?.id || '');
                                                  setSchedStudyId(studies[0]?.id || '');
                                                  setSchedTeacherId(teachers[0]?.id || '');
                                                  setSchedClassroomId('');
                                                  setScheduleModalOpen(true);
                                              },
                                          },
                                          {
                                              id: 'create_schedule_period',
                                              label: 'Buat Nama Jadwal Baru',
                                              description: 'Buat rancangan jadwal baru beserta masa berlakunya',
                                              icon: CalendarClock,
                                              iconColor: 'text-amber-600',
                                              onClick: openCreatePeriodModal,
                                          },
                                          {
                                              id: 'copy_schedule',
                                              label: 'Salin Jadwal KBM',
                                              description: 'Salin jadwal antar triwulan atau tahun ajaran baru',
                                              icon: Copy,
                                              iconColor: 'text-blue-600',
                                              onClick: () => setCopyModalOpen(true),
                                          },
                                      ]
                                    : []),
                                ...(canPrintSchedule && selectedSchedulePeriodId
                                    ? [
                                          {
                                              id: 'print_schedule',
                                              label: 'Cetak Jadwal Pelajaran (PDF)',
                                              description: 'Download format resmi jadwal per rombel & periode',
                                              icon: Printer,
                                              iconColor: 'text-slate-700',
                                              dividerBefore: canCreateSchedule,
                                              onClick: () => setPrintModalOpen(true),
                                          },
                                      ]
                                    : []),
                            ]}
                        />
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                BAR RINGKAS NAMA JADWAL, MASA BERLAKU & KONTROL STATUS
                ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'schedules' && (
                <div className="bg-white border border-slate-200 rounded-md px-3.5 py-2 shadow-xs">
                    {schedulePeriods.length === 0 ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                            <div className="flex items-center gap-2">
                                <CalendarClock className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>
                                    Belum ada nama jadwal pada periode ini (contoh: <b>Jadwal Periode 1447</b>).
                                </span>
                            </div>
                            {canCreateSchedule && (
                                <button
                                    type="button"
                                    onClick={openCreatePeriodModal}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0b57d0] hover:bg-[#0842a0] text-white text-xs font-bold rounded transition shrink-0"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Buat Nama Jadwal
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                                    Jadwal:
                                </span>
                                <select
                                    value={selectedSchedulePeriodId}
                                    onChange={(e) => setSelectedSchedulePeriodId(e.target.value)}
                                    className="px-2.5 py-1 text-xs font-bold border border-slate-300 rounded bg-white text-slate-900 max-w-[280px] sm:max-w-[340px]"
                                >
                                    {schedulePeriods.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.schedules_count ?? 0} sesi)
                                        </option>
                                    ))}
                                </select>

                                {currentSchedulePeriod && (
                                    <>
                                        <span
                                            title={
                                                !currentSchedulePeriod.is_active
                                                    ? 'Mode Draft: belum berlaku di Presensi, Jurnal & Dashboard sebelum diberlakukan'
                                                    : currentSchedulePeriod.description || currentSchedulePeriod.validity_label
                                            }
                                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border shrink-0 ${
                                                currentSchedulePeriod.validity_status === 'active'
                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                    : currentSchedulePeriod.validity_status === 'scheduled'
                                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                                    : currentSchedulePeriod.validity_status === 'expired'
                                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                            }`}
                                        >
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    currentSchedulePeriod.validity_status === 'active'
                                                        ? 'bg-emerald-500 animate-pulse'
                                                        : currentSchedulePeriod.validity_status === 'scheduled'
                                                        ? 'bg-blue-500'
                                                        : currentSchedulePeriod.validity_status === 'expired'
                                                        ? 'bg-rose-500'
                                                        : 'bg-amber-500'
                                                }`}
                                            />
                                            {currentSchedulePeriod.validity_label}
                                        </span>

                                        {(currentSchedulePeriod.effective_start_date || currentSchedulePeriod.effective_end_date) && (
                                            <span
                                                className="inline-flex items-center gap-1 text-[11px] text-slate-500 whitespace-nowrap"
                                                title={currentSchedulePeriod.description || 'Masa berlaku jadwal'}
                                            >
                                                <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                                                {formatShortDate(currentSchedulePeriod.effective_start_date) || '...'} s/d{' '}
                                                {formatShortDate(currentSchedulePeriod.effective_end_date) || '...'}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>

                            {(canCreateSchedule || canUpdateSchedule || canDeleteSchedule) && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {canUpdateSchedule && currentSchedulePeriod && !currentSchedulePeriod.is_active ? (
                                        <button
                                            type="button"
                                            onClick={() => setPeriodConfirmAction({ type: 'activate', period: currentSchedulePeriod })}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded shadow-xs transition"
                                            title="Aktifkan agar jadwal ini mulai berlaku untuk KBM & Presensi"
                                        >
                                            <CalendarCheck className="w-3.5 h-3.5" /> Berlakukan
                                        </button>
                                    ) : canUpdateSchedule && currentSchedulePeriod ? (
                                        <button
                                            type="button"
                                            onClick={() => setPeriodConfirmAction({ type: 'deactivate', period: currentSchedulePeriod })}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded transition"
                                            title="Nonaktifkan jadwal agar tidak lagi berlaku"
                                        >
                                            <Power className="w-3.5 h-3.5" /> Nonaktifkan
                                        </button>
                                    ) : null}

                                    {(canCreateSchedule || (currentSchedulePeriod && (canUpdateSchedule || (canDeleteSchedule && !currentSchedulePeriod.is_active)))) && (
                                        <ActionDropdown
                                            label="Kelola"
                                            size="sm"
                                            variant="outline"
                                            items={[
                                                ...(canCreateSchedule
                                                    ? [
                                                          {
                                                              id: 'create_period',
                                                              label: 'Buat Nama Jadwal Baru',
                                                              description: 'Buat draft jadwal baru beserta masa berlakunya',
                                                              icon: Plus,
                                                              iconColor: 'text-[#0b57d0]',
                                                              onClick: openCreatePeriodModal,
                                                          },
                                                      ]
                                                    : []),
                                                ...(currentSchedulePeriod && canUpdateSchedule
                                                    ? [
                                                          {
                                                              id: 'edit_period',
                                                              label: 'Atur Nama & Masa Berlaku',
                                                              description: 'Ubah nama jadwal, tanggal berlaku, atau catatan',
                                                              icon: FileEdit,
                                                              iconColor: 'text-slate-700',
                                                              onClick: () => openEditPeriodModal(currentSchedulePeriod),
                                                          },
                                                          {
                                                              id: 'reset_period',
                                                              label: 'Reset Jadwal',
                                                              description: currentSchedulePeriod.is_active
                                                                  ? 'Terkunci karena jadwal sudah diberlakukan'
                                                                  : 'Kosongkan slot jadwal sebelum diberlakukan',
                                                              icon: RotateCcw,
                                                              iconColor: 'text-rose-600',
                                                              badge: currentSchedulePeriod.is_active ? 'Aktif' : undefined,
                                                              disabled: currentSchedulePeriod.is_active || allSchedules.length === 0,
                                                              dividerBefore: canCreateSchedule,
                                                              onClick: () => {
                                                                  setResetScope('all');
                                                                  setResetTargetGroupId(
                                                                      paginatedGroups[0]?.id ? String(paginatedGroups[0].id) : ''
                                                                  );
                                                                  setResetModalOpen(true);
                                                              },
                                                          },
                                                      ]
                                                    : []),
                                                ...(currentSchedulePeriod && canDeleteSchedule && !currentSchedulePeriod.is_active
                                                    ? [
                                                          {
                                                              id: 'delete_period',
                                                              label: 'Hapus Draft Jadwal',
                                                              description: 'Hapus nama jadwal yang belum aktif ini',
                                                              icon: Trash2,
                                                              danger: true,
                                                              onClick: () =>
                                                                  setPeriodConfirmAction({
                                                                      type: 'delete',
                                                                      period: currentSchedulePeriod,
                                                                  }),
                                                          },
                                                      ]
                                                    : []),
                                            ]}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                FILTER DATA MASTER RELASIONAL: PROGRAM -> JENJANG -> KELAS
                (Hanya ditampilkan bila ada jadwal yang dibuat pada tab jadwal)
                ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'schedules' && selectedSchedulePeriodId && (
            <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-4">
                {/* 1. Filter Program Utama (Dinamis sesuai role pengguna) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-md">
                        {!userProgramId && (
                            <button
                                onClick={() => { setSelectedProgram('all'); setSelectedEducation('all'); setSelectedEducationClass('all'); setCurrentPage(1); }}
                                className={`px-3 py-1.5 text-xs font-bold rounded transition ${
                                    selectedProgram === 'all'
                                        ? 'bg-[#0b57d0] text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Semua Program
                            </button>
                        )}
                        {availablePrograms.map((prog) => (
                            <button
                                key={prog.id}
                                onClick={() => {
                                    if (userProgramId) return;
                                    setSelectedProgram(String(prog.id));
                                    setSelectedEducation('all');
                                    setSelectedEducationClass('all');
                                    setCurrentPage(1);
                                }}
                                className={`px-3 py-1.5 text-xs font-bold rounded transition flex items-center gap-1.5 ${
                                    String(selectedProgram) === String(prog.id) || Number(userProgramId) === Number(prog.id)
                                        ? 'bg-[#0b57d0] text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <School className="w-3.5 h-3.5" /> Program {prog.name}{prog.code ? ` (${prog.code})` : ''}
                            </button>
                        ))}
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
                    {/* Jenjang Pendidikan (Sinkron dengan Master Jenjang Pendidikan) */}
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
                            {filteredInstitutions.map((inst) => (
                                <option key={inst.id} value={String(inst.id)}>
                                    {inst.name}{inst.short_name && inst.short_name !== inst.name ? ` (${inst.short_name})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Tingkat / Kelas (Sinkron dengan Master Tingkat Kelas) */}
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
                            {filteredEducationClasses.map((cls) => (
                                <option key={cls.id} value={String(cls.id)}>
                                    {cls.name}{cls.code ? ` (${cls.code})` : ''}
                                </option>
                            ))}
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
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB NAVIGASI & VIEW SWITCHER
                ═══════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
                    <FlatTabs
                        tabs={scheduleTabs}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                    />

                    {activeTab === 'schedules' && selectedSchedulePeriodId && (
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
                    !selectedSchedulePeriodId ? (
                        <div className="bg-white border border-dashed border-slate-300 rounded-md p-10 text-center space-y-3 shadow-xs">
                            <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                <CalendarClock className="w-5 h-5" />
                            </div>
                            <div className="space-y-1 max-w-md mx-auto">
                                <h3 className="text-sm font-bold text-slate-800">
                                    Belum Ada Jadwal Pelajaran yang Dibuat
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Buat nama jadwal terlebih dahulu (contoh: <b>Jadwal Periode 1447</b>) sebelum menyusun dan menampilkan tabel matriks jadwal pelajaran.
                                </p>
                            </div>
                            {canCreateSchedule && (
                                <div className="pt-1">
                                    <button
                                        type="button"
                                        onClick={openCreatePeriodModal}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0b57d0] hover:bg-[#0842a0] text-white text-xs font-bold rounded shadow-xs transition"
                                    >
                                        <Plus className="w-4 h-4" /> Buat Nama Jadwal Baru
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
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

                                                                <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1 flex-wrap">
                                                                    <span>{g.program?.name || g.educational_institution?.program?.name || '-'}</span>
                                                                    <span>&bull;</span>
                                                                    <span>{g.educational_institution?.short_name || g.educational_institution?.name || g.education?.name || '-'}</span>
                                                                    <span>&bull;</span>
                                                                    <span className="text-slate-500 font-normal">{g.education_class?.name || '-'}</span>
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
                                                            const sched = getScheduleCell(selectedDayFilter, h.order, g.id, h.id);
                                                            const isClashing = sched && clashesMap.clashScheduleIds.has(sched.id);

                                                            return (
                                                                <td key={h.id} className="border-r border-slate-200 last:border-0 p-1.5 min-w-[11rem] align-top">
                                                                    {sched ? (
                                                                        <div
                                                                            onClick={() => handleEditScheduleClick(sched)}
                                                                            title="Klik untuk mengedit jadwal"
                                                                            className={`relative group p-2 rounded-md border transition h-full flex flex-col justify-between cursor-pointer ${
                                                                                isClashing
                                                                                    ? 'bg-rose-50 border-rose-300 hover:border-rose-400'
                                                                                    : 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50'
                                                                            }`}
                                                                        >
                                                                            <div className="pr-10">
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

                                                                            {(canUpdateSchedule || canDeleteSchedule) && (
                                                                            <div
                                                                                className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition bg-white/90 backdrop-blur-xs rounded border border-slate-200/80 shadow-2xs px-0.5 py-0.5"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                {canUpdateSchedule && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleEditScheduleClick(sched)}
                                                                                        className="text-slate-500 hover:text-[#0b57d0] transition p-1 rounded hover:bg-blue-50"
                                                                                        title="Edit Jadwal"
                                                                                    >
                                                                                        <Pencil className="w-3 h-3" />
                                                                                    </button>
                                                                                )}
                                                                                {canDeleteSchedule && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setDeleteScheduleTarget(sched)}
                                                                                        className="text-slate-400 hover:text-rose-600 transition p-1 rounded hover:bg-rose-50"
                                                                                        title="Hapus Jadwal"
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3" />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            )}
                                                                        </div>
                                                                    ) : canCreateSchedule ? (
                                                                        <button
                                                                            onClick={() => handleCellClick(selectedDayFilter, h.order, g.id)}
                                                                            className="w-full h-full min-h-[55px] border-2 border-dashed border-slate-100 hover:border-[#093c30]/20 hover:bg-[#093c30]/[0.02] transition rounded-md flex items-center justify-center group"
                                                                        >
                                                                            <span className="text-[10px] font-medium text-slate-300 group-hover:text-[#093c30] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                                                <Plus className="w-3 h-3" /> Jadwalkan
                                                                            </span>
                                                                        </button>
                                                                    ) : (
                                                                        <div className="w-full h-full min-h-[55px] rounded-md border border-slate-100/80 bg-slate-50/30" />
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
                                                        ? 'bg-[#0b57d0] text-white'
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
                                                    {g.name} &bull; {g.program?.name || g.educational_institution?.program?.name || '-'} ({g.educational_institution?.short_name || g.educational_institution?.name || g.education?.name || '-'} - {g.education_class?.name || '-'})
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
                                                            const sched = getScheduleCell(d.id, h.order, currentWeeklyGroup?.id, h.id);
                                                            const isClashing = sched && clashesMap.clashScheduleIds.has(sched.id);

                                                            return (
                                                                <td key={d.id} className="border-b border-r border-slate-200 p-1.5 min-w-[11rem]">
                                                                    {sched ? (
                                                                        <div
                                                                            onClick={() => handleEditScheduleClick(sched)}
                                                                            title="Klik untuk mengedit jadwal"
                                                                            className={`relative group block p-2.5 rounded-md border transition h-full cursor-pointer ${
                                                                                isClashing
                                                                                    ? 'bg-rose-50 border-rose-300'
                                                                                    : 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50'
                                                                            }`}
                                                                        >
                                                                            {isClashing && (
                                                                                <div className="mb-1 text-[9px] font-bold text-rose-600 flex items-center gap-1">
                                                                                    <AlertTriangle className="w-2.5 h-2.5" /> BENTROK JAM
                                                                                </div>
                                                                            )}
                                                                            <p className="font-bold text-slate-900 text-xs leading-tight pr-10">
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
                                                                            {(canUpdateSchedule || canDeleteSchedule) && (
                                                                            <div
                                                                                className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition bg-white/90 backdrop-blur-xs rounded border border-slate-200/80 shadow-2xs px-0.5 py-0.5"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                {canUpdateSchedule && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleEditScheduleClick(sched)}
                                                                                        className="text-slate-500 hover:text-[#0b57d0] transition p-1 rounded hover:bg-blue-50"
                                                                                        title="Edit Jadwal"
                                                                                    >
                                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                )}
                                                                                {canDeleteSchedule && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setDeleteScheduleTarget(sched)}
                                                                                        className="text-slate-400 hover:text-rose-600 transition p-1 rounded hover:bg-rose-50"
                                                                                        title="Hapus Jadwal"
                                                                                    >
                                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            )}
                                                                        </div>
                                                                    ) : canCreateSchedule ? (
                                                                        <button
                                                                            onClick={() => handleCellClick(d.id, h.order, currentWeeklyGroup?.id)}
                                                                            className="w-full h-full min-h-[55px] border-2 border-dashed border-slate-100 hover:border-[#093c30]/20 hover:bg-[#093c30]/[0.02] transition rounded-md flex items-center justify-center group"
                                                                        >
                                                                            <span className="text-[10px] font-medium text-slate-300 group-hover:text-[#093c30] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                                                <Plus className="w-3 h-3" /> Isi Slot
                                                                            </span>
                                                                        </button>
                                                                    ) : (
                                                                        <div className="w-full h-full min-h-[55px] rounded-md border border-slate-100/80 bg-slate-50/30" />
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
                                                            {s.class_group?.program?.name || s.class_group?.educational_institution?.program?.name || '-'}
                                                        </td>
                                                        <td className="px-3.5 py-2 text-slate-700">
                                                            {s.class_group?.educational_institution?.name || s.class_group?.education?.name || '-'}
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
                                                            {(canUpdateSchedule || canDeleteSchedule) && (
                                                            <div className="inline-flex items-center justify-end gap-1">
                                                                {canUpdateSchedule && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleEditScheduleClick(s)}
                                                                        className="text-slate-400 hover:text-[#0b57d0] p-1 transition rounded hover:bg-blue-50"
                                                                        title="Edit Jadwal"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                                {canDeleteSchedule && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setDeleteScheduleTarget(s)}
                                                                        className="text-slate-400 hover:text-rose-600 p-1 transition rounded hover:bg-rose-50"
                                                                        title="Hapus Jadwal"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            )}
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
                    )
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
                                                    {g.name} &bull; {g.program?.name || g.educational_institution?.program?.name || '-'} ({g.educational_institution?.short_name || g.educational_institution?.name || g.education?.name || '-'} - {g.education_class?.name || '-'})
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

                                {canCreateJournal && (
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
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0b57d0] text-white text-xs font-bold rounded-md hover:bg-[#0842a0] shadow-xs transition"
                                    >
                                        <Plus className="w-4 h-4 text-blue-200" /> Buka Jurnal Pertemuan Baru
                                    </button>
                                </div>
                                )}
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
                                        className="px-3.5 py-2 bg-[#0b57d0] text-white text-xs font-semibold rounded hover:bg-[#0842a0] transition"
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
                                                const hourName = j.lesson_schedule?.lesson_hour?.name || (hourOrder ? `Jam ${hourOrder}` : '-');
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
                                                                {hourName}
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
                                    const hourName = j.lesson_schedule?.lesson_hour?.name || (hourOrder ? `Jam Ke-${hourOrder}` : null);
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
                                                        {hourName && (
                                                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                                {hourName} {hourTime ? `(${hourTime})` : ''}
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
                    <div className="space-y-3">
                        {/* Control Bar Rekapitulasi Kehadiran */}
                        <div className="bg-white border border-slate-200 rounded-md p-3 shadow-xs space-y-3">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Rombel:
                                        </span>
                                        <select
                                            value={currentWeeklyGroup?.id || ''}
                                            onChange={(e) => setSelectedWeeklyGroupId(e.target.value)}
                                            className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white text-slate-900"
                                        >
                                            {allGroups.map((g) => (
                                                <option key={g.id} value={g.id}>
                                                    {g.name} &bull; {g.program?.name || g.educational_institution?.program?.name || '-'} ({g.educational_institution?.short_name || g.educational_institution?.name || g.education?.name || '-'} - {g.education_class?.name || '-'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        Total Pertemuan KBM: <b className="text-slate-900">{recap?.total_meetings ?? 0}</b> &bull; Santri: <b className="text-slate-900">{recap?.students?.length || 0}</b>
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                                        <input
                                            type="text"
                                            placeholder="Cari nama / NIS santri..."
                                            value={recapSearchQuery}
                                            onChange={(e) => setRecapSearchQuery(e.target.value)}
                                            className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-800 w-48 sm:w-56 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                        />
                                    </div>
                                    {canPrintPresence && (
                                    <>
                                    <button
                                        type="button"
                                        disabled={!currentWeeklyGroup?.id || !recap?.students?.length || isExportingRecap}
                                        onClick={handleExportRecapExcel}
                                        title={
                                            recapStartDate || recapEndDate
                                                ? 'Export Excel (Rentang Tanggal Terpilih)'
                                                : 'Export Excel (Semua Waktu)'
                                        }
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 disabled:opacity-40 transition shadow-2xs cursor-pointer"
                                    >
                                        {isExportingRecap ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <FileSpreadsheet className="w-3.5 h-3.5" />
                                        )}
                                        {isExportingRecap ? 'Mengekspor...' : 'Export Excel'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!recap?.students?.length}
                                        onClick={() => setPrintRecapModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#093c30] text-white text-xs font-semibold rounded hover:bg-[#062d24] disabled:opacity-40 transition shadow-2xs cursor-pointer"
                                    >
                                        <Printer className="w-3.5 h-3.5" />
                                        Preview &amp; Cetak PDF
                                    </button>
                                    </>
                                    )}
                                </div>
                            </div>

                            {/* Filter Rentang Tanggal */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                                        Rentang Tanggal:
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="date"
                                            aria-label="Dari Tanggal"
                                            value={recapStartDate}
                                            max={recapEndDate || undefined}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setRecapStartDate(val);
                                                if (recapEndDate && val && val > recapEndDate) {
                                                    setRecapEndDate(val);
                                                }
                                            }}
                                            className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                        />
                                        <span className="text-xs text-slate-400 font-medium">s/d</span>
                                        <input
                                            type="date"
                                            aria-label="Sampai Tanggal"
                                            value={recapEndDate}
                                            min={recapStartDate || undefined}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setRecapEndDate(val);
                                                if (recapStartDate && val && val < recapStartDate) {
                                                    setRecapStartDate(val);
                                                }
                                            }}
                                            className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => applyRecapPreset('reset')}
                                        className={`px-2.5 py-1 text-[11px] font-semibold border rounded transition cursor-pointer ${
                                            !recapStartDate && !recapEndDate
                                                ? 'bg-[#093c30] text-white border-[#093c30]'
                                                : 'border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-[#093c30] text-slate-700'
                                        }`}
                                    >
                                        Semua Waktu
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyRecapPreset('today')}
                                        className="px-2.5 py-1 text-[11px] font-semibold border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-[#093c30] text-slate-700 rounded transition cursor-pointer"
                                    >
                                        Hari Ini
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyRecapPreset('week')}
                                        className="px-2.5 py-1 text-[11px] font-semibold border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-[#093c30] text-slate-700 rounded transition cursor-pointer"
                                    >
                                        Pekan Ini
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyRecapPreset('month')}
                                        className="px-2.5 py-1 text-[11px] font-semibold border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-[#093c30] text-slate-700 rounded transition cursor-pointer"
                                    >
                                        Bulan Ini
                                    </button>
                                    {(recapStartDate || recapEndDate) && (
                                        <button
                                            type="button"
                                            onClick={() => applyRecapPreset('reset')}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded transition cursor-pointer"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tabel Kompak Rekapitulasi Kehadiran */}
                        <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
                            {isLoadingRecap ? (
                                <div className="p-8 text-center text-xs text-slate-400">Memuat rekap kehadiran...</div>
                            ) : recap?.students && recap.students.length > 0 ? (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs border-collapse">
                                            <thead className="bg-[#093c30] text-white text-[11px] uppercase tracking-wider">
                                                <tr>
                                                    <th className="py-2 px-3 text-center w-10 border-r border-[#064e3b]">No</th>
                                                    <th className="py-2 px-3 text-left w-32 border-r border-[#064e3b]">NIS</th>
                                                    <th className="py-2 px-3 text-left border-r border-[#064e3b]">Nama Santri</th>
                                                    <th className="py-2 px-2.5 text-center w-16 border-r border-[#064e3b]">Hadir</th>
                                                    <th className="py-2 px-2.5 text-center w-16 border-r border-[#064e3b]">Izin</th>
                                                    <th className="py-2 px-2.5 text-center w-16 border-r border-[#064e3b]">Sakit</th>
                                                    <th className="py-2 px-2.5 text-center w-16 border-r border-[#064e3b]">Alpa</th>
                                                    <th className="py-2 px-3 text-center w-44">Kehadiran</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {paginatedRecapStudents.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                                                            Tidak ada santri yang sesuai dengan pencarian &ldquo;{recapSearchQuery}&rdquo;.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    paginatedRecapStudents.map((st, idx) => (
                                                        <tr
                                                            key={st.student_id}
                                                            className={idx % 2 !== 0 ? 'bg-slate-50/50 hover:bg-emerald-50/40 transition-colors' : 'bg-white hover:bg-emerald-50/40 transition-colors'}
                                                        >
                                                            <td className="py-1.5 px-3 text-center font-mono text-[11px] text-slate-400 border-r border-slate-100">
                                                                {(recapPage - 1) * recapPerPage + idx + 1}
                                                            </td>
                                                            <td className="py-1.5 px-3 font-mono text-[11px] text-slate-600 border-r border-slate-100 whitespace-nowrap">
                                                                {st.nis || '-'}
                                                            </td>
                                                            <td className="py-1.5 px-3 font-bold text-slate-800 border-r border-slate-100">
                                                                {st.name}
                                                            </td>
                                                            <td className="py-1.5 px-2.5 text-center font-bold text-emerald-700 border-r border-slate-100">
                                                                {st.hadir ?? 0}
                                                            </td>
                                                            <td className="py-1.5 px-2.5 text-center font-bold text-blue-700 border-r border-slate-100">
                                                                {st.izin ?? 0}
                                                            </td>
                                                            <td className="py-1.5 px-2.5 text-center font-bold text-amber-700 border-r border-slate-100">
                                                                {st.sakit ?? 0}
                                                            </td>
                                                            <td className="py-1.5 px-2.5 text-center font-bold text-rose-700 border-r border-slate-100">
                                                                {st.alpa ?? 0}
                                                            </td>
                                                            <td className="py-1.5 px-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                        <div
                                                                            className={`h-full ${st.percentage >= 80 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                                            style={{ width: `${st.percentage ?? 0}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className={`text-[11px] font-bold w-9 text-right ${st.percentage >= 80 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                                        {st.percentage ?? 0}%
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination (tampil otomatis jika data > 10) */}
                                    {filteredRecapStudents.length > 10 && (
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-t border-slate-200 text-xs">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <span>
                                                    Menampilkan <b>{Math.min(filteredRecapStudents.length, (recapPage - 1) * recapPerPage + 1)}</b> -{' '}
                                                    <b>{Math.min(filteredRecapStudents.length, recapPage * recapPerPage)}</b> dari{' '}
                                                    <b>{filteredRecapStudents.length}</b> Santri
                                                </span>
                                                <select
                                                    value={recapPerPage}
                                                    onChange={(e) => setRecapPerPage(Number(e.target.value))}
                                                    className="px-2 py-0.5 text-xs border border-slate-300 rounded bg-white text-slate-700"
                                                >
                                                    <option value={10}>10 / hal</option>
                                                    <option value={25}>25 / hal</option>
                                                    <option value={50}>50 / hal</option>
                                                </select>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    disabled={recapPage <= 1}
                                                    onClick={() => setRecapPage((p) => Math.max(1, p - 1))}
                                                    className="p-1 border border-slate-300 rounded bg-white disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                                                >
                                                    <ChevronLeft className="w-3.5 h-3.5" />
                                                </button>
                                                {Array.from({ length: totalRecapPages }, (_, i) => i + 1).map((pg) => (
                                                    <button
                                                        key={pg}
                                                        type="button"
                                                        onClick={() => setRecapPage(pg)}
                                                        className={`px-2.5 py-0.5 text-xs font-semibold rounded cursor-pointer ${
                                                            recapPage === pg
                                                                ? 'bg-[#0b57d0] text-white'
                                                                : 'text-slate-600 hover:bg-slate-200/70'
                                                        }`}
                                                    >
                                                        {pg}
                                                    </button>
                                                ))}
                                                <button
                                                    type="button"
                                                    disabled={recapPage >= totalRecapPages}
                                                    onClick={() => setRecapPage((p) => Math.min(totalRecapPages, p + 1))}
                                                    className="p-1 border border-slate-300 rounded bg-white disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                                                >
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-xs text-slate-400 py-8 text-center">Belum ada data rekap presensi untuk rombel ini.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Tambah / Edit Jadwal */}
            <Modal
                open={scheduleModalOpen}
                title={editingSchedule ? 'Edit Jadwal Pelajaran' : 'Jadwalkan Mata Pelajaran Baru'}
                onClose={() => {
                    setScheduleModalOpen(false);
                    setEditingSchedule(null);
                }}
            >
                <form onSubmit={handleSaveSchedule} className="space-y-4">
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
                                    {g.name} &bull; {g.program?.name || g.educational_institution?.program?.name || '-'} ({g.educational_institution?.short_name || g.educational_institution?.name || g.education?.name || '-'} - {g.education_class?.name || '-'})
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
                                {(() => {
                                    const targetGroup = allGroups.find(
                                        (g) => String(g.id) === String(schedTargetGroupId || paginatedGroups[0]?.id)
                                    );
                                    const targetProgId =
                                        targetGroup?.program_id ||
                                        targetGroup?.program?.id ||
                                        targetGroup?.educational_institution?.program_id;
                                    const modalHours = targetProgId
                                        ? allLessonHours.filter(
                                              (h) => !h.program_id || String(h.program_id) === String(targetProgId)
                                          )
                                        : lessonHours;
                                    const list = modalHours.length > 0 ? modalHours : allLessonHours;
                                    return list.map((h) => (
                                        <option key={h.id} value={h.id}>
                                            {h.name} ({h.start_time?.substring(0, 5)} - {h.end_time?.substring(0, 5)})
                                            {h.program?.name ? ` • ${h.program.name}` : ''}
                                        </option>
                                    ));
                                })()}
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
                                {classrooms.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}{c.code ? ` (${c.code})` : ''}
                                    </option>
                                ))}
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

                    <div className="flex items-center justify-between gap-2 pt-4 border-t">
                        <div>
                            {editingSchedule && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const target = editingSchedule;
                                        setScheduleModalOpen(false);
                                        setEditingSchedule(null);
                                        setDeleteScheduleTarget(target);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md transition"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Hapus Jadwal
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setScheduleModalOpen(false);
                                    setEditingSchedule(null);
                                }}
                                className="px-3.5 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-md"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isCreatingSchedule || isUpdatingSchedule || !schedStudyId || !schedTeacherId || !schedHourId}
                                className="px-4 py-2 bg-[#0b57d0] text-white text-sm font-semibold rounded-md disabled:opacity-50 hover:bg-[#0842a0]"
                            >
                                {editingSchedule ? 'Simpan Perubahan' : 'Simpan Jadwal'}
                            </button>
                        </div>
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
                            className="px-4 py-2 bg-[#0b57d0] text-white text-sm font-semibold rounded-md disabled:opacity-50 hover:bg-[#0842a0]"
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
                                className="px-4 py-2 bg-[#0b57d0] text-white text-sm font-semibold rounded-md disabled:opacity-50 hover:bg-[#0842a0]"
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

            {/* Modal Buat / Edit Nama & Masa Berlaku Jadwal */}
            <Modal
                open={periodModalOpen}
                title={editingPeriod ? 'Edit Nama & Masa Berlaku Jadwal' : 'Buat Nama Jadwal Baru'}
                onClose={() => {
                    setPeriodModalOpen(false);
                    setEditingPeriod(null);
                }}
            >
                <form onSubmit={handleSaveSchedulePeriod} className="space-y-4">
                    {!editingPeriod && (
                        <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900">
                            Jadwal yang baru dibuat berstatus <b>Draft (Belum Berlaku)</b> dan belum digunakan di KBM/Presensi sampai Anda mengaktifkannya.
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Nama Jadwal <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Contoh: Jadwal Periode 1447"
                            value={periodFormName}
                            onChange={(e) => setPeriodFormName(e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Cakupan Program
                        </label>
                        {userProgramId ? (
                            <div className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 text-slate-700 font-semibold">
                                Program {userProgram?.name || availablePrograms[0]?.name || `#${userProgramId}`}
                            </div>
                        ) : (
                            <select
                                value={periodFormProgramId}
                                onChange={(e) => setPeriodFormProgramId(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                            >
                                <option value="">Semua Program (Umum)</option>
                                {programs.map((prog) => (
                                    <option key={prog.id} value={prog.id}>
                                        Program {prog.name}{prog.code ? ` (${prog.code})` : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Caturwulan / Periode Akademik (Opsional)
                        </label>
                        <select
                            value={periodFormQuarterId}
                            onChange={(e) => setPeriodFormQuarterId(e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            <option value="">Berlaku Umum (Semua Periode Tahun Ini)</option>
                            {quarters.map((q) => (
                                <option key={q.id} value={q.id}>
                                    {q.name} {q.active ? '• Aktif' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Mulai Berlaku (Opsional)
                            </label>
                            <input
                                type="date"
                                value={periodFormStartDate}
                                onChange={(e) => setPeriodFormStartDate(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Berakhir Berlaku (Opsional)
                            </label>
                            <input
                                type="date"
                                min={periodFormStartDate || undefined}
                                value={periodFormEndDate}
                                onChange={(e) => setPeriodFormEndDate(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Keterangan (Opsional)
                        </label>
                        <textarea
                            rows={2}
                            placeholder="Catatan penyusunan atau revisi jadwal..."
                            value={periodFormDesc}
                            onChange={(e) => setPeriodFormDesc(e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <button
                            type="button"
                            onClick={() => {
                                setPeriodModalOpen(false);
                                setEditingPeriod(null);
                            }}
                            className="px-3.5 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-md"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreatingPeriod || isUpdatingPeriod}
                            className="px-4 py-2 bg-[#0b57d0] text-white text-sm font-semibold rounded-md disabled:opacity-50 hover:bg-[#0842a0]"
                        >
                            {isCreatingPeriod || isUpdatingPeriod
                                ? 'Menyimpan...'
                                : editingPeriod
                                ? 'Simpan Perubahan'
                                : 'Simpan Nama Jadwal'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Reset Jadwal Sebelum Diberlakukan */}
            <Modal
                open={resetModalOpen}
                title="Reset Jadwal Sebelum Diberlakukan"
                onClose={() => setResetModalOpen(false)}
            >
                <form onSubmit={handleResetScheduleConfirm} className="space-y-4">
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-900 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            Tindakan ini akan mengosongkan susunan mata pelajaran pada draft jadwal{' '}
                            <b>&ldquo;{currentSchedulePeriod?.name}&rdquo;</b> sebelum diberlakukan agar Anda dapat menyusun ulang dari awal.
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">
                            Cakupan Reset Jadwal:
                        </label>
                        <label className="flex items-start gap-2 p-2.5 rounded border border-slate-200 cursor-pointer text-xs">
                            <input
                                type="radio"
                                name="resetScope"
                                value="all"
                                checked={resetScope === 'all'}
                                onChange={() => setResetScope('all')}
                                className="mt-0.5"
                            />
                            <div>
                                <span className="font-bold text-slate-900">Semua Rombel dalam Jadwal Ini</span>
                                <p className="text-[11px] text-slate-500">
                                    Hapus seluruh {allSchedules.length} sesi terjadwal di &ldquo;{currentSchedulePeriod?.name}&rdquo;.
                                </p>
                            </div>
                        </label>

                        <label className="flex items-start gap-2 p-2.5 rounded border border-slate-200 cursor-pointer text-xs">
                            <input
                                type="radio"
                                name="resetScope"
                                value="group"
                                checked={resetScope === 'group'}
                                onChange={() => setResetScope('group')}
                                className="mt-0.5"
                            />
                            <div className="flex-1 space-y-2">
                                <div>
                                    <span className="font-bold text-slate-900">Rombel Tertentu Saja</span>
                                    <p className="text-[11px] text-slate-500">
                                        Hanya kosongkan jadwal untuk 1 rombel yang dipilih.
                                    </p>
                                </div>
                                {resetScope === 'group' && (
                                    <select
                                        value={resetTargetGroupId}
                                        onChange={(e) => setResetTargetGroupId(e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                                    >
                                        {allGroups.map((g) => (
                                            <option key={g.id} value={g.id}>
                                                {g.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <button
                            type="button"
                            onClick={() => setResetModalOpen(false)}
                            className="px-3.5 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-md"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isResettingPeriod || (resetScope === 'group' && !resetTargetGroupId)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-md disabled:opacity-50"
                        >
                            <RotateCcw className="w-4 h-4" />
                            {isResettingPeriod ? 'Mereset...' : 'Ya, Reset Jadwal'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Dialog Aktivasi / Nonaktifkan / Hapus Nama Jadwal */}
            <ConfirmDialog
                open={!!periodConfirmAction}
                title={
                    periodConfirmAction?.type === 'activate'
                        ? 'Berlakukan Jadwal Pelajaran'
                        : periodConfirmAction?.type === 'deactivate'
                        ? 'Nonaktifkan Jadwal Pelajaran'
                        : 'Hapus Draft Nama Jadwal'
                }
                message={
                    periodConfirmAction?.type === 'activate'
                        ? `Aktifkan dan berlakukan jadwal "${periodConfirmAction?.period?.name}"? Jadwal aktif lain pada tahun & periode yang sama akan dinonaktifkan, dan jadwal ini akan langsung digunakan untuk KBM & Presensi.`
                        : periodConfirmAction?.type === 'deactivate'
                        ? `Nonaktifkan jadwal "${periodConfirmAction?.period?.name}"? Jadwal ini tidak akan berlaku di Presensi & Jurnal KBM sampai diaktifkan kembali.`
                        : `Yakin ingin menghapus draft jadwal "${periodConfirmAction?.period?.name}" beserta seluruh susunan slot di dalamnya?`
                }
                confirmLabel={
                    periodConfirmAction?.type === 'activate'
                        ? 'Ya, Berlakukan'
                        : periodConfirmAction?.type === 'deactivate'
                        ? 'Ya, Nonaktifkan'
                        : 'Ya, Hapus'
                }
                loadingLabel="Memproses..."
                confirmTone={
                    periodConfirmAction?.type === 'activate'
                        ? 'primary'
                        : periodConfirmAction?.type === 'deactivate'
                        ? 'amber'
                        : 'danger'
                }
                isLoading={isActivatingPeriod || isDeactivatingPeriod || isDeletingPeriod}
                onConfirm={async () => {
                    if (!periodConfirmAction?.period) return;
                    const { type, period } = periodConfirmAction;
                    try {
                        if (type === 'activate') {
                            const res = await activateSchedulePeriod(period.id).unwrap();
                            toast.success(res?.message || 'Jadwal berhasil diberlakukan');
                        } else if (type === 'deactivate') {
                            const res = await deactivateSchedulePeriod(period.id).unwrap();
                            toast.success(res?.message || 'Jadwal berhasil dinonaktifkan');
                        } else if (type === 'delete') {
                            const res = await deleteSchedulePeriod(period.id).unwrap();
                            toast.success(res?.message || 'Draft jadwal berhasil dihapus');
                            setSelectedSchedulePeriodId('');
                        }
                        setPeriodConfirmAction(null);
                    } catch (err) {
                        toast.error(err?.data?.message || 'Gagal memproses aksi jadwal');
                    }
                }}
                onCancel={() => setPeriodConfirmAction(null)}
            />

            {/* Modal Salin Jadwal Antar Periode / Tahun Akademik */}
            <CopyScheduleModal
                open={copyModalOpen}
                onClose={() => setCopyModalOpen(false)}
                academicYears={academicYears}
                activeYearId={selectedYearId}
                quarters={quarters}
                activeQuarterId={selectedQuarterId}
                educations={institutions}
                currentEducation={selectedEducation}
                schedulePeriods={schedulePeriods}
                activeSchedulePeriodId={selectedSchedulePeriodId}
                onSuccess={(result) => {
                    if (result?.type === 'period' && result?.targetQuarterId) {
                        setSelectedQuarterId(String(result.targetQuarterId));
                        if (result?.targetSchedulePeriodId) {
                            setSelectedSchedulePeriodId(String(result.targetSchedulePeriodId));
                        }
                    } else if (result?.type === 'year' && result?.targetYearId) {
                        setSelectedYearId(String(result.targetYearId));
                    }
                    refetchSchedulePeriods();
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
                selectedEducation={selectedEducationLabel}
                scheduleName={currentSchedulePeriod?.name || ''}
                effectivePeriodText={
                    currentSchedulePeriod
                        ? `${currentSchedulePeriod.validity_label}${
                              currentSchedulePeriod.effective_start_date || currentSchedulePeriod.effective_end_date
                                  ? ` (${formatShortDate(currentSchedulePeriod.effective_start_date) || '...'} s/d ${formatShortDate(currentSchedulePeriod.effective_end_date) || '...'})`
                                  : ''
                          }`
                        : ''
                }
            />

            {/* Modal Pratinjau & Cetak PDF Rekapitulasi Kehadiran */}
            <PrintRecapModal
                open={printRecapModalOpen}
                onClose={() => setPrintRecapModalOpen(false)}
                group={currentWeeklyGroup}
                students={recap?.students || []}
                totalMeetings={recap?.total_meetings ?? 0}
                academicYear={currentYear?.year ? `${currentYear.year} H` : '1446/1447 H'}
                quarterName={currentQuarter?.name || 'Triwulan IV (Syawal - Dzulhijjah)'}
                startDate={recapStartDate}
                endDate={recapEndDate}
                onExportExcel={handleExportRecapExcel}
                isExportingExcel={isExportingRecap}
            />
        </div>
    );
}

// Helper Nama Hari Pesantren
function getDayName(dayId) {
    const m = { 6: 'Sabtu', 7: 'Ahad', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat (Libur)' };
    return m[dayId] || 'Tidak Diketahui';
}

function formatShortDate(dateStr) {
    if (!dateStr) return '';
    try {
        const clean = String(dateStr).substring(0, 10);
        const [y, m, d] = clean.split('-');
        if (!y || !m || !d) return clean;
        const dt = new Date(Number(y), Number(m) - 1, Number(d));
        return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return String(dateStr);
    }
}
