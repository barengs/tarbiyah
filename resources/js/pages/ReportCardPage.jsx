import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    useGetGradingPeriodQuery,
    useGetQuarterlySheetQuery,
    useSaveQuarterlySheetMutation,
    useToggleScoreLockMutation,
    useSaveRemedialScoresMutation,
    useGetClassExamEligibilityQuery,
} from '../store/slices/assessmentApi';
import {
    useGetReportsQuery,
    useGenerateReportsMutation,
    useUpdateReportNotesMutation,
} from '../store/slices/reportApi';
import { useGetClassGroupsQuery } from '../store/slices/classGroupApi';
import Modal from '../components/ui/Modal';
import FlatTabs from '../components/atoms/FlatTabs';
import ActionDropdown from '../components/molecules/ActionDropdown';
import PrintReportAndHistoryModal from '../components/organisms/PrintReportAndHistoryModal';
import CollectiveExcelImportModal from '../components/organisms/CollectiveExcelImportModal';
import {
    generateStudentReportCardPdf,
    generateBulkReportCardsPdf,
    generateGradebookPdf,
    generateExamEligibilityPdf,
} from '../utils/reportCardPdfGenerator';
import {
    FileSpreadsheet,
    FileText,
    ExternalLink,
    Printer,
    MessageSquare,
    Calculator,
    Award,
    CheckCircle2,
    BookOpen,
    Save,
    Search,
    Eye,
    ShieldCheck,
    AlertTriangle,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Minus,
    ArrowUpRight,
    RotateCcw,
    Calendar,
    Lock,
    Unlock,
    Settings,
    Clock,
    SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'react-toastify';

const STUDY_TYPE_BADGE = {
    khusus: {
        label: 'Mapel Khusus (Inti)',
        short: 'Khusus',
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    reguler: {
        label: 'Mapel Reguler',
        short: 'Reguler',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    muatan_lokal: {
        label: 'Muatan Lokal (Penunjang)',
        short: 'Mulok (Non-Kelas)',
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
    },
};

const PROMOTION_BADGE = {
    layak_naik: {
        label: 'Layak Naik Kelas',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    tuntas_remidi: {
        label: 'Layak Naik (Tuntas Remidi)',
        cls: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    remidi_khusus: {
        label: 'Wajib Remidi Mapel Khusus',
        cls: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    belum_dinilai: {
        label: 'Belum Dinilai',
        cls: 'bg-slate-100 text-slate-500 border-slate-200',
    },
};

export default function ReportCardPage({ initialTab }) {
    const location = useLocation();
    const navigate = useNavigate();
    const defaultTab = initialTab || (location.pathname.includes('nilai') ? 'quarterly_input' : 'reports');
    const [activeTab, setActiveTab] = useState(defaultTab);

    // ═══════════════════════════════════════════════════════════
    // 1. DATA PERIODE AKTIF & MASA PENGINPUTAN NILAI (SINKRON NAVBAR)
    // ═══════════════════════════════════════════════════════════
    const { selectedYearId: globalYearId, selectedQuarterId: globalQuarterId } = useSelector(
        (state) => state.academicContext || {}
    );
    const [archiveQuarterId, setArchiveQuarterId] = useState(''); // Hanya jika melihat arsip

    useEffect(() => {
        setArchiveQuarterId('');
    }, [globalYearId, globalQuarterId]);

    const effectiveQuarterParam = archiveQuarterId || globalQuarterId;
    const { data: periodData, isLoading: isLoadingPeriod, refetch: refetchPeriod } = useGetGradingPeriodQuery({
        ...(globalYearId && { academic_year_id: globalYearId }),
        ...(effectiveQuarterParam && { academic_quarter_id: effectiveQuarterParam }),
    });
    const period = periodData?.data || null;

    const activeYear = period?.active_academic_year;
    const activeQuarter = period?.active_quarter;
    const isOpenGrading = period?.is_open ?? true;
    const isClosedGrading = period?.status === 'closed';

    // ═══════════════════════════════════════════════════════════
    // 2. PEMILIHAN KELAS / ROMBEL & MATA PELAJARAN (SIMPEL)
    // ═══════════════════════════════════════════════════════════
    const effectiveYearId = activeYear?.id || globalYearId;
    const { data: groupsData, isLoading: isLoadingGroups } = useGetClassGroupsQuery(
        effectiveYearId ? { academic_year_id: effectiveYearId } : undefined
    );
    const allGroups = groupsData?.data || [];
    const [selectedGroupId, setSelectedGroupId] = useState('');

    useEffect(() => {
        if (allGroups.length > 0) {
            const exists = allGroups.some((g) => String(g.id) === String(selectedGroupId));
            if (!selectedGroupId || !exists) {
                setSelectedGroupId(String(allGroups[0].id));
            }
        } else {
            setSelectedGroupId('');
        }
    }, [allGroups, selectedGroupId]);

    const selectedGroupObj = useMemo(
        () => allGroups.find((g) => String(g.id) === String(selectedGroupId)),
        [allGroups, selectedGroupId]
    );

    // Lembar Nilai Akhir Triwulan
    const {
        data: sheetResponse,
        isLoading: isLoadingSheet,
        refetch: refetchSheet,
    } = useGetQuarterlySheetQuery(
        {
            class_group_id: selectedGroupId,
            academic_year_id: activeYear?.id,
            academic_quarter_id: activeQuarter?.id,
        },
        { skip: !selectedGroupId }
    );

    const sheetData = sheetResponse?.data || null;
    const sheetStudies = sheetData?.studies || [];
    const sheetStudents = sheetData?.students || [];
    const studiesLockSummary = sheetData?.studies_lock_summary || {};

    // Mode Input: 'single' (Pilih 1 Mata Pelajaran) atau 'matrix' (Semua Mapel)
    const [selectedStudyId, setSelectedStudyId] = useState('');
    const [viewMode, setViewMode] = useState('single'); // 'single' | 'matrix'
    const [studentSearch, setStudentSearch] = useState('');

    useEffect(() => {
        if (sheetStudies.length > 0) {
            const exists = sheetStudies.some((s) => String(s.id) === String(selectedStudyId));
            if (!exists) {
                setSelectedStudyId(String(sheetStudies[0].id));
            }
        }
    }, [sheetStudies, selectedStudyId]);

    const currentStudyObj = useMemo(
        () => sheetStudies.find((s) => String(s.id) === String(selectedStudyId)),
        [sheetStudies, selectedStudyId]
    );

    // State Input Nilai Lokal: { [studentId]: { [studyId]: scoreString } }
    const [scoreMatrix, setScoreMatrix] = useState({});
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (!sheetStudents.length) {
            setScoreMatrix({});
            setIsDirty(false);
            return;
        }
        const initial = {};
        sheetStudents.forEach((st) => {
            initial[st.student_id] = {};
            sheetStudies.forEach((sub) => {
                const cell = st.grades?.[sub.id] || st.scores?.[sub.id];
                const val = cell?.score !== null && cell?.score !== undefined ? String(cell.score) : '';
                initial[st.student_id][sub.id] = val;
            });
        });
        setScoreMatrix(initial);
        setIsDirty(false);
    }, [sheetStudents, sheetStudies, selectedGroupId]);

    const [saveQuarterlySheet, { isLoading: isSavingSheet }] = useSaveQuarterlySheetMutation();
    const [toggleScoreLock, { isLoading: isTogglingLock }] = useToggleScoreLockMutation();
    const [saveRemedialScores, { isLoading: isSavingRemedial }] = useSaveRemedialScoresMutation();

    // Status kunci nilai untuk mata pelajaran terpilih / seluruh mata pelajaran
    const currentStudyLockInfo = useMemo(
        () =>
            studiesLockSummary[selectedStudyId] || {
                graded_count: 0,
                locked_count: 0,
                is_locked: false,
                has_locked: false,
            },
        [studiesLockSummary, selectedStudyId]
    );
    const isCurrentStudyLocked = Boolean(currentStudyLockInfo.is_locked);
    const hasCurrentStudyLocked = Boolean(currentStudyLockInfo.has_locked);

    const anyMatrixStudyLocked = useMemo(
        () => Object.values(studiesLockSummary).some((s) => s.has_locked),
        [studiesLockSummary]
    );

    const filteredStudents = useMemo(() => {
        if (!studentSearch.trim()) return sheetStudents;
        const q = studentSearch.toLowerCase();
        return sheetStudents.filter(
            (st) =>
                (st.student_name || st.name || '').toLowerCase().includes(q) ||
                (st.student_nis || st.nis || '').toLowerCase().includes(q)
        );
    }, [sheetStudents, studentSearch]);

    const handleScoreChange = (studentId, studyId, val) => {
        if (!isOpenGrading) {
            toast.warning('Masa penginputan nilai telah berakhir. Form dalam mode baca saja.');
            return;
        }
        const stRow = sheetStudents.find((s) => String(s.student_id) === String(studentId));
        const cellMeta = stRow?.grades?.[studyId] || stRow?.scores?.[studyId];
        if (cellMeta?.is_locked) {
            toast.warning('Nilai ini telah dikunci. Klik "Buka Kunci" terlebih dahulu jika ingin mengedit.');
            return;
        }
        if (val !== '' && (Number(val) < 0 || Number(val) > 100)) return;
        setScoreMatrix((prev) => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || {}),
                [studyId]: val,
            },
        }));
        setIsDirty(true);
    };

    const handleSaveSingleStudy = async (lockAfterSave = false) => {
        if (!selectedGroupId || !selectedStudyId) return;

        const entries = [];
        filteredStudents.forEach((st) => {
            const cellMeta = st.grades?.[selectedStudyId] || st.scores?.[selectedStudyId];
            if (cellMeta?.is_locked) return; // Jangan ubah nilai yang sudah terkunci
            const val = scoreMatrix[st.student_id]?.[selectedStudyId];
            if (val !== '' && val !== null && val !== undefined && !isNaN(parseFloat(val))) {
                entries.push({
                    student_id: Number(st.student_id),
                    study_id: Number(selectedStudyId),
                    score: parseFloat(val),
                });
            }
        });

        if (entries.length === 0) {
            toast.warning(
                hasCurrentStudyLocked
                    ? 'Nilai mata pelajaran ini sudah terkunci. Buka kunci terlebih dahulu untuk mengedit.'
                    : 'Belum ada nilai yang diinput.'
            );
            return;
        }

        try {
            await saveQuarterlySheet({
                class_group_id: Number(selectedGroupId),
                academic_year_id: activeYear?.id,
                academic_quarter_id: activeQuarter?.id,
                lock_after_save: Boolean(lockAfterSave),
                entries,
            }).unwrap();

            toast.success(
                lockAfterSave
                    ? `Nilai ${currentStudyObj?.name || 'Mata Pelajaran'} berhasil disimpan & dikunci!`
                    : `Nilai ${currentStudyObj?.name || 'Mata Pelajaran'} berhasil disimpan!`
            );
            setIsDirty(false);
            refetchSheet();
            refetchReports();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan nilai');
        }
    };

    const handleSaveAllStudies = async (lockAfterSave = false) => {
        if (!selectedGroupId) return;

        const entries = [];
        Object.entries(scoreMatrix).forEach(([studentId, studyMap]) => {
            const stRow = sheetStudents.find((s) => String(s.student_id) === String(studentId));
            Object.entries(studyMap).forEach(([studyId, val]) => {
                const cellMeta = stRow?.grades?.[studyId] || stRow?.scores?.[studyId];
                if (cellMeta?.is_locked) return;
                if (val !== '' && val !== null && val !== undefined && !isNaN(parseFloat(val))) {
                    entries.push({
                        student_id: Number(studentId),
                        study_id: Number(studyId),
                        score: parseFloat(val),
                    });
                }
            });
        });

        if (entries.length === 0) {
            toast.warning('Belum ada nilai baru yang dapat disimpan (atau semua nilai sudah terkunci).');
            return;
        }

        try {
            await saveQuarterlySheet({
                class_group_id: Number(selectedGroupId),
                academic_year_id: activeYear?.id,
                academic_quarter_id: activeQuarter?.id,
                lock_after_save: Boolean(lockAfterSave),
                entries,
            }).unwrap();

            toast.success(
                lockAfterSave
                    ? 'Semua nilai akhir triwulan berhasil disimpan & dikunci!'
                    : 'Semua nilai akhir triwulan berhasil disimpan!'
            );
            setIsDirty(false);
            refetchSheet();
            refetchReports();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan nilai');
        }
    };

    const handleToggleLock = async ({ action, studyId = null, studentId = null }) => {
        if (!selectedGroupId) return;
        if (action === 'unlock' && !isOpenGrading) {
            toast.warning(
                'Masa penginputan nilai saat ini sedang ditutup. Buka kembali periode masa input nilai di menu Pengaturan agar kunci nilai dapat dibuka.'
            );
            return;
        }

        try {
            // Jika sedang mengunci dan masih ada nilai di form yang belum disimpan, simpan terlebih dahulu
            if (action === 'lock' && isDirty) {
                if (viewMode === 'single' && studyId) {
                    const unsavedEntries = [];
                    filteredStudents.forEach((st) => {
                        const cellMeta = st.grades?.[studyId] || st.scores?.[studyId];
                        if (cellMeta?.is_locked) return;
                        const val = scoreMatrix[st.student_id]?.[studyId];
                        if (val !== '' && val !== null && val !== undefined && !isNaN(parseFloat(val))) {
                            unsavedEntries.push({
                                student_id: Number(st.student_id),
                                study_id: Number(studyId),
                                score: parseFloat(val),
                            });
                        }
                    });
                    if (unsavedEntries.length > 0) {
                        await saveQuarterlySheet({
                            class_group_id: Number(selectedGroupId),
                            academic_year_id: activeYear?.id,
                            academic_quarter_id: activeQuarter?.id,
                            lock_after_save: true,
                            entries: unsavedEntries,
                        }).unwrap();
                        setIsDirty(false);
                    }
                }
            }

            const res = await toggleScoreLock({
                class_group_id: Number(selectedGroupId),
                academic_year_id: activeYear?.id,
                academic_quarter_id: activeQuarter?.id,
                study_id: studyId ? Number(studyId) : undefined,
                student_id: studentId ? Number(studentId) : undefined,
                action,
            }).unwrap();

            toast.success(
                res?.message ||
                    (action === 'lock'
                        ? 'Nilai berhasil dikunci dan tidak dapat diedit.'
                        : 'Kunci nilai berhasil dibuka. Nilai kini dapat diedit kembali.')
            );
            refetchSheet();
            refetchReports();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal mengubah status kunci nilai');
        }
    };

    // ═══════════════════════════════════════════════════════════
    // 3. REMIDI MAPEL KHUSUS & EVALUASI KENAIKAN KELAS
    // ═══════════════════════════════════════════════════════════
    const [remedialModalOpen, setRemedialModalOpen] = useState(false);
    const [remedialStudent, setRemedialStudent] = useState(null);
    const [remedialInputs, setRemedialInputs] = useState({});

    const targetRemedialStudies = useMemo(() => {
        const fromSheet = sheetStudies.filter((s) => s.study_type === 'khusus');
        if (fromSheet.length > 0) return fromSheet;
        if (remedialStudent?.remedial_studies?.length > 0) {
            return remedialStudent.remedial_studies.map((rs) => ({
                id: rs.study_id,
                name: rs.study_name,
                kkm: rs.kkm,
                study_type: 'khusus',
            }));
        }
        return [];
    }, [sheetStudies, remedialStudent]);

    const openRemedialModal = (student) => {
        setRemedialStudent(student);
        const init = {};

        const khususList = sheetStudies.filter((s) => s.study_type === 'khusus');
        const listToUse = khususList.length > 0
            ? khususList
            : (student.remedial_studies || []).map((rs) => ({
                  id: rs.study_id,
                  name: rs.study_name,
                  kkm: rs.kkm,
                  study_type: 'khusus',
              }));

        listToUse.forEach((sub) => {
            const sc = student.grades?.[sub.id] || student.scores?.[sub.id];
            const orig = sc?.original_score !== null && sc?.original_score !== undefined
                ? Number(sc.original_score)
                : (sc?.score !== null && sc?.score !== undefined ? Number(sc.score) : null);

            init[sub.id] = {
                original_score: orig,
                kkm: sub.kkm || 65,
                remedial_score: sc?.remedial_score !== null && sc?.remedial_score !== undefined ? String(sc.remedial_score) : '',
                notes: sc?.notes || 'Tuntas ujian remidi mapel khusus akhir triwulan',
            };
        });
        setRemedialInputs(init);
        setRemedialModalOpen(true);
    };

    const handleSaveRemedial = async (e) => {
        e.preventDefault();
        if (!remedialStudent) return;

        const items = [];
        Object.entries(remedialInputs).forEach(([studyId, form]) => {
            const sc = remedialStudent?.grades?.[studyId] || remedialStudent?.scores?.[studyId];
            const hasOrig = (sc?.original_score !== null && sc?.original_score !== undefined) || (sc?.score !== null && sc?.score !== undefined);
            if (!hasOrig) {
                // Abaikan mapel yang belum pernah diinput nilai awalnya
                return;
            }

            const val = parseFloat(form.remedial_score);
            if (!isNaN(val) && val >= 0 && val <= 100) {
                items.push({
                    student_id: Number(remedialStudent.student_id),
                    study_id: Number(studyId),
                    remedial_score: val,
                    notes: form.notes || null,
                });
            }
        });

        if (items.length === 0) {
            toast.warning('Masukkan nilai remidi untuk mata pelajaran khusus yang wajib remidi.');
            return;
        }

        try {
            await saveRemedialScores({
                class_group_id: Number(selectedGroupId),
                academic_year_id: activeYear?.id,
                academic_quarter_id: activeQuarter?.id,
                remedials: items,
            }).unwrap();

            toast.success('Nilai remidi berhasil disimpan! Nilai akhir rapor diperbarui.');
            setRemedialModalOpen(false);
            refetchSheet();
            refetchReports();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan nilai remidi');
        }
    };

    // ═══════════════════════════════════════════════════════════
    // 4. BUKU RAPOR DIGITAL
    // ═══════════════════════════════════════════════════════════
    const {
        data: reportsResponse,
        isLoading: isLoadingReports,
        refetch: refetchReports,
    } = useGetReportsQuery(
        {
            class_group_id: selectedGroupId,
            academic_year_id: activeYear?.id,
            academic_quarter_id: activeQuarter?.id,
        },
        { skip: !selectedGroupId }
    );
    const reports = reportsResponse?.data || [];

    const [generateReports, { isLoading: isGeneratingReports }] = useGenerateReportsMutation();
    const [updateNotes, { isLoading: isSavingNotes }] = useUpdateReportNotesMutation();
    const [detailReport, setDetailReport] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [homeroomNote, setHomeroomNote] = useState('');

    const handleSyncReports = async () => {
        if (!selectedGroupId) return;
        try {
            await generateReports({
                class_group_id: Number(selectedGroupId),
                academic_year_id: activeYear?.id,
                academic_quarter_id: activeQuarter?.id,
            }).unwrap();
            toast.success('Buku Rapor & Peringkat Triwulan berhasil disinkronkan!');
            refetchReports();
            refetchSheet();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal sinkronisasi rapor');
        }
    };

    const handleSaveNote = async (e) => {
        e.preventDefault();
        if (!detailReport) return;
        try {
            await updateNotes({
                id: detailReport.id,
                homeroom_notes: homeroomNote,
                status: 'published',
            }).unwrap();
            toast.success('Catatan wali kelas tersimpan!');
            setNoteModalOpen(false);
            refetchReports();
        } catch (err) {
            toast.error('Gagal menyimpan catatan');
        }
    };

    // Modal Cetak & Preview PDF (Riwayat Nilai & Buku Rapor)
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printModalConfig, setPrintModalConfig] = useState({
        docType: 'history',
        historyFormat: 'gradebook',
        studentId: '',
    });

    const openPrintModal = ({ docType = 'history', historyFormat = 'gradebook', studentId = '' } = {}) => {
        setPrintModalConfig({ docType, historyFormat, studentId });
        setPrintModalOpen(true);
    };

    // Modal Import Penilaian Kolektif dari Excel
    const [importExcelModalOpen, setImportExcelModalOpen] = useState(false);

    // ═══════════════════════════════════════════════════════════
    // 5. KELAYAKAN UJIAN (BANK SANTRI)
    // ═══════════════════════════════════════════════════════════
    const {
        data: eligibilityResponse,
        isLoading: isLoadingEligibility,
        refetch: refetchEligibility,
    } = useGetClassExamEligibilityQuery(
        { class_group_id: selectedGroupId },
        { skip: !selectedGroupId || activeTab !== 'eligibility' }
    );
    const eligibilityList = eligibilityResponse?.data?.students || [];

    const tabs = [
        {
            id: 'quarterly_input',
            label: 'Input Nilai Akhir Triwulan',
            icon: FileSpreadsheet,
        },
        {
            id: 'remedial',
            label: 'Remidi Khusus & Evaluasi Kenaikan',
            icon: RotateCcw,
        },
        {
            id: 'reports',
            label: 'Buku Rapor Digital',
            icon: BookOpen,
            count: reports.length || undefined,
        },
        {
            id: 'eligibility',
            label: 'Kelayakan Ujian (Bank Santri)',
            icon: ShieldCheck,
        },
    ];

    return (
        <div className="space-y-4">
            {/* ═══════════════════ HEADER & STATUS MASA INPUT NILAI ═══════════════════ */}
            <div className="bg-white border border-slate-200 rounded-xs p-4 shadow-2xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-amber-400 rounded-xs">
                                Penilaian Akhir Triwulan
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                                {activeYear?.year ? `TA ${activeYear.year} H` : 'Tahun Ajaran Aktif'} • {activeQuarter?.name || 'Triwulan Aktif'}
                            </span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
                            <Award className="w-5 h-5 text-emerald-800" />
                            Lembar Penilaian Akhir Triwulan &amp; Buku Rapor
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Tombol Import Nilai Kolektif (Excel) */}
                        <button
                            type="button"
                            onClick={() => setImportExcelModalOpen(true)}
                            disabled={!selectedGroupId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-xs shadow-2xs cursor-pointer disabled:opacity-50"
                            title="Import Nilai Kolektif Multi-Mata Pelajaran dari Berkas Excel"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-800" />
                            Import Excel
                        </button>

                        {/* Tombol Cetak PDF (Riwayat Nilai & Buku Rapor) */}
                        <button
                            type="button"
                            onClick={() =>
                                openPrintModal({
                                    docType: activeTab === 'reports' ? 'rapor' : 'history',
                                    historyFormat: 'gradebook',
                                    studentId: '',
                                })
                            }
                            disabled={!sheetStudents.length}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xs shadow-2xs cursor-pointer disabled:opacity-50"
                            title="Cetak & Preview PDF Riwayat Nilai atau Buku Rapor"
                        >
                            <Printer className="w-3.5 h-3.5 text-emerald-800" />
                            Cetak
                        </button>

                        {/* Status Masa Penginputan Nilai */}
                        <div
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xs border text-xs font-semibold ${
                                isOpenGrading
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                        >
                            {isOpenGrading ? <Unlock className="w-4 h-4 text-emerald-700" /> : <Lock className="w-4 h-4 text-rose-700" />}
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider leading-none">
                                    {isOpenGrading ? 'Masa Input Terbuka' : 'Masa Input Ditutup'}
                                </div>
                                <div className="text-[11px] font-normal text-slate-600 mt-0.5">
                                    {period?.grading_start_date && period?.grading_end_date
                                        ? `${period.grading_start_date} s/d ${period.grading_end_date}`
                                        : 'Belum diatur'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Banner Peringatan jika Masa Input Nilai Telah Berakhir */}
                {isClosedGrading && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xs flex flex-wrap items-center justify-between gap-2 text-xs text-rose-900">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>
                                <strong>Masa penginputan nilai untuk triwulan ini telah berakhir</strong> ({period?.grading_end_date}). Form input terkunci dalam mode hanya-baca (Read-Only). Hubungi Bagian Kurikulum atau atur rentang tanggal di menu Pengaturan.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/pengaturan/masa-nilai')}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xs cursor-pointer"
                        >
                            Buka Menu Pengaturan &rarr;
                        </button>
                    </div>
                )}

                {/* Opsi Arsip Triwulan Sebelumnya (hanya tampil jika user ingin melihat arsip masa lalu) */}
                {period?.quarters_archive && period.quarters_archive.length > 1 && isClosedGrading && (
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs">
                        <span className="text-slate-500 font-semibold">Lihat Arsip Triwulan:</span>
                        <select
                            value={archiveQuarterId}
                            onChange={(e) => setArchiveQuarterId(e.target.value)}
                            className="px-2 py-1 text-xs border border-slate-300 rounded-xs bg-white text-slate-800 font-medium"
                        >
                            <option value="">-- Triwulan Aktif Sekarang ({activeQuarter?.name}) --</option>
                            {period.quarters_archive.map((q) => (
                                <option key={q.id} value={q.id}>
                                    {q.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* ═══════════════════ FLAT TABS ═══════════════════ */}
            <FlatTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            {/* ════════════════════════════════════════════════════════════════════════
                TAB 1: INPUT NILAI AKHIR TRIWULAN (SEDERHANA, BERSIH & JELAS)
               ════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'quarterly_input' && (
                <div className="bg-white border border-slate-200 rounded-xs shadow-2xs overflow-hidden space-y-0">
                    {/* Toolbar Pemilihan Rombel & Mata Pelajaran */}
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* 1. Pilih Kelas / Rombel */}
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                                    Kelas / Rombel:
                                </label>
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(e.target.value)}
                                    className="px-3 py-1.5 text-xs font-bold border border-emerald-600 rounded-xs bg-white text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                >
                                    {allGroups.map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {g.name} ({g.program?.name || 'Program'} • {g.education?.name || 'Jenjang'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 2. Pilih Mata Pelajaran yang dinilai */}
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                                    Mata Pelajaran:
                                </label>
                                <select
                                    value={viewMode === 'matrix' ? 'all' : selectedStudyId}
                                    onChange={(e) => {
                                        if (e.target.value === 'all') {
                                            setViewMode('matrix');
                                        } else {
                                            setViewMode('single');
                                            setSelectedStudyId(e.target.value);
                                        }
                                    }}
                                    className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-xs bg-white text-slate-800 focus:outline-none focus:border-emerald-700"
                                >
                                    {sheetStudies.map((s) => {
                                        const lockInf = studiesLockSummary[s.id];
                                        const lockPrefix = lockInf?.is_locked ? '🔒 ' : '';
                                        return (
                                            <option key={s.id} value={s.id}>
                                                {lockPrefix}[{STUDY_TYPE_BADGE[s.study_type]?.short || 'Mapel'}] {s.name} (KKM {s.kkm || 65})
                                            </option>
                                        );
                                    })}
                                    <option value="all">-- Mode Matriks Semua Mapel --</option>
                                </select>
                            </div>
                        </div>

                        {/* Search, Import Excel, Kunci Nilai & Simpan Nilai (Sejajar dalam 1 Baris) */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    placeholder="Cari santri..."
                                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xs bg-white w-32 sm:w-40 focus:outline-none focus:border-emerald-700"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => setImportExcelModalOpen(true)}
                                disabled={!selectedGroupId}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xs shadow-2xs disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                title="Import Nilai Kolektif Multi-Mata Pelajaran dari Berkas Excel"
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-800" />
                                Import Excel
                            </button>

                            {viewMode === 'single' ? (
                                hasCurrentStudyLocked ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleToggleLock({
                                                action: 'unlock',
                                                studyId: selectedStudyId,
                                            })
                                        }
                                        disabled={isTogglingLock || !isOpenGrading}
                                        title={
                                            isOpenGrading
                                                ? 'Buka kunci nilai agar dapat diedit kembali'
                                                : 'Periode input nilai sedang ditutup. Buka kembali periode masa input nilai di Pengaturan untuk membuka kunci nilai.'
                                        }
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xs shadow-2xs disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                    >
                                        <Unlock className="w-3.5 h-3.5" />
                                        {isTogglingLock ? 'Memproses...' : 'Buka Kunci'}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleToggleLock({
                                                action: 'lock',
                                                studyId: selectedStudyId,
                                            })
                                        }
                                        disabled={isTogglingLock || isSavingSheet || !isOpenGrading || !filteredStudents.length}
                                        title="Kunci nilai mata pelajaran ini agar tidak dapat diedit"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xs shadow-2xs disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                    >
                                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                                        {isTogglingLock ? 'Mengunci...' : 'Kunci Nilai'}
                                    </button>
                                )
                            ) : anyMatrixStudyLocked ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleToggleLock({
                                            action: 'unlock',
                                            studyId: null,
                                        })
                                    }
                                    disabled={isTogglingLock || !isOpenGrading}
                                    title={
                                        isOpenGrading
                                            ? 'Buka kunci semua nilai pada rombel ini'
                                            : 'Periode input nilai sedang ditutup. Buka kembali periode masa input nilai di Pengaturan untuk membuka kunci nilai.'
                                    }
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xs shadow-2xs disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                >
                                    <Unlock className="w-3.5 h-3.5" />
                                    {isTogglingLock ? 'Memproses...' : 'Buka Kunci Semua'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleToggleLock({
                                            action: 'lock',
                                            studyId: null,
                                        })
                                    }
                                    disabled={isTogglingLock || isSavingSheet || !isOpenGrading || !filteredStudents.length}
                                    title="Kunci semua nilai yang telah diinput pada rombel ini"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xs shadow-2xs disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                >
                                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                                    {isTogglingLock ? 'Mengunci...' : 'Kunci Semua'}
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() =>
                                    viewMode === 'single' ? handleSaveSingleStudy(false) : handleSaveAllStudies(false)
                                }
                                disabled={
                                    isSavingSheet ||
                                    !isOpenGrading ||
                                    !filteredStudents.length ||
                                    (viewMode === 'single' && isCurrentStudyLocked)
                                }
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-xs shadow-2xs disabled:opacity-50 cursor-pointer whitespace-nowrap"
                            >
                                <Save className="w-3.5 h-3.5" />
                                {isSavingSheet ? 'Menyimpan...' : 'Simpan Nilai'}
                            </button>
                        </div>
                    </div>

                    {/* Mode 1: Single Study Input (Paling Sederhana & Langsung Dipahami Guru) */}
                    {viewMode === 'single' && currentStudyObj && (
                        <div>
                            {/* Header Info Mapel Terpilih */}
                            <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-slate-900 text-sm">
                                        {currentStudyObj.name}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold border ${STUDY_TYPE_BADGE[currentStudyObj.study_type]?.badge}`}>
                                        {STUDY_TYPE_BADGE[currentStudyObj.study_type]?.label || 'Mapel Reguler'}
                                    </span>
                                    <span className="text-slate-500 font-semibold">
                                        • KKM: <strong className="text-slate-900">{currentStudyObj.kkm || 65}</strong>
                                    </span>
                                    {hasCurrentStudyLocked && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                            <Lock className="w-3 h-3" />
                                            Nilai Terkunci ({currentStudyLockInfo.locked_count}/{currentStudyLockInfo.graded_count} santri)
                                        </span>
                                    )}
                                </div>

                                <div className="text-[11px] text-slate-600">
                                    {currentStudyObj.study_type === 'khusus' && (
                                        <span className="text-rose-700 font-medium">
                                            * Mapel Khusus: Wajib tuntas/remidi sebagai syarat kelayakan kenaikan kelas.
                                        </span>
                                    )}
                                    {currentStudyObj.study_type === 'muatan_lokal' && (
                                        <span className="text-amber-800 font-medium">
                                            * Mapel Muatan Lokal: Non-jadwal KBM, berfungsi sebagai penunjang nilai rata-rata triwulan.
                                        </span>
                                    )}
                                    {currentStudyObj.study_type === 'reguler' && (
                                        <span>Mapel Reguler KBM</span>
                                    )}
                                </div>
                            </div>

                            {/* Tabel Sederhana Single Mapel */}
                            {isLoadingSheet ? (
                                <div className="p-12 text-center text-xs text-slate-500">
                                    Memuat daftar santri...
                                </div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="p-12 text-center text-xs text-slate-500">
                                    Tidak ada santri di rombel ini.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead>
                                            <tr className="bg-emerald-950 text-white uppercase text-[10px] tracking-wider">
                                                <th className="py-2.5 px-3 text-center w-12">No.</th>
                                                <th className="py-2.5 px-3 w-32">NIS Santri</th>
                                                <th className="py-2.5 px-3">Nama Santri</th>
                                                <th className="py-2.5 px-3 text-center w-56">
                                                    Nilai Akhir Triwulan (0 - 100)
                                                </th>
                                                <th className="py-2.5 px-3 text-center w-48">
                                                    Ketuntasan / Keterangan
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {filteredStudents.map((st, idx) => {
                                                const studentName = st.student_name || st.name || '-';
                                                const studentNis = st.student_nis || st.nis || '-';
                                                const val = scoreMatrix[st.student_id]?.[selectedStudyId] ?? '';
                                                const numVal = parseFloat(val);
                                                const kkm = currentStudyObj.kkm || 65;
                                                const isEntered = val !== '' && !isNaN(numVal);
                                                const isPassed = isEntered && numVal >= kkm;

                                                const cellMeta = st.grades?.[selectedStudyId] || st.scores?.[selectedStudyId];
                                                const hasRemedial = cellMeta?.is_remedial && cellMeta?.remedial_score !== null;
                                                const isCellLocked = Boolean(cellMeta?.is_locked);
                                                const isSavedInDb = cellMeta?.score !== null && cellMeta?.score !== undefined;

                                                return (
                                                    <tr key={st.student_id} className="hover:bg-slate-50">
                                                        <td className="py-2.5 px-3 text-center font-semibold text-slate-500">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="py-2.5 px-3 font-mono text-slate-600 font-semibold">
                                                            {studentNis}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                                <span>{studentName}</span>
                                                                {st.is_mukim ? (
                                                                    <span className="px-1.5 py-0.2 rounded-xs text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                        Mukim
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-1.5 py-0.2 rounded-xs text-[9px] bg-slate-100 text-slate-600 border border-slate-200">
                                                                        Luar
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            <div className="inline-flex items-center justify-center gap-1.5">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    step="0.1"
                                                                    value={val}
                                                                    disabled={!isOpenGrading || isCellLocked}
                                                                    onChange={(e) =>
                                                                        handleScoreChange(st.student_id, selectedStudyId, e.target.value)
                                                                    }
                                                                    placeholder="0 - 100"
                                                                    className={`w-28 px-3 py-1.5 text-center text-xs font-bold rounded-xs border focus:outline-none ${
                                                                        isCellLocked
                                                                            ? 'border-slate-300 bg-slate-100 text-slate-700 cursor-not-allowed'
                                                                            : isEntered && !isPassed
                                                                              ? 'border-rose-400 bg-rose-50 text-rose-800'
                                                                              : isEntered
                                                                                ? 'border-emerald-400 bg-white text-slate-900'
                                                                                : 'border-slate-300 bg-slate-50 text-slate-500'
                                                                    } disabled:opacity-75`}
                                                                />
                                                                {isSavedInDb && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={isTogglingLock || !isOpenGrading}
                                                                        onClick={() =>
                                                                            handleToggleLock({
                                                                                action: isCellLocked ? 'unlock' : 'lock',
                                                                                studyId: selectedStudyId,
                                                                                studentId: st.student_id,
                                                                            })
                                                                        }
                                                                        title={
                                                                            isCellLocked
                                                                                ? isOpenGrading
                                                                                    ? 'Nilai terkunci. Klik untuk membuka kunci nilai santri ini.'
                                                                                    : 'Nilai terkunci (Periode input nilai ditutup)'
                                                                                : 'Klik untuk mengunci nilai santri ini'
                                                                        }
                                                                        className={`p-1.5 rounded-xs border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                                                            isCellLocked
                                                                                ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                                                                                : 'bg-white text-slate-400 border-slate-200 hover:text-slate-700 hover:bg-slate-100'
                                                                        }`}
                                                                    >
                                                                        {isCellLocked ? (
                                                                            <Lock className="w-3.5 h-3.5" />
                                                                        ) : (
                                                                            <Unlock className="w-3.5 h-3.5" />
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {hasRemedial && (
                                                                <div className="text-[10px] text-teal-700 font-bold mt-0.5">
                                                                    Remidi: {cellMeta.remedial_score} &rarr; Akhir: {cellMeta.score}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            <div className="inline-flex flex-wrap items-center justify-center gap-1">
                                                                {!isEntered ? (
                                                                    <span className="text-slate-400 text-[11px]">
                                                                        Belum Diinput
                                                                    </span>
                                                                ) : isPassed ? (
                                                                    <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                        Tuntas (KKM {kkm})
                                                                    </span>
                                                                ) : currentStudyObj.study_type === 'khusus' ? (
                                                                    <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
                                                                        Wajib Remidi Khusus
                                                                    </span>
                                                                ) : currentStudyObj.study_type === 'muatan_lokal' ? (
                                                                    <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                                        Penunjang Nilai
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                                        Belum Tuntas
                                                                    </span>
                                                                )}
                                                                {isCellLocked && (
                                                                    <span className="px-1.5 py-0.5 rounded-xs text-[9px] font-bold bg-slate-200 text-slate-700">
                                                                        Terkunci
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Bottom Bar Simpan & Kunci Single Mapel */}
                            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                <div className="text-xs text-slate-600">
                                    {isCurrentStudyLocked ? (
                                        <span className="text-amber-800 font-semibold flex items-center gap-1.5">
                                            <Lock className="w-3.5 h-3.5 text-amber-700" />
                                            Nilai mata pelajaran ini telah dikunci.{' '}
                                            {isOpenGrading
                                                ? 'Klik tombol "Buka Kunci" apabila perlu memperbaiki nilai.'
                                                : 'Buka kembali periode masa input nilai di Pengaturan jika ingin membuka kunci.'}
                                        </span>
                                    ) : isDirty ? (
                                        <span className="text-amber-700 font-bold">
                                            Terdapat perubahan nilai yang belum disimpan.
                                        </span>
                                    ) : (
                                        <span>
                                            Nilai disimpan ke basis data dan otomatis memperbarui buku rapor triwulan.
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {hasCurrentStudyLocked ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleToggleLock({
                                                    action: 'unlock',
                                                    studyId: selectedStudyId,
                                                })
                                            }
                                            disabled={isTogglingLock || !isOpenGrading}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xs shadow-2xs disabled:opacity-50 cursor-pointer"
                                        >
                                            <Unlock className="w-4 h-4" />
                                            {isTogglingLock ? 'Memproses...' : 'Buka Kunci Nilai'}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleSaveSingleStudy(true)}
                                            disabled={isSavingSheet || isTogglingLock || !isOpenGrading || !filteredStudents.length}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xs shadow-2xs disabled:opacity-50 cursor-pointer"
                                        >
                                            <Lock className="w-4 h-4 text-amber-700" />
                                            Simpan &amp; Kunci Nilai
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleSaveSingleStudy(false)}
                                        disabled={isSavingSheet || !isOpenGrading || !filteredStudents.length || isCurrentStudyLocked}
                                        className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-xs shadow-2xs disabled:opacity-50 cursor-pointer"
                                    >
                                        <Save className="w-4 h-4" />
                                        {isSavingSheet ? 'Menyimpan...' : `Simpan Nilai ${currentStudyObj.name}`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mode 2: Matriks Semua Mapel Sekaligus */}
                    {viewMode === 'matrix' && (
                        <div>
                            <div className="p-3 bg-amber-50/60 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                                <span>
                                    Mode Matriks menampilkan semua mata pelajaran santri dalam satu tabel. Nilai yang terkunci tidak dapat diedit sebelum kuncinya dibuka.
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('single')}
                                    className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
                                >
                                    Kembali ke Input per Mata Pelajaran &rarr;
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="bg-emerald-950 text-white uppercase text-[10px] tracking-wider">
                                            <th className="py-2.5 px-3 text-center w-10 sticky left-0 bg-emerald-950 z-10 border-r border-emerald-800">
                                                No.
                                            </th>
                                            <th className="py-2.5 px-3 min-w-[180px] sticky left-10 bg-emerald-950 z-10 border-r border-emerald-800">
                                                Nama Santri &amp; NIS
                                            </th>
                                            {sheetStudies.map((sub) => {
                                                const lockInf = studiesLockSummary[sub.id];
                                                return (
                                                    <th key={sub.id} className="py-2.5 px-2 text-center min-w-[110px] border-r border-emerald-800">
                                                        <div className="font-bold flex items-center justify-center gap-1">
                                                            {lockInf?.is_locked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                                                            <span>{sub.name}</span>
                                                        </div>
                                                        <div className="text-[9px] text-amber-300">
                                                            [{STUDY_TYPE_BADGE[sub.study_type]?.short}] KKM {sub.kkm || 65}
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                            <th className="py-2.5 px-3 text-center min-w-[90px] bg-emerald-900 border-l border-emerald-800">
                                                Rerata Akhir
                                            </th>
                                            <th className="py-2.5 px-3 text-center min-w-[130px] bg-emerald-900 border-l border-emerald-800">
                                                Status Kenaikan
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {filteredStudents.map((st, idx) => {
                                            const studentName = st.student_name || st.name || '-';
                                            const studentNis = st.student_nis || st.nis || '-';
                                            const promoBadge = PROMOTION_BADGE[st.promotion_status] || PROMOTION_BADGE.belum_dinilai;

                                            return (
                                                <tr key={st.student_id} className="hover:bg-slate-50">
                                                    <td className="py-2 px-3 text-center font-semibold text-slate-500 sticky left-0 bg-white border-r border-slate-200">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="py-2 px-3 sticky left-10 bg-white border-r border-slate-200">
                                                        <div className="font-bold text-slate-900">{studentName}</div>
                                                        <div className="text-[10px] font-mono text-slate-500">NIS: {studentNis}</div>
                                                    </td>
                                                    {sheetStudies.map((sub) => {
                                                        const val = scoreMatrix[st.student_id]?.[sub.id] ?? '';
                                                        const numVal = parseFloat(val);
                                                        const kkm = sub.kkm || 65;
                                                        const isBelow = val !== '' && !isNaN(numVal) && numVal < kkm;
                                                        const cellMeta = st.grades?.[sub.id] || st.scores?.[sub.id];
                                                        const isCellLocked = Boolean(cellMeta?.is_locked);

                                                        return (
                                                            <td key={sub.id} className="py-1.5 px-1.5 text-center border-r border-slate-100">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    step="0.1"
                                                                    value={val}
                                                                    disabled={!isOpenGrading || isCellLocked}
                                                                    onChange={(e) =>
                                                                        handleScoreChange(st.student_id, sub.id, e.target.value)
                                                                    }
                                                                    placeholder="-"
                                                                    title={isCellLocked ? 'Nilai Terkunci' : ''}
                                                                    className={`w-16 px-1.5 py-1 text-center text-xs font-bold rounded-xs border focus:outline-none ${
                                                                        isCellLocked
                                                                            ? 'border-slate-300 bg-slate-100 text-slate-600 cursor-not-allowed'
                                                                            : isBelow
                                                                              ? 'border-rose-400 bg-rose-50 text-rose-800'
                                                                              : val !== ''
                                                                                ? 'border-emerald-300 bg-white text-slate-900'
                                                                                : 'border-slate-200 bg-slate-50 text-slate-400'
                                                                    }`}
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="py-2 px-3 text-center font-bold text-emerald-950 border-l border-slate-200">
                                                        {st.average !== null ? Number(st.average).toFixed(1) : '-'}
                                                    </td>
                                                    <td className="py-2 px-3 text-center border-l border-slate-200">
                                                        <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold border ${promoBadge.cls}`}>
                                                            {promoBadge.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleSaveAllStudies(true)}
                                    disabled={isSavingSheet || !isOpenGrading || !filteredStudents.length}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xs shadow-2xs disabled:opacity-50 cursor-pointer"
                                >
                                    <Lock className="w-4 h-4 text-amber-700" />
                                    Simpan &amp; Kunci Semua
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSaveAllStudies(false)}
                                    disabled={isSavingSheet || !isOpenGrading || !filteredStudents.length}
                                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-xs shadow-2xs disabled:opacity-50 cursor-pointer"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSavingSheet ? 'Menyimpan...' : 'Simpan Semua Nilai Matriks'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════════
                TAB 2: REMIDI KHUSUS & EVALUASI KENAIKAN KELAS
               ════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'remedial' && (
                <div className="bg-white border border-slate-200 rounded-xs shadow-2xs overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">
                                Evaluasi Progres Nilai &amp; Remidi Mata Pelajaran Khusus
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Santri yang nilai Mapel Khususnya di bawah KKM wajib mengikuti remidi. Nilai asli awal sebelum remidi tetap tercatat dalam riwayat laporan penilaian.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                                    Kelas / Rombel:
                                </label>
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(e.target.value)}
                                    className="px-3 py-1.5 text-xs font-bold border border-emerald-600 rounded-xs bg-white text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                >
                                    {allGroups.map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {g.name} ({g.program?.name || 'Program'} • {g.education?.name || 'Jenjang'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    openPrintModal({
                                        docType: 'history',
                                        historyFormat: 'gradebook',
                                        studentId: '',
                                    })
                                }
                                disabled={!sheetStudents.length}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-xs shadow-2xs cursor-pointer disabled:opacity-50"
                                title="Cetak & Preview Riwayat Nilai (PDF)"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Cetak
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead>
                                <tr className="bg-emerald-950 text-white uppercase text-[10px] tracking-wider">
                                    <th className="py-2.5 px-3 text-center w-10">No.</th>
                                    <th className="py-2.5 px-3">Santri &amp; NIS</th>
                                    <th className="py-2.5 px-3 text-center">Progres Rerata</th>
                                    <th className="py-2.5 px-3 text-center">Rerata Khusus</th>
                                    <th className="py-2.5 px-3 text-center">Penunjang Mulok</th>
                                    <th className="py-2.5 px-3 text-center">Rerata Akhir</th>
                                    <th className="py-2.5 px-3 text-center">Status Kenaikan</th>
                                    <th className="py-2.5 px-3 text-center w-52">Aksi Remidi &amp; Riwayat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {sheetStudents.map((st, idx) => {
                                    const studentName = st.student_name || st.name || '-';
                                    const studentNis = st.student_nis || st.nis || '-';
                                    const promoBadge = PROMOTION_BADGE[st.promotion_status] || PROMOTION_BADGE.belum_dinilai;

                                    return (
                                        <tr key={st.student_id} className="hover:bg-slate-50">
                                            <td className="py-2.5 px-3 text-center font-semibold text-slate-500">
                                                {idx + 1}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <div className="font-bold text-slate-900">{studentName}</div>
                                                <div className="text-[10px] font-mono text-slate-500">NIS: {studentNis}</div>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                {st.previous_average !== null && st.average !== null ? (
                                                    <div>
                                                        <span className="text-slate-600">
                                                            {Number(st.previous_average).toFixed(1)} &rarr;{' '}
                                                            <strong className="text-slate-900">{Number(st.average).toFixed(1)}</strong>
                                                        </span>
                                                        <div
                                                            className={`text-[10px] font-bold ${
                                                                (st.progress_delta ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
                                                            }`}
                                                        >
                                                            {(st.progress_delta ?? 0) >= 0 ? `+${st.progress_delta}` : st.progress_delta}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-bold text-rose-800">
                                                {st.khusus_average !== null ? Number(st.khusus_average).toFixed(1) : '-'}
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-semibold text-amber-800">
                                                {st.mulok_average !== null ? Number(st.mulok_average).toFixed(1) : '-'}
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-bold text-emerald-950">
                                                {st.average !== null ? Number(st.average).toFixed(1) : '-'}
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold border ${promoBadge.cls}`}>
                                                    {promoBadge.label}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => openRemedialModal(st)}
                                                        className={`px-2.5 py-1 text-xs font-bold rounded-xs border transition cursor-pointer ${
                                                            st.promotion_status === 'remidi_khusus'
                                                                ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                                                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {st.promotion_status === 'remidi_khusus' ? 'Input Remidi' : 'Lihat Remidi'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openPrintModal({
                                                                docType: 'history',
                                                                historyFormat: 'student_sheet',
                                                                studentId: st.student_id,
                                                            })
                                                        }
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-xs border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                                                        title="Preview & Cetak Riwayat Nilai Siswa Ini"
                                                    >
                                                        <Printer className="w-3 h-3 text-emerald-800" />
                                                        Riwayat
                                                    </button>
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

            {/* ════════════════════════════════════════════════════════════════════════
                TAB 3: BUKU RAPOR DIGITAL
               ════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'reports' && (
                <div className="bg-white border border-slate-200 rounded-xs shadow-2xs overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">
                                Buku Rapor Digital Siswa ({activeQuarter?.name || 'Triwulan Aktif'})
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Rekapitulasi rapor akhir triwulan (mencantumkan nilai akhir murni), peringkat kelas, serta preview &amp; cetak lembar PDF.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                                    Kelas / Rombel:
                                </label>
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(e.target.value)}
                                    className="px-3 py-1.5 text-xs font-bold border border-emerald-600 rounded-xs bg-white text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                >
                                    {allGroups.map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {g.name} ({g.program?.name || 'Program'} • {g.education?.name || 'Jenjang'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={handleSyncReports}
                                disabled={isGeneratingReports}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-xs cursor-pointer disabled:opacity-50"
                            >
                                <Calculator className="w-3.5 h-3.5" />
                                {isGeneratingReports ? 'Menghitung...' : 'Sinkronkan Rapor'}
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    openPrintModal({
                                        docType: 'rapor',
                                        studentId: '',
                                    })
                                }
                                disabled={!reports.length && !sheetStudents.length}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-400 text-emerald-950 rounded-xs hover:bg-amber-300 cursor-pointer disabled:opacity-50"
                                title="Cetak & Preview Rapor (PDF)"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Cetak
                            </button>
                        </div>
                    </div>

                    {isLoadingReports ? (
                        <div className="p-12 text-center text-xs text-slate-500">
                            Memuat daftar buku rapor...
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="p-12 text-center space-y-3">
                            <p className="text-xs text-slate-500">
                                Belum ada buku rapor pada triwulan ini. Klik tombol di bawah untuk membuat rapor dari nilai yang telah diinput.
                            </p>
                            <button
                                type="button"
                                onClick={handleSyncReports}
                                className="px-4 py-2 text-xs font-bold bg-[#0b57d0] hover:bg-[#0842a0] text-white rounded-xs cursor-pointer"
                            >
                                Hitung &amp; Buat Buku Rapor Sekarang
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-emerald-950 text-white uppercase text-[10px] tracking-wider">
                                        <th className="py-2.5 px-3 text-center w-10">No.</th>
                                        <th className="py-2.5 px-3">Nama Santri &amp; NIS</th>
                                        <th className="py-2.5 px-3 text-center">Progres Nilai</th>
                                        <th className="py-2.5 px-3 text-center">Rata-Rata</th>
                                        <th className="py-2.5 px-3 text-center">Peringkat</th>
                                        <th className="py-2.5 px-3 text-center">Status Kenaikan</th>
                                        <th className="py-2.5 px-3 text-center">Absensi (H/I/S/A)</th>
                                        <th className="py-2.5 px-3">Catatan Wali Kelas</th>
                                        <th className="py-2.5 px-3 text-center w-24">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {reports.map((rep, idx) => {
                                        const promoBadge = PROMOTION_BADGE[rep.promotion_status] || PROMOTION_BADGE.layak_naik;
                                        const att = rep.attendance_summary || {};
                                        return (
                                            <tr key={rep.id} className="hover:bg-slate-50">
                                                <td className="py-2.5 px-3 text-center font-semibold text-slate-500">
                                                    {idx + 1}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="font-bold text-slate-900">{rep.student?.name}</div>
                                                    <div className="text-[10px] font-mono text-slate-500">NIS: {rep.student?.nis}</div>
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    {rep.previous_average !== null && rep.average_score !== null ? (
                                                        <span>
                                                            {Number(rep.previous_average).toFixed(1)} &rarr;{' '}
                                                            <strong>{Number(rep.average_score).toFixed(1)}</strong>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">Triwulan Awal</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3 text-center font-bold text-emerald-950">
                                                    {rep.average_score !== null ? Number(rep.average_score).toFixed(1) : '-'}
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-xs bg-amber-100 text-amber-900 font-bold text-[11px]">
                                                        #{rep.rank || idx + 1}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold border ${promoBadge.cls}`}>
                                                        {promoBadge.label}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-center font-mono text-[10px]">
                                                    {att.hadir ?? 0}H / {att.izin ?? 0}I / {att.sakit ?? 0}S / {att.alpa ?? 0}A
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                                                    {rep.homeroom_notes || '-'}
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <ActionDropdown
                                                        items={[
                                                            {
                                                                label: 'Lihat Rincian Rapor',
                                                                icon: Eye,
                                                                onClick: () => {
                                                                    setDetailReport(rep);
                                                                    setDetailModalOpen(true);
                                                                },
                                                            },
                                                            {
                                                                label: 'Catatan Wali Kelas',
                                                                icon: MessageSquare,
                                                                onClick: () => {
                                                                    setDetailReport(rep);
                                                                    setHomeroomNote(rep.homeroom_notes || '');
                                                                    setNoteModalOpen(true);
                                                                },
                                                            },
                                                            {
                                                                label: 'Preview & Cetak Rapor PDF',
                                                                icon: Printer,
                                                                onClick: () => {
                                                                    openPrintModal({
                                                                        docType: 'rapor',
                                                                        historyFormat: 'student_sheet',
                                                                        studentId: rep.student_id || rep.student?.id || null,
                                                                    });
                                                                },
                                                            },
                                                            {
                                                                label: 'Preview & Cetak Riwayat Nilai',
                                                                icon: FileText,
                                                                onClick: () => {
                                                                    openPrintModal({
                                                                        docType: 'history',
                                                                        historyFormat: 'student_sheet',
                                                                        studentId: rep.student_id || rep.student?.id || null,
                                                                    });
                                                                },
                                                            },
                                                        ]}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════════
                TAB 4: KELAYAKAN UJIAN (BANK SANTRI)
               ════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'eligibility' && (
                <div className="bg-white border border-slate-200 rounded-xs shadow-2xs overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">
                                Verifikasi Kelayakan Ujian Triwulan (Integrasi Bank Santri)
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Status pelunasan tagihan administrasi santri secara real-time dari layanan keuangan Bank Santri.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => refetchEligibility()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-xs bg-white hover:bg-slate-50 cursor-pointer"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Segarkan Status
                        </button>
                    </div>

                    {isLoadingEligibility ? (
                        <div className="p-12 text-center text-xs text-slate-500">
                            Memeriksa status administrasi ke Bank Santri...
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-emerald-950 text-white uppercase text-[10px] tracking-wider">
                                        <th className="py-2.5 px-3 text-center w-10">No.</th>
                                        <th className="py-2.5 px-3">Nama Santri</th>
                                        <th className="py-2.5 px-3">NIS</th>
                                        <th className="py-2.5 px-3 text-center">Status Kelayakan</th>
                                        <th className="py-2.5 px-3 text-right">Tunggakan</th>
                                        <th className="py-2.5 px-3">Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {eligibilityList.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="py-2 px-3 text-center font-semibold text-slate-500">
                                                {idx + 1}
                                            </td>
                                            <td className="py-2 px-3 font-bold text-slate-900">{item.name}</td>
                                            <td className="py-2 px-3 font-mono text-slate-600">{item.nis}</td>
                                            <td className="py-2 px-3 text-center">
                                                {item.eligible ? (
                                                    <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        Layak Ujian
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        Ada Tunggakan
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                                                Rp {Number(item.unpaid_amount || 0).toLocaleString('id-ID')}
                                            </td>
                                            <td className="py-2 px-3 text-slate-600">{item.reason || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════ MODAL INPUT NILAI REMIDI KHUSUS ═══════════════════ */}
            <Modal
                open={remedialModalOpen}
                isOpen={remedialModalOpen}
                onClose={() => setRemedialModalOpen(false)}
                title={`Input Remidi Mapel Khusus — ${remedialStudent?.student_name || remedialStudent?.name || ''}`}
            >
                {remedialStudent && (
                    <form onSubmit={handleSaveRemedial} className="space-y-4">
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xs text-xs text-rose-950">
                            <strong>Ketentuan Remidi:</strong> Hanya berlaku untuk Mata Pelajaran Khusus bagi santri yang belum mencapai KKM atau perlu perbaikan nilai akhir triwulan.
                        </div>

                        <div className="space-y-3">
                            {targetRemedialStudies.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-500">
                                    Tidak ada mata pelajaran khusus untuk rombel ini.
                                </div>
                            ) : (
                                targetRemedialStudies.map((sub) => {
                                    const sc = remedialStudent?.grades?.[sub.id] || remedialStudent?.scores?.[sub.id];
                                    const form = remedialInputs[sub.id] || { original_score: null, kkm: sub.kkm || 65, remedial_score: '', notes: '' };

                                    const rawOrig = sc?.original_score !== null && sc?.original_score !== undefined
                                        ? Number(sc.original_score)
                                        : (sc?.score !== null && sc?.score !== undefined ? Number(sc.score) : null);

                                    const isGraded = rawOrig !== null;
                                    const kkm = Number(sub.kkm || 65);
                                    const isBelowKkm = isGraded && rawOrig < kkm;
                                    const isPass = isGraded && !isBelowKkm;
                                    const currentRemScore = sc?.remedial_score !== null && sc?.remedial_score !== undefined ? Number(sc.remedial_score) : null;
                                    const currentFinalScore = sc?.score !== null && sc?.score !== undefined ? Number(sc.score) : null;

                                    return (
                                        <div key={sub.id} className="p-3 border border-slate-200 rounded-xs bg-slate-50/60 space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="font-bold text-slate-900">{sub.name}</span>
                                                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-xs font-semibold bg-slate-200 text-slate-700">
                                                        KKM: {kkm}
                                                    </span>
                                                    {!isGraded ? (
                                                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                                            Belum Input Nilai
                                                        </span>
                                                    ) : isBelowKkm ? (
                                                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-xs font-bold bg-rose-100 text-rose-700 border border-rose-300">
                                                            Wajib Remidi
                                                        </span>
                                                    ) : (
                                                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                            Tuntas KKM
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-slate-500">
                                                    Nilai Awal (Asli):{' '}
                                                    <strong className={!isGraded ? 'text-amber-700 font-bold' : isBelowKkm ? 'text-rose-700 font-bold' : 'text-emerald-800 font-bold'}>
                                                        {isGraded ? rawOrig.toFixed(1) : 'Belum Ada (-)'}
                                                    </strong>
                                                </span>
                                            </div>

                                            {!isGraded ? (
                                                <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                                    <span className="text-amber-900">
                                                        Mata pelajaran ini belum memiliki nilai triwulan. Harap input nilai terlebih dahulu di menu <strong>Input Nilai Akhir Triwulan</strong>.
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setRemedialModalOpen(false);
                                                            setSelectedStudyId(String(sub.id));
                                                            setActiveTab('quarterly_input');
                                                        }}
                                                        className="px-2.5 py-1 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xs shrink-0 cursor-pointer"
                                                    >
                                                        Ke Input Nilai &rarr;
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    {currentRemScore !== null && (
                                                        <div className="text-[11px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xs flex flex-wrap items-center justify-between gap-1">
                                                            <span>Riwayat Remidi Tersimpan:</span>
                                                            <span className="font-semibold text-slate-800">
                                                                Nilai Asli Awal: {rawOrig.toFixed(1)} &rarr; Nilai Remidi: {currentRemScore.toFixed(1)} (Nilai Akhir Rapor: <strong>{currentFinalScore?.toFixed(1)}</strong>)
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                                                Nilai Remidi (0-100)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                step="0.1"
                                                                placeholder={String(kkm)}
                                                                value={form.remedial_score}
                                                                onChange={(e) =>
                                                                    setRemedialInputs((p) => ({
                                                                        ...p,
                                                                        [sub.id]: {
                                                                            ...(p[sub.id] || form),
                                                                            remedial_score: e.target.value,
                                                                        },
                                                                    }))
                                                                }
                                                                className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-xs bg-white focus:outline-none focus:border-emerald-600"
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                                                Catatan Remidi
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={form.notes}
                                                                onChange={(e) =>
                                                                    setRemedialInputs((p) => ({
                                                                        ...p,
                                                                        [sub.id]: {
                                                                            ...(p[sub.id] || form),
                                                                            notes: e.target.value,
                                                                        },
                                                                    }))
                                                                }
                                                                placeholder="Catatan hasil ujian remidi..."
                                                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xs bg-white focus:outline-none focus:border-emerald-600"
                                                            />
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setRemedialModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-xs hover:bg-slate-50 cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isSavingRemedial}
                                className="px-4 py-2 text-xs font-bold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-xs cursor-pointer disabled:opacity-50"
                            >
                                {isSavingRemedial ? 'Menyimpan...' : 'Simpan Nilai Remidi'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* ═══════════════════ MODAL RINCIAN RAPOR ═══════════════════ */}
            <Modal
                open={detailModalOpen}
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                title={`Rincian Buku Rapor — ${detailReport?.student?.name || ''}`}
            >
                {detailReport && (
                    <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xs">
                            <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase">NIS</div>
                                <div className="font-bold text-slate-900">{detailReport.student?.nis}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase">Rerata Akhir</div>
                                <div className="font-bold text-emerald-900">
                                    {detailReport.average_score !== null ? Number(detailReport.average_score).toFixed(1) : '-'}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase">Peringkat</div>
                                <div className="font-bold text-amber-900">#{detailReport.rank || '-'}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase">Status Kenaikan</div>
                                <div className="font-bold text-slate-900">
                                    {PROMOTION_BADGE[detailReport.promotion_status]?.label || 'Layak Naik Kelas'}
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-xs overflow-hidden">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                                        <th className="p-2 text-center w-8">No.</th>
                                        <th className="p-2">Mata Pelajaran</th>
                                        <th className="p-2 text-center">KKM</th>
                                        <th className="p-2 text-center">Nilai Akhir</th>
                                        <th className="p-2 text-center">Predikat</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {(detailReport.grades_summary || []).map((g, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                                            <td className="p-2 font-semibold text-slate-900">{g.study_name}</td>
                                            <td className="p-2 text-center">{g.kkm || 65}</td>
                                            <td className="p-2 text-center font-bold text-slate-900">
                                                {g.score !== null ? Number(g.score).toFixed(1) : '-'}
                                            </td>
                                            <td className="p-2 text-center font-bold">{g.predicate || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    generateStudentReportCardPdf({
                                        report: detailReport,
                                        classGroup: selectedGroupObj,
                                        academicYear: activeYear,
                                        quarter: activeQuarter,
                                        preview: true,
                                    });
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xs cursor-pointer"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Preview PDF
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    generateStudentReportCardPdf({
                                        report: detailReport,
                                        classGroup: selectedGroupObj,
                                        academicYear: activeYear,
                                        quarter: activeQuarter,
                                    });
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-xs cursor-pointer"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Unduh Rapor PDF
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ═══════════════════ MODAL CATATAN WALI KELAS ═══════════════════ */}
            <Modal
                open={noteModalOpen}
                isOpen={noteModalOpen}
                onClose={() => setNoteModalOpen(false)}
                title={`Catatan Wali Kelas — ${detailReport?.student?.name || ''}`}
            >
                <form onSubmit={handleSaveNote} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Evaluasi &amp; Catatan Perkembangan Santri
                        </label>
                        <textarea
                            rows={4}
                            value={homeroomNote}
                            onChange={(e) => setHomeroomNote(e.target.value)}
                            placeholder="Tuliskan catatan evaluasi belajar, muthala'ah, dan akhlaq santri..."
                            className="w-full p-2.5 text-xs border border-slate-300 rounded-xs focus:outline-none focus:border-emerald-700"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setNoteModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-xs"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSavingNotes}
                            className="px-4 py-2 text-xs font-bold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-xs cursor-pointer"
                        >
                            {isSavingNotes ? 'Menyimpan...' : 'Simpan Catatan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ═══════════════════ MODAL CETAK & PREVIEW PDF (RAPOR & RIWAYAT NILAI) ═══════════════════ */}
            <PrintReportAndHistoryModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                initialDocType={printModalConfig.docType}
                initialHistoryFormat={printModalConfig.historyFormat}
                initialStudentId={printModalConfig.studentId}
                currentGroup={selectedGroupObj}
                sheetData={sheetData}
                reports={reports}
                academicYear={activeYear?.year}
                quarterName={activeQuarter?.name}
            />

            {/* ═══════════════════ MODAL IMPORT PENILAIAN KOLEKTIF EXCEL ═══════════════════ */}
            <CollectiveExcelImportModal
                open={importExcelModalOpen}
                onClose={() => setImportExcelModalOpen(false)}
                currentGroup={selectedGroupObj}
                academicYearId={activeYear?.id}
                academicQuarterId={activeQuarter?.id}
                academicYearName={activeYear?.year}
                quarterName={activeQuarter?.name}
                sheetStudies={sheetStudies}
                isOpenGrading={isOpenGrading}
                onSuccess={() => {
                    refetchSheet();
                    refetchReports();
                }}
            />
        </div>
    );
}
