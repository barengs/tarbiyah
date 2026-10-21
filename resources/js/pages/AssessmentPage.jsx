import React, { useState, useEffect } from 'react';
import {
    useGetAssessmentsQuery,
    useGetAssessmentCategoriesQuery,
    useCreateAssessmentMutation,
    useDeleteAssessmentMutation,
    useSaveScoresMutation,
    useGetGradebookQuery,
} from '../store/slices/assessmentApi';
import { useGetClassGroupsQuery } from '../store/slices/classGroupApi';
import { useGetStudiesQuery } from '../store/slices/studyApi';
import { useGetTeachersQuery } from '../store/slices/teacherApi';
import Modal from '../components/ui/Modal';
import FlatTabs from '../components/atoms/FlatTabs';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Plus, Trash2, Save, BookOpen, BarChart3, GraduationCap } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AssessmentPage() {
    const [activeTab, setActiveTab] = useState('assessments'); // 'assessments' | 'gradebook'
    const [selectedGroupId, setSelectedGroupId] = useState('');

    const { data: groupsData } = useGetClassGroupsQuery();
    const groups = groupsData?.data || [];
    const currentGroup = groups.find(g => g.id === Number(selectedGroupId)) || groups[0];
    const effectiveGroupId = selectedGroupId || currentGroup?.id;

    // Assessments data
    const { data: assessmentsData, isLoading: isLoadingAssessments } = useGetAssessmentsQuery(
        effectiveGroupId ? { class_group_id: effectiveGroupId } : undefined,
        { skip: !effectiveGroupId }
    );
    const assessments = assessmentsData?.data || [];

    const { data: categoriesData } = useGetAssessmentCategoriesQuery();
    const categories = categoriesData?.data || [];

    const { data: studiesData } = useGetStudiesQuery();
    const studies = studiesData?.data || [];

    const { data: teachersData } = useGetTeachersQuery();
    const teachers = teachersData?.data || [];

    // Gradebook data
    const { data: gradebookData, isLoading: isLoadingGradebook } = useGetGradebookQuery(
        effectiveGroupId ? { class_group_id: effectiveGroupId } : undefined,
        { skip: !effectiveGroupId || activeTab !== 'gradebook' }
    );
    const gradebook = gradebookData?.data;

    const [createAssessment, { isLoading: isCreating }] = useCreateAssessmentMutation();
    const [deleteAssessment, { isLoading: isDeleting }] = useDeleteAssessmentMutation();
    const [saveScores, { isLoading: isSaving }] = useSaveScoresMutation();

    // Modal states
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [scoreModalAssessment, setScoreModalAssessment] = useState(null);
    const [scoresMap, setScoresMap] = useState({});

    // Fetch single assessment detail when opening score modal
    const [detailedAssessment, setDetailedAssessment] = useState(null);
    useEffect(() => {
        if (scoreModalAssessment) {
            fetch(`/api/main/assessments/${scoreModalAssessment.id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json',
                },
            })
                .then(res => res.json())
                .then(res => {
                    const detail = res.data;
                    setDetailedAssessment(detail);
                    const initial = {};
                    detail?.scores?.forEach(s => {
                        initial[s.student_id] = { score: s.score ?? 0, feedback: s.feedback || '' };
                    });
                    setScoresMap(initial);
                })
                .catch(() => toast.error('Gagal memuat detail nilai'));
        } else {
            setDetailedAssessment(null);
        }
    }, [scoreModalAssessment]);

    // Form fields
    const [fCategoryId, setFCategoryId] = useState('');
    const [fStudyId, setFStudyId] = useState('');
    const [fTeacherId, setFTeacherId] = useState('');
    const [fTitle, setFTitle] = useState('');
    const [fDate, setFDate] = useState(new Date().toISOString().substring(0, 10));
    const [fMaxScore, setFMaxScore] = useState(100);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await createAssessment({
                academic_year_id: 1,
                class_group_id: effectiveGroupId,
                study_id: fStudyId,
                teacher_id: fTeacherId,
                category_id: fCategoryId,
                title: fTitle,
                date: fDate,
                max_score: Number(fMaxScore),
            }).unwrap();
            toast.success('Asesmen berhasil dibuat dan lembar nilai disiapkan');
            setCreateModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal membuat asesmen');
        }
    };

    const handleSaveScores = async () => {
        const payload = Object.keys(scoresMap).map(sId => ({
            student_id: Number(sId),
            score: Number(scoresMap[sId]?.score ?? 0),
            feedback: scoresMap[sId]?.feedback || null,
        }));

        try {
            await saveScores({
                assessmentId: scoreModalAssessment.id,
                scores: payload,
            }).unwrap();
            toast.success('Nilai siswa berhasil disimpan');
            setScoreModalAssessment(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan nilai');
        }
    };

    const getPredicate = (score, kkm) => {
        if (score >= kkm) return <span className="text-emerald-700 font-bold">Tuntas</span>;
        return <span className="text-rose-700 font-bold">Remedial</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Penilaian & Leger Nilai</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Input nilai ujian/tugas per mapel dan pantau rekap nilai akhir santri di kelas.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={effectiveGroupId || ''}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="px-3.5 py-2 text-sm font-semibold border border-slate-300 rounded-md bg-white shadow-xs focus:ring-2 focus:ring-emerald-500"
                    >
                        {groups.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Navigation Flat Tabs */}
            <FlatTabs
                tabs={[
                    { id: 'assessments', name: 'Daftar Asesmen / Ujian', icon: BookOpen },
                    { id: 'gradebook', name: 'Leger Nilai Kelas', icon: BarChart3 },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            {/* TAB 1: ASESMEN LIST */}
            {activeTab === 'assessments' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Penilaian Terdaftar: {currentGroup?.name}
                        </span>
                        <button
                            onClick={() => {
                                setFCategoryId(categories[0]?.id || '');
                                setFStudyId(studies[0]?.id || '');
                                setFTeacherId(teachers[0]?.id || '');
                                setFTitle('');
                                setCreateModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 shadow-xs"
                        >
                            <Plus className="w-4 h-4" /> + Buat Asesmen
                        </button>
                    </div>

                    <div className="overflow-x-auto bg-white border border-slate-200 rounded-md shadow-xs">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Ujian / Tugas</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mapel & Kategori</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nilai Masuk</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {assessments.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center text-xs text-slate-400">Belum ada asesmen terdaftar untuk rombel ini</td>
                                    </tr>
                                ) : (
                                    assessments.map((a) => (
                                        <tr key={a.id} className="hover:bg-slate-50 transition">
                                            <td className="px-5 py-3.5 text-sm text-slate-900 font-semibold">{a.title}</td>
                                            <td className="px-5 py-3.5 text-xs">
                                                <span className="font-medium text-slate-700">{a.study?.name}</span><br/>
                                                <span className="text-slate-400">{a.category?.name}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">
                                                {a.date ? new Date(a.date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                                            </td>
                                            <td className="px-5 py-3.5 text-xs">
                                                <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold">
                                                    {a.scores_count || 0} Siswa
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setScoreModalAssessment(a)}
                                                        className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800"
                                                    >
                                                        Input Nilai
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(a)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: LEGER NILAI KELAS */}
            {activeTab === 'gradebook' && (
                <div className="space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600">
                        <span className="font-bold text-slate-800">Leger Nilai Akhir</span> — Rekapitulasi rata-rata nilai seluruh mata pelajaran dan peringkat kelas <strong>{currentGroup?.name}</strong>.
                    </div>

                    <div className="overflow-x-auto bg-white border border-slate-200 rounded-md shadow-xs">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Peringkat</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Siswa</th>
                                    {gradebook?.studies?.map((s) => (
                                        <th key={s.id} className="px-3 py-3 text-center text-xs font-semibold text-slate-500">
                                            {s.name}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Rata-rata</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {gradebook?.students?.length ? (
                                    gradebook.students.map((st) => (
                                        <tr key={st.student_id} className="hover:bg-slate-50 transition">
                                            <td className="px-4 py-3.5">
                                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold ${
                                                    st.rank === 1 ? 'bg-amber-100 text-amber-800' :
                                                    st.rank <= 3 ? 'bg-emerald-100 text-emerald-800' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {st.rank}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-sm font-semibold text-slate-900">{st.name}</td>
                                            {gradebook.studies.map((s) => {
                                                const g = st.grades?.[s.id];
                                                return (
                                                    <td key={s.id} className="px-3 py-3.5 text-center text-sm">
                                                        {g?.score !== null && g?.score !== undefined ? (
                                                            <span className={g.score >= g.kkm ? 'text-slate-800' : 'text-rose-600 font-bold'}>
                                                                {g.score}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-3.5 text-center">
                                                <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {st.average}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="p-10 text-center text-xs text-slate-400">
                                            {isLoadingGradebook ? 'Memuat leger...' : 'Belum ada data leger'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Create Assessment */}
            <Modal
                open={createModalOpen}
                title="Buat Asesmen / Ujian Baru"
                onClose={() => setCreateModalOpen(false)}
            >
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Nama Ujian / Tugas *</label>
                        <input
                            type="text"
                            required
                            placeholder="Contoh: Ulangan Harian Bab 4"
                            value={fTitle}
                            onChange={(e) => setFTitle(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Kategori Nilai *</label>
                            <select
                                required
                                value={fCategoryId}
                                onChange={(e) => setFCategoryId(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                            >
                                <option value="">-- Pilih Kategori --</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Tanggal *</label>
                            <input
                                type="date"
                                required
                                value={fDate}
                                onChange={(e) => setFDate(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Mata Pelajaran *</label>
                        <select
                            required
                            value={fStudyId}
                            onChange={(e) => setFStudyId(e.target.value)}
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
                            value={fTeacherId}
                            onChange={(e) => setFTeacherId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        >
                            <option value="">-- Pilih Guru --</option>
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setCreateModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
                        >
                            Buat Asesmen
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Input Nilai */}
            <Modal
                open={!!scoreModalAssessment}
                title={`Input Nilai: ${scoreModalAssessment?.title || ''}`}
                onClose={() => setScoreModalAssessment(null)}
            >
                <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                        Mapel: <strong className="text-slate-800">{detailedAssessment?.study?.name}</strong> • Maksimal Nilai: <strong>{detailedAssessment?.max_score || 100}</strong>
                    </p>

                    <div className="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-96 overflow-y-auto">
                        {detailedAssessment?.scores?.length ? (
                            detailedAssessment.scores.map((s) => (
                                <div key={s.id} className="p-3 flex items-center justify-between text-xs gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-900 truncate">{s.student?.name}</p>
                                        <p className="text-slate-400 font-mono text-[11px]">NIS: {s.student?.nis}</p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            value={scoresMap[s.student_id]?.score ?? 0}
                                            onChange={(e) => setScoresMap(prev => ({
                                                ...prev,
                                                [s.student_id]: {
                                                    ...(prev[s.student_id] || {}),
                                                    score: e.target.value,
                                                }
                                            }))}
                                            className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-md text-xs text-center font-bold focus:ring-2 focus:ring-emerald-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Catatan"
                                            value={scoresMap[s.student_id]?.feedback || ''}
                                            onChange={(e) => setScoresMap(prev => ({
                                                ...prev,
                                                [s.student_id]: {
                                                    ...(prev[s.student_id] || {}),
                                                    feedback: e.target.value,
                                                }
                                            }))}
                                            className="w-40 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs"
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-xs text-slate-400">Memuat lembar nilai...</div>
                        )}
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setScoreModalAssessment(null)}
                            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                        >
                            Tutup
                        </button>
                        <button
                            onClick={handleSaveScores}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Menyimpan...' : 'Simpan Nilai'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Asesmen"
                message={`Yakin ingin menghapus asesmen "${deleteTarget?.title}"? Seluruh lembar nilai terkait juga akan terhapus.`}
                onConfirm={async () => {
                    try {
                        await deleteAssessment(deleteTarget.id).unwrap();
                        toast.success('Asesmen berhasil dihapus');
                        setDeleteTarget(null);
                    } catch (err) {
                        toast.error('Gagal menghapus asesmen');
                    }
                }}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
