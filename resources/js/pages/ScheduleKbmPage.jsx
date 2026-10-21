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
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import FlatTabs from '../components/atoms/FlatTabs';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Calendar, Plus, Clock, BookOpen, UserCheck, CheckCircle2, AlertCircle, XCircle, Users, BarChart3 } from 'lucide-react';
import { toast } from 'react-toastify';

export default function ScheduleKbmPage() {
    const [activeTab, setActiveTab] = useState('schedules'); // 'schedules' | 'journals' | 'recap'
    const [selectedGroupId, setSelectedGroupId] = useState('');

    const { data: groupsData } = useGetClassGroupsQuery();
    const groups = groupsData?.data || [];
    const currentGroup = groups.find(g => g.id === Number(selectedGroupId)) || groups[0];

    const effectiveGroupId = selectedGroupId || currentGroup?.id;

    // Data for Schedules
    const { data: schedulesData, isLoading: isLoadingSchedules } = useGetSchedulesQuery(
        effectiveGroupId ? { class_group_id: effectiveGroupId } : undefined,
        { skip: !effectiveGroupId }
    );
    const schedules = schedulesData?.data || [];

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
    const [schedDay, setSchedDay] = useState(1);
    const [schedHourId, setSchedHourId] = useState('');
    const [schedStudyId, setSchedStudyId] = useState('');
    const [schedTeacherId, setSchedTeacherId] = useState('');

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
                day: Number(schedDay),
            }).unwrap();
            toast.success('Jadwal pelajaran berhasil ditambahkan');
            setScheduleModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menambahkan jadwal');
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
                journalId: presenceModalJournal.id,
                presences: payload,
            }).unwrap();
            toast.success('Presensi siswa berhasil disimpan!');
            setPresenceModalJournal(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan presensi');
        }
    };

    const days = [
        { id: 1, name: 'Senin' },
        { id: 2, name: 'Selasa' },
        { id: 3, name: 'Rabu' },
        { id: 4, name: 'Kamis' },
        { id: 5, name: 'Jumat' },
        { id: 6, name: 'Sabtu' },
        { id: 7, name: 'Ahad' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Jadwal & Presensi Belajar (KBM)</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Atur jadwal pelajaran mingguan per rombel, buat jurnal mengajar guru, dan input absensi kehadiran santri.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Selector Rombel */}
                    <select
                        value={effectiveGroupId || ''}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="px-3.5 py-2 text-sm font-semibold border border-slate-300 rounded-md bg-white shadow-xs focus:ring-2 focus:ring-emerald-500"
                    >
                        {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.name} ({g.progression_type === 'leveling' ? 'Tahfidz' : 'Formal'})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Navigation Flat Tabs */}
            <FlatTabs
                tabs={[
                    { id: 'schedules', name: 'Jadwal Mingguan', icon: Calendar },
                    { id: 'journals', name: 'Jurnal Mengajar & Presensi', icon: BookOpen },
                    { id: 'recap', name: 'Rekap Kehadiran', icon: BarChart3 },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            {/* TAB 1: JADWAL PELAJARAN */}
            {activeTab === 'schedules' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Matriks Jadwal: {currentGroup?.name || 'Pilih Rombel'}
                        </span>
                        <button
                            onClick={() => {
                                setSchedHourId(lessonHours[0]?.id || '');
                                setSchedStudyId(studies[0]?.id || '');
                                setSchedTeacherId(teachers[0]?.id || '');
                                setScheduleModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700"
                        >
                            <Plus className="w-3.5 h-3.5" /> + Jadwal Pelajaran
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {days.map((day) => {
                            const daySchedules = schedules.filter((s) => s.day === day.id);
                            return (
                                <div key={day.id} className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-xs flex flex-col">
                                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                                        <span className="font-bold text-sm text-slate-800">{day.name}</span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                            {daySchedules.length} Sesi
                                        </span>
                                    </div>
                                    <div className="p-3 space-y-2 flex-1">
                                        {daySchedules.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic py-6 text-center">Tidak ada KBM</p>
                                        ) : (
                                            daySchedules.map((s) => (
                                                <div key={s.id} className="p-2.5 rounded-md border border-slate-100 bg-slate-50/50 hover:bg-emerald-50/40 transition">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <p className="font-bold text-xs text-slate-900">{s.study?.name}</p>
                                                            <p className="text-[11px] text-slate-500">{s.teacher?.name}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => setDeleteScheduleTarget(s)}
                                                            className="text-slate-300 hover:text-rose-600 text-xs p-1"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-emerald-700 font-semibold bg-white border border-emerald-100 rounded px-1.5 py-0.5 w-fit">
                                                        <Clock className="w-3 h-3 text-emerald-600" />
                                                        {s.lesson_hour?.name} ({s.lesson_hour?.start_time?.substring(0, 5)} - {s.lesson_hour?.end_time?.substring(0, 5)})
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 shadow-xs"
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
                                        <h3 className="font-bold text-base text-slate-900">{j.topic}</h3>
                                        <p className="text-xs text-slate-500">
                                            Mapel: <strong className="text-slate-700">{j.study?.name}</strong> • Guru: <strong className="text-slate-700">{j.teacher?.name}</strong>
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Presensi counts */}
                                        <div className="flex gap-2 text-xs font-semibold">
                                            <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                {j.hadir_count || 0} Hadir
                                            </span>
                                            <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                                {j.izin_count || 0} Izin
                                            </span>
                                            <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                                {j.sakit_count || 0} Sakit
                                            </span>
                                            <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                                                {j.alpa_count || 0} Alpa
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleOpenPresenceModal(j)}
                                            className="px-3.5 py-2 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 transition"
                                        >
                                            Input Presensi
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: REKAP KEHADIRAN */}
            {activeTab === 'recap' && (
                <div className="space-y-4">
                    <div className="p-4 bg-white border border-slate-200 rounded-md shadow-xs">
                        <div className="mb-4">
                            <h3 className="font-bold text-base text-slate-900">Rekapitulasi Kehadiran Siswa</h3>
                            <p className="text-xs text-slate-500">Total {recap?.total_meetings || 0} Pertemuan KBM Terlaksana di {currentGroup?.name}</p>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {recap?.students?.length ? (
                                recap.students.map((st) => (
                                    <div key={st.student_id} className="py-3 flex items-center justify-between text-xs">
                                        <div>
                                            <p className="font-bold text-slate-800">{st.name}</p>
                                            <p className="text-slate-400 font-mono">NIS: {st.nis}</p>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="flex gap-2">
                                                <span className="text-emerald-700 font-semibold">{st.hadir}H</span>
                                                <span className="text-blue-700 font-semibold">{st.izin}I</span>
                                                <span className="text-amber-700 font-semibold">{st.sakit}S</span>
                                                <span className="text-rose-700 font-semibold">{st.alpa}A</span>
                                            </div>

                                            <div className="w-24 text-right">
                                                <span className={`font-bold px-2.5 py-0.5 rounded text-xs ${
                                                    st.percentage >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                }`}>
                                                    {st.percentage}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-400 py-6 text-center">Belum ada data rekap presensi</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Tambah Jadwal */}
            <Modal
                open={scheduleModalOpen}
                title="Tambah Jadwal KBM Mingguan"
                onClose={() => setScheduleModalOpen(false)}
            >
                <form onSubmit={handleCreateSchedule} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Hari *</label>
                        <select
                            value={schedDay}
                            onChange={(e) => setSchedDay(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            {days.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Jam Pelajaran *</label>
                        <select
                            required
                            value={schedHourId}
                            onChange={(e) => setSchedHourId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            <option value="">-- Pilih Jam Pelajaran --</option>
                            {lessonHours.map((h) => (
                                <option key={h.id} value={h.id}>
                                    {h.name} ({h.start_time?.substring(0, 5)} - {h.end_time?.substring(0, 5)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Mata Pelajaran *</label>
                        <select
                            required
                            value={schedStudyId}
                            onChange={(e) => setSchedStudyId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            <option value="">-- Pilih Mapel --</option>
                            {studies.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Guru Pengampu *</label>
                        <select
                            required
                            value={schedTeacherId}
                            onChange={(e) => setSchedTeacherId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            <option value="">-- Pilih Guru --</option>
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setScheduleModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreatingSchedule}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
                        >
                            Simpan Jadwal
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Buka Jurnal Pertemuan Baru */}
            <Modal
                open={journalModalOpen}
                title="Buka Jurnal Pertemuan Baru"
                onClose={() => setJournalModalOpen(false)}
            >
                <form onSubmit={handleCreateJournal} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Pertemuan Ke- *</label>
                            <input
                                type="number"
                                min="1"
                                required
                                value={jMeetingNo}
                                onChange={(e) => setJMeetingNo(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Tanggal KBM *</label>
                            <input
                                type="date"
                                required
                                value={jDate}
                                onChange={(e) => setJDate(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Mata Pelajaran *</label>
                        <select
                            required
                            value={jStudyId}
                            onChange={(e) => setJStudyId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            <option value="">-- Pilih Mapel --</option>
                            {studies.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Guru Pengajar *</label>
                        <select
                            required
                            value={jTeacherId}
                            onChange={(e) => setJTeacherId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            <option value="">-- Pilih Guru --</option>
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Topik / Bahasan Materi *</label>
                        <input
                            type="text"
                            required
                            placeholder="Contoh: Bab 3 - Kaidah Fiqih Muamalah"
                            value={jTopic}
                            onChange={(e) => setJTopic(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Catatan KBM</label>
                        <textarea
                            rows={2}
                            placeholder="Catatan pelaksanaan KBM..."
                            value={jNotes}
                            onChange={(e) => setJNotes(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setJournalModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreatingJournal}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
                        >
                            Buka Jurnal & Input Absensi
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Input/Update Presensi Siswa */}
            <Modal
                open={!!presenceModalJournal}
                title={`Input Presensi: Pertemuan Ke-${presenceModalJournal?.meeting_number} (${presenceModalJournal?.study?.name || ''})`}
                onClose={() => setPresenceModalJournal(null)}
            >
                <form onSubmit={handleSavePresences} className="space-y-4">
                    <p className="text-xs text-slate-500">
                        Topik: <strong className="text-slate-800">{presenceModalJournal?.topic}</strong>
                    </p>

                    <div className="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-80 overflow-y-auto">
                        {!presenceModalJournal?.presences?.length && !singleJournal?.presences?.length ? (
                            <div className="p-6 text-center text-xs text-slate-400">Belum ada siswa terdaftar di rombel ini</div>
                        ) : (
                            (singleJournal?.presences || presenceModalJournal?.presences || []).map((p) => {
                                const currentStatus = presencesMap[p.student_id]?.status || p.status || 'hadir';
                                return (
                                    <div key={p.id} className="p-3 flex items-center justify-between text-xs">
                                        <div>
                                            <p className="font-bold text-slate-900">{p.student?.name}</p>
                                            <p className="text-slate-400 font-mono">NIS: {p.student?.nis}</p>
                                        </div>

                                        {/* Status Switcher Buttons */}
                                        <div className="flex items-center gap-1">
                                            {[
                                                { code: 'hadir', label: 'Hadir', bg: 'bg-emerald-600 text-white', inactive: 'bg-emerald-50 text-emerald-700' },
                                                { code: 'izin', label: 'Izin', bg: 'bg-blue-600 text-white', inactive: 'bg-blue-50 text-blue-700' },
                                                { code: 'sakit', label: 'Sakit', bg: 'bg-amber-600 text-white', inactive: 'bg-amber-50 text-amber-700' },
                                                { code: 'alpa', label: 'Alpa', bg: 'bg-rose-600 text-white', inactive: 'bg-rose-50 text-rose-700' },
                                            ].map((statusOpt) => (
                                                <button
                                                    type="button"
                                                    key={statusOpt.code}
                                                    onClick={() => setPresencesMap(prev => ({
                                                        ...prev,
                                                        [p.student_id]: {
                                                            ...(prev[p.student_id] || {}),
                                                            status: statusOpt.code,
                                                        }
                                                    }))}
                                                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                                                        currentStatus === statusOpt.code ? statusOpt.bg : statusOpt.inactive
                                                    }`}
                                                >
                                                    {statusOpt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setPresenceModalJournal(null)}
                            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                        >
                            Tutup
                        </button>
                        <button
                            type="submit"
                            disabled={isSavingPresences}
                            className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800"
                        >
                            Simpan Presensi
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Delete Schedule */}
            <ConfirmDialog
                open={!!deleteScheduleTarget}
                title="Hapus Jadwal Pelajaran"
                message="Yakin ingin menghapus sesi jadwal ini?"
                onConfirm={async () => {
                    try {
                        await deleteSchedule(deleteScheduleTarget.id).unwrap();
                        toast.success('Jadwal dihapus');
                        setDeleteScheduleTarget(null);
                    } catch (err) {
                        toast.error('Gagal menghapus jadwal');
                    }
                }}
                onCancel={() => setDeleteScheduleTarget(null)}
            />
        </div>
    );
}
