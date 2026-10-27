import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    useGetTeacherByIdQuery, 
    useUpdateTeacherMutation, 
    useDeleteTeacherMutation 
} from '../../store/slices/teacherApi';
import FlatTabs from '../../components/atoms/FlatTabs';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { 
    ArrowLeft, 
    Edit2, 
    Trash2, 
    User, 
    Briefcase, 
    BookOpen, 
    Calendar, 
    Clock, 
    Phone, 
    Mail, 
    Building2, 
    GraduationCap, 
    CheckCircle2, 
    XCircle, 
    Layers, 
    Printer,
    Shield,
    UsersRound
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function TeacherDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: response, isLoading, refetch } = useGetTeacherByIdQuery(id);
    const teacher = response?.data;

    const [activeTab, setActiveTab] = useState('biodata');

    // Edit modal states
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const [updateTeacher, { isLoading: isUpdating }] = useUpdateTeacherMutation();
    const [deleteTeacher, { isLoading: isDeleting }] = useDeleteTeacherMutation();

    // Form fields
    const [name, setName] = useState('');
    const [nip, setNip] = useState('');
    const [gender, setGender] = useState('L');
    const [status, setStatus] = useState('tetap');
    const [specialization, setSpecialization] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    const openEditModal = () => {
        if (!teacher) return;
        setName(teacher.name || '');
        setNip(teacher.nip || '');
        setGender(teacher.gender || 'L');
        setStatus(teacher.status || 'tetap');
        setSpecialization(teacher.specialization || '');
        setPhone(teacher.phone || '');
        setEmail(teacher.email || '');
        setEditModalOpen(true);
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateTeacher({
                id: teacher.id,
                name,
                nip: nip || null,
                gender,
                status,
                specialization: specialization || null,
                phone: phone || null,
                email: email || null,
            }).unwrap();
            toast.success('Data guru berhasil diperbarui');
            setEditModalOpen(false);
            refetch();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal memperbarui data guru');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteTeacher(teacher.id).unwrap();
            toast.success('Data guru berhasil dihapus');
            navigate('/guru');
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus data guru');
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-6 w-48 bg-slate-200 rounded"></div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="h-96 bg-slate-200 rounded-lg"></div>
                    <div className="lg:col-span-3 h-96 bg-slate-200 rounded-lg"></div>
                </div>
            </div>
        );
    }

    if (!teacher) {
        return (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <p className="text-slate-600 font-semibold mb-4">Data guru tidak ditemukan atau telah dihapus.</p>
                <Link
                    to="/guru"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#093c30] text-white rounded-md text-sm font-semibold hover:bg-[#072d24] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Guru
                </Link>
            </div>
        );
    }

    const studies = teacher.studies || [];
    const schedules = teacher.schedules || [];
    const homeroomClasses = teacher.homeroom_class_groups || [];

    const tabs = [
        { id: 'biodata', label: 'Profil & Kepegawaian', icon: User },
        { id: 'studies', label: 'Mata Pelajaran', icon: BookOpen, count: studies.length },
        { id: 'schedules', label: 'Jadwal Mengajar', icon: Calendar, count: schedules.length },
        { id: 'homeroom', label: 'Kelas Binaan (Wali Kelas)', icon: GraduationCap, count: homeroomClasses.length },
    ];

    const dayNames = {
        1: 'Senin',
        2: 'Selasa',
        3: 'Rabu',
        4: 'Kamis',
        5: 'Jumat',
        6: 'Sabtu',
        7: 'Ahad',
    };

    return (
        <div className="space-y-5">
            {/* TOP BAR / BREADCRUMB & AKSI */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-md border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        title="Kembali"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                            <Link to="/guru" className="hover:text-[#093c30] transition-colors">Data Guru</Link>
                            <span>/</span>
                            <span className="text-slate-700 font-medium">Detail Staf & Pendidik</span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            {teacher.name}
                            <span className={`text-xs px-2 py-0.5 rounded font-semibold border ${
                                teacher.is_active 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                                {teacher.is_active ? 'Aktif Mengajar' : 'Non-Aktif'}
                            </span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        Cetak Ringkasan
                    </button>
                    <button
                        onClick={openEditModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#093c30] text-xs font-semibold text-white hover:bg-[#072d24] transition-colors shadow-2xs"
                    >
                        <Edit2 className="w-3.5 h-3.5 text-emerald-200" />
                        Edit Data Guru
                    </button>
                    <button
                        onClick={() => setDeleteConfirmOpen(true)}
                        className="p-2 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus Guru"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* KONTEN UTAMA: 2 KOLOM (PROFIL KIRI + DETAIL TAB KANAN) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* 1. KARTU PROFIL KIRI (COL 4) */}
                <div className="lg:col-span-4 space-y-5">
                    <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden">
                        {/* Header Banner Kecil */}
                        <div className="h-20 bg-gradient-to-r from-[#093c30] to-[#0f5443] relative">
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                                <div className="w-20 h-20 rounded-full border-4 border-white bg-slate-100 shadow-md flex items-center justify-center overflow-hidden text-slate-500">
                                    <User className="w-10 h-10 text-[#093c30]" />
                                </div>
                            </div>
                        </div>

                        {/* Profil Info */}
                        <div className="pt-12 p-5 text-center">
                            <h2 className="text-base font-bold text-slate-900 leading-snug">{teacher.name}</h2>
                            <p className="text-xs text-slate-500 mt-0.5">{teacher.nip ? `NIP: ${teacher.nip}` : 'NIP: Belum Terdaftar'}</p>

                            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                    teacher.status === 'tetap'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : teacher.status === 'honorer'
                                        ? 'bg-sky-50 text-sky-800 border-sky-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                    {teacher.status === 'tetap' ? 'Guru Tetap Ma\'had' : teacher.status === 'honorer' ? 'Guru Honorer' : 'Guru Luar Mandiri'}
                                </span>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    {teacher.gender === 'L' ? 'Laki-laki (Ustadz)' : 'Perempuan (Ustadzah)'}
                                </span>
                            </div>

                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-100 text-center">
                                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                    <p className="text-[10px] text-slate-500 font-medium">Mapel</p>
                                    <p className="text-base font-bold text-slate-800 mt-0.5">{studies.length}</p>
                                </div>
                                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                    <p className="text-[10px] text-slate-500 font-medium">Sesi KBM</p>
                                    <p className="text-base font-bold text-slate-800 mt-0.5">{schedules.length}</p>
                                </div>
                                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                    <p className="text-[10px] text-slate-500 font-medium">Wali Kelas</p>
                                    <p className="text-base font-bold text-slate-800 mt-0.5">{homeroomClasses.length}</p>
                                </div>
                            </div>

                            {/* Kontak Langsung */}
                            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5 text-left text-xs">
                                <div className="flex items-center gap-2.5 text-slate-600">
                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-medium truncate">{teacher.phone || 'Tidak ada no. telepon'}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-slate-600">
                                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-medium truncate">{teacher.email || 'Tidak ada email'}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-slate-600">
                                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-medium truncate">{teacher.specialization || 'Umum'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Akun Pengguna Terkait */}
                    <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-[#093c30]" />
                                Akun Login Portal
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                teacher.user ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {teacher.user ? 'Terhubung' : 'Belum Ada Akun'}
                            </span>
                        </div>
                        {teacher.user ? (
                            <div className="text-xs space-y-1.5 text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100">
                                <p><span className="text-slate-400">Username:</span> <strong className="text-slate-800">{teacher.user.name}</strong></p>
                                <p><span className="text-slate-400">Email Akun:</span> <span className="font-mono">{teacher.user.email}</span></p>
                                <p><span className="text-slate-400">Role Sistem:</span> <span className="font-semibold text-emerald-800 capitalize">{teacher.user.role || 'Asatidz'}</span></p>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400">Guru ini belum dihubungkan dengan akun login portal SIM Akademik.</p>
                        )}
                    </div>
                </div>

                {/* 2. TAB INFORMASI DETAIL KANAN (COL 8) */}
                <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden">
                    <FlatTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

                    <div className="p-6">
                        {/* TAB 1: BIODATA & KEPEGAWAIAN */}
                        {activeTab === 'biodata' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                                        <User className="w-4 h-4 text-[#093c30]" />
                                        Data Identitas Pribadi
                                    </h3>
                                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
                                        <div>
                                            <dt className="text-slate-400 font-medium">Nama Lengkap & Gelar</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{teacher.name}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">NIP / Kode Identitas</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{teacher.nip || '-'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Jenis Kelamin</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">
                                                {teacher.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Bidang Spesialisasi</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{teacher.specialization || '-'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Nomor WhatsApp / HP</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{teacher.phone || '-'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Alamat Email</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{teacher.email || '-'}</dd>
                                        </div>
                                    </dl>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-[#093c30]" />
                                        Status Kepegawaian & Sistem
                                    </h3>
                                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
                                        <div>
                                            <dt className="text-slate-400 font-medium">Kategori Guru</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5 capitalize">{teacher.status}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Status Pengajaran</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">
                                                {teacher.is_active ? 'Aktif Bertugas' : 'Tidak Aktif'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Terdaftar Sejak</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">
                                                {teacher.created_at ? new Date(teacher.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Pembaruan Terakhir</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">
                                                {teacher.updated_at ? new Date(teacher.updated_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: MATA PELAJARAN */}
                        {activeTab === 'studies' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-800">Mata Pelajaran yang Diampu</h3>
                                    <span className="text-xs text-slate-500">Total: {studies.length} mapel</span>
                                </div>

                                {studies.length === 0 ? (
                                    <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                                        Belum ada penugasan mata pelajaran untuk guru ini.
                                    </div>
                                ) : (
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-left text-xs text-slate-700">
                                            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                                <tr>
                                                    <th className="px-3.5 py-2">Kode</th>
                                                    <th className="px-3.5 py-2">Nama Mata Pelajaran</th>
                                                    <th className="px-3.5 py-2">Lembaga / Jenjang</th>
                                                    <th className="px-3.5 py-2">KKM</th>
                                                    <th className="px-3.5 py-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {studies.map((s) => (
                                                    <tr key={s.id} className="hover:bg-slate-50/50">
                                                        <td className="px-3.5 py-2 font-mono font-semibold text-slate-600">{s.code || '-'}</td>
                                                        <td className="px-3.5 py-2 font-bold text-slate-900">{s.name}</td>
                                                        <td className="px-3.5 py-2 text-slate-600">{s.educational_institution?.name || '-'}</td>
                                                        <td className="px-3.5 py-2 font-semibold text-emerald-800">{s.kkm}</td>
                                                        <td className="px-3.5 py-2">
                                                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                                Aktif
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: JADWAL KBM */}
                        {activeTab === 'schedules' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-800">Jadwal Pelajaran KBM Mingguan</h3>
                                    <span className="text-xs text-slate-500">Total: {schedules.length} sesi pertemuan</span>
                                </div>

                                {schedules.length === 0 ? (
                                    <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                                        Belum ada jadwal mengajar yang dialokasikan untuk guru ini.
                                    </div>
                                ) : (
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-left text-xs text-slate-700">
                                            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                                <tr>
                                                    <th className="px-3.5 py-2">Hari</th>
                                                    <th className="px-3.5 py-2">Jam Ke / Waktu</th>
                                                    <th className="px-3.5 py-2">Mata Pelajaran</th>
                                                    <th className="px-3.5 py-2">Rombel / Kelas</th>
                                                    <th className="px-3.5 py-2">Ruang Belajar</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {schedules.map((sch) => (
                                                    <tr key={sch.id} className="hover:bg-slate-50/50">
                                                        <td className="px-3.5 py-2 font-bold text-[#093c30]">
                                                            {dayNames[sch.day] || `Hari-${sch.day}`}
                                                        </td>
                                                        <td className="px-3.5 py-2 font-medium">
                                                            {sch.lesson_hour ? `${sch.lesson_hour.name} (${sch.lesson_hour.start_time} - ${sch.lesson_hour.end_time})` : '-'}
                                                        </td>
                                                        <td className="px-3.5 py-2 font-semibold text-slate-900">{sch.study?.name || '-'}</td>
                                                        <td className="px-3.5 py-2 font-medium text-slate-800">{sch.class_group?.name || '-'}</td>
                                                        <td className="px-3.5 py-2 text-slate-500">{sch.classroom?.name || 'Ruang Standar'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 4: WALI KELAS */}
                        {activeTab === 'homeroom' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-800">Tugas Pembinaan Rombel (Wali Kelas)</h3>
                                    <span className="text-xs text-slate-500">Total: {homeroomClasses.length} rombel</span>
                                </div>

                                {homeroomClasses.length === 0 ? (
                                    <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                                        Guru ini saat ini tidak ditugaskan sebagai wali kelas di rombel manapun.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {homeroomClasses.map((cls) => (
                                            <div key={cls.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-bold text-slate-900 text-sm">{cls.name}</h4>
                                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                        Wali Kelas Aktif
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">Jenjang: {cls.education?.name || '-'}</p>
                                                <p className="text-xs text-slate-500">Tahun Akademik: {cls.academic_year?.name || '-'}</p>
                                                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                                                    <span className="text-slate-500">Kapasitas: {cls.capacity || 40} santri</span>
                                                    <Link 
                                                        to={`/kurikulum/rombel`} 
                                                        className="font-semibold text-[#093c30] hover:underline"
                                                    >
                                                        Buka Rombel &rarr;
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL EDIT GURU */}
            <Modal
                open={editModalOpen}
                title="Edit Data Guru"
                onClose={() => setEditModalOpen(false)}
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => setEditModalOpen(false)}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            form="edit-teacher-form"
                            disabled={isUpdating}
                            className="px-4 py-2 text-xs font-semibold text-white bg-[#093c30] hover:bg-[#072d24] rounded-md transition-colors disabled:opacity-50"
                        >
                            {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </>
                }
            >
                <form id="edit-teacher-form" onSubmit={handleUpdateSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
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
                            <label className="block text-xs font-bold text-slate-700 mb-1">Bidang Keahlian</label>
                            <input
                                type="text"
                                value={specialization}
                                onChange={(e) => setSpecialization(e.target.value)}
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
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* CONFIRM DELETE */}
            <ConfirmDialog
                open={deleteConfirmOpen}
                title="Hapus Data Guru"
                message={`Apakah Anda yakin ingin menghapus data guru "${teacher.name}"? Jadwal mengajar dan penugasan terkait akan terpengaruh.`}
                confirmLabel={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                onConfirm={handleDelete}
                onCancel={() => setDeleteConfirmOpen(false)}
            />
        </div>
    );
}
