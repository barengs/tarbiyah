import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    useGetStudentsQuery, 
    useCreateStudentMutation, 
    useUpdateStudentMutation, 
    useDeleteStudentMutation,
    usePullStudentsFromSmptMutation
} from '../store/slices/studentApi';
import DataTable from '../components/ui/DataTable';
import FlatTabs from '../components/atoms/FlatTabs';
import Modal from '../components/ui/Modal';
import PullStudentsModal from '../components/organisms/PullStudentsModal';
import BulkAssignProgramModal from '../components/organisms/BulkAssignProgramModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Plus, Edit2, Trash2, Users, Home, School, Search, Info, RefreshCw, CalendarRange, GraduationCap, BookOpen, School as SchoolIcon, UsersRound, ChevronDown } from 'lucide-react';
import { useGetClassGroupsQuery } from '../store/slices/classGroupApi';
import { useGetEducationsQuery } from '../store/slices/institutionApi';
import { toast } from 'react-toastify';

export default function StudentPage() {
    const navigate = useNavigate();
    const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
    const actionDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (actionDropdownRef.current && !actionDropdownRef.current.contains(e.target)) {
                setActionDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [mukimFilter, setMukimFilter] = useState('all'); // 'all', 'mukim', 'luar'
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    // Filter lanjutan dinamis
    const [periodFilter, setPeriodFilter] = useState('');
    const [programFilter, setProgramFilter] = useState('');
    const [educationFilter, setEducationFilter] = useState('');
    const [classGroupFilter, setClassGroupFilter] = useState('');

    const queryParams = {
        ...(mukimFilter === 'mukim' && { is_mukim: 'true' }),
        ...(mukimFilter === 'luar' && { is_mukim: 'false' }),
        ...(statusFilter && { status: statusFilter }),
        ...(search && { search }),
        ...(periodFilter && { period: periodFilter }),
        ...(programFilter !== '' && { program_id: programFilter }),
        ...(educationFilter && { education_id: educationFilter }),
        ...(classGroupFilter && { class_group_id: classGroupFilter }),
        all: 'true',
    };

    const { data: response, isLoading, refetch } = useGetStudentsQuery(queryParams);
    const students = response?.data || [];
    const meta = response?.meta || {};

    // Komposisi siswa dinamis dari backend (bukan angka hardcode)
    const summary = meta.summary || {};
    const filterOptions = meta.filter_options || {};
    const periods = filterOptions.periods || [];
    const programs = filterOptions.programs || [];

    // Master data untuk filter lanjutan
    const { data: classGroupsData } = useGetClassGroupsQuery({ all: 'true' });
    const classGroups = classGroupsData?.data || classGroupsData || [];
    const { data: educationsData } = useGetEducationsQuery();
    const educations = educationsData?.data || educationsData || [];

    // Reset filter turunan saat filter induk berubah
    const handleProgramChange = (v) => { setProgramFilter(v); setEducationFilter(''); setClassGroupFilter(''); };
    const handleEducationChange = (v) => { setEducationFilter(v); setClassGroupFilter(''); };

    const filterSelect = 'pl-3 pr-9 py-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white';
    const fmtPercent = (v) => (typeof v === 'number' ? `${String(v).replace('.', ',')}%` : null);
    const withPercent = (label, v) => (fmtPercent(v) ? `${label} (${fmtPercent(v)})` : label);

    const [createStudent, { isLoading: isCreating }] = useCreateStudentMutation();
    const [updateStudent, { isLoading: isUpdating }] = useUpdateStudentMutation();
    const [deleteStudent, { isLoading: isDeleting }] = useDeleteStudentMutation();
    const [pullStudents, { isLoading: isPulling }] = usePullStudentsFromSmptMutation();

    const handlePullFromSmpt = async () => {
        try {
            const res = await pullStudents().unwrap();
            toast.success(res?.message || 'Data santri berhasil ditarik dari SMPT');
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menarik data dari SMPT');
        }
    };

    const [modalOpen, setModalOpen] = useState(false);
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    const toggleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(students.map((s) => s.id));
        else setSelectedIds([]);
    };
    const toggleSelect = (id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };
    const selectedStudents = students.filter((s) => selectedIds.includes(s.id));
    const [pullModalOpen, setPullModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Form fields
    const [nis, setNis] = useState('');
    const [nisn, setNisn] = useState('');
    const [nik, setNik] = useState('');
    const [name, setName] = useState('');
    const [gender, setGender] = useState('L');
    const [isMukim, setIsMukim] = useState(false); // default form pendaftaran manual: siswa reguler luar
    const [bornIn, setBornIn] = useState('');
    const [bornAt, setBornAt] = useState('');
    const [parentName, setParentName] = useState('');
    const [parentPhone, setParentPhone] = useState('');
    const [address, setAddress] = useState('');
    const [status, setStatus] = useState('aktif');

    const openCreateModal = () => {
        setEditingItem(null);
        setNis('');
        setNisn('');
        setNik('');
        setName('');
        setGender('L');
        setIsMukim(false); // form manual dikhususkan untuk siswa luar
        setBornIn('');
        setBornAt('');
        setParentName('');
        setParentPhone('');
        setAddress('');
        setStatus('aktif');
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setNis(item.nis || '');
        setNisn(item.nisn || '');
        setNik(item.nik || '');
        setName(item.name || '');
        setGender(item.gender || 'L');
        setIsMukim(Boolean(item.is_mukim));
        setBornIn(item.born_in || '');
        setBornAt(item.born_at ? item.born_at.substring(0, 10) : '');
        setParentName(item.parent_name || '');
        setParentPhone(item.parent_phone || '');
        setAddress(item.address || '');
        setStatus(item.status || 'aktif');
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            nis,
            nisn: nisn || null,
            nik: nik || null,
            name,
            gender,
            is_mukim: isMukim,
            born_in: bornIn || null,
            born_at: bornAt || null,
            parent_name: parentName || null,
            parent_phone: parentPhone || null,
            address: address || null,
            status,
        };

        try {
            if (editingItem) {
                await updateStudent({ id: editingItem.id, ...payload }).unwrap();
                toast.success('Data siswa berhasil diperbarui');
            } else {
                await createStudent(payload).unwrap();
                toast.success('Siswa berhasil didaftarkan');
            }
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan data siswa');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteStudent(deleteTarget.id).unwrap();
            toast.success('Data siswa berhasil dihapus');
            setDeleteTarget(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus data siswa');
        }
    };

    const columns = [
        {
            key: 'nis',
            label: 'Identitas Siswa',
            render: (row) => (
                <div className="flex items-start gap-2.5">
                    <input
                        type="checkbox"
                        className="mt-1.5 w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                        checked={selectedIds.includes(row.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelect(row.id)}
                        aria-label={`Pilih ${row.name}`}
                    />
                    <div>
                    <p className="font-semibold text-slate-900">{row.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500 font-mono">NIS: {row.nis}</span>
                        {row.nisn && <span className="text-xs text-slate-400 font-mono">NISN: {row.nisn}</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            row.gender === 'L' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-rose-50 text-rose-700 border border-rose-300'
                        }`}>
                            {row.gender === 'L' ? 'L (Banin)' : 'P (Kesalahan Algoritma)'}
                        </span>
                    </div>
                </div>
                </div>
            ),
        },
        {
            key: 'mukim_type',
            label: 'Tipe Kesiswaan',
            render: (row) => (
                row.is_mukim ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Home className="w-3.5 h-3.5 text-emerald-600" />
                        Santri Mukim
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <School className="w-3.5 h-3.5 text-indigo-600" />
                        Siswa Reguler Luar
                    </span>
                )
            ),
        },
        {
            key: 'period',
            label: 'Angkatan',
            render: (row) => (
                row.period ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                        <CalendarRange className="w-3.5 h-3.5 text-violet-600" />
                        {row.period}
                    </span>
                ) : (
                    <span className="text-xs text-slate-400 italic">Belum diatur</span>
                )
            ),
        },
        {
            key: 'program_education',
            label: 'Program / Pendidikan',
            render: (row) => (
                <div className="text-xs space-y-0.5">
                    <p className="font-medium text-slate-800">
                        {row.program?.name
                            ? <>{row.program.name} <span className="text-slate-400">({row.program.code})</span></>
                            : <span className="text-slate-400 italic">Belum diatur</span>}
                    </p>
                    <p className="text-slate-500">
                        {row.active_class?.class_group?.education?.name
                            ? `Jenjang: ${row.active_class.class_group.education.name}`
                            : 'Jenjang belum diatur'}
                    </p>
                </div>
            ),
        },
        {
            key: 'class_rombel',
            label: 'Kelas / Rombel',
            render: (row) => (
                row.active_class?.class_group ? (
                    <div>
                        <p className="font-semibold text-slate-800 text-sm">{row.active_class.class_group.name}</p>
                        <p className="text-xs text-slate-500">
                            {row.active_class.class_group.academic_year?.year || 'TA belum diatur'}
                        </p>
                    </div>
                ) : (
                    <span className="text-xs text-slate-400 italic">Belum diatur</span>
                )
            ),
        },
        {
            key: 'parent',
            label: 'Wali / Orang Tua',
            render: (row) => (
                <div className="text-xs space-y-0.5">
                    <p className="text-slate-700 font-medium">{row.parent_name || '-'}</p>
                    <p className="text-slate-400">{row.parent_phone || '-'}</p>
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => {
                let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (row.status === 'lulus') badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                if (row.status === 'mutasi') badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                if (row.status === 'keluar') badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';

                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border capitalize ${badgeClass}`}>
                        {row.status || 'aktif'}
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
                        onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        title="Edit Siswa"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Hapus Siswa"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Siswa / Murid</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Daftar seluruh siswa madrasah, memisahkan perlakuan santri mukim pesantren dan murid reguler luar (kalong).
                    </p>
                </div>
                <div ref={actionDropdownRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setActionDropdownOpen((v) => !v)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#093c30] text-white font-semibold text-xs sm:text-sm rounded-md hover:bg-[#072d24] transition shadow-xs"
                    >
                        <span>Aksi Siswa</span>
                        {selectedIds.length > 0 && (
                            <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[11px] font-bold rounded-full">
                                {selectedIds.length}
                            </span>
                        )}
                        <ChevronDown className={"w-3.5 h-3.5 transition-transform duration-150 " + (actionDropdownOpen ? "rotate-180" : "")} />
                    </button>

                    {actionDropdownOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-40 animate-in fade-in">
                            <button
                                type="button"
                                onClick={() => {
                                    setActionDropdownOpen(false);
                                    openCreateModal();
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 hover:text-slate-900 transition-colors"
                            >
                                <Plus className="w-4 h-4 text-emerald-700 shrink-0" />
                                <div>
                                    <p className="font-bold">Tambah Siswa Luar</p>
                                    <p className="text-[11px] text-slate-400">Pendaftaran murid non-mukim</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setActionDropdownOpen(false);
                                    setPullModalOpen(true);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 hover:text-slate-900 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4 text-emerald-700 shrink-0" />
                                <div>
                                    <p className="font-bold">Tarik Data Santri</p>
                                    <p className="text-[11px] text-slate-400">Sinkronisasi data santri SMPT</p>
                                </div>
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            <button
                                type="button"
                                onClick={() => {
                                    setActionDropdownOpen(false);
                                    setBulkModalOpen(true);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center justify-between text-slate-700 hover:text-slate-900 transition-colors"
                            >
                                <div className="flex items-center gap-2.5">
                                    <GraduationCap className="w-4 h-4 text-violet-600 shrink-0" />
                                    <span className="font-bold">Atur Rombel</span>
                                </div>
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-violet-100 text-violet-700">
                                    {selectedIds.length}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            

            {/* Filter Lanjutan Dinamis */}
            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                        <GraduationCap className="w-4 h-4 text-emerald-600" />
                        Filter Lanjutan
                    </div>

                    <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className={filterSelect}>
                        <option value="">Semua Angkatan</option>
                        {periods.map((p) => (<option key={p} value={p}>Angkatan {p}</option>))}
                    </select>

                    <select value={programFilter} onChange={(e) => handleProgramChange(e.target.value)} className={filterSelect}>
                        <option value="">Semua Program</option>
                        <option value="0">Belum diatur</option>
                        {programs.map((pg) => (<option key={pg.id} value={pg.id}>{pg.name}</option>))}
                    </select>

                    <select value={educationFilter} onChange={(e) => handleEducationChange(e.target.value)} className={filterSelect}>
                        <option value="">Semua Jenjang Pendidikan</option>
                        {educations.map((ed) => (<option key={ed.id} value={ed.id}>{ed.name}</option>))}
                    </select>

                    <select value={classGroupFilter} onChange={(e) => setClassGroupFilter(e.target.value)} className={filterSelect}>
                        <option value="">Semua Kelas / Rombel</option>
                        {classGroups.map((cg) => (
                            <option key={cg.id} value={cg.id}>
                                {cg.name} {cg.academic_year?.year ? `(TA ${cg.academic_year.year})` : ''}
                            </option>
                        ))}
                    </select>

                    {(periodFilter || programFilter !== '' || educationFilter || classGroupFilter) && (
                        <button
                            onClick={() => { setPeriodFilter(''); setProgramFilter(''); setEducationFilter(''); setClassGroupFilter(''); }}
                            className="text-xs font-medium text-slate-500 underline hover:text-emerald-600 transition"
                        >
                            Hapus semua filter lanjutan
                        </button>
                    )}
                </div>
            </div>

            {/* Flat Tab & Tabel Kesiswaan Ramping */}
            <div className="space-y-2.5">
                <FlatTabs
                    tabs={[
                        { label: 'Semua Siswa', value: 'all' },
                        { label: withPercent('Santri Mukim', summary.mukim_percent), value: 'mukim' },
                        { label: withPercent('Siswa Luar', summary.luar_percent), value: 'luar' },
                    ]}
                    activeTab={mukimFilter}
                    onChange={(val) => setMukimFilter(val || 'all')}
                />

                {/* Pilih Semua */}
                <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-md text-xs">
                    <label className="flex items-center gap-2 font-medium text-slate-700">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                            checked={selectedIds.length === students.length && students.length > 0}
                            onChange={toggleSelectAll}
                        />
                        Pilih semua santri pada tampilan ini ({students.length})
                    </label>
                    <span className="text-slate-500">{selectedIds.length} santri terpilih</span>
                </div>

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={students}
                    isLoading={isLoading}
                    emptyMessage="Belum ada data siswa ditemukan"
                    onRowClick={(row) => navigate("/siswa/" + row.id)}
                />
            </div>

            {/* Modal Pengaturan Program / Rombel Massal */}
            <BulkAssignProgramModal
                open={bulkModalOpen}
                onClose={() => setBulkModalOpen(false)}
                selectedStudents={selectedStudents}
                onDone={() => { setSelectedIds([]); refetch(); }}
                programsFromParent={programs}
            />

            {/* Modal Penarikan Data Santri Baru (SMPT) */}
            <PullStudentsModal
                open={pullModalOpen}
                onClose={() => setPullModalOpen(false)}
                onFinish={() => refetch()}
            />

            {/* Form Modal */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Data Siswa' : 'Pendaftaran Siswa Baru'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Tipe Kesiswaan *</label>
                        <div className="mt-1 grid grid-cols-2 gap-3">
                            <label className={`flex items-center gap-2 p-3 border rounded-md cursor-pointer text-xs font-semibold ${
                                !isMukim ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 text-slate-600'
                            }`}>
                                <input
                                    type="radio"
                                    name="is_mukim"
                                    checked={!isMukim}
                                    onChange={() => setIsMukim(false)}
                                    className="text-indigo-600"
                                />
                                Siswa Reguler Luar (Kalong)
                            </label>
                            <label className={`flex items-center gap-2 p-3 border rounded-md cursor-pointer text-xs font-semibold ${
                                isMukim ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-600'
                            }`}>
                                <input
                                    type="radio"
                                    name="is_mukim"
                                    checked={isMukim}
                                    onChange={() => setIsMukim(true)}
                                    className="text-emerald-600"
                                />
                                Santri Mukim Pesantren
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Nama Lengkap Siswa *</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Muhammad Farhan"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">NIS (Nomor Induk Siswa) *</label>
                            <input
                                type="text"
                                required
                                value={nis}
                                onChange={(e) => setNis(e.target.value)}
                                placeholder="Contoh: 20260001"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">NISN</label>
                            <input
                                type="text"
                                value={nisn}
                                onChange={(e) => setNisn(e.target.value)}
                                placeholder="Contoh: 0081234567"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Jenis Kelamin *</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            >
                                <option value="L">Laki-laki (Ikhwan)</option>
                                <option value="P">Perempuan (Akhwat)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Status Siswa *</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            >
                                <option value="aktif">Aktif</option>
                                <option value="lulus">Lulus</option>
                                <option value="mutasi">Mutasi</option>
                                <option value="keluar">Keluar / Dikeluarkan</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Tempat Lahir</label>
                            <input
                                type="text"
                                value={bornIn}
                                onChange={(e) => setBornIn(e.target.value)}
                                placeholder="Jakarta"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Tanggal Lahir</label>
                            <input
                                type="date"
                                value={bornAt}
                                onChange={(e) => setBornAt(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Nama Orang Tua / Wali</label>
                            <input
                                type="text"
                                value={parentName}
                                onChange={(e) => setParentName(e.target.value)}
                                placeholder="Nama ayah / ibu / wali"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">No. WhatsApp Wali</label>
                            <input
                                type="text"
                                value={parentPhone}
                                onChange={(e) => setParentPhone(e.target.value)}
                                placeholder="08..."
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Alamat Domisili</label>
                        <textarea
                            rows={2}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Alamat tempat tinggal siswa saat ini..."
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
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
                            {isCreating || isUpdating ? 'Menyimpan...' : 'Simpan Siswa'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Data Siswa"
                message={`Yakin ingin menghapus siswa ${deleteTarget?.name}?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
