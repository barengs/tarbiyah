import React, { useState } from 'react';
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
import { useGetClassGroupsQuery } from '../store/slices/classGroupApi';
import { useGetStudiesQuery } from '../store/slices/studyApi';
import { useGetTeachersQuery } from '../store/slices/teacherApi';
import { useGetLessonHoursQuery } from '../store/slices/lessonHourApi';
import Modal from '../components/ui/Modal';
import FlatTabs from '../components/atoms/FlatTabs';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Calendar, Plus, Clock, BookOpen, CheckCircle2, BarChart3, User, MapPin, X, Trash2, Sun, Moon, Coffee, GraduationCap, Users, Eye } from 'lucide-react';
import { toast } from 'react-toastify';

export default function ScheduleKbmPage() {
    const [activeTab, setActiveTab] = useState('schedules'); // 'schedules' | 'journals' | 'recap'
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [showAllGroups, setShowAllGroups] = useState(false);

    const { data: groupsData } = useGetClassGroupsQuery();
    const groups = groupsData?.data || [];
    const currentGroup = groups.find(g => g.id === Number(selectedGroupId)) || groups[0];

    const effectiveGroupId = showAllGroups ? '' : (selectedGroupId || currentGroup?.id);

    // Data for Schedules
    const { data: schedulesData, isLoading: isLoadingSchedules } = useGetSchedulesQuery(
        showAllGroups ? {} : { class_group_id: effectiveGroupId },
        { skip: !showAllGroups && !effectiveGroupId }
    );
    const allSchedules = schedulesData?.data || [];
    const schedules = showAllGroups ? allSchedules : allSchedules.filter(s => s.class_group_id === effectiveGroupId);

    const { data: hoursData } = useGetLessonHoursQuery();
    const lessonHours = hoursData?.data || [];

    const { data: studiesData } = useGetStudiesQuery();
    const studies = studiesData?.data || [];

    const { data: teachersData } = useGetTeachersQuery();
    const teachers = teachersData?.data || [];

    const [createSchedule, { isLoading: isCreatingSchedule }] = useCreateScheduleMutation();
    const [deleteSchedule] = useDeleteScheduleMutation();

    // Data for Journals & Presences
    const { data: journalsData, isLoading: isLoadingJournals } = useGetJournalsQuery(
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
    const [schedClassroomId, setSchedClassroomId] = useState('');

    // Form Journal
    const [jMeetingNo, setJMeetingNo] = useState(1);
    const [jDate, setJDate] = useState(new Date().toISOString().substring(0, 10));
    const [jStudyId, setJStudyId] = useState('');
    const [jTeacherId, setJTeacherId] = useState('');
    const [jTopic, setJTopic] = useState('');
    const [jNotes, setJNotes] = useState('');

    // Presences editing state: map student_id => { status, notes }
    const [presencesMap, setPresencesMap] = useState({});

    const { data: singleJournalData } = useGetJournalQuery(presenceModalJournal?.id, {
        skip: !presenceModalJournal,
    });
    const singleJournal = singleJournalData?.data;

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

    const handleCreateSchedule = async (e) => {
        e.preventDefault();
        try {
            await createSchedule({
                academic_year_id: 1,
                class_group_id: effectiveGroupId,
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

    // ═══════════════════════════════════════════════════════════
    // PETA HARI & JAM MINGGUAN KHAS PUSANTREN (SABTU-KAMIS, JUMAT LIBUR)
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

    const getScheduleAt = (dayId, hourOrder) => {
        if (!showAllGroups && !schedules.some(s => s.day === dayId && s.lesson_hour?.order === hourOrder)) return null;
        const target = schedules.find(s => s.day === dayId && s.lesson_hour?.order === hourOrder && (showAllGroups ? true : s.class_group_id === effectiveGroupId));
        return target || null;
    };

    const handleCellClick = (dayId, hourOrder) => {
        setSchedDay(dayId);
        setSchedHourId(lessonHours.find(h => h.order === hourOrder)?.id || '');
        setSchedStudyId(studies[0]?.id || '');
        setSchedTeacherId(teachers[0]?.id || '');
        setSchedClassroomId('');
        setScheduleModalOpen(true);
    };

    const deleteCount = showAllGroups ? allSchedules.length : schedules.length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Jadwal & Presensi Belajar (KBM)</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Tampilan matriks mingguan pesantren: Sabtu hingga Kamis (6 sesi dari Pagi hingga Malam), libur hari Jumat.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    {/* Toggle Tampilan Semua Rombel */}
                    <button
                        onClick={() => setShowAllGroups(!showAllGroups)}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border transition ${
                            showAllGroups
                                ? 'bg-[#093c30] text-white border-[#093c30]'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <Eye className="w-3.5 h-3.5" />
                        {showAllGroups ? 'Mode Seluruh Rombel' : 'Mode Rombel Terpilih'}
                    </button>

                    {/* Selector Rombel (dinyatakan nonaktif saat mode seluruh rombel) */}
                    <select
                        value={effectiveGroupId || ''}
                        onChange={(e) => {
                            setSelectedGroupId(e.target.value);
                            setShowAllGroups(false);
                        }}
                        disabled={showAllGroups}
                        className={`px-3.5 py-2 text-sm font-semibold border rounded-md shadow-xs focus:ring-2 focus:ring-emerald-500 ${
                            showAllGroups ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white'
                        }`}
                    >
                        {!showAllGroups && (
                            <option value="">Pilih Rombel / Kelas</option>
                        )}
                        {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.name} ({g.code}) {g.progression_type === 'leveling' ? '- Tahfidz' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Navigation Flat Tabs */}
            <div className="space-y-2.5">
                <FlatTabs
                    tabs={[
                        { id: 'schedules', name: 'Matriks Jadwal Pelajaran', icon: Calendar },
                        { id: 'journals', name: 'Jurnal Mengajar & Presensi', icon: BookOpen },
                        { id: 'recap', name: 'Rekap Kehadiran', icon: BarChart3 },
                    ]}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                />

                {/* TAB 1: MATRIKS JADWAL KHAS PESANTREN */}
                {activeTab === 'schedules' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">
                                Matriks Harian: {showAllGroups ? 'Seluruh Rombel (Komparasi)' : `Rombel ${currentGroup?.name || ''}`}
                            </div>
                            <button
                                onClick={() => {
                                    setSchedDay(6);
                                    setSchedHourId(lessonHours[0]?.id || '');
                                    setSchedStudyId(studies[0]?.id || '');
                                    setSchedTeacherId(teachers[0]?.id || '');
                                    setSchedClassroomId('');
                                    setScheduleModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#093c30] text-white text-xs font-semibold rounded-md hover:bg-[#064e3b] transition"
                            >
                                <Plus className="w-3.5 h-3.5" /> Tambah Jadwal Baru
                            </button>
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
                                        {/* Kolom Jumat Libur */}
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
                                                {/* Label Left Sticky */}
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

                                                {/* Sel Matriks untuk tiap Hari (Sabtu - Kamis) */}
                                                {days.map((d) => {
                                                    const sched = getScheduleAt(d.id, h.order);
                                                    return (
                                                        <td key={d.id} className="border-b border-r border-slate-200 p-1.5 min-w-[11rem]">
                                                            {sched ? (
                                                                <div className="relative group block p-2.5 border border-emerald-100 bg-emerald-50/40 hover:border-emerald-300 hover:bg-emerald-50 transition rounded-md h-full">
                                                                    <div className="flex items-start justify-between gap-1">
                                                                        <div>
                                                                            <p className="font-bold text-slate-900 text-[13px] leading-tight">
                                                                                {sched.study?.name || 'Tidak Diketahui'}
                                                                            </p>
                                                                            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                                                                <User className="w-3 h-3" />
                                                                                {sched.teacher?.name || 'Belum Ditetapkan'}
                                                                            </p>
                                                                        </div>
                                                                        
                                                                        {/* Info guru rombel lain dalam mode komparasi */}
                                                                        {showAllGroups && (
                                                                            <div className="text-[10px] bg-white text-slate-600 border border-slate-200 px-1.5 py-0.5 font-bold shrink-0">
                                                                                {sched.class_group?.code}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {sched.classroom?.name && (
                                                                        <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-800 font-semibold">
                                                                            <MapPin className="w-3 h-3" />
                                                                            Ruang {sched.classroom?.name}
                                                                        </div>
                                                                    )}

                                                                    {/* Aksi: Hapus */}
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setDeleteScheduleTarget(sched); }}
                                                                        className="absolute top-1.5 right-1.5 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition p-1"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                /* Slot Kosong yang Dapat Diisi */
                                                                <button
                                                                    onClick={() => handleCellClick(d.id, h.order)}
                                                                    className="w-full h-full min-h-[60px] border-2 border-dashed border-slate-100 hover:border-[#093c30]/20 hover:bg-[#093c30]/[0.02] transition rounded-md flex items-center justify-center group"
                                                                >
                                                                    <span className="text-[11px] font-medium text-slate-300 group-hover:text-[#093c30] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                                        <Plus className="w-3.5 h-3.5" /> Isi Jadwal
                                                                    </span>
                                                                </button>
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                {/* Kolom Jumat (Libur Ma'had / Offday) */}
                                                <td className="border-b border-slate-200 p-1.5 min-w-[11rem]">
                                                    <div className="h-full w-full bg-slate-50/50 border border-slate-100 rounded-md p-2.5 text-slate-400 italic text-[11px] leading-relaxed flex flex-col justify-center">
                                                        <div className="flex items-center gap-1.5 text-slate-500 not-italic font-semibold text-xs">
                                                            <Clock className="w-3.5 h-3.5 text-slate-400" /> Libur / Shalat Jumat
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 not-italic mt-1">
                                                            Hari Jumat merupakan hari libur mingguan resmi Ma'had untuk shalat berjamaah, ziarah, atau kegiatan khalifah.
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

                {/* TAB 2: JURNAL & PRESENSI */}
                {activeTab === 'journals' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Riwayat Jurnal Pertemuan KBM
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
                                    Belum ada jurnal pertemuan KBM yang dibuka
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

                {/* TAB 3: REKAP PRESENSI */}
                {activeTab === 'recap' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Rekapitulasi Kehadiran Santri Rombel Tersebut
                            </span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-xs overflow-x-auto">
                            {isLoadingRecap ? (
                                <div className="p-12 text-center text-slate-400">Memuat rekap kehadiran...</div>
                            ) : recap?.students ? (
                                <div className="space-y-3">
                                    <div className="text-sm text-slate-500">
                                        Total Pertemuan: <span className="font-bold text-slate-900">{journals.length}</span>
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
                                <p className="text-xs text-slate-400 py-6 text-center">Belum ada data rekap presensi</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Tambah / Edit Jadwal Manual */}
            <Modal
                open={scheduleModalOpen}
                title="Jadwalkan Mata Pelajaran Baru"
                onClose={() => setScheduleModalOpen(false)}
            >
                <form onSubmit={handleCreateSchedule} className="space-y-4">
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
                                <option value="">Tanpa Ruangan</option>
                                {/* Classrooms placeholder */}
                                <option value="1">Ruang 1</option>
                                <option value="2">Ruang 2</option>
                                <option value="3">Ruang 3</option>
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

            {/* Modal Buat Jurnal */}
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
                            placeholder="Contoh: Kajian Fathul Qorib Bab Thaharah"
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
                message={`Yakin ingin menghapus jadwal "${deleteScheduleTarget?.study?.name}" pada hari ${LessonSchedulePage.getDayName(deleteScheduleTarget?.day)} di ${deleteScheduleTarget?.lesson_hour?.name}?`}
                confirmLabel="Ya, Hapus Jadwal"
                onConfirm={async () => {
                    try {
                        await deleteSchedule(deleteScheduleTarget.id).unwrap();
                        toast.success('Jadwal berhasil dihapus dari matriks');
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

// Helper
ScheduleKbmPage.getDayName = (dayId) => {
    const m = { 6: 'Sabtu', 7: 'Ahad', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat (Libur)' };
    return m[dayId] || 'Tidak Diketahui';
};
