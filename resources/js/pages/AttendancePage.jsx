import React, { useState, useEffect, useMemo } from 'react';
import { 
    useGetAttendanceSheetQuery,
    useGetDayGridQuery,
    useSaveDayGridMutation,
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
    CalendarDays, Users, Award, FileText, Check, HelpCircle, Save,
    CheckCheck, UserX, AlertCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function AttendancePage() {
    // ═══════════════════════════════════════════════════════════
    // ACTIVE TAB: FORMULIR BERBASIS JAM vs LEMBAR MATRIKS P1-P16
    // ═══════════════════════════════════════════════════════════
    const [activeTab, setActiveTab] = useState('day_grid'); // 'day_grid' | 'matrix_sheet'

    // Master Rombel
    const { data: groupsData, isLoading: isLoadingGroups } = useGetClassGroupsQuery();
    const groups = groupsData?.data || [];
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const currentGroup = useMemo(() => {
        if (selectedGroupId) {
            return groups.find(g => Number(g.id) === Number(selectedGroupId)) || groups[0];
        }
        return groups[0];
    }, [groups, selectedGroupId]);

    // ═══════════════════════════════════════════════════════════
    // STATE FORMULIR PRESENSI BERBASIS JAM PELAJARAN (TAB 1)
    // ═══════════════════════════════════════════════════════════
    const [attendanceDate, setAttendanceDate] = useState('2026-10-17'); // Default tanggal belajar aktif
    
    // Fetch data grid harian dari Backend
    const { 
        data: dayGridData, 
        isLoading: isLoadingDayGrid, 
        isFetching: isFetchingDayGrid,
        refetch: refetchDayGrid 
    } = useGetDayGridQuery(
        currentGroup?.id ? {
            class_group_id: currentGroup.id,
            date: attendanceDate
        } : undefined,
        { skip: !currentGroup?.id || !attendanceDate }
    );
    const dayGrid = dayGridData?.data;

    // Local state untuk editable grid presensi santri x jam pelajaran
    const [gridRows, setGridRows] = useState([]);
    const [notesMap, setNotesMap] = useState({});

    // Sinkronisasi data grid lokal saat data Backend tiba
    useEffect(() => {
        if (dayGrid?.students && dayGrid?.hours) {
            const initialRows = dayGrid.students.map(st => {
                const atts = {};
                dayGrid.hours.forEach(h => {
                    const existingAtt = st.attendances?.[h.order];
                    atts[h.order] = {
                        schedule_id: h.schedule_id,
                        study_id: h.study_id,
                        status: existingAtt?.status || 'hadir', // DEFAULT SELALU HADIR
                    };
                });
                return {
                    student_id: st.student_id,
                    name: st.name,
                    nis: st.nis,
                    attendances: atts,
                };
            });
            setGridRows(initialRows);

            const initialNotes = {};
            dayGrid.students.forEach(st => {
                dayGrid.hours.forEach(h => {
                    const existingAtt = st.attendances?.[h.order];
                    if (existingAtt?.notes) {
                        initialNotes[st.student_id] = existingAtt.notes;
                    }
                });
            });
            setNotesMap(initialNotes);
        }
    }, [dayGrid]);

    // Ubah status kehadiran santri di jam tertentu
    const handleSetStatus = (studentId, hourOrder, newStatus) => {
        setGridRows(prev => prev.map(row => {
            if (row.student_id === studentId) {
                return {
                    ...row,
                    attendances: {
                        ...row.attendances,
                        [hourOrder]: {
                            ...row.attendances[hourOrder],
                            status: newStatus
                        }
                    }
                };
            }
            return row;
        }));
    };

    // Aksi Cepat Baris: Set Semua Jam Santri Ini (Hadir / Sakit / Izin / Alpa)
    const handleSetAllHoursForStudent = (studentId, status) => {
        setGridRows(prev => prev.map(row => {
            if (row.student_id === studentId) {
                const updatedAtts = {};
                Object.keys(row.attendances).forEach(order => {
                    updatedAtts[order] = {
                        ...row.attendances[order],
                        status: status
                    };
                });
                return { ...row, attendances: updatedAtts };
            }
            return row;
        }));
    };

    // Aksi Cepat Global: Set Semua Santri & Semua Jam ke "Hadir"
    const handleSetAllStudentsHadir = () => {
        setGridRows(prev => prev.map(row => {
            const updatedAtts = {};
            Object.keys(row.attendances).forEach(order => {
                updatedAtts[order] = {
                    ...row.attendances[order],
                    status: 'hadir'
                };
            });
            return { ...row, attendances: updatedAtts };
        }));
        toast.info('Seluruh santri di semua jam pelajaran diatur menjadi HADIR');
    };

    // Simpan Grid Presensi Harian Berbasis Jam
    const [saveDayGrid, { isLoading: isSavingGrid }] = useSaveDayGridMutation();
    const handleSaveDayGrid = async () => {
        try {
            const payload = {
                class_group_id: currentGroup.id,
                date: attendanceDate,
                grid: gridRows.map(row => {
                    const attsWithNotes = {};
                    Object.keys(row.attendances).forEach(order => {
                        attsWithNotes[order] = {
                            ...row.attendances[order],
                            notes: notesMap[row.student_id] || null
                        };
                    });
                    return {
                        student_id: row.student_id,
                        attendances: attsWithNotes
                    };
                })
            };

            const res = await saveDayGrid(payload).unwrap();
            toast.success(res.message || 'Presensi harian berdasarkan jam pelajaran berhasil disimpan!');
            refetchDayGrid();
            refetchSheet();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan presensi harian');
        }
    };

    // ═══════════════════════════════════════════════════════════
    // STATE TAB 2: LEMBAR PRESENSI MATRIKS P1 - P16 (AKUMULASI)
    // ═══════════════════════════════════════════════════════════
    const { data: studiesData } = useGetStudiesQuery();
    const studies = studiesData?.data || [];
    const [selectedStudyId, setSelectedStudyId] = useState('');

    const { 
        data: sheetData, 
        isLoading: isLoadingSheet, 
        refetch: refetchSheet 
    } = useGetAttendanceSheetQuery(
        currentGroup?.id ? {
            class_group_id: currentGroup.id,
            study_id: selectedStudyId || undefined
        } : undefined,
        { skip: !currentGroup?.id }
    );
    const sheet = sheetData?.data;

    // Modal Pertemuan Tunggal (dari Lembar Matriks P1-P16)
    const [singleMeetingModal, setSingleMeetingModal] = useState(null);
    const [singlePresencesMap, setSinglePresencesMap] = useState({});
    const [updatePresences, { isLoading: isSubmittingSingle }] = useUpdatePresencesMutation();

    const handleOpenMeetingModal = (meeting) => {
        setSingleMeetingModal(meeting);
        const map = {};
        if (sheet?.students) {
            sheet.students.forEach(st => {
                const att = st.attendances?.[meeting.meeting_number];
                map[st.student_id] = {
                    status: att?.status && att.status !== '-' ? att.status : 'hadir',
                    notes: att?.notes || ''
                };
            });
        }
        setSinglePresencesMap(map);
    };

    const handleSaveSingleMeeting = async (e) => {
        e.preventDefault();
        try {
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
                toast.success(`Presensi Pertemuan Ke-${singleMeetingModal.meeting_number} berhasil diperbarui!`);
            } else {
                toast.info('Sesi pertemuan otomatis tersinkron saat pengisian jam harian.');
            }
            setSingleMeetingModal(null);
            refetchSheet();
            refetchDayGrid();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan presensi');
        }
    };

    // Hitung ringkasan status harian
    const statsSummary = useMemo(() => {
        let fullPresent = 0;
        let partialAbsent = 0;

        gridRows.forEach(row => {
            const statuses = Object.values(row.attendances).map(a => a.status);
            const allHadir = statuses.every(s => s === 'hadir');
            if (allHadir) {
                fullPresent++;
            } else {
                partialAbsent++;
            }
        });

        return { fullPresent, partialAbsent, total: gridRows.length };
    }, [gridRows]);

    return (
        <div className="space-y-6">
            {/* ═══════════════════════════════════════════════════════════
                HEADER UTAMA & NAVIGATION TABS
                ═══════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#093c30] text-emerald-100 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" /> Sistem Presensi & Jurnal Terpadu
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Default: 100% Selalu Hadir
                            </span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Presensi Jam Pelajaran & Lembar Akumulasi
                        </h1>
                        <p className="text-xs text-slate-500">
                            Presensi dicatat mengacu pada jam pelajaran (Jam 1 s.d 6), dan terakumulasi otomatis ke lembar pertemuan mata pelajaran (P1 - P16).
                        </p>
                    </div>

                    {/* Mode Navigation Tabs */}
                    <div className="flex items-center p-1 bg-slate-100 rounded-md border border-slate-200 shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveTab('day_grid')}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded transition flex items-center gap-1.5 ${
                                activeTab === 'day_grid'
                                    ? 'bg-[#093c30] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Clock className="w-3.5 h-3.5 text-emerald-300" />
                            Formulir Absen (Per Jam)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('matrix_sheet')}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded transition flex items-center gap-1.5 ${
                                activeTab === 'matrix_sheet'
                                    ? 'bg-[#093c30] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5 text-emerald-300" />
                            Lembar Matriks (P1 - P16)
                        </button>
                    </div>
                </div>

                {/* Filter Global: Rombongan Belajar */}
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

                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Tahun Ajaran & Semester
                        </label>
                        <div className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-700 font-mono font-semibold">
                            {currentGroup?.academic_year?.name || '1446/1447 H'} &bull; Semester Genap
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                TAB 1: FORMULIR PENGISIAN ABSEN BERBASIS JAM PELAJARAN
                ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'day_grid' && (
                <div className="space-y-4">
                    {/* Control Bar: Tanggal Absen, Indikator Hari, & Tombol Simpan */}
                    <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                    Tanggal Pelaksanaan KBM
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={attendanceDate}
                                        onChange={(e) => setAttendanceDate(e.target.value)}
                                        className="px-3 py-1.5 border border-slate-300 rounded text-xs font-bold bg-white text-slate-900"
                                    />
                                    <span className="px-2.5 py-1 rounded bg-[#093c30] text-white text-xs font-bold">
                                        Hari {dayGrid?.day_name || 'Sabtu'}
                                    </span>
                                </div>
                            </div>

                            {/* Shortcut Hari Pesantren (Sabtu s.d. Kamis) */}
                            <div className="hidden lg:block pl-3 border-l border-slate-200">
                                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    Loncat Hari (Pekan Ini)
                                </label>
                                <div className="flex items-center gap-1">
                                    {[
                                        { label: 'Sab', date: '2026-10-17' },
                                        { label: 'Ahd', date: '2026-10-18' },
                                        { label: 'Sen', date: '2026-10-19' },
                                        { label: 'Sel', date: '2026-10-20' },
                                        { label: 'Rab', date: '2026-10-21' },
                                        { label: 'Kam', date: '2026-10-22' },
                                    ].map(d => (
                                        <button
                                            key={d.label}
                                            type="button"
                                            onClick={() => setAttendanceDate(d.date)}
                                            className={`px-2 py-1 text-[11px] font-bold rounded transition ${
                                                attendanceDate === d.date
                                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Ringkasan & Tombol Simpan */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleSetAllStudentsHadir}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition flex items-center gap-1"
                                title="Reset seluruh kolom jam menjadi HADIR"
                            >
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Semua Hadir
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveDayGrid}
                                disabled={isSavingGrid}
                                className="px-4 py-2 bg-[#093c30] hover:bg-[#064e3b] text-white text-xs font-bold rounded shadow-xs transition flex items-center gap-1.5"
                            >
                                <Save className="w-4 h-4 text-emerald-300" />
                                {isSavingGrid ? 'Menyimpan...' : 'Simpan Presensi Harian (6 Jam)'}
                            </button>
                        </div>
                    </div>

                    {/* Ringkasan Urutan Jam Pelajaran Hari Ini */}
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-[#093c30]" />
                                Susunan Jam Pelajaran Hari {dayGrid?.day_name || 'Sabtu'} ({dayGrid?.hours?.length || 6} Jam KBM)
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                                Posisi mapel disesuaikan dengan jadwal resmi hari ini
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                            {dayGrid?.hours?.map(h => (
                                <div key={h.schedule_id} className="bg-white border border-slate-200 rounded p-2 shadow-2xs space-y-0.5">
                                    <div className="flex items-center justify-between">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#093c30] text-emerald-100">
                                            {h.hour_name.split(' ')[0]} {h.order}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            {h.time}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 truncate" title={h.study_name}>
                                        {h.study_name}
                                    </p>
                                    <p className="text-[10px] text-slate-500 truncate" title={h.teacher_name}>
                                        {h.teacher_name}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════
                        TABEL GRID PENGISIAN ABSEN (SANTRI X JAM PELAJARAN)
                        ═══════════════════════════════════════════════════════════ */}
                    <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
                        <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">
                                    Daftar Santri & Status Kehadiran Per Jam Pelajaran
                                </span>
                                <span className="text-slate-400">&bull;</span>
                                <span className="text-emerald-700 font-semibold">
                                    Hadir Penuh: {statsSummary.fullPresent}
                                </span>
                                {statsSummary.partialAbsent > 0 && (
                                    <>
                                        <span className="text-slate-400">&bull;</span>
                                        <span className="text-amber-700 font-semibold">
                                            Berhalangan Parsial: {statsSummary.partialAbsent}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Legend Singkat */}
                            <div className="flex items-center gap-2 text-[11px]">
                                <span className="flex items-center gap-1 font-bold text-emerald-700">
                                    <span className="w-2.5 h-2.5 rounded bg-emerald-600 text-white flex items-center justify-center text-[8px]">H</span> Hadir
                                </span>
                                <span className="flex items-center gap-1 font-bold text-amber-700">
                                    <span className="w-2.5 h-2.5 rounded bg-amber-500 text-white flex items-center justify-center text-[8px]">S</span> Sakit
                                </span>
                                <span className="flex items-center gap-1 font-bold text-blue-700">
                                    <span className="w-2.5 h-2.5 rounded bg-blue-600 text-white flex items-center justify-center text-[8px]">I</span> Izin
                                </span>
                                <span className="flex items-center gap-1 font-bold text-rose-700">
                                    <span className="w-2.5 h-2.5 rounded bg-rose-600 text-white flex items-center justify-center text-[8px]">A</span> Alpa
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-[#093c30] text-white">
                                    <tr>
                                        <th className="sticky left-0 z-20 bg-[#093c30] px-3 py-3 text-center w-12 border-r border-[#064e3b]">
                                            No
                                        </th>
                                        <th className="sticky left-12 z-20 bg-[#093c30] px-3 py-3 text-left min-w-[13rem] border-r border-[#064e3b]">
                                            Nama Santri
                                        </th>
                                        <th className="px-2 py-3 text-center min-w-[7rem] border-r border-[#064e3b]">
                                            Set 1 Baris
                                        </th>

                                        {/* Kolom Tiap Jam Pelajaran Hari Ini */}
                                        {dayGrid?.hours?.map(h => (
                                            <th key={h.schedule_id} className="px-2 py-2.5 text-center min-w-[7.5rem] border-r border-[#064e3b] last:border-0">
                                                <div className="font-extrabold text-[12px] text-emerald-200">
                                                    Jam {h.order}
                                                </div>
                                                <div className="text-[10px] font-medium text-white truncate max-w-[7.5rem]" title={h.study_name}>
                                                    {h.study_name}
                                                </div>
                                                <div className="text-[9px] text-emerald-300/80 font-mono">
                                                    {h.time.split(' - ')[0]}
                                                </div>
                                            </th>
                                        ))}

                                        <th className="px-3 py-3 text-left min-w-[10rem]">
                                            Catatan / Alasan
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isLoadingDayGrid ? (
                                        <tr>
                                            <td colSpan={10} className="p-8 text-center text-slate-400">
                                                Memuat jadwal dan daftar santri...
                                            </td>
                                        </tr>
                                    ) : gridRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                                                Tidak ada santri aktif atau jadwal tidak ditemukan pada hari ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        gridRows.map((row, idx) => (
                                            <tr key={row.student_id} className={idx % 2 !== 0 ? 'bg-slate-50/40 hover:bg-slate-100/60' : 'bg-white hover:bg-slate-50'}>
                                                <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-center text-slate-400 font-mono border-r border-slate-200">
                                                    {idx + 1}
                                                </td>
                                                <td className="sticky left-12 z-10 bg-inherit px-3 py-2 border-r border-slate-200">
                                                    <div className="font-extrabold text-slate-900 text-xs">
                                                        {row.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-mono">
                                                        NIS: {row.nis}
                                                    </div>
                                                </td>

                                                {/* Tombol Aksi Cepat 1 Baris Santri */}
                                                <td className="px-2 py-2 text-center border-r border-slate-200">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetAllHoursForStudent(row.student_id, 'hadir')}
                                                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                                            title="Set Hadir untuk seluruh jam santri ini"
                                                        >
                                                            H
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetAllHoursForStudent(row.student_id, 'sakit')}
                                                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                                            title="Set Sakit untuk seluruh jam santri ini"
                                                        >
                                                            S
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetAllHoursForStudent(row.student_id, 'izin')}
                                                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                                            title="Set Izin untuk seluruh jam santri ini"
                                                        >
                                                            I
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Kolom Pilihan Status Tiap Jam Pelajaran */}
                                                {dayGrid?.hours?.map(h => {
                                                    const att = row.attendances?.[h.order] || {};
                                                    const status = att.status || 'hadir';

                                                    return (
                                                        <td key={h.schedule_id} className="px-2 py-2 text-center border-r border-slate-100 align-middle">
                                                            <div className="inline-flex rounded-md p-0.5 bg-slate-100 border border-slate-200 shadow-2xs">
                                                                {['hadir', 'sakit', 'izin', 'alpa'].map(st => {
                                                                    const isSelected = status === st;
                                                                    const label = st === 'hadir' ? 'H' : st === 'sakit' ? 'S' : st === 'izin' ? 'I' : 'A';
                                                                    const activeClass = 
                                                                        st === 'hadir' ? 'bg-emerald-600 text-white font-extrabold shadow-xs' :
                                                                        st === 'sakit' ? 'bg-amber-500 text-white font-extrabold shadow-xs' :
                                                                        st === 'izin' ? 'bg-blue-600 text-white font-extrabold shadow-xs' :
                                                                        'bg-rose-600 text-white font-extrabold shadow-xs';

                                                                    return (
                                                                        <button
                                                                            key={st}
                                                                            type="button"
                                                                            onClick={() => handleSetStatus(row.student_id, h.order, st)}
                                                                            className={`w-6 h-6 rounded text-[10px] transition-all flex items-center justify-center ${
                                                                                isSelected ? activeClass : 'text-slate-500 hover:text-slate-900'
                                                                            }`}
                                                                            title={`Jam ${h.order} (${h.study_name}): ${st}`}
                                                                        >
                                                                            {label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>
                                                    );
                                                })}

                                                {/* Input Catatan Santri */}
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Catatan jika izin / sakit..."
                                                        value={notesMap[row.student_id] || ''}
                                                        onChange={(e) => setNotesMap(prev => ({
                                                            ...prev,
                                                            [row.student_id]: e.target.value
                                                        }))}
                                                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 placeholder:text-slate-300"
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Tabel dengan Tombol Simpan Bawah */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <span className="text-xs text-slate-500">
                                Presensi otomatis mencatat kehadiran santri ke jurnal KBM masing-masing mata pelajaran.
                            </span>

                            <button
                                type="button"
                                onClick={handleSaveDayGrid}
                                disabled={isSavingGrid}
                                className="px-5 py-2.5 bg-[#093c30] hover:bg-[#064e3b] text-white text-xs font-bold rounded shadow-xs transition flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4 text-emerald-300" />
                                {isSavingGrid ? 'Menyimpan Presensi...' : 'Simpan Presensi Harian (6 Jam Sekaligus)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB 2: LEMBAR PRESENSI MATRIKS AKUMULASI (P1 - P16)
                ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'matrix_sheet' && (
                <div className="space-y-4">
                    {/* Header Lembar Presensi Persis Screenshot 1 */}
                    <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
                            <div>
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-emerald-800" /> Detail Lembar Presensi Akumulasi
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Hasil akumulasi dari seluruh pengisian presensi harian per jam pelajaran.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedStudyId}
                                    onChange={(e) => setSelectedStudyId(e.target.value)}
                                    className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded bg-white text-slate-800"
                                >
                                    <option value="">Semua Mata Pelajaran (Kajian Terpadu)</option>
                                    {studies.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name} {s.category ? `(${s.category})` : ''}</option>
                                    ))}
                                </select>

                                <button
                                    onClick={() => window.print()}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 transition"
                                >
                                    <Printer className="w-3.5 h-3.5" /> Print
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-3 gap-x-4 text-xs">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Tahun Ajaran</span>
                                <span className="font-bold text-slate-800 font-mono">{sheet?.meta?.academic_year || '1446/1447 H'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Tingkat Pendidikan</span>
                                <span className="font-bold text-slate-800">{sheet?.meta?.education || 'Wustha'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Kelas</span>
                                <span className="font-bold text-slate-800">{sheet?.meta?.class_level || 'Kelas 1'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Rombel</span>
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
                                <span className="text-slate-400 block text-[11px]">Status Presensi</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Aktif</span>
                            </div>
                        </div>
                    </div>

                    {/* Matriks P1 s.d P16 Persis Screenshot 1 */}
                    <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                                    Lembar Presensi
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Klik tombol pertemuan (<b className="text-emerald-800">P1 s.d P16</b>) untuk melihat atau mengubah presensi pertemuan.
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

                                        {sheet?.meetings?.map((m) => (
                                            <th key={m.meeting_number} className="px-1.5 py-2 text-center min-w-[3.5rem] border-r border-[#064e3b] last:border-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenMeetingModal(m)}
                                                    className="w-full py-1.5 px-1 rounded font-extrabold text-[11px] bg-emerald-950/60 hover:bg-emerald-600 text-white transition shadow-2xs flex flex-col items-center justify-center group"
                                                    title={`Presensi Pertemuan P${m.meeting_number}`}
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
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                MODAL PRESENSI PERTEMUAN KE-N (PERSIS SCREENSHOT 2)
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
                            Status default telah diatur sebagai <b>Hadir</b>. Ubah status hanya jika santri sakit, izin, atau alpa.
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
        </div>
    );
}
