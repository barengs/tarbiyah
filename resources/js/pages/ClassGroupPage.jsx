import React, { useState } from 'react';
import { 
    useGetClassGroupsQuery, 
    useGetClassGroupQuery,
    useCreateClassGroupMutation, 
    useUpdateClassGroupMutation, 
    useDeleteClassGroupMutation,
    useAddStudentToGroupMutation,
    useRemoveStudentFromGroupMutation,
    useAssignSubjectToGroupMutation
} from '../store/slices/classGroupApi';
import { useGetInstitutionsQuery } from '../store/slices/institutionApi';
import { useGetTeachersQuery } from '../store/slices/teacherApi';
import { useGetStudentsQuery } from '../store/slices/studentApi';
import { useGetStudiesQuery } from '../store/slices/studyApi';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Plus, Edit2, Trash2, Users, UserPlus, BookOpen, Layers } from 'lucide-react';
import { toast } from 'react-toastify';

export default function ClassGroupPage() {
    const [instFilter, setInstFilter] = useState('');
    const { data: instData } = useGetInstitutionsQuery();
    const institutions = instData?.data || [];

    const { data: groupsData, isLoading } = useGetClassGroupsQuery({
        progression_type: 'semester',
        ...(instFilter && { educational_institution_id: instFilter }),
    });
    const groups = groupsData?.data || [];

    const { data: teachersData } = useGetTeachersQuery();
    const teachers = teachersData?.data || [];

    const [createGroup, { isLoading: isCreating }] = useCreateClassGroupMutation();
    const [updateGroup, { isLoading: isUpdating }] = useUpdateClassGroupMutation();
    const [deleteGroup, { isLoading: isDeleting }] = useDeleteClassGroupMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Form fields
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [institutionId, setInstitutionId] = useState('');
    const [homeroomTeacherId, setHomeroomTeacherId] = useState('');
    const [gender, setGender] = useState('campur');
    const [capacity, setCapacity] = useState(32);

    // Student Member Modal State
    const [selectedGroupForStudents, setSelectedGroupForStudents] = useState(null);
    const { data: groupDetailData } = useGetClassGroupQuery(selectedGroupForStudents?.id, {
        skip: !selectedGroupForStudents,
    });
    const groupDetail = groupDetailData?.data;
    const [addStudentToGroup] = useAddStudentToGroupMutation();
    const [removeStudentFromGroup] = useRemoveStudentFromGroupMutation();
    const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');

    const { data: allStudentsData } = useGetStudentsQuery();
    const allStudents = allStudentsData?.data || [];

    // Assign Subject Modal State
    const [selectedGroupForSubjects, setSelectedGroupForSubjects] = useState(null);
    const { data: studiesData } = useGetStudiesQuery();
    const allStudies = studiesData?.data || [];
    const [assignSubjectToGroup] = useAssignSubjectToGroupMutation();
    const [selectedStudyId, setSelectedStudyId] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState('');

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setCode('');
        setInstitutionId(institutions[0]?.id || '');
        setHomeroomTeacherId('');
        setGender('campur');
        setCapacity(32);
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name || '');
        setCode(item.code || '');
        setInstitutionId(item.educational_institution_id || '');
        setHomeroomTeacherId(item.homeroom_teacher_id || '');
        setGender(item.gender || 'campur');
        setCapacity(item.capacity || 32);
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name,
            code: code || null,
            academic_year_id: 1, // Default aktif tahun ajaran
            educational_institution_id: institutionId,
            homeroom_teacher_id: homeroomTeacherId || null,
            gender,
            progression_type: 'semester',
            capacity: Number(capacity),
        };

        try {
            if (editingItem) {
                await updateGroup({ id: editingItem.id, ...payload }).unwrap();
                toast.success('Rombel berhasil diperbarui');
            } else {
                await createGroup(payload).unwrap();
                toast.success('Rombel berhasil dibuat');
            }
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan rombel');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteGroup(deleteTarget.id).unwrap();
            toast.success('Rombel berhasil dihapus');
            setDeleteTarget(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus rombel');
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        if (!selectedStudentToAdd) return;
        try {
            await addStudentToGroup({
                groupId: selectedGroupForStudents.id,
                student_id: selectedStudentToAdd,
            }).unwrap();
            toast.success('Siswa berhasil dimasukkan ke rombel');
            setSelectedStudentToAdd('');
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menambahkan siswa');
        }
    };

    const handleAssignSubject = async (e) => {
        e.preventDefault();
        if (!selectedStudyId) return;
        try {
            await assignSubjectToGroup({
                groupId: selectedGroupForSubjects.id,
                study_id: selectedStudyId,
                teacher_id: selectedTeacherId || null,
            }).unwrap();
            toast.success('Mata pelajaran berhasil ditugaskan');
            setSelectedStudyId('');
            setSelectedTeacherId('');
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menugaskan mapel');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Nama Rombel / Kelas',
            render: (row) => (
                <div>
                    <span className="font-bold text-slate-900">{row.name}</span>
                    <span className="text-xs text-slate-400 block font-mono">{row.code || 'Tanpa Kode'}</span>
                </div>
            ),
        },
        {
            key: 'institution',
            label: 'Lembaga',
            render: (row) => (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {row.educational_institution?.name || '-'}
                </span>
            ),
        },
        {
            key: 'homeroom',
            label: 'Wali Kelas',
            render: (row) => (
                <span className="text-sm text-slate-700 font-medium">
                    {row.homeroom_teacher?.name || <span className="text-slate-400 italic">Belum Ditunjuk</span>}
                </span>
            ),
        },
        {
            key: 'students_count',
            label: 'Anggota Siswa',
            render: (row) => (
                <button
                    onClick={(e) => { e.stopPropagation(); setSelectedGroupForStudents(row); }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                >
                    <Users className="w-3.5 h-3.5" />
                    {row.students_count || 0} Siswa
                </button>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={(e) => { e.stopPropagation(); setSelectedGroupForSubjects(row); }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Atur Guru Mapel"
                    >
                        <BookOpen className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        title="Edit Rombel"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Hapus Rombel"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Rombongan Belajar (Rombel)</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola pembagian kelas formal semesteran, penunjukan wali kelas, dan anggota siswa.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-md hover:bg-emerald-700 transition shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Rombel
                </button>
            </div>

            {/* Filter Lembaga */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lembaga:</span>
                <select
                    value={instFilter}
                    onChange={(e) => setInstFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="">Semua Lembaga Formal</option>
                    {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={groups}
                isLoading={isLoading}
                emptyMessage="Belum ada rombel terdaftar"
            />

            {/* Modal Form Rombel */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Rombongan Belajar' : 'Buat Rombel Baru'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Nama Rombel *</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: VII-A / VIII-B"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Kode Rombel</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="VII-A"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Kapasitas</label>
                            <input
                                type="number"
                                value={capacity}
                                onChange={(e) => setCapacity(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Institusi / Lembaga *</label>
                        <select
                            required
                            value={institutionId}
                            onChange={(e) => setInstitutionId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        >
                            <option value="">Pilih Lembaga</option>
                            {institutions.map((inst) => (
                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Wali Kelas</label>
                        <select
                            value={homeroomTeacherId}
                            onChange={(e) => setHomeroomTeacherId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        >
                            <option value="">-- Belum Ditunjuk --</option>
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || isUpdating}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {isCreating || isUpdating ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Kelola Anggota Siswa */}
            <Modal
                open={!!selectedGroupForStudents}
                title={`Anggota Rombel: ${selectedGroupForStudents?.name || ''}`}
                onClose={() => setSelectedGroupForStudents(null)}
            >
                <div className="space-y-4">
                    <form onSubmit={handleAddStudent} className="flex gap-2">
                        <select
                            required
                            value={selectedStudentToAdd}
                            onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-xs bg-white"
                        >
                            <option value="">-- Pilih Siswa untuk Dimasukkan --</option>
                            {allStudents.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} (NIS: {s.nis}) {s.is_mukim ? '[Santri Mukim]' : '[Luar]'}
                                </option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            className="px-3.5 py-2 bg-emerald-600 text-white rounded-md text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1 shrink-0"
                        >
                            <UserPlus className="w-4 h-4" /> Masukkan
                        </button>
                    </form>

                    <div className="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-72 overflow-y-auto">
                        {!groupDetail?.student_classes?.length ? (
                            <div className="p-6 text-center text-xs text-slate-400">Belum ada siswa di kelas ini</div>
                        ) : (
                            groupDetail.student_classes.filter((sc) => sc.status === 'aktif').map((sc) => (
                                <div key={sc.id} className="p-3 flex items-center justify-between text-xs">
                                    <div>
                                        <p className="font-bold text-slate-800">{sc.student?.name}</p>
                                        <p className="text-slate-400 font-mono">NIS: {sc.student?.nis}</p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await removeStudentFromGroup({
                                                    groupId: selectedGroupForStudents.id,
                                                    studentId: sc.student_id,
                                                }).unwrap();
                                                toast.success('Siswa dikeluarkan dari rombel');
                                            } catch (err) {
                                                toast.error('Gagal mengeluarkan siswa');
                                            }
                                        }}
                                        className="text-slate-400 hover:text-rose-600 p-1"
                                        title="Keluarkan dari Rombel"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            {/* Modal Penugasan Guru Mapel */}
            <Modal
                open={!!selectedGroupForSubjects}
                title={`Penugasan Guru Mapel: ${selectedGroupForSubjects?.name || ''}`}
                onClose={() => setSelectedGroupForSubjects(null)}
            >
                <div className="space-y-4">
                    <form onSubmit={handleAssignSubject} className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
                        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Tugaskan Guru ke Mapel Rombel Ini</div>
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                required
                                value={selectedStudyId}
                                onChange={(e) => setSelectedStudyId(e.target.value)}
                                className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white"
                            >
                                <option value="">-- Pilih Mapel --</option>
                                {allStudies.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <select
                                value={selectedTeacherId}
                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                                className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white"
                            >
                                <option value="">-- Pilih Guru Pengampu --</option>
                                {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="w-full py-2 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700"
                        >
                            + Simpan Penugasan
                        </button>
                    </form>

                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-md max-h-60 overflow-y-auto">
                        {!groupDetail?.subjects?.length ? (
                            <div className="p-6 text-center text-xs text-slate-400">Belum ada mapel ditugaskan</div>
                        ) : (
                            groupDetail.subjects.map((subj) => (
                                <div key={subj.id} className="p-3 flex items-center justify-between text-xs">
                                    <div>
                                        <p className="font-bold text-slate-800">{subj.study?.name}</p>
                                        <p className="text-slate-400">Guru: {subj.teacher?.name || 'Belum Ada'}</p>
                                    </div>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Aktif
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Rombongan Belajar"
                message={`Yakin ingin menghapus rombel ${deleteTarget?.name}?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
