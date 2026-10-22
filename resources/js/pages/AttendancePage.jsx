import React, { useState, useMemo } from 'react';
import { 
    useGetAttendanceSheetQuery,
    useBatchPresenceMutation,
    useUpdatePresencesMutation,
    useGetJournalQuery
} from '../store/slices/journalApi';
import { useGetClassGroupsQuery } from '../store/slices/classGroupApi';
import { useGetStudiesQuery } from '../store/slices/studyApi';
import Modal from '../components/ui/Modal';
import FlatTabs from '../components/atoms/FlatTabs';
import { 
    Calendar, Clock, BookOpen, User, CheckCircle2, AlertTriangle, 
    Zap, Plus, Trash2, Printer, ChevronLeft, ShieldCheck, Filter, 
    CalendarDays, Users, Award, FileText, Check, HelpCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function AttendancePage() {
    // ═══════════════════════════════════════════════════════════
    // SELEKTOR MASTER DATA: ROMBEL & MATA PELAJARAN
    // ═══════════════════════════════════════════════════════════
    const { data: groupsData, isLoading: isLoadingGroups } = useGetClassGroupsQuery();
    const groups = groupsData?.data || [];

    const [selectedGroupId, setSelectedGroupId] = useState('');
    const currentGroup = useMemo(() => {
        if (selectedGroupId) {
            return groups.find(g => Number(g.id) === Number(selectedGroupId)) || groups[0];
        }
        return groups[0];
    }, [groups, selectedGroupId]);

    const { data: studiesData } = useGetStudiesQuery();
    const studies = studiesData?.data || [];
    const [selectedStudyId, setSelectedStudyId] = useState('');

    // Fetch Lembar Presensi Matriks P1 - P16 dari Backend
    const { data: sheetData, isLoading: isLoadingSheet, refetch: refetchSheet } = useGetAttendanceSheetQuery(
        currentGroup?.id ? {
            class_group_id: currentGroup.id,
            study_id: selectedStudyId || undefined
        } : undefined,
        { skip: !currentGroup?.id }
    );
    const sheet = sheetData?.data;

    // Mutation Hooks
    const [batchPresence, { isLoading: isSubmittingBatch }] = useBatchPresenceMutation();
    const [updatePresences, { isLoading: isSubmittingSingle }] = useUpdatePresencesMutation();

    // ═══════════════════════════════════════════════════════════
    // MODAL STATE 1: PRESENSI PERTEMUAN TUNGGAL (PERSIS SCREENSHOT 2)
    // ═══════════════════════════════════════════════════════════
    const [singleMeetingModal, setSingleMeetingModal] = useState(null); // { meeting_number, journal_id }
    const { data: singleJournalData } = useGetJournalQuery(singleMeetingModal?.journal_id, {
        skip: !singleMeetingModal?.journal_id
    });
    const singleJournal = singleJournalData?.data;
    const [singlePresencesMap, setSinglePresencesMap] = useState({});

    // ═══════════════════════════════════════════════════════════
    // MODAL STATE 2: ABSENSI CERDAS DINAMIS (HARIAN 6 JAM / MINGGUAN / MULTI-HARI)
    // ═══════════════════════════════════════════════════════════
    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [batchMode, setBatchMode] = useState('daily'); // 'daily' | 'weekly' | 'custom_days'
    const [batchDate, setBatchDate] = useState(new Date().toISOString().substring(0, 10));
    const [customDays, setCustomDays] = useState([6]); // Hari terpilih (6=Sabtu, dll)
    const [exceptions, setExceptions] = useState([]); // Daftar santri tidak hadir

    // Handle buka form pertemuan tunggal (P1 - P16)
    const handleOpenMeetingModal = (meeting) => {
        setSingleMeetingModal(meeting);
        const map = {};
        if (sheet?.students) {
            sheet.students.forEach(st => {
                const att = st.attendances?.[meeting.meeting_number];
                map[st.student_id] = {
                    status: att?.status && att.status !== '-' ? att.status : 'hadir', // DEFAULT HADIR
                    notes: att?.notes || ''
                };
            });
        }
        setSinglePresencesMap(map);
    };

    // Simpan Presensi Pertemuan Tunggal
    const handleSaveSingleMeeting = async (e) => {
        e.preventDefault();
        try {
            if (!singleMeetingModal?.journal_id) {
                toast.info('Sesi pertemuan ini akan dibuka otomatis melalui sistem jurnal.');
            }
            const payload = Object.keys(singlePresencesMap).map(sId => ({
                student_id: Number(sId),
                status: singlePresencesMap[sId]?.status || 'hadir',
                notes: singlePresencesMap[sId]?.notes || null
            }));

            if (singleMeetingModal?.journal_id) {
                await updatePresences({
                    journal_id: singleMeetingModal.journal_id,
                    presences: payload
                }).unwrap();
            } else {
                // Jika jurnal belum ada, gunakan batch harian untuk sesi ini
                await batchPresence({
                    class_group_id: currentGroup.id,
                    mode: 'daily',
                    date: batchDate,
                    exceptions: Object.keys(singlePresencesMap)
                        .filter(sId => singlePresencesMap[sId]?.status !== 'hadir')
                        .map(sId => ({
                            student_id: Number(sId),
                            status: singlePresencesMap[sId]?.status,
                            notes: singlePresencesMap[sId]?.notes
                        }))
                }).unwrap();
            }

            toast.success(`Presensi Pertemuan Ke-${singleMeetingModal.meeting_number} berhasil disimpan!`);
            setSingleMeetingModal(null);
            refetchSheet();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan presensi pertemuan');
        }
    };

    // Tambah Pengecualian di Modal Batch
    const handleAddException = () => {
        if (!sheet?.students || sheet.students.length === 0) return;
        const available = sheet.students.find(s => !exceptions.some(e => e.student_id === s.student_id));
        if (!available) {
            toast.info('Seluruh santri sudah masuk dalam daftar pengecualian');
            return;
        }
        setExceptions(prev => [
            ...prev,
            { student_id: available.student_id, status: 'sakit', notes: '', scope: 'all' }
        ]);
    };

    // Update baris pengecualian
    const handleUpdateException = (idx, field, value) => {
        setExceptions(prev => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
    };

    // Hapus baris pengecualian
    const handleRemoveException = (idx) => {
        setExceptions(prev => prev.filter((_, i) => i !== idx));
    };

    // Simpan Absensi Cerdas Massal
    const handleSaveBatchPresence = async (e) => {
        e.preventDefault();
        try {
            await batchPresence({
                class_group_id: currentGroup.id,
                mode: batchMode,
                date: batchDate,
                days: customDays,
                exceptions: exceptions.map(ex => ({
                    student_id: Number(ex.student_id),
                    status: ex.status,
                    notes: ex.notes || null,
                    scope: ex.scope || 'all'
                }))
            }).unwrap();

            toast.success('Presensi massal dinamis berhasil diproses!');
            setBatchModalOpen(false);
            setExceptions([]);
            refetchSheet();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal memproses absensi massal');
        }
    };

    return (
        <div className="space-y-6">
            {/* ═══════════════════════════════════════════════════════════
                HEADER UTAMA & SELECTOR ROMBEL / MAPEL
                ═══════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#093c30] text-emerald-100 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" /> Portal Presensi Terpadu
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Default: 100% Selalu Hadir
                            </span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Lembar Presensi & Rekap Kehadiran Santri
                        </h1>
                        <p className="text-xs text-slate-500">
                            Pencatatan presensi dinamis: 6 jam sekaligus per hari, 1 pekan penuh (36 jam), atau per pertemuan (P1 s.d P16).
                        </p>
                    </div>

                    {/* Quick CTA: Absensi Cerdas Dinamis */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => { setBatchMode('daily'); setBatchModalOpen(true); }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#093c30] text-white text-xs font-bold rounded-md hover:bg-[#064e3b] shadow-xs transition"
                            title="Absen sekali untuk 6 jam pelajaran sekaligus pada hari ini"
                        >
                            <Zap className="w-3.5 h-3.5 text-amber-300" /> Absen 6 Jam Sehari
                        </button>

                        <button
                            onClick={() => { setBatchMode('weekly'); setBatchModalOpen(true); }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-md hover:bg-emerald-100 transition"
                            title="Absen sekali untuk seluruh 36 jam pelajaran dalam sepekan"
                        >
                            <CalendarDays className="w-3.5 h-3.5 text-emerald-700" /> Absen Seminggu Penuh
                        </button>

                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-50 transition"
                        >
                            <Printer className="w-3.5 h-3.5" /> Cetak Lembar
                        </button>
                    </div>
                </div>

                {/* Filter Rombel & Mata Pelajaran */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Pilih Kelas & Rombel
                        </label>
                        <select
                            value={currentGroup?.id || ''}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white text-slate-900"
                        >
                            {groups.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name} &bull; {g.program?.name} ({g.education?.name} - {g.education_class?.name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Filter Mata Pelajaran
                        </label>
                        <select
                            value={selectedStudyId}
                            onChange={(e) => setSelectedStudyId(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded bg-white text-slate-800"
                        >
                            <option value="">Semua Mata Pelajaran (Kajian Terpadu)</option>
                            {studies.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} {s.category ? `(${s.category})` : ''}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Wali Kelas & Ruang
                        </label>
                        <div className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-700 flex items-center justify-between">
                            <span className="font-semibold truncate">
                                {currentGroup?.homeroom_teacher?.name || 'Ust. Ahmad Zaki'}
                            </span>
                            <span className="font-mono text-slate-400">
                                {currentGroup?.classroom?.name || 'R-01'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                KARTU DETAIL PRESENSI (PERSIS TAMPILAN HEADER SCREENSHOT 1)
                ═══════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs">
                <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-800" /> Detail Lembar Presensi
                    </h2>
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        Status Presensi: Aktif
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-3 gap-x-4 text-xs">
                    <div>
                        <span className="text-slate-400 block text-[11px]">Tahun Ajaran</span>
                        <span className="font-bold text-slate-800 font-mono">{sheet?.meta?.academic_year || '1446/1447 H'}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[11px]">Program Pesantren</span>
                        <span className="font-bold text-slate-800">{sheet?.meta?.program || 'Kubar (Mu\'allimin)'}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[11px]">Jenjang Pendidikan</span>
                        <span className="font-bold text-slate-800">{sheet?.meta?.education || 'Wustha'}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[11px]">Tingkat / Kelas</span>
                        <span className="font-bold text-slate-800">{sheet?.meta?.class_level || 'Kelas 1'}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[11px]">Rombongan Belajar</span>
                        <span className="font-bold text-[#093c30] text-[13px]">{sheet?.meta?.class_group || currentGroup?.name}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[11px]">Mata Pelajaran</span>
                        <span className="font-bold text-slate-800">{sheet?.meta?.study || 'I\'anatut Tholibin'}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[11px]">Guru Pengampu</span>
                        <span className="font-bold text-slate-800">{sheet?.meta?.teacher || '-'}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[11px]">Jam Pelajaran</span>
                        <span className="font-mono text-slate-800 font-semibold">{sheet?.meta?.lesson_hour || '06:30 - 08:00'}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[11px]">Total Santri Aktif</span>
                        <span className="font-bold text-slate-800">{sheet?.students?.length || 20} Santri</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[11px]">Target Pertemuan</span>
                        <span className="font-bold text-emerald-800 font-mono">16 Pertemuan (P1 - P16)</span>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                LEMBAR PRESENSI MATRIKS P1 - P16 (PERSIS TAMPILAN SCREENSHOT 1)
                ═══════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                            Lembar Presensi Siswa
                        </h3>
                        <p className="text-[11px] text-slate-500">
                            Klik tombol pertemuan (<b className="text-emerald-800">P 1, P 2, dst.</b>) pada header tabel untuk mengisi atau mengubah presensi pertemuan tersebut.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-600">
                        <span className="flex items-center gap-1 font-semibold text-emerald-700">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> hadir
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-amber-700">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> sakit
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-blue-700">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> izin
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-rose-700">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> alpa
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-[#093c30] text-white">
                            <tr>
                                <th className="sticky left-0 z-20 bg-[#093c30] px-3.5 py-3 text-left font-bold uppercase tracking-wider w-12 border-r border-[#064e3b]">
                                    No
                                </th>
                                <th className="sticky left-12 z-20 bg-[#093c30] px-4 py-3 text-left font-bold uppercase tracking-wider min-w-[14rem] border-r border-[#064e3b]">
                                    Nama Siswa
                                </th>

                                {/* 16 Tombol Header Pertemuan (P 1 s.d P 16) */}
                                {sheet?.meetings?.map((m) => (
                                    <th key={m.meeting_number} className="px-1.5 py-2 text-center min-w-[3.5rem] border-r border-[#064e3b] last:border-0">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenMeetingModal(m)}
                                            className="w-full py-1.5 px-1 rounded font-extrabold text-[11px] bg-emerald-950/60 hover:bg-emerald-600 text-white transition shadow-2xs flex flex-col items-center justify-center group"
                                            title={`Klik untuk mengisi/mengubah Presensi Pertemuan ke-${m.meeting_number}`}
                                        >
                                            <span className="tracking-wider">P {m.meeting_number}</span>
                                            {m.is_recorded && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 mt-0.5" />
                                            )}
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoadingSheet ? (
                                <tr>
                                    <td colSpan={18} className="p-8 text-center text-slate-400">
                                        Memuat lembar presensi santri...
                                    </td>
                                </tr>
                            ) : !sheet?.students || sheet.students.length === 0 ? (
                                <tr>
                                    <td colSpan={18} className="p-8 text-center text-slate-400 italic">
                                        Belum ada santri terdaftar di rombel ini.
                                    </td>
                                </tr>
                            ) : (
                                sheet.students.map((st, idx) => (
                                    <tr key={st.student_id} className={idx % 2 !== 0 ? 'bg-slate-50/40 hover:bg-slate-100/60' : 'bg-white hover:bg-slate-50'}>
                                        <td className="sticky left-0 z-10 bg-inherit px-3.5 py-2.5 text-slate-500 font-mono border-r border-slate-200 text-center">
                                            {idx + 1}
                                        </td>
                                        <td className="sticky left-12 z-10 bg-inherit px-4 py-2.5 border-r border-slate-200">
                                            <div className="font-extrabold text-slate-900 text-xs">
                                                {st.name}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono">
                                                NIS: {st.nis}
                                            </div>
                                        </td>

                                        {/* Status P1 s.d P16 */}
                                        {Array.from({ length: 16 }, (_, i) => i + 1).map((mNum) => {
                                            const att = st.attendances?.[mNum];
                                            const status = att?.status || '-';

                                            return (
                                                <td key={mNum} className="px-1 py-2 text-center border-r border-slate-100 last:border-0 align-middle">
                                                    {status === 'hadir' && (
                                                        <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                            hadir
                                                        </span>
                                                    )}
                                                    {status === 'sakit' && (
                                                        <span className="inline-block text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title={att?.notes}>
                                                            sakit
                                                        </span>
                                                    )}
                                                    {status === 'izin' && (
                                                        <span className="inline-block text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" title={att?.notes}>
                                                            izin
                                                        </span>
                                                    )}
                                                    {status === 'alpa' && (
                                                        <span className="inline-block text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" title={att?.notes}>
                                                            alpa
                                                        </span>
                                                    )}
                                                    {status === '-' && (
                                                        <span className="text-slate-300 font-mono text-xs">
                                                            -
                                                        </span>
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
            </div>

            {/* ═══════════════════════════════════════════════════════════
                MODAL 1: PRESENSI PERTEMUAN KE-N (PERSIS SCREENSHOT 2)
                ═══════════════════════════════════════════════════════════ */}
            <Modal
                open={!!singleMeetingModal}
                title={`Presensi Pertemuan ke-${singleMeetingModal?.meeting_number || '?'}`}
                onClose={() => setSingleMeetingModal(null)}
            >
                <form onSubmit={handleSaveSingleMeeting} className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs space-y-1">
                        <p className="font-bold text-slate-800">
                            Isi kehadiran untuk mata pelajaran {sheet?.meta?.study || 'Kajian Kitab'} di kelas {sheet?.meta?.class_group}
                        </p>
                        <p className="text-slate-500 text-[11px]">
                            Status default telah diatur sebagai <b>Hadir</b>. Ubah status hanya jika ada santri yang sakit, izin, atau alpa.
                        </p>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto pr-1 border border-slate-200 rounded-md">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 font-bold">
                                <tr>
                                    <th className="px-3 py-2 text-center w-12">No</th>
                                    <th className="px-3 py-2 text-left">Nama Siswa</th>
                                    <th className="px-3 py-2 text-left w-36">Status Kehadiran</th>
                                    <th className="px-3 py-2 text-left">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sheet?.students?.map((st, idx) => (
                                    <tr key={st.student_id} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 text-center text-slate-400 font-mono">
                                            {idx + 1}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="font-bold text-slate-800 text-xs">{st.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">NIS: {st.nis}</div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <select
                                                value={singlePresencesMap[st.student_id]?.status || 'hadir'}
                                                onChange={(e) => setSinglePresencesMap(prev => ({
                                                    ...prev,
                                                    [st.student_id]: {
                                                        ...prev[st.student_id],
                                                        status: e.target.value
                                                    }
                                                }))}
                                                className={`w-full px-2 py-1.5 text-xs font-bold rounded border ${
                                                    singlePresencesMap[st.student_id]?.status === 'sakit' ? 'border-amber-300 bg-amber-50 text-amber-900' :
                                                    singlePresencesMap[st.student_id]?.status === 'izin' ? 'border-blue-300 bg-blue-50 text-blue-900' :
                                                    singlePresencesMap[st.student_id]?.status === 'alpa' ? 'border-rose-300 bg-rose-50 text-rose-900' :
                                                    'border-emerald-300 bg-emerald-50 text-emerald-900'
                                                }`}
                                            >
                                                <option value="hadir">Hadir</option>
                                                <option value="izin">Izin</option>
                                                <option value="sakit">Sakit</option>
                                                <option value="alpa">Alpa</option>
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                placeholder="Keterangan (opsional)"
                                                value={singlePresencesMap[st.student_id]?.notes || ''}
                                                onChange={(e) => setSinglePresencesMap(prev => ({
                                                    ...prev,
                                                    [st.student_id]: {
                                                        ...prev[st.student_id],
                                                        notes: e.target.value
                                                    }
                                                }))}
                                                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-800"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <button
                            type="button"
                            onClick={() => setSingleMeetingModal(null)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmittingSingle}
                            className="px-5 py-2 bg-[#093c30] text-white text-xs font-bold rounded-md hover:bg-[#064e3b] shadow-xs"
                        >
                            Simpan Presensi Pertemuan
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ═══════════════════════════════════════════════════════════
                MODAL 2: ABSENSI CERDAS DINAMIS (HARIAN 6 JAM / MINGGUAN)
                ═══════════════════════════════════════════════════════════ */}
            <Modal
                open={batchModalOpen}
                title={batchMode === 'daily' ? '⚡ Absensi 6 Jam Sekaligus (Harian)' : '⚡ Absensi Sepekan Penuh (36 Jam Sekaligus)'}
                onClose={() => setBatchModalOpen(false)}
            >
                <form onSubmit={handleSaveBatchPresence} className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                            <Zap className="w-4 h-4 text-emerald-700" />
                            Mekanisme Otomatisasi Pesantren (Default Hadir)
                        </div>
                        <p className="text-emerald-800 text-[11px] leading-relaxed">
                            {batchMode === 'daily'
                                ? `Seluruh ${sheet?.students?.length || 20} santri di ${currentGroup?.name} otomatis tercatat HADIR untuk seluruh 6 jam pelajaran pada tanggal yang dipilih. Anda cukup menambahkan santri yang berhalangan hadir di bawah ini.`
                                : `Seluruh 36 jam pelajaran dalam sepekan (Sabtu s.d. Kamis) otomatis terisi HADIR untuk seluruh santri. Anda hanya perlu mencatat riwayat santri yang izin/sakit.`
                            }
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Tanggal Pelaksanaan
                            </label>
                            <input
                                type="date"
                                value={batchDate}
                                onChange={(e) => setBatchDate(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-md text-xs bg-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Mode Rentang
                            </label>
                            <select
                                value={batchMode}
                                onChange={(e) => setBatchMode(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-md text-xs bg-white font-bold"
                            >
                                <option value="daily">Harian: Sekali untuk 6 Jam Hari Ini</option>
                                <option value="weekly">Mingguan: 1 Pekan Penuh (Sabtu s.d Kamis)</option>
                                <option value="custom_days">Pilihan Hari Khusus</option>
                            </select>
                        </div>
                    </div>

                    {/* Section Pengecualian (Santri Tidak Hadir) */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Catat Santri Tidak Hadir ({exceptions.length} Santri)
                            </span>
                            <button
                                type="button"
                                onClick={handleAddException}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#093c30] text-white rounded hover:bg-[#064e3b]"
                            >
                                <Plus className="w-3.5 h-3.5" /> Tambah Santri
                            </button>
                        </div>

                        {exceptions.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-md">
                                Tidak ada santri yang berhalangan hadir. <b>Semua santri akan tercatat 100% HADIR.</b>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                                {exceptions.map((exc, idx) => (
                                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-md flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                                        <select
                                            value={exc.student_id}
                                            onChange={(e) => handleUpdateException(idx, 'student_id', Number(e.target.value))}
                                            className="px-2 py-1.5 border border-slate-300 rounded bg-white flex-1 font-semibold"
                                        >
                                            {sheet?.students?.map(s => (
                                                <option key={s.student_id} value={s.student_id}>{s.name}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={exc.status}
                                            onChange={(e) => handleUpdateException(idx, 'status', e.target.value)}
                                            className="px-2 py-1.5 border border-slate-300 rounded bg-white w-28 font-bold"
                                        >
                                            <option value="sakit">Sakit</option>
                                            <option value="izin">Izin</option>
                                            <option value="alpa">Alpa</option>
                                        </select>

                                        <input
                                            type="text"
                                            placeholder="Catatan / alasan (misal: di UKS)"
                                            value={exc.notes}
                                            onChange={(e) => handleUpdateException(idx, 'notes', e.target.value)}
                                            className="px-2 py-1.5 border border-slate-300 rounded bg-white flex-1"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveException(idx)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => setBatchModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmittingBatch}
                            className="px-5 py-2 bg-[#093c30] text-white text-xs font-bold rounded-md hover:bg-[#064e3b] shadow-xs flex items-center gap-1.5"
                        >
                            <Check className="w-4 h-4" /> Proses Presensi Sekaligus
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
