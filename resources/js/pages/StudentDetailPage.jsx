import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    useGetStudentByIdQuery, 
    useUpdateStudentMutation, 
    useDeleteStudentMutation 
} from '../store/slices/studentApi';
import FlatTabs from '../components/atoms/FlatTabs';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { 
    ArrowLeft, 
    Edit2, 
    Trash2, 
    User, 
    Users, 
    Home, 
    School, 
    Calendar, 
    Phone, 
    MapPin, 
    FileText, 
    GraduationCap, 
    BookOpen, 
    Printer, 
    ShieldCheck, 
    Building2,
    Clock,
    HeartHandshake
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function StudentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: response, isLoading, refetch } = useGetStudentByIdQuery(id);
    const student = response?.data;

    const [activeTab, setActiveTab] = useState('biodata');

    // Modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const [updateStudent, { isLoading: isUpdating }] = useUpdateStudentMutation();
    const [deleteStudent, { isLoading: isDeleting }] = useDeleteStudentMutation();

    // Form fields for edit
    const [name, setName] = useState('');
    const [nis, setNis] = useState('');
    const [nik, setNik] = useState('');
    const [kk, setKk] = useState('');
    const [gender, setGender] = useState('L');
    const [isMukim, setIsMukim] = useState(true);
    const [bornIn, setBornIn] = useState('');
    const [bornAt, setBornAt] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [village, setVillage] = useState('');
    const [district, setDistrict] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [parentName, setParentName] = useState('');
    const [parentPhone, setParentPhone] = useState('');
    const [status, setStatus] = useState('Aktif');

    const openEditModal = () => {
        if (!student) return;
        setName(student.name || '');
        setNis(student.nis || '');
        setNik(student.nik || '');
        setKk(student.kk || '');
        setGender(student.gender || 'L');
        setIsMukim(student.is_mukim ?? true);
        setBornIn(student.born_in || '');
        setBornAt(student.born_at ? student.born_at.substring(0, 10) : '');
        setPhone(student.phone || '');
        setAddress(student.address || '');
        setVillage(student.village || '');
        setDistrict(student.district || '');
        setPostalCode(student.postal_code || '');
        setParentName(student.parent_name || '');
        setParentPhone(student.parent_phone || '');
        setStatus(student.status || 'Aktif');
        setEditModalOpen(true);
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateStudent({
                id: student.id,
                name,
                nis,
                nik: nik || null,
                kk: kk || null,
                gender,
                is_mukim: isMukim,
                born_in: bornIn || null,
                born_at: bornAt || null,
                phone: phone || null,
                address: address || null,
                village: village || null,
                district: district || null,
                postal_code: postalCode || null,
                parent_name: parentName || null,
                parent_phone: parentPhone || null,
                status,
            }).unwrap();
            toast.success('Data siswa berhasil diperbarui');
            setEditModalOpen(false);
            refetch();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal memperbarui data siswa');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteStudent(student.id).unwrap();
            toast.success('Data siswa berhasil dihapus');
            navigate('/siswa');
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus data siswa');
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-6 w-48 bg-slate-200 rounded"></div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4 h-96 bg-slate-200 rounded-lg"></div>
                    <div className="lg:col-span-8 h-96 bg-slate-200 rounded-lg"></div>
                </div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <p className="text-slate-600 font-semibold mb-4">Data siswa tidak ditemukan atau telah dihapus.</p>
                <Link
                    to="/siswa"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#093c30] text-white rounded-md text-sm font-semibold hover:bg-[#072d24] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Siswa
                </Link>
            </div>
        );
    }

    const activeClass = student.active_class;
    const currentClassGroup = activeClass?.class_group;
    const classHistories = student.student_classes || [];

    const tabs = [
        { id: 'biodata', label: 'Biodata Siswa', icon: User },
        { id: 'parent', label: 'Orang Tua / Wali', icon: HeartHandshake },
        { id: 'academic', label: 'Akademik & Rombel', icon: School, count: classHistories.length },
        { id: 'pesantren', label: 'Kepesantrenan', icon: Home },
    ];

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
                            <Link to="/siswa" className="hover:text-[#093c30] transition-colors">Data Siswa & Santri</Link>
                            <span>/</span>
                            <span className="text-slate-700 font-medium">Detail Santri</span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            {student.name}
                            <span className={`text-xs px-2 py-0.5 rounded font-semibold border ${
                                student.status === 'Aktif' || student.status === 'aktif'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                                {student.status}
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
                        Cetak Biodata
                    </button>
                    <button
                        onClick={openEditModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#093c30] text-xs font-semibold text-white hover:bg-[#072d24] transition-colors shadow-2xs"
                    >
                        <Edit2 className="w-3.5 h-3.5 text-emerald-200" />
                        Edit Data Siswa
                    </button>
                    <button
                        onClick={() => setDeleteConfirmOpen(true)}
                        className="p-2 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus Siswa"
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
                        {/* Header Banner */}
                        <div className="h-20 bg-gradient-to-r from-[#093c30] to-[#0f5443] relative">
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                                <div className="w-20 h-20 rounded-full border-4 border-white bg-slate-100 shadow-md flex items-center justify-center overflow-hidden text-slate-500">
                                    <User className="w-10 h-10 text-[#093c30]" />
                                </div>
                            </div>
                        </div>

                        {/* Profil Info */}
                        <div className="pt-12 p-5 text-center">
                            <h2 className="text-base font-bold text-slate-900 leading-snug">{student.name}</h2>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">NIS: {student.nis}</p>

                            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                    student.is_mukim 
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                    {student.is_mukim ? 'Santri Mukim (Asrama)' : 'Siswa Reguler Luar'}
                                </span>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                    student.gender === 'L' 
                                        ? 'bg-sky-50 text-sky-800 border-sky-200' 
                                        : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}>
                                    {student.gender === 'L' ? 'Laki-laki (Banin)' : 'Perempuan (Banat)'}
                                </span>
                            </div>

                            {/* Rombel Aktif Saat Ini */}
                            <div className="mt-5 p-3 rounded-lg border border-emerald-200/60 bg-emerald-50/30 text-left">
                                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                                    Rombel & Kelas Aktif
                                </span>
                                {currentClassGroup ? (
                                    <div className="mt-1">
                                        <p className="text-sm font-bold text-slate-900">{currentClassGroup.name}</p>
                                        <p className="text-xs text-slate-600 mt-0.5">
                                            Jenjang: {currentClassGroup.education?.name || '-'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Wali Kelas: {currentClassGroup.homeroom_teacher?.name || '-'}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-amber-700 italic mt-1">Belum ditempatkan di rombel aktif.</p>
                                )}
                            </div>

                            {/* Quick Info Kontak */}
                            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5 text-left text-xs">
                                <div className="flex items-center gap-2.5 text-slate-600">
                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-medium truncate">{student.phone || 'Tidak ada no. telepon'}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-slate-600">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-medium truncate">{student.address || student.district || 'Alamat belum diisi'}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-slate-600">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-medium truncate">Angkatan: {student.period || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sinkronisasi SMPT & Emis */}
                    <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#093c30]" />
                                Sinkronisasi Kepesantrenan
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700">
                                Tersinkron
                            </span>
                        </div>
                        <div className="text-xs space-y-1.5 text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100">
                            <p><span className="text-slate-400">ID Santri SMPT:</span> <strong className="text-slate-800">{student.santri_id || '-'}</strong></p>
                            <p><span className="text-slate-400">Program:</span> <span className="font-semibold text-slate-800">{student.program?.name || 'Program Reguler'}</span></p>
                            <p><span className="text-slate-400">Kamar Asrama:</span> <span className="font-semibold text-slate-800">{student.hostel_id ? `Asrama #${student.hostel_id}` : 'Non-Asrama'}</span></p>
                        </div>
                    </div>
                </div>

                {/* 2. TAB INFORMASI DETAIL KANAN (COL 8) */}
                <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden">
                    <FlatTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

                    <div className="p-6">
                        {/* TAB 1: BIODATA LENGKAP */}
                        {activeTab === 'biodata' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                                        <User className="w-4 h-4 text-[#093c30]" />
                                        Data Identitas Santri
                                    </h3>
                                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
                                        <div>
                                            <dt className="text-slate-400 font-medium">Nama Lengkap</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{student.name}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">NIS / NISN</dt>
                                            <dd className="text-slate-800 font-semibold font-mono mt-0.5">{student.nis}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">NIK Kependudukan</dt>
                                            <dd className="text-slate-800 font-semibold font-mono mt-0.5">{student.nik || '-'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Nomor Kartu Keluarga (KK)</dt>
                                            <dd className="text-slate-800 font-semibold font-mono mt-0.5">{student.kk || '-'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Tempat, Tanggal Lahir</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">
                                                {student.born_in || '-'}, {student.born_at ? new Date(student.born_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Jenis Kelamin</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">
                                                {student.gender === 'L' ? 'Laki-laki (Banin)' : 'Perempuan (Banat)'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Pendidikan Terakhir / Asal</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{student.last_education || '-'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Angkatan / Periode Masuk</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{student.period || '-'}</dd>
                                        </div>
                                    </dl>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-[#093c30]" />
                                        Alamat & Kontak Tempat Tinggal
                                    </h3>
                                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
                                        <div className="sm:col-span-2">
                                            <dt className="text-slate-400 font-medium">Alamat Lengkap</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{student.address || '-'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Desa / Kelurahan</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{student.village || '-'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Kecamatan</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{student.district || '-'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Kode Pos</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{student.postal_code || '-'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Nomor WhatsApp / HP Santri</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{student.phone || '-'}</dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: DATA ORANG TUA / WALI */}
                        {activeTab === 'parent' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                                        <HeartHandshake className="w-4 h-4 text-[#093c30]" />
                                        Identitas Orang Tua / Wali Santri
                                    </h3>
                                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
                                        <div>
                                            <dt className="text-slate-400 font-medium">Nama Orang Tua / Wali</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{student.parent_name || 'Belum Dicatat'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Nomor WhatsApp / Telepon Wali</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{student.parent_phone || '-'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">NIK / ID Wali</dt>
                                            <dd className="text-slate-800 font-semibold font-mono mt-0.5">{student.parent_id || '-'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Alamat Orang Tua / Wali</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{student.address || '-'}</dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: AKADEMIK & RIWAYAT ROMBEL */}
                        {activeTab === 'academic' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-800">Riwayat Penempatan Kelas & Rombel</h3>
                                    <span className="text-xs text-slate-500">Total: {classHistories.length} riwayat</span>
                                </div>

                                {classHistories.length === 0 ? (
                                    <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                                        Belum ada riwayat rombel tercatat untuk siswa ini.
                                    </div>
                                ) : (
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-left text-xs text-slate-700">
                                            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                                <tr>
                                                    <th className="px-3.5 py-2">Tahun Ajaran</th>
                                                    <th className="px-3.5 py-2">Rombel / Kelas</th>
                                                    <th className="px-3.5 py-2">Jenjang</th>
                                                    <th className="px-3.5 py-2">Wali Kelas</th>
                                                    <th className="px-3.5 py-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {classHistories.map((h) => {
                                                    const cg = h.class_group;
                                                    const isCurrent = h.status === 'Aktif' || h.status === 'aktif';
                                                    return (
                                                        <tr key={h.id} className={isCurrent ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}>
                                                            <td className="px-3.5 py-2 font-medium">{cg?.academic_year?.name || '-'}</td>
                                                            <td className="px-3.5 py-2 font-bold text-slate-900">{cg?.name || '-'}</td>
                                                            <td className="px-3.5 py-2 text-slate-600">{cg?.education?.name || '-'}</td>
                                                            <td className="px-3.5 py-2 text-slate-600">{cg?.homeroom_teacher?.name || '-'}</td>
                                                            <td className="px-3.5 py-2">
                                                                <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                                                                    isCurrent 
                                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                                                }`}>
                                                                    {h.status || 'Selesai'}
                                                                </span>
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

                        {/* TAB 4: KEPESANTRENAN */}
                        {activeTab === 'pesantren' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                                        <Home className="w-4 h-4 text-[#093c30]" />
                                        Status Domisili & Asrama Santri
                                    </h3>
                                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
                                        <div>
                                            <dt className="text-slate-400 font-medium">Status Tinggal</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">
                                                {student.is_mukim ? 'Mukim di Pesantren (Santri Asrama)' : 'Reguler / Pulang-Pergi (Non-Mukim)'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Program Pendidikan Pondok</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">{student.program?.name || 'Program Reguler Ma\'had'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">Alokasi Kamar / Asrama</dt>
                                            <dd className="text-slate-800 font-semibold mt-0.5">
                                                {student.hostel_id ? `Gedung Asrama #${student.hostel_id}` : 'Belum Ditentukan'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-400 font-medium">ID Referensi Sistem SMPT</dt>
                                            <dd className="text-slate-800 font-semibold font-mono mt-0.5">{student.santri_id || '-'}</dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL EDIT SISWA */}
            <Modal
                open={editModalOpen}
                title="Edit Data Siswa"
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
                            form="edit-student-form"
                            disabled={isUpdating}
                            className="px-4 py-2 text-xs font-semibold text-white bg-[#093c30] hover:bg-[#072d24] rounded-md transition-colors disabled:opacity-50"
                        >
                            {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </>
                }
            >
                <form id="edit-student-form" onSubmit={handleUpdateSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Nama Lengkap <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                NIS (Nomor Induk) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={nis}
                                onChange={(e) => setNis(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">NIK Santri</label>
                            <input
                                type="text"
                                value={nik}
                                onChange={(e) => setNik(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Kartu Keluarga (KK)</label>
                            <input
                                type="text"
                                value={kk}
                                onChange={(e) => setKk(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none bg-white"
                            >
                                <option value="L">Laki-laki (Banin)</option>
                                <option value="P">Perempuan (Banat)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Status Mukim</label>
                            <select
                                value={isMukim ? 'true' : 'false'}
                                onChange={(e) => setIsMukim(e.target.value === 'true')}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none bg-white"
                            >
                                <option value="true">Santri Mukim (Asrama)</option>
                                <option value="false">Siswa Reguler Luar (Pulang-Pergi)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Tempat Lahir</label>
                            <input
                                type="text"
                                value={bornIn}
                                onChange={(e) => setBornIn(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Lahir</label>
                            <input
                                type="date"
                                value={bornAt}
                                onChange={(e) => setBornAt(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Orang Tua / Wali</label>
                            <input
                                type="text"
                                value={parentName}
                                onChange={(e) => setParentName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">No. HP / WA Wali</label>
                            <input
                                type="text"
                                value={parentPhone}
                                onChange={(e) => setParentPhone(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Tinggal</label>
                        <textarea
                            rows={2}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none"
                        />
                    </div>
                </form>
            </Modal>

            {/* CONFIRM DELETE */}
            <ConfirmDialog
                open={deleteConfirmOpen}
                title="Hapus Data Siswa"
                message={`Apakah Anda yakin ingin menghapus data siswa "${student.name}" (NIS: ${student.nis})?`}
                confirmLabel={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                onConfirm={handleDelete}
                onCancel={() => setDeleteConfirmOpen(false)}
            />
        </div>
    );
}
