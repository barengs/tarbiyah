import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    useGetTeachersQuery, 
    useCreateTeacherMutation, 
    useUpdateTeacherMutation, 
    useDeleteTeacherMutation 
} from '../../store/slices/teacherApi';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import AssignStudyModal from '../../components/organisms/AssignStudyModal';
import { Plus, Edit2, Trash2, ShieldAlert, BookOpen, PlusCircle } from 'lucide-react';
import { toast } from 'react-toastify';

export default function TeacherPage() {
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState('');
    const { data: response, isLoading, refetch } = useGetTeachersQuery(
        statusFilter ? { status: statusFilter } : undefined
    );
    const teachers = response?.data || [];

    const [createTeacher, { isLoading: isCreating }] = useCreateTeacherMutation();
    const [updateTeacher, { isLoading: isUpdating }] = useUpdateTeacherMutation();
    const [deleteTeacher, { isLoading: isDeleting }] = useDeleteTeacherMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Penugasan Mata Pelajaran Modal
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedTeacherForAssign, setSelectedTeacherForAssign] = useState(null);

    const openAssignModal = (teacher) => {
        setSelectedTeacherForAssign(teacher);
        setAssignModalOpen(true);
    };

    // Form fields
    const [name, setName] = useState('');
    const [nip, setNip] = useState('');
    const [gender, setGender] = useState('L');
    const [status, setStatus] = useState('tetap');
    const [specialization, setSpecialization] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setNip('');
        setGender('L');
        setStatus('tetap');
        setSpecialization('');
        setPhone('');
        setEmail('');
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name || '');
        setNip(item.nip || '');
        setGender(item.gender || 'L');
        setStatus(item.status || 'tetap');
        setSpecialization(item.specialization || '');
        setPhone(item.phone || '');
        setEmail(item.email || '');
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name,
            nip: nip || null,
            gender,
            status,
            specialization: specialization || null,
            phone: phone || null,
            email: email || null,
        };

        try {
            if (editingItem) {
                await updateTeacher({ id: editingItem.id, ...payload }).unwrap();
                toast.success('Data guru berhasil diperbarui');
            } else {
                await createTeacher(payload).unwrap();
                toast.success('Guru baru berhasil didaftarkan');
            }
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan data guru');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteTeacher(deleteTarget.id).unwrap();
            toast.success('Data guru berhasil dihapus');
            setDeleteTarget(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus data guru');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Nama & NIP',
            render: (row) => (
                <div>
                    <p className="font-semibold text-slate-900">{row.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{row.nip ? `NIP: ${row.nip}` : 'NIP: -'}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            row.gender === 'L' ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                            {row.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Kategori Status',
            render: (row) => {
                let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                let label = 'Guru Tetap';
                if (row.status === 'luar') {
                    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                    label = 'Guru Luar (Mandiri)';
                } else if (row.status === 'honorer') {
                    badgeClass = 'bg-sky-50 text-sky-700 border-sky-200';
                    label = 'Honorer';
                }
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${badgeClass}`}>
                        {label}
                    </span>
                );
            },
        },
        {
            key: 'specialization',
            label: 'Bidang Keahlian',
            render: (row) => (
                <span className="text-xs text-slate-600 font-medium">
                    {row.specialization || '-'}
                </span>
            ),
        },
        {
            key: 'studies',
            label: 'Mata Pelajaran Diampu',
            render: (row) => {
                const studies = row.studies || [];
                if (studies.length === 0) {
                    return (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                openAssignModal(row);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors cursor-pointer group shadow-2xs"
                            title="Klik untuk menugaskan mata pelajaran ke guru ini"
                        >
                            <PlusCircle className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                            + Tugaskan Mapel
                        </button>
                    );
                }

                return (
                    <div className="flex flex-wrap items-center gap-1 max-w-xs">
                        {studies.slice(0, 2).map((s) => (
                            <span
                                key={s.id}
                                className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                            >
                                {s.name}
                            </span>
                        ))}
                        {studies.length > 2 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-[#093c30] border border-emerald-200">
                                +{studies.length - 2} lagi
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                openAssignModal(row);
                            }}
                            className="p-1 text-slate-400 hover:text-[#093c30] hover:bg-slate-100 rounded transition-colors"
                            title="Ubah Penugasan Mapel"
                        >
                            <Edit2 className="w-3 h-3" />
                        </button>
                    </div>
                );
            },
        },
        {
            key: 'contact',
            label: 'Kontak',
            render: (row) => (
                <div className="text-xs space-y-0.5">
                    <p className="text-slate-700 font-medium">{row.phone || '-'}</p>
                    <p className="text-slate-400">{row.email || '-'}</p>
                </div>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={(e) => { e.stopPropagation(); openAssignModal(row); }}
                        className="p-1.5 text-slate-500 hover:text-[#093c30] hover:bg-emerald-50 rounded-md transition-colors"
                        title="Tugaskan / Kelola Mapel"
                    >
                        <BookOpen className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        title="Edit Guru"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Hapus Guru"
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
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Guru & Pendidik</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola data dewan asatidz pesantren, guru formal, dan tenaga pengajar luar (mandiri).
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#093c30] text-white text-sm font-semibold rounded-md hover:bg-[#072d24] transition-colors shadow-sm self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    Daftarkan Guru Baru
                </button>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">Filter Status:</span>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs border border-slate-300 rounded-md px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#093c30]"
                >
                    <option value="">Semua Status Guru</option>
                    <option value="tetap">Guru Tetap Pesantren</option>
                    <option value="honorer">Honorer</option>
                    <option value="luar">Guru Luar (Mandiri)</option>
                </select>
            </div>

            {/* Note banner */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                    <span className="font-bold">Akses Guru Luar:</span> Guru bertipe <em>Guru Luar</em> dapat masuk langsung melalui portal login mandiri tanpa melihat modul-modul kepesantrenan (kamtib, asrama, perizinan) sehingga antarmuka tetap bersih dan fokus pada KBM, absensi, serta input nilai.
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={teachers}
                isLoading={isLoading}
                emptyMessage="Belum ada data guru terdaftar"
                onRowClick={(row) => navigate("/guru/" + row.id)}
            />

            {/* Form Modal Tambah / Edit Guru */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Data Guru' : 'Daftarkan Guru Baru'}
                onClose={() => setModalOpen(false)}
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            form="teacher-form"
                            disabled={isCreating || isUpdating}
                            className="px-4 py-2 text-xs font-semibold text-white bg-[#093c30] hover:bg-[#072d24] rounded-md transition-colors disabled:opacity-50"
                        >
                            {isCreating || isUpdating ? 'Menyimpan...' : 'Simpan Data'}
                        </button>
                    </>
                }
            >
                <form id="teacher-form" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Ust. M. Rofiq, S.Pd.I"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">NIP / Kode Identitas</label>
                            <input
                                type="text"
                                value={nip}
                                onChange={(e) => setNip(e.target.value)}
                                placeholder="Opsional (misal: 198501...)"
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none bg-white"
                            >
                                <option value="L">Laki-laki (Ustadz)</option>
                                <option value="P">Perempuan (Ustadzah)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Status Kepegawaian</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none bg-white"
                            >
                                <option value="tetap">Guru Tetap Pesantren</option>
                                <option value="honorer">Guru Honorer</option>
                                <option value="luar">Guru Luar (Mandiri)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Bidang Keahlian / Jurusan</label>
                            <input
                                type="text"
                                value={specialization}
                                onChange={(e) => setSpecialization(e.target.value)}
                                placeholder="Contoh: Fiqih / Matematika"
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Telepon / WA</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="08xxxxxxxxxx"
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="guru@pesantren.id"
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Modal Penugasan Mata Pelajaran */}
            <AssignStudyModal
                open={assignModalOpen}
                onClose={() => {
                    setAssignModalOpen(false);
                    setSelectedTeacherForAssign(null);
                }}
                teacher={selectedTeacherForAssign}
                onSuccess={refetch}
            />

            {/* Confirm Dialog Hapus */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Data Guru"
                message={`Apakah Anda yakin ingin menghapus data guru "${deleteTarget?.name}"?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
