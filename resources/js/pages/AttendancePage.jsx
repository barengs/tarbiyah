import React, { useState, useEffect, useMemo } from 'react';
import { 
    useGetAttendanceSheetQuery,
    useGetDayGridQuery,
    useGetRangeGridQuery,
    useSaveDayGridMutation,
    useSaveMultiDayGridMutation,
    useUpdatePresencesMutation,
    useGetJournalQuery
} from '../store/slices/journalApi';
import { useGetClassGroupsQuery } from '../store/slices/classGroupApi';
import { useGetStudiesQuery } from '../store/slices/studyApi';
import Modal from '../components/ui/Modal';
import { 
    Calendar, Clock, BookOpen, User, CheckCircle2, AlertTriangle, 
    Zap, Plus, Trash2, Printer, ChevronLeft, ChevronRight, ShieldCheck, Filter, 
    CalendarDays, Users, Award, FileText, Check, HelpCircle, Save,
    CheckCheck, UserX, AlertCircle, RefreshCw, CalendarRange, Layers
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function AttendancePage() {
    // ═══════════════════════════════════════════════════════════
    // ACTIVE TAB UTAMA: FORMULIR vs LEMBAR MATRIKS P1-P16
    // ═══════════════════════════════════════════════════════════
    const [activeTab, setActiveTab] = useState('attendance_form'); // 'attendance_form' | 'matrix_sheet'

    // Master Rombel
    const { data: groupsData } = useGetClassGroupsQuery();
    const groups = groupsData?.data || [];
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const currentGroup = useMemo(() => {
        if (selectedGroupId) {
            return groups.find(g => Number(g.id) === Number(selectedGroupId)) || groups[0];
        }
        return groups[0];
    }, [groups, selectedGroupId]);

    // ═══════════════════════════════════════════════════════════
    // MODE PRESENSI: HARIAN vs MINGGUAN (KAMIS) vs RENTANG HARI
    // ═══════════════════════════════════════════════════════════
    const [entryMode, setEntryMode] = useState('daily'); // 'daily' | 'weekly' | 'range'

    // Parameter Tanggal
    const [singleDate, setSingleDate] = useState('2026-10-17'); // Hari Sabtu default
    const [rangeStartDate, setRangeStartDate] = useState('2026-10-17'); // Sabtu
    const [rangeEndDate, setRangeEndDate] = useState('2026-10-22'); // Kamis (Akhir pekan)

    // Saat beralih ke mode mingguan, otomatis set rentang Sabtu s.d Kamis pekan berjalan
    const handleSetWeeklyMode = () => {
        setEntryMode('weekly');
        setRangeStartDate('2026-10-17'); // Sabtu
        setRangeEndDate('2026-10-22');   // Kamis akhir pekan
    };

    // Effective date range untuk query range
    const effectiveStartDate = entryMode === 'daily' ? singleDate : rangeStartDate;
    const effectiveEndDate   = entryMode === 'daily' ? singleDate : rangeEndDate;

    // Fetch Range Grid dari Backend (Mencakup 1 hari, rentang hari berurutan, atau 1 pekan penuh)
    const { 
        data: rangeGridData, 
        isLoading: isLoadingRange,
        isFetching: isFetchingRange,
        refetch: refetchRangeGrid 
    } = useGetRangeGridQuery(
        currentGroup?.id ? {
            class_group_id: currentGroup.id,
            start_date: effectiveStartDate,
            end_date: effectiveEndDate
        } : undefined,
        { skip: !currentGroup?.id || !effectiveStartDate || !effectiveEndDate }
    );
    const rangeData = rangeGridData?.data;
    const daysList = rangeData?.days || [];

    // Active Day Index untuk Day Stepper Tabs
    const [activeDayIndex, setActiveDayIndex] = useState(0);

    // Pastikan activeDayIndex valid saat daysList berganti
    useEffect(() => {
        if (activeDayIndex >= daysList.length) {
            setActiveDayIndex(0);
        }
    }, [daysList.length]);

    // ═══════════════════════════════════════════════════════════
    // LOCAL MULTI-DAY STATE: { [dateStr]: [ { student_id, name, nis, attendances: { [order]: { schedule_id, status } } } ] }
    // ═══════════════════════════════════════════════════════════
    const [multiDayState, setMultiDayState] = useState({});
    const [multiDayNotes, setMultiDayNotes] = useState({}); // { [dateStr]: { [student_id]: notes } }

    // Sinkronisasi data saat API selesai memuat
    useEffect(() => {
        if (daysList && daysList.length > 0) {
            const newState = {};
            const newNotes = {};

            daysList.forEach(day => {
                const dateKey = day.date;
                const rows = day.students.map(st => {
                    const atts = {};
                    day.hours.forEach(h => {
                        const existingAtt = st.attendances?.[h.order];
                        atts[h.order] = {
                            schedule_id: h.schedule_id,
                            study_id: h.study_id,
                            status: existingAtt?.status || 'hadir', // DEFAULT 100% HADIR
                        };
                    });
                    return {
                        student_id: st.student_id,
                        name: st.name,
                        nis: st.nis,
                        attendances: atts
                    };
                });
                newState[dateKey] = rows;

                const dayNotes = {};
                day.students.forEach(st => {
                    day.hours.forEach(h => {
                        const existingAtt = st.attendances?.[h.order];
                        if (existingAtt?.notes) {
                            dayNotes[st.student_id] = existingAtt.notes;
                        }
                    });
                });
                newNotes[dateKey] = dayNotes;
            });

            setMultiDayState(newState);
            setMultiDayNotes(newNotes);
        }
    }, [rangeData]);

    // Current Day Object & Rows
    const currentDayObj = daysList[activeDayIndex] || daysList[0];
    const currentDayDate = currentDayObj?.date || effectiveStartDate;
    const currentDayRows = multiDayState[currentDayDate] || [];
    const currentDayNotes = multiDayNotes[currentDayDate] || {};

    // Ubah status kehadiran santri di jam tertentu pada hari aktif
    const handleSetStatus = (studentId, hourOrder, newStatus) => {
        setMultiDayState(prev => {
            const dayRows = prev[currentDayDate] || [];
            const updatedRows = dayRows.map(row => {
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
            });
            return { ...prev, [currentDayDate]: updatedRows };
        });
    };

    // Aksi Cepat Baris: Set Semua Jam Santri Ini di Hari Aktif (Hadir / Sakit / Izin / Alpa)
    const handleSetAllHoursForStudent = (studentId, status) => {
        setMultiDayState(prev => {
            const dayRows = prev[currentDayDate] || [];
            const updatedRows = dayRows.map(row => {
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
            });
            return { ...prev, [currentDayDate]: updatedRows };
        });
    };

    // Aksi Cepat Global: Set Semua Santri & Semua Jam di Hari Aktif ke "Hadir"
    const handleSetAllStudentsHadir = () => {
        setMultiDayState(prev => {
            const dayRows = prev[currentDayDate] || [];
            const updatedRows = dayRows.map(row => {
                const updatedAtts = {};
                Object.keys(row.attendances).forEach(order => {
                    updatedAtts[order] = {
                        ...row.attendances[order],
                        status: 'hadir'
                    };
                });
                return { ...row, attendances: updatedAtts };
            });
            return { ...prev, [currentDayDate]: updatedRows };
        });
        toast.info(`Seluruh santri di hari ${currentDayObj?.day_name} diatur menjadi HADIR`);
    };

    // ═══════════════════════════════════════════════════════════
    // FITUR AKSELERASI: "TERAPKAN IZIN / SAKIT RENTANG HARI"
    // ═══════════════════════════════════════════════════════════
    const [ruleModalOpen, setRuleModalOpen] = useState(false);
    const [ruleStudentId, setRuleStudentId] = useState('');
    const [ruleStatus, setRuleStatus] = useState('izin'); // 'izin' | 'sakit' | 'alpa'
    const [ruleScope, setRuleScope] = useState('fullday'); // 'fullday' | 'selected_hours'
    const [ruleSelectedHours, setRuleSelectedHours] = useState([1, 2]); // Array jam tertentu
    const [ruleSelectedDays, setRuleSelectedDays] = useState([]); // Array tanggal yang dicentang
    const [ruleNotes, setRuleNotes] = useState('');

    // Buka modal rule
    const handleOpenRuleModal = () => {
        if (!currentDayRows || currentDayRows.length === 0) {
            toast.error('Data santri belum termuat');
            return;
        }
        setRuleStudentId(currentDayRows[0]?.student_id || '');
        // Default: seluruh hari dalam rentang terpilih
        setRuleSelectedDays(daysList.map(d => d.date));
        setRuleModalOpen(true);
    };

    // Terapkan Rule ke Multi-Day State
    const handleApplyRule = (e) => {
        e.preventDefault();
        if (!ruleStudentId) {
            toast.error('Pilih santri terlebih dahulu');
            return;
        }
        if (ruleSelectedDays.length === 0) {
            toast.error('Pilih minimal satu hari dalam rentang');
            return;
        }

        setMultiDayState(prev => {
            const copy = { ...prev };

            ruleSelectedDays.forEach(dateKey => {
                const dayRows = copy[dateKey] || [];
                copy[dateKey] = dayRows.map(row => {
                    if (row.student_id === Number(ruleStudentId)) {
                        const updatedAtts = { ...row.attendances };
                        Object.keys(updatedAtts).forEach(order => {
                            const orderNum = Number(order);
                            let shouldApply = false;
                            if (ruleScope === 'fullday') {
                                shouldApply = true;
                            } else {
                                shouldApply = ruleSelectedHours.includes(orderNum);
                            }

                            if (shouldApply) {
                                updatedAtts[order] = {
                                    ...updatedAtts[order],
                                    status: ruleStatus
                                };
                            }
                        });
                        return { ...row, attendances: updatedAtts };
                    }
                    return row;
                });
            });

            return copy;
        });

        // Set catatan
        if (ruleNotes) {
            setMultiDayNotes(prev => {
                const copy = { ...prev };
                ruleSelectedDays.forEach(dateKey => {
                    copy[dateKey] = {
                        ...(copy[dateKey] || {}),
                        [ruleStudentId]: ruleNotes
                    };
                });
                return copy;
            });
        }

        toast.success(`Status ${ruleStatus.toUpperCase()} berhasil diterapkan ke ${ruleSelectedDays.length} hari!`);
        setRuleModalOpen(false);
    };

    // ═══════════════════════════════════════════════════════════
    // SIMPAN GRID PRESENSI (SERENTAK UNTUK SELURUH HARI)
    // ═══════════════════════════════════════════════════════════
    const [saveMultiDayGrid, { isLoading: isSavingMultiDay }] = useSaveMultiDayGridMutation();

    const handleSaveAllDays = async () => {
        try {
            const payloadDays = daysList.map(day => {
                const dateKey = day.date;
                const rows = multiDayState[dateKey] || [];
                const notes = multiDayNotes[dateKey] || {};

                return {
                    date: dateKey,
                    grid: rows.map(r => {
                        const attsWithNotes = {};
                        Object.keys(r.attendances).forEach(order => {
                            attsWithNotes[order] = {
                                ...r.attendances[order],
                                notes: notes[r.student_id] || null
                            };
                        });
                        return {
                            student_id: r.student_id,
                            attendances: attsWithNotes
                        };
                    })
                };
            });

            const res = await saveMultiDayGrid({
                class_group_id: currentGroup.id,
                days: payloadDays
            }).unwrap();

            toast.success(res.message || 'Presensi berhasil disimpan ke seluruh hari dan jam!');
            refetchRangeGrid();
            refetchSheet();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan presensi');
        }
    };

    // ═══════════════════════════════════════════════════════════
    // TAB 2: LEMBAR PRESENSI MATRIKS AKUMULASI P1 - P16
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

    // Modal Pertemuan Tunggal
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
            }
            setSingleMeetingModal(null);
            refetchSheet();
            refetchRangeGrid();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan presensi');
        }
    };

    // Hitung ringkasan status santri di hari aktif
    const dayStats = useMemo(() => {
        let fullPresent = 0;
        let partialAbsent = 0;

        currentDayRows.forEach(row => {
            const statuses = Object.values(row.attendances).map(a => a.status);
            const allHadir = statuses.every(s => s === 'hadir');
            if (allHadir) {
                fullPresent++;
            } else {
                partialAbsent++;
            }
        });

        return { fullPresent, partialAbsent, total: currentDayRows.length };
    }, [currentDayRows]);

    return (
        <div className="space-y-6">
            {/* ═══════════════════════════════════════════════════════════
                HEADER UTAMA: IDENTITAS ROMBEL & NAVIGASI TAB UTAMA
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
                            Pencatatan presensi terintegrasi jam pelajaran: Harian, Rekap Akhir Pekan (Kamis), atau Rentang Hari Berurutan.
                        </p>
                    </div>

                    {/* Mode Navigation Tabs */}
                    <div className="flex items-center p-1 bg-slate-100 rounded-md border border-slate-200 shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveTab('attendance_form')}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded transition flex items-center gap-1.5 ${
                                activeTab === 'attendance_form'
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

                {/* Filter Global: Rombel, Wali Kelas, Semester */}
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
                TAB 1: FORMULIR PRESENSI (HARIAN, MINGGUAN KAMIS, RENTANG HARI)
                ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'attendance_form' && (
                <div className="space-y-4">
                    {/* Control Bar: Pilihan Mode (Harian, Mingguan Akhir Pekan, Rentang Hari) */}
                    <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Radio Switcher 3 Mode */}
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEntryMode('daily')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                                        entryMode === 'daily'
                                            ? 'bg-[#093c30] text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    <Clock className="w-3.5 h-3.5" />
                                    Presensi Harian (1 Hari)
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSetWeeklyMode}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                                        entryMode === 'weekly'
                                            ? 'bg-[#093c30] text-white shadow-xs'
                                            : 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                                    }`}
                                    title="Rekap sepekan penuh (Sabtu s.d. Kamis) di akhir pekan"
                                >
                                    <CalendarDays className="w-3.5 h-3.5 text-amber-300" />
                                    Rekap Akhir Pekan (Kamis / Sepekan)
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setEntryMode('range')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                                        entryMode === 'range'
                                            ? 'bg-[#093c30] text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                    title="Pilih rentang hari yang berdekatan/berurutan"
                                >
                                    <CalendarRange className="w-3.5 h-3.5" />
                                    Rentang Hari Berurutan
                                </button>
                            </div>

                            {/* Tombol Aksi Cepat: Terapkan Izin Berhari-hari & Simpan Semua */}
                            <div className="flex items-center gap-2 shrink-0">
                                {entryMode !== 'daily' && (
                                    <button
                                        type="button"
                                        onClick={handleOpenRuleModal}
                                        className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded shadow-xs transition flex items-center gap-1.5"
                                        title="Catat santri yang izin atau sakit selama beberapa hari sekaligus"
                                    >
                                        <Plus className="w-3.5 h-3.5 text-amber-700" />
                                        Terapkan Izin Berhari-hari
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={handleSetAllStudentsHadir}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition flex items-center gap-1"
                                    title="Reset seluruh santri di hari ini ke status Hadir"
                                >
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    Hadir Semua Hari Ini
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSaveAllDays}
                                    disabled={isSavingMultiDay}
                                    className="px-4 py-2 bg-[#093c30] hover:bg-[#064e3b] text-white text-xs font-bold rounded shadow-xs transition flex items-center gap-1.5"
                                >
                                    <Save className="w-4 h-4 text-emerald-300" />
                                    {isSavingMultiDay 
                                        ? 'Menyimpan...' 
                                        : entryMode === 'weekly' 
                                            ? 'Simpan Presensi Sepekan (Kamis)'
                                            : entryMode === 'range'
                                                ? `Simpan ${daysList.length} Hari Sekaligus`
                                                : 'Simpan Presensi Hari Ini'
                                    }
                                </button>
                            </div>
                        </div>

                        {/* Input Pemilihan Tanggal / Rentang */}
                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
                            {entryMode === 'daily' ? (
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-slate-600">Tanggal Absen:</span>
                                    <input
                                        type="date"
                                        value={singleDate}
                                        onChange={(e) => setSingleDate(e.target.value)}
                                        className="px-3 py-1.5 border border-slate-300 rounded font-bold text-slate-900 bg-white"
                                    />
                                    <span className="px-2.5 py-1 rounded bg-[#093c30] text-white font-bold">
                                        Hari {currentDayObj?.day_name || 'Sabtu'}
                                    </span>
                                </div>
                            ) : entryMode === 'weekly' ? (
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                                        Rekap Akhir Pekan (Hari Kamis)
                                    </span>
                                    <span className="text-slate-600">
                                        Memproses KBM Sepekan: <b>Sabtu ({rangeStartDate})</b> s.d. <b>Kamis ({rangeEndDate})</b>
                                    </span>
                                    <span className="text-slate-400">&bull;</span>
                                    <span className="text-slate-500">
                                        Total: <b>{daysList.length} Hari Belajar</b> ({daysList.reduce((acc, d) => acc + (d.hours_count || 0), 0)} Jam Pelajaran)
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="font-semibold text-slate-600">Pilih Rentang Hari Berurutan:</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={rangeStartDate}
                                            onChange={(e) => setRangeStartDate(e.target.value)}
                                            className="px-2.5 py-1.5 border border-slate-300 rounded font-bold text-slate-900 bg-white"
                                        />
                                        <span className="text-slate-400 font-bold">s.d.</span>
                                        <input
                                            type="date"
                                            value={rangeEndDate}
                                            onChange={(e) => setRangeEndDate(e.target.value)}
                                            className="px-2.5 py-1.5 border border-slate-300 rounded font-bold text-slate-900 bg-white"
                                        />
                                    </div>
                                    <span className="text-slate-500">
                                        (Terpilih <b>{daysList.length} Hari Berurutan</b>)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════
                        DAY STEPPER TABS: DERETAN TAB HARI BERURUTAN
                        ═══════════════════════════════════════════════════════════ */}
                    {daysList.length > 1 && (
                        <div className="bg-slate-100 border border-slate-200 rounded-md p-1.5 flex items-center gap-1 overflow-x-auto shadow-2xs">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 shrink-0">
                                Pilih Hari:
                            </span>
                            {daysList.map((d, idx) => {
                                const isActive = idx === activeDayIndex;
                                const dateRows = multiDayState[d.date] || [];
                                // Hitung apakah ada santri tidak hadir di hari ini
                                let hasAbsent = false;
                                dateRows.forEach(r => {
                                    if (Object.values(r.attendances).some(a => a.status !== 'hadir')) {
                                        hasAbsent = true;
                                    }
                                });

                                return (
                                    <button
                                        key={d.date}
                                        type="button"
                                        onClick={() => setActiveDayIndex(idx)}
                                        className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                                            isActive
                                                ? 'bg-[#093c30] text-white shadow-xs'
                                                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                                        }`}
                                    >
                                        <Calendar className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-300' : 'text-slate-400'}`} />
                                        <span>{idx + 1}. {d.day_name}</span>
                                        <span className={`text-[10px] font-mono ${isActive ? 'text-emerald-200' : 'text-slate-400'}`}>
                                            ({d.date.substring(5)})
                                        </span>
                                        {hasAbsent ? (
                                            <span className="w-2 h-2 rounded-full bg-amber-400" title="Ada catatan ketidakhadiran di hari ini" />
                                        ) : (
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" title="Semua santri hadir" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Ringkasan Susunan Jam Pelajaran Hari Aktif */}
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-[#093c30]" />
                                Susunan Jam Pelajaran Hari {currentDayObj?.day_name} &bull; {currentDayObj?.date} ({currentDayObj?.hours?.length || 6} Jam KBM)
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                                Posisi mapel disesuaikan dengan jadwal resmi pada hari ini
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                            {currentDayObj?.hours?.map(h => (
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
                        TABEL GRID PENGISIAN ABSEN (SANTRI X JAM PELAJARAN DI HARI AKTIF)
                        ═══════════════════════════════════════════════════════════ */}
                    <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
                        <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">
                                    Daftar Santri & Status Kehadiran Hari {currentDayObj?.day_name}
                                </span>
                                <span className="text-slate-400">&bull;</span>
                                <span className="text-emerald-700 font-semibold">
                                    Hadir Penuh: {dayStats.fullPresent}
                                </span>
                                {dayStats.partialAbsent > 0 && (
                                    <>
                                        <span className="text-slate-400">&bull;</span>
                                        <span className="text-amber-700 font-semibold">
                                            Berhalangan Sebagian / Full: {dayStats.partialAbsent}
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

                                        {/* Kolom Tiap Jam Pelajaran di Hari Ini */}
                                        {currentDayObj?.hours?.map(h => (
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
                                    {isLoadingRange ? (
                                        <tr>
                                            <td colSpan={10} className="p-8 text-center text-slate-400">
                                                Memuat jadwal dan daftar santri...
                                            </td>
                                        </tr>
                                    ) : currentDayRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                                                Tidak ada santri aktif atau jadwal tidak ditemukan pada hari ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        currentDayRows.map((row, idx) => (
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

                                                {/* Tombol Aksi Cepat 1 Baris Santri (Full Day) */}
                                                <td className="px-2 py-2 text-center border-r border-slate-200">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetAllHoursForStudent(row.student_id, 'hadir')}
                                                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                                            title="Set Hadir untuk seluruh jam santri ini hari ini"
                                                        >
                                                            H
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetAllHoursForStudent(row.student_id, 'sakit')}
                                                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                                            title="Set Sakit seharian (Full Day) untuk santri ini"
                                                        >
                                                            S
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetAllHoursForStudent(row.student_id, 'izin')}
                                                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                                            title="Set Izin seharian (Full Day) untuk santri ini"
                                                        >
                                                            I
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Kolom Pilihan Status Tiap Jam Pelajaran */}
                                                {currentDayObj?.hours?.map(h => {
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
                                                        value={currentDayNotes[row.student_id] || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setMultiDayNotes(prev => ({
                                                                ...prev,
                                                                [currentDayDate]: {
                                                                    ...(prev[currentDayDate] || {}),
                                                                    [row.student_id]: val
                                                                }
                                                            }));
                                                        }}
                                                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 placeholder:text-slate-300"
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Tabel dengan Navigasi Hari Berikutnya & Tombol Simpan */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                {daysList.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            disabled={activeDayIndex === 0}
                                            onClick={() => setActiveDayIndex(prev => Math.max(0, prev - 1))}
                                            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
                                        >
                                            <ChevronLeft className="w-4 h-4" /> Hari Sebelumnya
                                        </button>
                                        <button
                                            type="button"
                                            disabled={activeDayIndex === daysList.length - 1}
                                            onClick={() => setActiveDayIndex(prev => Math.min(daysList.length - 1, prev + 1))}
                                            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
                                        >
                                            Hari Berikutnya <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleSaveAllDays}
                                disabled={isSavingMultiDay}
                                className="px-5 py-2.5 bg-[#093c30] hover:bg-[#064e3b] text-white text-xs font-bold rounded shadow-xs transition flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4 text-emerald-300" />
                                {isSavingMultiDay 
                                    ? 'Menyimpan...' 
                                    : entryMode === 'weekly' 
                                        ? 'Simpan Presensi Sepekan (Sabtu s.d. Kamis)'
                                        : entryMode === 'range'
                                            ? `Simpan ${daysList.length} Hari Sekaligus`
                                            : 'Simpan Presensi Hari Ini'
                                }
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
                MODAL FITUR: "TERAPKAN IZIN / SAKIT RENTANG HARI"
                ═══════════════════════════════════════════════════════════ */}
            <Modal
                open={ruleModalOpen}
                title="⚡ Terapkan Izin / Sakit Rentang Hari"
                onClose={() => setRuleModalOpen(false)}
            >
                <form onSubmit={handleApplyRule} className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs space-y-1 text-amber-900">
                        <p className="font-bold flex items-center gap-1.5">
                            <CalendarRange className="w-4 h-4 text-amber-700" />
                            Pencatatan Izin / Sakit Berhari-hari (Multi-Day Rule)
                        </p>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                            Mekanisme ini menerapkan status santri pada hari-hari yang Anda centang secara otomatis, baik seharian penuh (*Full Day*) maupun hanya jam tertentu saja (misal: Jam 1 & 2).
                        </p>
                    </div>

                    <div className="space-y-3 text-xs">
                        {/* Pilih Santri */}
                        <div>
                            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Pilih Santri
                            </label>
                            <select
                                value={ruleStudentId}
                                onChange={(e) => setRuleStudentId(e.target.value)}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold text-slate-900 bg-white"
                            >
                                {currentDayRows.map(s => (
                                    <option key={s.student_id} value={s.student_id}>
                                        {s.name} (NIS: {s.nis})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status Kehadiran */}
                        <div>
                            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Status Kehadiran
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 'izin', label: 'Izin', color: 'bg-blue-600 text-white' },
                                    { value: 'sakit', label: 'Sakit', color: 'bg-amber-500 text-white' },
                                    { value: 'alpa', label: 'Alpa', color: 'bg-rose-600 text-white' },
                                ].map(st => (
                                    <button
                                        key={st.value}
                                        type="button"
                                        onClick={() => setRuleStatus(st.value)}
                                        className={`py-1.5 text-xs font-bold rounded transition text-center border ${
                                            ruleStatus === st.value
                                                ? `${st.color} border-transparent shadow-xs`
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        {st.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pilih Hari yang Diterapkan */}
                        <div>
                            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Terapkan Pada Hari (Rentang Terpilih)
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-md">
                                {daysList.map(d => {
                                    const isChecked = ruleSelectedDays.includes(d.date);
                                    return (
                                        <label key={d.date} className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                    if (isChecked) {
                                                        setRuleSelectedDays(prev => prev.filter(x => x !== d.date));
                                                    } else {
                                                        setRuleSelectedDays(prev => [...prev, d.date]);
                                                    }
                                                }}
                                                className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                                            />
                                            <span className="font-medium">{d.day_name} ({d.date.substring(5)})</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Lingkup Jam: Full Day vs Jam Tertentu */}
                        <div>
                            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Lingkup Jam Pelajaran
                            </label>
                            <div className="flex items-center gap-4 mb-2">
                                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                                    <input
                                        type="radio"
                                        name="ruleScope"
                                        value="fullday"
                                        checked={ruleScope === 'fullday'}
                                        onChange={() => setRuleScope('fullday')}
                                        className="text-[#093c30]"
                                    />
                                    Full Day (Semua Jam Pelajaran)
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                                    <input
                                        type="radio"
                                        name="ruleScope"
                                        value="selected_hours"
                                        checked={ruleScope === 'selected_hours'}
                                        onChange={() => setRuleScope('selected_hours')}
                                        className="text-[#093c30]"
                                    />
                                    Jam Tertentu Saja
                                </label>
                            </div>

                            {/* Checklist Jam Tertentu */}
                            {ruleScope === 'selected_hours' && (
                                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-md">
                                    {[1, 2, 3, 4, 5, 6].map(hourNum => {
                                        const isChecked = ruleSelectedHours.includes(hourNum);
                                        return (
                                            <label key={hourNum} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-bold cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        if (isChecked) {
                                                            setRuleSelectedHours(prev => prev.filter(x => x !== hourNum));
                                                        } else {
                                                            setRuleSelectedHours(prev => [...prev, hourNum]);
                                                        }
                                                    }}
                                                    className="rounded border-slate-300 text-emerald-800"
                                                />
                                                Jam {hourNum}
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Catatan / Alasan */}
                        <div>
                            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Catatan / Keterangan Alasan
                            </label>
                            <input
                                type="text"
                                placeholder="Misal: Izin sambangan keluarga / Istirahat di UKS"
                                value={ruleNotes}
                                onChange={(e) => setRuleNotes(e.target.value)}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <button
                            type="button"
                            onClick={() => setRuleModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 bg-[#093c30] text-white text-xs font-bold rounded-md hover:bg-[#064e3b] shadow-xs flex items-center gap-1.5"
                        >
                            <Check className="w-4 h-4 text-emerald-300" />
                            Terapkan ke Rentang Hari
                        </button>
                    </div>
                </form>
            </Modal>

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
