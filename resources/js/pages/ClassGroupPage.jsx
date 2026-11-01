import React, { useState } from 'react';
import { useSelector } from 'react-redux';
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
import { 
    Plus, 
    Edit2, 
    Trash2, 
    Users, 
    UserPlus, 
    BookOpen, 
    Layers, 
    GraduationCap, 
    Eye, 
    School, 
    Clock, 
    Award, 
    ShieldCheck, 
    CheckCircle2 
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function ClassGroupPage() {
    const { selectedYearId } = useSelector((state) => state.academicContext || {});
    const [instFilter, setInstFilter] = useState('');
    const { data: instData } = useGetInstitutionsQuery();
    const institutions = instData?.data || [];

    const { data: groupsData, isLoading } = useGetClassGroupsQuery({
        ...(selectedYearId && { academic_year_id: selectedYearId }),
        ...(instFilter && { educational_institution_id: instFilter }),
    });
    const groups = groupsData?.data || [];

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Rombel Detail Modal State
    const [selectedGroupForDetail, setSelectedGroupForDetail] = useState(null);
    const [detailTab, setDetailTab] = useState('guru_mapel'); // 'guru_mapel' | 'santri'
    const { data: detailData, isLoading: isDetailLoading } = useGetClassGroupQuery(selectedGroupForDetail?.id, {
        skip: !selectedGroupForDetail,
    });
    const groupDetailInfo = detailData?.data || selectedGroupForDetail;

    // Form fields
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [institutionId, setInstitutionId] = useState('');
    const [educationClassId, setEducationClassId] = useState('');
    const [homeroomTeacherId, setHomeroomTeacherId] = useState('');
    const [gender, setGender] = useState('campur');
    const [capacity, setCapacity] = useState(32);

    const activeInstIdForClasses = institutionId || instFilter;
    const { data: eduClassesData } = useGetEducationClassesQuery(
        activeInstIdForClasses ? { educational_institution_id: activeInstIdForClasses } : undefined
    );
    const educationClasses = eduClassesData?.data || [];

    const { data: teachersData } = useGetTeachersQuery();
    const teachers = teachersData?.data || [];

    const [createGroup, { isLoading: isCreating }] = useCreateClassGroupMutation();
    const [updateGroup, { isLoading: isUpdating }] = useUpdateClassGroupMutation();
    const [deleteGroup, { isLoading: isDeleting }] = useDeleteClassGroupMutation();

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
        ...(selectedYearId && { academic_year_id: selectedYearId }),
        ...(unassignedGender && { gender: unassignedGender }),
        ...(unassignedSearch && { search: unassignedSearch }),
    }, { skip: !selectedGroupForStudents || studentTab !== 'unassigned' });
    const unassignedStudents = unassignedData?.data || [];

    const { data: allStudentsData } = useGetStudentsQuery(
        selectedYearId ? { academic_year_id: selectedYearId } : undefined
    );
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
        const targetInst = institutions.find(i => String(i.id) === String(institutionId));
        const payload = {
            name,
            code: code || null,
            academic_year_id: editingItem?.academic_year_id || selectedYearId || 1,
            educational_institution_id: institutionId,
            education_class_id: educationClassId ? Number(educationClassId) : null,
            homeroom_teacher_id: homeroomTeacherId || null,
            gender,
            progression_type: targetInst?.progression_type || 'triwulan',
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
            label: 'Lembaga / Program',
            render: (row) => (
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-slate-800">
                        {row.educational_institution?.name || '-'}
                    </span>
                    {row.program && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                            Program: <span className="font-bold">{row.program.name}</span>
                        </span>
                    )}
                </div>
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
                const labels = { L: 'Putra', P: 'Putri', campur: 'Campur' };
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
                        onClick={(e) => { e.stopPropagation(); setSelectedGroupForDetail(row); setDetailTab('guru_mapel'); }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        title="Lihat Detil Rombel & Guru Mapel"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setSelectedGroupForSubjects(row); }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                        title="Tugaskan Guru Mapel"
                    >
                        <BookOpen className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                        title="Edit Rombel"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
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
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0b57d0] text-white font-semibold text-sm rounded-md hover:bg-[#0842a0] transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Rombel
                    </button>
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={groups}
                isLoading={isLoading}
                onRowClick={(row) => { setSelectedGroupForDetail(row); setDetailTab('guru_mapel'); }}
                emptyMessage="Belum ada rombongan belajar terdaftar"
                filters={
                    <div className="flex items-center gap-1.5">
                        <select
                            value={instFilter}
                            onChange={(e) => setInstFilter(e.target.value)}
                            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-[#093c30] focus:border-[#093c30] transition-colors cursor-pointer shadow-2xs"
                        >
                            <option value="">Semua Lembaga</option>
                            {institutions.map((inst) => (
                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                        </select>
                    </div>
                }
            />

            {/* ═══════════════════ MODAL DETIL ROMBEL & DAFTAR GURU MAPEL ═══════════════════ */}
            <Modal
                open={!!selectedGroupForDetail}
                maxWidth="max-w-4xl"
                title={
                    <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4" />
                        </span>
                        <div>
                            <span className="font-bold text-slate-900 text-base">
                                Detil Rombel: {groupDetailInfo?.name || selectedGroupForDetail?.name}
                            </span>
                            <span className="text-xs text-slate-400 font-mono block">
                                Kode: {groupDetailInfo?.code || selectedGroupForDetail?.code || '-'}
                            </span>
                        </div>
                    </div>
                }
                onClose={() => setSelectedGroupForDetail(null)}
                footer={
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const g = groupDetailInfo || selectedGroupForDetail;
                                    setSelectedGroupForDetail(null);
                                    setSelectedGroupForSubjects(g);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md cursor-pointer transition-colors"
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                Tugaskan Guru Mapel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const g = groupDetailInfo || selectedGroupForDetail;
                                    setSelectedGroupForDetail(null);
                                    setSelectedGroupForStudents(g);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md cursor-pointer transition-colors"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                Kelola Santri
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const g = groupDetailInfo || selectedGroupForDetail;
                                    setSelectedGroupForDetail(null);
                                    openEditModal(g);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-md cursor-pointer transition-colors"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit Rombel
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedGroupForDetail(null)}
                                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                }
            >
                <div className="space-y-5">
                    {/* 1. Header Informasi Singkat (4 KPI Grid Cards) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Lembaga / Jenjang</span>
                            <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                                {groupDetailInfo?.educational_institution?.name || '-'}
                            </p>
                            <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">
                                {groupDetailInfo?.program?.name ? `Program: ${groupDetailInfo.program.name}` : 'Kurikulum Diniyah'}
                            </span>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Wali Kelas</span>
                            <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                                {groupDetailInfo?.homeroom_teacher?.name || <span className="text-slate-400 font-normal italic">Belum ditentukan</span>}
                            </p>
                            <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                                {groupDetailInfo?.homeroom_teacher?.nip ? `NIP: ${groupDetailInfo.homeroom_teacher.nip}` : 'Pendidik Pesantren'}
                            </span>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Ruang & Kapasitas</span>
                            <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                                {groupDetailInfo?.classroom?.name || 'Ruang Belajar'}
                            </p>
                            <span className="text-[11px] text-slate-600 font-medium mt-0.5 block">
                                {groupDetailInfo?.student_classes?.length || 0} / {groupDetailInfo?.capacity || 35} Santri
                            </span>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Kategori & Model</span>
                            <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                                {groupDetailInfo?.gender === 'L' ? 'Khusus Putra' : groupDetailInfo?.gender === 'P' ? 'Khusus Putri' : 'Campur'}
                            </p>
                            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block capitalize">
                                {groupDetailInfo?.progression_type === 'triwulan' ? 'Triwulanan (Pesantren)' : (groupDetailInfo?.progression_type || 'Triwulanan')}
                            </span>
                        </div>
                    </div>

                    {/* 2. Tab Navigasi: Guru Mata Pelajaran vs Santri Anggota */}
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                        <button
                            type="button"
                            onClick={() => setDetailTab('guru_mapel')}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                                detailTab === 'guru_mapel'
                                    ? 'bg-[#093c30] text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            Daftar Guru Mata Pelajaran ({groupDetailInfo?.teachers_list?.length || 0})
                        </button>
                        <button
                            type="button"
                            onClick={() => setDetailTab('santri')}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                                detailTab === 'santri'
                                    ? 'bg-[#093c30] text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            Daftar Santri Anggota ({groupDetailInfo?.student_classes?.length || 0})
                        </button>
                    </div>

                    {/* 3. Isi Tab: Guru Mata Pelajaran */}
                    {detailTab === 'guru_mapel' && (
                        <div className="space-y-3">
                            {isDetailLoading ? (
                                <div className="p-8 text-center text-xs text-slate-400">
                                    Memuat daftar guru mata pelajaran...
                                </div>
                            ) : (!groupDetailInfo?.teachers_list || groupDetailInfo.teachers_list.length === 0) ? (
                                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg bg-slate-50/50 space-y-2">
                                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                                    <p className="text-xs font-semibold text-slate-600">
                                        Belum ada guru mata pelajaran yang terdaftar pada rombel ini.
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                        Silakan tetapkan guru pengampu mata pelajaran untuk rombel ini.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const g = groupDetailInfo || selectedGroupForDetail;
                                            setSelectedGroupForDetail(null);
                                            setSelectedGroupForSubjects(g);
                                        }}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md cursor-pointer transition shadow-xs mt-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Tugaskan Guru Mapel
                                    </button>
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                                    <div className="max-h-72 overflow-y-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                                                    <th className="py-2.5 px-3">Mata Pelajaran</th>
                                                    <th className="py-2.5 px-3">Guru Pengampu</th>
                                                    <th className="py-2.5 px-3 text-center">Beban KBM</th>
                                                    <th className="py-2.5 px-3 text-center">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {groupDetailInfo.teachers_list.map((item, idx) => (
                                                    <tr key={item.study_id || idx} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <div className="font-bold text-slate-800">{item.study_name}</div>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="font-mono text-[10px] text-slate-400">
                                                                    Kode: {item.study_code || '-'}
                                                                </span>
                                                                {item.study_type === 'khusus' && (
                                                                    <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                                                        Mapel Khusus
                                                                    </span>
                                                                )}
                                                                {item.kkm && (
                                                                    <span className="text-[10px] text-slate-400">
                                                                        KKM: {Math.round(item.kkm)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            {item.teacher_name ? (
                                                                <div>
                                                                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                                        <span>{item.teacher_name}</span>
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                                                        {item.teacher_spec || (item.teacher_nip ? `NIP: ${item.teacher_nip}` : 'Pendidik Pesantren')}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-amber-600 font-medium italic text-[11px]">
                                                                    Belum ditugaskan
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            {item.total_hours > 0 ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                                    <Clock className="w-3 h-3 text-emerald-600" />
                                                                    {item.total_hours} Jam / Pekan
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-400 italic">
                                                                    Terjadwal KBM
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const g = groupDetailInfo || selectedGroupForDetail;
                                                                    setSelectedGroupForDetail(null);
                                                                    setSelectedGroupForSubjects(g);
                                                                    setSelectedStudyId(String(item.study_id));
                                                                    if (item.teacher_id) setSelectedTeacherId(String(item.teacher_id));
                                                                }}
                                                                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded cursor-pointer transition-colors"
                                                                title="Ubah atau ganti guru pengampu mapel ini"
                                                            >
                                                                Ganti Guru
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                                        <span>
                                            Total: <b className="text-slate-800">{groupDetailInfo.teachers_list.length}</b> Mata Pelajaran
                                        </span>
                                        <span>
                                            Total Beban KBM: <b className="text-slate-800">{groupDetailInfo.teachers_list.reduce((acc, i) => acc + (i.total_hours || 0), 0)}</b> Jam Pelajaran / Pekan
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. Isi Tab: Santri Anggota */}
                    {detailTab === 'santri' && (
                        <div className="space-y-3">
                            {(!groupDetailInfo?.student_classes || groupDetailInfo.student_classes.length === 0) ? (
                                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg bg-slate-50/50 space-y-2">
                                    <Users className="w-8 h-8 text-slate-300 mx-auto" />
                                    <p className="text-xs font-semibold text-slate-600">
                                        Belum ada santri terdaftar pada rombel ini.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const g = groupDetailInfo || selectedGroupForDetail;
                                            setSelectedGroupForDetail(null);
                                            setSelectedGroupForStudents(g);
                                        }}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer transition shadow-xs mt-1"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        Kelola &amp; Masukkan Santri
                                    </button>
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                                    <div className="max-h-72 overflow-y-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                                    <th className="py-2 px-3 w-10 text-center">No</th>
                                                    <th className="py-2 px-3">NIS</th>
                                                    <th className="py-2 px-3">Nama Lengkap Santri</th>
                                                    <th className="py-2 px-3">Kategori</th>
                                                    <th className="py-2 px-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {groupDetailInfo.student_classes.map((sc, idx) => (
                                                    <tr key={sc.id || idx} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="py-2 px-3 text-center font-mono text-slate-400 text-[11px]">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="py-2 px-3 font-mono text-slate-600 font-semibold">
                                                            {sc.student?.nis || '-'}
                                                        </td>
                                                        <td className="py-2 px-3 font-bold text-slate-800">
                                                            {sc.student?.name || '-'}
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                                                                {sc.student?.gender === 'L' ? 'Putra' : 'Putri'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                                                                {sc.status || 'Aktif'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>

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
                                <option value="L">Khusus Putra</option>
                                <option value="P">Khusus Putri</option>
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
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#0b57d0] rounded-md hover:bg-[#0842a0] disabled:opacity-50"
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
                                    ? 'border-[#0b57d0] text-[#0b57d0] bg-[#0b57d0]/[0.08]'
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
                                    ? 'border-[#0b57d0] text-[#0b57d0] bg-[#0b57d0]/[0.08]'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span>+ Penempatan Santri Baru (Pool)</span>
                            {unassignedStudents.length > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-[#0b57d0]">
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
                                    className="px-3.5 py-2 bg-[#0b57d0] text-white rounded-md text-xs font-semibold hover:bg-[#0842a0] flex items-center gap-1 shrink-0"
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
                                                        {sc.student?.gender === 'L' ? 'Putra' : 'Putri'}
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
                                        className={`px-2 py-1 text-[11px] rounded ${!unassignedGender ? 'bg-[#0b57d0] text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Semua
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUnassignedGender('L')}
                                        className={`px-2 py-1 text-[11px] rounded ${unassignedGender === 'L' ? 'bg-[#0b57d0] text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Putra (L)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUnassignedGender('P')}
                                        className={`px-2 py-1 text-[11px] rounded ${unassignedGender === 'P' ? 'bg-[#0b57d0] text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Putri (P)
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
                                                        {s.gender === 'L' ? 'Putra' : 'Putri'}
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
                                    className="px-4 py-2 bg-[#0b57d0] text-white rounded-md text-xs font-semibold hover:bg-[#0842a0] disabled:opacity-50 transition shadow-sm"
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
