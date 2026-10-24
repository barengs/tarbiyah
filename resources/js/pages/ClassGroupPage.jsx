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
import { useGetEducationClassesQuery } from '../store/slices/educationClassApi';
import { useGetTeachersQuery } from '../store/slices/teacherApi';
import { useGetStudentsQuery, useGetUnassignedStudentsQuery, useBulkAssignStudentsMutation } from '../store/slices/studentApi';
import { CheckSquare, Square, Check, Filter } from 'lucide-react';
import { useGetStudiesQuery } from '../store/slices/studyApi';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Plus, Edit2, Trash2, Users, UserPlus, BookOpen, Layers, GraduationCap } from 'lucide-react';
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

    const { data: eduClassesData } = useGetEducationClassesQuery(
        instFilter ? { educational_institution_id: instFilter } : undefined
    );
    const educationClasses = eduClassesData?.data || [];

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
    const [educationClassId, setEducationClassId] = useState('');
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
    const [studentTab, setStudentTab] = useState('members'); // 'members' | 'unassigned'
    const [unassignedGender, setUnassignedGender] = useState('');
    const [unassignedSearch, setUnassignedSearch] = useState('');
    const [selectedUnassignedIds, setSelectedUnassignedIds] = useState([]);
    const [bulkAssignStudents, { isLoading: isBulkAssigning }] = useBulkAssignStudentsMutation();

    const { data: unassignedData, refetch: refetchUnassigned } = useGetUnassignedStudentsQuery({
        all: true,
        ...(unassignedGender && { gender: unassignedGender }),
        ...(unassignedSearch && { search: unassignedSearch }),
    }, { skip: !selectedGroupForStudents || studentTab !== 'unassigned' });
    const unassignedStudents = unassignedData?.data || [];

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
        setInstitutionId(instFilter || institutions[0]?.id || '');
        setEducationClassId('');
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
        setEducationClassId(item.education_class_id ? String(item.education_class_id) : '');
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
            education_class_id: educationClassId ? Number(educationClassId) : null,
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
                toast.success('Rombel berhasil ditambahkan');
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
            toast.error(err?.data?.message || 'Gagal memasukkan siswa');
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
            toast.success('Mata pelajaran dan guru pengampu berhasil ditugaskan');
            setSelectedStudyId('');
            setSelectedTeacherId('');
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menugaskan mapel');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Nama Rombel',
            render: (row) => (
                <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                    </span>
                    <div>
                        <span className="font-bold text-slate-800 block text-sm">{row.name}</span>
                        {row.code && (
                            <span className="text-[11px] font-mono text-slate-400">Kode: {row.code}</span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'education_class',
            label: 'Tingkat Kelas',
            render: (row) => (
                row.education_class ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                        {row.education_class.name}
                    </span>
                ) : (
                    <span className="text-xs text-slate-400 italic">Belum Diset</span>
                )
            ),
        },
        {
            key: 'institution',
            label: 'Lembaga',
            render: (row) => (
                <span className="text-xs font-semibold text-slate-700">
                    {row.educational_institution?.name || '-'}
                </span>
            ),
        },
        {
            key: 'homeroom_teacher',
            label: 'Wali Kelas',
            render: (row) => (
                <span className="text-xs text-slate-600">
                    {row.homeroom_teacher?.name || <span className="text-slate-400 italic">Belum Ada</span>}
                </span>
            ),
        },
        {
            key: 'students_count',
            label: 'Siswa / Kapasitas',
            render: (row) => {
                const count = row.students_count || 0;
                const cap = row.capacity || 32;
                const isFull = count >= cap;
                return (
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isFull ? 'text-amber-600' : 'text-slate-700'}`}>
                            {count} / {cap}
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedGroupForStudents(row); }}
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Kelola Anggota Santri"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                );
            },
        },
        {
            key: 'gender',
            label: 'Gender',
            render: (row) => {
                const badges = {
                    L: 'bg-blue-50 text-blue-700 border-blue-200',
                    P: 'bg-rose-50 text-rose-700 border-rose-200',
                    campur: 'bg-slate-100 text-slate-700 border-slate-200',
                };
                const labels = { L: 'Putra (Banin)', P: 'Putri (Banat)', campur: 'Campur' };
                return (
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${badges[row.gender] || badges.campur}`}>
                        {labels[row.gender] || 'Campur'}
                    </span>
                );
            },
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={(e) => { e.stopPropagation(); setSelectedGroupForSubjects(row); }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Tugaskan Guru Mapel"
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
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="p-2 bg-emerald-50 text-emerald-700 rounded-md">
                            <Users className="w-5 h-5" />
                        </span>
                        Rombongan Belajar (Rombel)
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola rombel santri aktif, penetapan wali kelas, ruang belajar, dan pembagian kelas santri.
                    </p>
                </div>
                <div>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-md hover:bg-emerald-700 transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Rombel
                    </button>
                </div>
            </div>

            {/* Filter Lembaga */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Filter Lembaga:</span>
                <select
                    value={instFilter}
                    onChange={(e) => setInstFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="">Semua Lembaga</option>
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
                emptyMessage="Belum ada rombongan belajar terdaftar"
            />

            {/* Modal Tambah/Edit Rombel */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Rombongan Belajar' : 'Tambah Rombel Baru'}
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
                            placeholder="Contoh: Kelas 7A / Takhasus 1 Putra"
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
                                placeholder="Contoh: 7A-PUTRA"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Lembaga *</label>
                            <select
                                required
                                value={institutionId}
                                onChange={(e) => setInstitutionId(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            >
                                <option value="">-- Pilih Lembaga --</option>
                                {institutions.map((inst) => (
                                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Tingkat Kelas</label>
                            <select
                                value={educationClassId}
                                onChange={(e) => setEducationClassId(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            >
                                <option value="">-- Tanpa Tingkat Khusus --</option>
                                {educationClasses.map((cls) => (
                                    <option key={cls.id} value={cls.id}>{cls.name} ({cls.code})</option>
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
                                <option value="">-- Pilih Wali Kelas --</option>
                                {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Kategori Gender</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            >
                                <option value="campur">Campur</option>
                                <option value="L">Khusus Putra (Banin)</option>
                                <option value="P">Khusus Putri (Banat)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Kapasitas Maksimal</label>
                            <input
                                type="number"
                                min={1}
                                required
                                value={capacity}
                                onChange={(e) => setCapacity(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
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
                title={`Kelola Anggota Rombel: ${selectedGroupForStudents?.name || ''}`}
                onClose={() => {
                    setSelectedGroupForStudents(null);
                    setSelectedUnassignedIds([]);
                    setStudentTab('members');
                }}
            >
                <div className="space-y-4">
                    {/* Sub Tab Pemilihan */}
                    <div className="flex border-b border-slate-200">
                        <button
                            type="button"
                            onClick={() => setStudentTab('members')}
                            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                                studentTab === 'members'
                                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Anggota Aktif ({groupDetail?.student_classes?.filter((sc) => sc.status === 'aktif').length || 0})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStudentTab('unassigned')}
                            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                                studentTab === 'unassigned'
                                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span>+ Penempatan Santri Baru (Pool)</span>
                            {unassignedStudents.length > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                                    {unassignedStudents.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {studentTab === 'members' ? (
                        <>
                            <form onSubmit={handleAddStudent} className="flex gap-2">
                                <select
                                    required
                                    value={selectedStudentToAdd}
                                    onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-xs bg-white"
                                >
                                    <option value="">-- Pilih Siswa Manual --</option>
                                    {allStudents.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} (NIS: {s.nis}) {s.is_mukim ? '[Santri Mukim]' : '[Luar]'}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="submit"
                                    className="px-3.5 py-2 bg-emerald-700 text-white rounded-md text-xs font-semibold hover:bg-emerald-800 flex items-center gap-1 shrink-0"
                                >
                                    <UserPlus className="w-4 h-4" /> Masukkan
                                </button>
                            </form>

                            <div className="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-72 overflow-y-auto">
                                {!groupDetail?.student_classes?.filter((sc) => sc.status === 'aktif').length ? (
                                    <div className="p-6 text-center text-xs text-slate-400">Belum ada siswa aktif di rombel ini</div>
                                ) : (
                                    groupDetail.student_classes.filter((sc) => sc.status === 'aktif').map((sc) => (
                                        <div key={sc.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition">
                                            <div>
                                                <p className="font-bold text-slate-800">{sc.student?.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-slate-400 font-mono">NIS: {sc.student?.nis}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                                        sc.student?.gender === 'L' ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'
                                                    }`}>
                                                        {sc.student?.gender === 'L' ? 'Banin' : 'Banat'}
                                                    </span>
                                                </div>
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
                                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition"
                                                title="Keluarkan dari Rombel"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 flex items-center justify-between">
                                <span>Menampilkan santri aktif yang <b>belum memiliki rombel</b> pada Tahun Akademik ini.</span>
                                <span className="font-mono text-emerald-700 font-semibold">{unassignedStudents.length} santri</span>
                            </div>

                            {/* Filter bar */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Cari NIS atau Nama santri..."
                                    value={unassignedSearch}
                                    onChange={(e) => setUnassignedSearch(e.target.value)}
                                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded">
                                    <button
                                        type="button"
                                        onClick={() => setUnassignedGender('')}
                                        className={`px-2 py-1 text-[11px] rounded ${!unassignedGender ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Semua
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUnassignedGender('L')}
                                        className={`px-2 py-1 text-[11px] rounded ${unassignedGender === 'L' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Banin (L)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUnassignedGender('P')}
                                        className={`px-2 py-1 text-[11px] rounded ${unassignedGender === 'P' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Banat (P)
                                    </button>
                                </div>
                            </div>

                            {/* Checklist santri */}
                            <div className="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-64 overflow-y-auto">
                                {unassignedStudents.length === 0 ? (
                                    <div className="p-6 text-center text-xs text-slate-400">
                                        Tidak ada santri yang belum memiliki rombel sesuai kriteria.
                                    </div>
                                ) : (
                                    unassignedStudents.map((s) => {
                                        const isChecked = selectedUnassignedIds.includes(s.id);
                                        return (
                                            <div
                                                key={s.id}
                                                onClick={() => {
                                                    setSelectedUnassignedIds(prev => 
                                                        prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                                    );
                                                }}
                                                className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition ${
                                                    isChecked ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {}} // handled by parent onClick
                                                        className="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                                                    />
                                                    <div>
                                                        <p className="font-bold text-slate-800">{s.name}</p>
                                                        <p className="text-slate-400 font-mono text-[11px]">NIS: {s.nis}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                        s.gender === 'L' ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'
                                                    }`}>
                                                        {s.gender === 'L' ? 'Banin' : 'Banat'}
                                                    </span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                                        {s.is_mukim ? 'Mukim' : 'Luar'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Action footer */}
                            <div className="pt-2 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedUnassignedIds.length === unassignedStudents.length) {
                                            setSelectedUnassignedIds([]);
                                        } else {
                                            setSelectedUnassignedIds(unassignedStudents.map(s => s.id));
                                        }
                                    }}
                                    className="text-xs text-slate-600 hover:text-emerald-700 underline font-medium"
                                >
                                    {selectedUnassignedIds.length === unassignedStudents.length ? 'Batalkan Pilihan Semua' : 'Pilih Semua Santri'}
                                </button>
                                <button
                                    type="button"
                                    disabled={selectedUnassignedIds.length === 0 || isBulkAssigning}
                                    onClick={async () => {
                                        try {
                                            const res = await bulkAssignStudents({
                                                class_group_id: selectedGroupForStudents.id,
                                                student_ids: selectedUnassignedIds,
                                            }).unwrap();
                                            toast.success(res?.message || 'Santri berhasil ditempatkan ke rombel');
                                            setSelectedUnassignedIds([]);
                                            setStudentTab('members');
                                        } catch (err) {
                                            toast.error(err?.data?.message || 'Gagal menempatkan santri ke rombel');
                                        }
                                    }}
                                    className="px-4 py-2 bg-emerald-700 text-white rounded-md text-xs font-semibold hover:bg-emerald-800 disabled:opacity-50 transition shadow-sm"
                                >
                                    {isBulkAssigning ? 'Memproses...' : `Tempatkan (${selectedUnassignedIds.length}) Santri Terpilih`}
                                </button>
                            </div>
                        </div>
                    )}
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
