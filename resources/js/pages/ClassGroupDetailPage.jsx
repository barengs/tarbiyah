import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    useGetClassGroupQuery,
    useUpdateClassGroupMutation,
    useDeleteClassGroupMutation,
    useAddStudentToGroupMutation,
    useRemoveStudentFromGroupMutation,
    useAssignSubjectToGroupMutation,
} from '../store/slices/classGroupApi';
import { useGetInstitutionsQuery } from '../store/slices/institutionApi';
import { useGetEducationClassesQuery } from '../store/slices/educationClassApi';
import { useGetTeachersQuery } from '../store/slices/teacherApi';
import {
    useGetStudentsQuery,
    useGetUnassignedStudentsQuery,
    useBulkAssignStudentsMutation,
} from '../store/slices/studentApi';
import { useGetStudiesQuery } from '../store/slices/studyApi';
import {
    generateClassGroupStudentsPdf,
    formatStudentBirthInfo,
    formatStudentAddress,
} from '../utils/classGroupStudentsPdfGenerator';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import {
    ArrowLeft,
    Users,
    BookOpen,
    Edit2,
    Trash2,
    UserPlus,
    Plus,
    Clock,
    GraduationCap,
    School,
    FileDown,
    Search,
    Eye,
    Loader2,
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function ClassGroupDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { selectedYearId } = useSelector((state) => state.academicContext || {});

    const { data: detailRes, isLoading, refetch } = useGetClassGroupQuery(id);
    const group = detailRes?.data;

    const [activeTab, setActiveTab] = useState('santri'); // 'santri' | 'guru_mapel'
    const [studentSearch, setStudentSearch] = useState('');
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    // Modals
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [studentsModalOpen, setStudentsModalOpen] = useState(false);
    const [subjectsModalOpen, setSubjectsModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    // Edit Rombel form states
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [institutionId, setInstitutionId] = useState('');
    const [educationClassId, setEducationClassId] = useState('');
    const [homeroomTeacherId, setHomeroomTeacherId] = useState('');
    const [gender, setGender] = useState('campur');
    const [capacity, setCapacity] = useState(32);

    const { data: instData } = useGetInstitutionsQuery();
    const institutions = instData?.data || [];

    const { data: eduClassesData } = useGetEducationClassesQuery(
        institutionId ? { educational_institution_id: institutionId } : undefined
    );
    const educationClasses = eduClassesData?.data || [];

    const { data: teachersData } = useGetTeachersQuery();
    const teachers = teachersData?.data || [];

    const { data: studiesData } = useGetStudiesQuery();
    const allStudies = studiesData?.data || [];

    const [updateGroup, { isLoading: isUpdating }] = useUpdateClassGroupMutation();
    const [deleteGroup, { isLoading: isDeleting }] = useDeleteClassGroupMutation();

    // Manage Students modal states
    const [studentTab, setStudentTab] = useState('members'); // 'members' | 'unassigned'
    const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');
    const [unassignedGender, setUnassignedGender] = useState('');
    const [unassignedSearch, setUnassignedSearch] = useState('');
    const [selectedUnassignedIds, setSelectedUnassignedIds] = useState([]);

    const [addStudentToGroup] = useAddStudentToGroupMutation();
    const [removeStudentFromGroup] = useRemoveStudentFromGroupMutation();
    const [bulkAssignStudents, { isLoading: isBulkAssigning }] = useBulkAssignStudentsMutation();

    const effectiveYearId = group?.academic_year_id || selectedYearId;

    const { data: allStudentsData } = useGetStudentsQuery(
        effectiveYearId ? { academic_year_id: effectiveYearId } : undefined,
        { skip: !studentsModalOpen }
    );
    const allStudents = allStudentsData?.data || [];

    const { data: unassignedData } = useGetUnassignedStudentsQuery(
        {
            all: true,
            ...(effectiveYearId && { academic_year_id: effectiveYearId }),
            ...(unassignedGender && { gender: unassignedGender }),
            ...(unassignedSearch && { search: unassignedSearch }),
        },
        { skip: !studentsModalOpen || studentTab !== 'unassigned' }
    );
    const unassignedStudents = unassignedData?.data || [];

    // Manage Subjects modal states
    const [assignSubjectToGroup] = useAssignSubjectToGroupMutation();
    const [selectedStudyId, setSelectedStudyId] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState('');

    // Active students list sorted alphabetically
    const activeStudentClasses = useMemo(() => {
        const list = group?.student_classes || [];
        return list
            .filter((sc) => !sc.status || sc.status.toLowerCase() === 'aktif')
            .sort((a, b) => (a.student?.name || '').localeCompare(b.student?.name || '', 'id'));
    }, [group]);

    const filteredStudentClasses = useMemo(() => {
        if (!studentSearch.trim()) return activeStudentClasses;
        const q = studentSearch.toLowerCase();
        return activeStudentClasses.filter((sc) => {
            const st = sc.student || {};
            return (
                st.name?.toLowerCase().includes(q) ||
                st.nis?.toLowerCase().includes(q) ||
                st.parent_name?.toLowerCase().includes(q) ||
                formatStudentAddress(st).toLowerCase().includes(q)
            );
        });
    }, [activeStudentClasses, studentSearch]);

    const openEditModal = () => {
        if (!group) return;
        setName(group.name || '');
        setCode(group.code || '');
        setInstitutionId(group.educational_institution_id ? String(group.educational_institution_id) : '');
        setEducationClassId(group.education_class_id ? String(group.education_class_id) : '');
        setHomeroomTeacherId(group.homeroom_teacher_id ? String(group.homeroom_teacher_id) : '');
        setGender(group.gender || 'campur');
        setCapacity(group.capacity || 32);
        setEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        const targetInst = institutions.find((i) => String(i.id) === String(institutionId));
        try {
            await updateGroup({
                id: group.id,
                name,
                code: code || null,
                academic_year_id: group.academic_year_id || selectedYearId || 1,
                program_id: targetInst?.program_id || targetInst?.program?.id || group.program_id || null,
                educational_institution_id: institutionId,
                education_class_id: educationClassId ? Number(educationClassId) : null,
                homeroom_teacher_id: homeroomTeacherId || null,
                gender,
                progression_type: targetInst?.progression_type || group.progression_type || 'triwulan',
                capacity: Number(capacity),
            }).unwrap();
            toast.success('Rombel berhasil diperbarui');
            setEditModalOpen(false);
            refetch();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal memperbarui rombel');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteGroup(group.id).unwrap();
            toast.success('Rombel berhasil dihapus');
            navigate('/kurikulum/rombel');
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus rombel');
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        if (!selectedStudentToAdd) return;
        try {
            await addStudentToGroup({
                groupId: group.id,
                student_id: selectedStudentToAdd,
            }).unwrap();
            toast.success('Siswa berhasil dimasukkan ke rombel');
            setSelectedStudentToAdd('');
            refetch();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal memasukkan siswa');
        }
    };

    const handleRemoveStudent = async (studentId) => {
        try {
            await removeStudentFromGroup({
                groupId: group.id,
                studentId,
            }).unwrap();
            toast.success('Siswa dikeluarkan dari rombel');
            refetch();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal mengeluarkan siswa');
        }
    };

    const handleAssignSubject = async (e) => {
        e.preventDefault();
        if (!selectedStudyId) return;
        try {
            await assignSubjectToGroup({
                groupId: group.id,
                study_id: selectedStudyId,
                teacher_id: selectedTeacherId || null,
            }).unwrap();
            toast.success('Mata pelajaran dan guru pengampu berhasil ditugaskan');
            setSelectedStudyId('');
            setSelectedTeacherId('');
            refetch();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menugaskan mapel');
        }
    };

    const handleExportStudentsPdf = () => {
        if (!group) return;
        if (activeStudentClasses.length === 0) {
            toast.warning('Belum ada data siswa pada rombel ini untuk diekspor.');
            return;
        }

        setIsExportingPdf(true);
        setTimeout(() => {
            try {
                const doc = generateClassGroupStudentsPdf({
                    group,
                    studentClasses: activeStudentClasses,
                });
                const safeName = (group.name || 'Rombel').replace(/[^a-zA-Z0-9]+/g, '_');
                const safeYear = (group.academic_year?.year || '').replace(/[^a-zA-Z0-9]+/g, '_');
                const fileName = `Data_Siswa_Rombel_${safeName}${safeYear ? `_${safeYear}` : ''}.pdf`;
                doc.save(fileName);
                toast.success('Data siswa rombel berhasil diekspor ke PDF');
            } catch (err) {
                console.error(err);
                toast.error('Gagal mengekspor PDF: ' + (err?.message || 'Terjadi kesalahan'));
            } finally {
                setIsExportingPdf(false);
            }
        }, 100);
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse max-w-7xl">
                <div className="h-8 w-64 bg-slate-200 rounded"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="h-24 bg-slate-200 rounded-lg"></div>
                    ))}
                </div>
                <div className="h-80 bg-slate-200 rounded-lg"></div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center max-w-3xl mx-auto">
                <p className="text-slate-600 font-semibold mb-4">
                    Data rombongan belajar tidak ditemukan atau telah dihapus.
                </p>
                <Link
                    to="/kurikulum/rombel"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b57d0] text-white rounded-md text-sm font-semibold hover:bg-[#0842a0] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Rombel
                </Link>
            </div>
        );
    }

    const teachersList = group.teachers_list || [];

    return (
        <div className="space-y-5 max-w-7xl">
            {/* TOP BAR: BREADCRUMB & ACTIONS */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/kurikulum/rombel')}
                        className="p-2 rounded-md border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Kembali ke Daftar Rombel"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                            <Link to="/kurikulum/rombel" className="hover:text-[#093c30] transition-colors">
                                Rombongan Belajar (Rombel)
                            </Link>
                            <span>/</span>
                            <span className="text-slate-700 font-medium">Detail Rombel</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                {group.name}
                            </h1>
                            {group.code && (
                                <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {group.code}
                                </span>
                            )}
                            {group.academic_year?.year && (
                                <span className="text-xs px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    TA {group.academic_year.year} H
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleExportStudentsPdf}
                        disabled={isExportingPdf}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                        {isExportingPdf ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <FileDown className="w-3.5 h-3.5" />
                        )}
                        {isExportingPdf ? 'Membuat PDF...' : 'Export Data Siswa (PDF)'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setStudentsModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        Kelola Santri
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedStudyId('');
                            setSelectedTeacherId('');
                            setSubjectsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        Tugaskan Guru Mapel
                    </button>
                    <button
                        type="button"
                        onClick={openEditModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0b57d0] text-xs font-semibold text-white hover:bg-[#0842a0] transition-colors shadow-2xs cursor-pointer"
                    >
                        <Edit2 className="w-3.5 h-3.5 text-blue-200" />
                        Edit Rombel
                    </button>
                    <button
                        type="button"
                        onClick={() => setDeleteConfirmOpen(true)}
                        className="p-2 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus Rombel"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* 4 KARTU RINGKASAN ROMBEL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Lembaga / Jenjang
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-1 truncate" title={group.educational_institution?.name}>
                        {group.educational_institution?.name || group.education?.name || '-'}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {group.program?.name && (
                            <span className="text-[11px] font-semibold text-emerald-700">
                                Program: {group.program.name}
                            </span>
                        )}
                        {group.education_class?.name && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                                {group.education_class.name}
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Wali Kelas
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-1 truncate" title={group.homeroom_teacher?.name}>
                        {group.homeroom_teacher?.name || <span className="text-slate-400 italic font-normal">Belum Ditentukan</span>}
                    </p>
                    <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                        {group.homeroom_teacher?.nip ? `NIP: ${group.homeroom_teacher.nip}` : 'Pengampu Rombel'}
                    </span>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Ruang &amp; Kapasitas
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                        {group.classroom?.name || 'Ruang Belajar'}
                    </p>
                    <span className="text-[11px] text-slate-600 font-semibold mt-1 block">
                        {activeStudentClasses.length} / {group.capacity || 35} Santri Aktif
                    </span>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Kategori &amp; Model
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                        {group.gender === 'L' ? 'Khusus Putra' : group.gender === 'P' ? 'Khusus Putri' : 'Campur'}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium mt-1 block capitalize">
                        {group.progression_type === 'triwulan'
                            ? 'Triwulanan (Pesantren)'
                            : group.progression_type || 'Triwulanan'}
                    </span>
                </div>
            </div>

            {/* TAB NAVIGASI & KONTEN UTAMA */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-3 pb-2.5 border-b border-slate-200 bg-slate-50/70">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('santri')}
                            className={`px-3.5 py-2 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                                activeTab === 'santri'
                                    ? 'bg-[#093c30] text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-200/60'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            Daftar Santri Anggota ({activeStudentClasses.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('guru_mapel')}
                            className={`px-3.5 py-2 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                                activeTab === 'guru_mapel'
                                    ? 'bg-[#093c30] text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-200/60'
                            }`}
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            Daftar Guru Mata Pelajaran ({teachersList.length})
                        </button>
                    </div>

                    {activeTab === 'santri' && (
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                                <input
                                    type="text"
                                    placeholder="Cari nama, NIS, alamat, wali..."
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-800 w-56 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* TAB 1: DAFTAR SANTRI ANGGOTA */}
                {activeTab === 'santri' && (
                    <div className="p-4">
                        {activeStudentClasses.length === 0 ? (
                            <div className="p-10 text-center border border-dashed border-slate-300 rounded-lg bg-slate-50/50 space-y-2.5">
                                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                                <p className="text-sm font-semibold text-slate-600">
                                    Belum ada santri terdaftar pada rombel ini.
                                </p>
                                <p className="text-xs text-slate-400">
                                    Tambahkan santri dari daftar santri aktif atau pool penempatan santri baru.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setStudentsModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer transition shadow-xs mt-1"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    Kelola &amp; Masukkan Santri
                                </button>
                            </div>
                        ) : (
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                                                <th className="py-3 px-3 w-10 text-center">No</th>
                                                <th className="py-3 px-3 whitespace-nowrap">NIS</th>
                                                <th className="py-3 px-3 min-w-[11rem]">Nama Lengkap</th>
                                                <th className="py-3 px-3 min-w-[11rem]">Tempat, Tanggal Lahir</th>
                                                <th className="py-3 px-3 min-w-[14rem]">Alamat</th>
                                                <th className="py-3 px-3 min-w-[10rem]">Nama Orang Tua</th>
                                                <th className="py-3 px-3 text-center">Status</th>
                                                <th className="py-3 px-3 text-center">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredStudentClasses.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                                                        Tidak ada siswa yang cocok dengan pencarian &ldquo;{studentSearch}&rdquo;.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredStudentClasses.map((sc, idx) => {
                                                    const st = sc.student || {};
                                                    return (
                                                        <tr key={sc.id || idx} className="hover:bg-slate-50/70 transition-colors">
                                                            <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                                                                {idx + 1}
                                                            </td>
                                                            <td className="py-2.5 px-3 font-mono text-slate-600 font-semibold whitespace-nowrap">
                                                                {st.nis || '-'}
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <Link
                                                                    to={`/siswa/${sc.student_id}`}
                                                                    className="font-bold text-slate-900 hover:text-[#0b57d0] transition-colors block"
                                                                >
                                                                    {st.name || '-'}
                                                                </Link>
                                                                <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                                                    st.gender === 'L'
                                                                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                                }`}>
                                                                    {st.gender === 'L' ? 'Putra' : 'Putri'}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-slate-700">
                                                                {formatStudentBirthInfo(st)}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-slate-600">
                                                                {formatStudentAddress(st)}
                                                            </td>
                                                            <td className="py-2.5 px-3 font-medium text-slate-800">
                                                                {st.parent_name || '-'}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center">
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                                                                    {sc.status || 'Aktif'}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                                <div className="inline-flex items-center gap-1">
                                                                    <Link
                                                                        to={`/siswa/${sc.student_id}`}
                                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                                                        title="Lihat Detail Santri"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                    </Link>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveStudent(sc.student_id)}
                                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                                                        title="Keluarkan dari Rombel"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                                    <span>
                                        Menampilkan <b className="text-slate-800">{filteredStudentClasses.length}</b> dari{' '}
                                        <b className="text-slate-800">{activeStudentClasses.length}</b> Santri Anggota
                                    </span>
                                    <span>
                                        Kapasitas Rombel: <b className="text-slate-800">{group.capacity || 35} Santri</b>
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: DAFTAR GURU MATA PELAJARAN */}
                {activeTab === 'guru_mapel' && (
                    <div className="p-4">
                        {teachersList.length === 0 ? (
                            <div className="p-10 text-center border border-dashed border-slate-300 rounded-lg bg-slate-50/50 space-y-2.5">
                                <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                                <p className="text-sm font-semibold text-slate-600">
                                    Belum ada guru mata pelajaran yang terdaftar pada rombel ini.
                                </p>
                                <p className="text-xs text-slate-400">
                                    Silakan tetapkan guru pengampu mata pelajaran untuk rombel ini.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedStudyId('');
                                        setSelectedTeacherId('');
                                        setSubjectsModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md cursor-pointer transition shadow-xs mt-1"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Tugaskan Guru Mapel
                                </button>
                            </div>
                        ) : (
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                                                <th className="py-3 px-3 w-10 text-center">No</th>
                                                <th className="py-3 px-3">Mata Pelajaran</th>
                                                <th className="py-3 px-3">Guru Pengampu</th>
                                                <th className="py-3 px-3 text-center">Beban KBM</th>
                                                <th className="py-3 px-3 text-center">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {teachersList.map((item, idx) => (
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
                                                                <div className="font-semibold text-slate-800">
                                                                    {item.teacher_name}
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
                                                                setSelectedStudyId(String(item.study_id));
                                                                setSelectedTeacherId(item.teacher_id ? String(item.teacher_id) : '');
                                                                setSubjectsModalOpen(true);
                                                            }}
                                                            className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded cursor-pointer transition-colors"
                                                        >
                                                            Ganti Guru
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                                    <span>
                                        Total: <b className="text-slate-800">{teachersList.length}</b> Mata Pelajaran
                                    </span>
                                    <span>
                                        Total Beban KBM:{' '}
                                        <b className="text-slate-800">
                                            {teachersList.reduce((acc, i) => acc + (i.total_hours || 0), 0)}
                                        </b>{' '}
                                        Jam Pelajaran / Pekan
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL EDIT ROMBEL */}
            <Modal
                open={editModalOpen}
                title="Edit Rombongan Belajar"
                onClose={() => setEditModalOpen(false)}
            >
                <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Nama Rombel *</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
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
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Lembaga *</label>
                            <select
                                required
                                value={institutionId}
                                onChange={(e) => {
                                    setInstitutionId(e.target.value);
                                    setEducationClassId('');
                                }}
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
                                    <option key={cls.id} value={cls.id}>
                                        {cls.name} ({cls.code})
                                    </option>
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
                            onClick={() => setEditModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isUpdating}
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#0b57d0] rounded-md hover:bg-[#0842a0] disabled:opacity-50"
                        >
                            {isUpdating ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL KELOLA ANGGOTA SANTRI */}
            <Modal
                open={studentsModalOpen}
                title={`Kelola Anggota Rombel: ${group.name}`}
                onClose={() => {
                    setStudentsModalOpen(false);
                    setSelectedUnassignedIds([]);
                    setStudentTab('members');
                }}
            >
                <div className="space-y-4">
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
                            Anggota Aktif ({activeStudentClasses.length})
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
                                {activeStudentClasses.length === 0 ? (
                                    <div className="p-6 text-center text-xs text-slate-400">Belum ada siswa aktif di rombel ini</div>
                                ) : (
                                    activeStudentClasses.map((sc) => (
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
                                                type="button"
                                                onClick={() => handleRemoveStudent(sc.student_id)}
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
                                                    setSelectedUnassignedIds((prev) =>
                                                        prev.includes(s.id) ? prev.filter((item) => item !== s.id) : [...prev, s.id]
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
                                                        onChange={() => {}}
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

                            <div className="pt-2 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedUnassignedIds.length === unassignedStudents.length) {
                                            setSelectedUnassignedIds([]);
                                        } else {
                                            setSelectedUnassignedIds(unassignedStudents.map((s) => s.id));
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
                                                class_group_id: group.id,
                                                student_ids: selectedUnassignedIds,
                                            }).unwrap();
                                            toast.success(res?.message || 'Santri berhasil ditempatkan ke rombel');
                                            setSelectedUnassignedIds([]);
                                            setStudentTab('members');
                                            refetch();
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

            {/* MODAL PENUGASAN GURU MAPEL */}
            <Modal
                open={subjectsModalOpen}
                title={`Penugasan Guru Mapel: ${group.name}`}
                onClose={() => setSubjectsModalOpen(false)}
            >
                <div className="space-y-4">
                    <form onSubmit={handleAssignSubject} className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
                        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Tugaskan Guru ke Mapel Rombel Ini
                        </div>
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
                        {!group.subjects?.length ? (
                            <div className="p-6 text-center text-xs text-slate-400">Belum ada mapel ditugaskan</div>
                        ) : (
                            group.subjects.map((subj) => (
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

            {/* CONFIRM DELETE ROMBEL */}
            <ConfirmDialog
                open={deleteConfirmOpen}
                title="Hapus Rombongan Belajar"
                message={`Yakin ingin menghapus rombel ${group.name}?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteConfirmOpen(false)}
                isLoading={isDeleting}
            />
        </div>
    );
}
