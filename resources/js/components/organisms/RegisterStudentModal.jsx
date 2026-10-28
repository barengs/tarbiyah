import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { 
    useCreateStudentMutation, 
    useUpdateStudentMutation, 
    useLazyGenerateNisQuery 
} from '../../store/slices/studentApi';
import { 
    User, 
    Users, 
    Home, 
    GraduationCap, 
    RefreshCw, 
    CheckCircle2, 
    Sparkles, 
    Info, 
    ArrowRight, 
    ArrowLeft,
    Check
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function RegisterStudentModal({ 
    open, 
    onClose, 
    editingStudent = null,
    programs = [],
    periods = []
}) {
    const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'parents', 'academic'

    // Mutasi & Query
    const [createStudent, { isLoading: isCreating }] = useCreateStudentMutation();
    const [updateStudent, { isLoading: isUpdating }] = useUpdateStudentMutation();
    const [triggerGenerateNis, { isFetching: isGeneratingNis }] = useLazyGenerateNisQuery();

    // 1. Data Kesiswaan & Kependudukan
    const [isMukim, setIsMukim] = useState(false);
    const [nis, setNis] = useState('');
    const [isAutoNis, setIsAutoNis] = useState(true);
    const [nisn, setNisn] = useState('');
    const [nik, setNik] = useState('');
    const [kk, setKk] = useState('');
    const [name, setName] = useState('');
    const [gender, setGender] = useState('L');
    const [bornIn, setBornIn] = useState('');
    const [bornAt, setBornAt] = useState('');
    const [phone, setPhone] = useState('');
    const [lastEducation, setLastEducation] = useState('');

    // 2. Data Orang Tua & Wali
    const [fatherName, setFatherName] = useState('');
    const [fatherNik, setFatherNik] = useState('');
    const [fatherJob, setFatherJob] = useState('');
    const [fatherPhone, setFatherPhone] = useState('');

    const [motherName, setMotherName] = useState('');
    const [motherNik, setMotherNik] = useState('');
    const [motherJob, setMotherJob] = useState('');
    const [motherPhone, setMotherPhone] = useState('');

    const [guardianName, setGuardianName] = useState('');
    const [guardianNik, setGuardianNik] = useState('');
    const [guardianRelation, setGuardianRelation] = useState('');
    const [guardianJob, setGuardianJob] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');

    // 3. Alamat & Penempatan
    const [address, setAddress] = useState('');
    const [village, setVillage] = useState('');
    const [district, setDistrict] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [period, setPeriod] = useState(periods[0] || '1446-1447');
    const [programId, setProgramId] = useState('');
    const [status, setStatus] = useState('Aktif');

    // Reset atau populate data saat modal dibuka
    useEffect(() => {
        if (!open) return;

        setActiveTab('personal');

        if (editingStudent) {
            setIsMukim(Boolean(editingStudent.is_mukim));
            setNis(editingStudent.nis || '');
            setIsAutoNis(false);
            setNisn(editingStudent.nisn || '');
            setNik(editingStudent.nik || '');
            setKk(editingStudent.kk || '');
            setName(editingStudent.name || '');
            setGender(editingStudent.gender || 'L');
            setBornIn(editingStudent.born_in || '');
            setBornAt(editingStudent.born_at ? editingStudent.born_at.substring(0, 10) : '');
            setPhone(editingStudent.phone || '');
            setLastEducation(editingStudent.last_education || '');

            setFatherName(editingStudent.father_name || editingStudent.parent_name || '');
            setFatherNik(editingStudent.father_nik || editingStudent.parent_id || '');
            setFatherJob(editingStudent.father_job || '');
            setFatherPhone(editingStudent.father_phone || editingStudent.parent_phone || '');

            setMotherName(editingStudent.mother_name || '');
            setMotherNik(editingStudent.mother_nik || '');
            setMotherJob(editingStudent.mother_job || '');
            setMotherPhone(editingStudent.mother_phone || '');

            setGuardianName(editingStudent.guardian_name || '');
            setGuardianNik(editingStudent.guardian_nik || '');
            setGuardianRelation(editingStudent.guardian_relation || '');
            setGuardianJob(editingStudent.guardian_job || '');
            setGuardianPhone(editingStudent.guardian_phone || '');

            setAddress(editingStudent.address || '');
            setVillage(editingStudent.village || '');
            setDistrict(editingStudent.district || '');
            setPostalCode(editingStudent.postal_code || '');
            setPeriod(editingStudent.period || periods[0] || '1446-1447');
            setProgramId(editingStudent.program_id || '');
            setStatus(editingStudent.status || 'Aktif');
        } else {
            // Mode Pendaftaran Baru
            setIsMukim(false); // default pendaftaran manual adalah siswa reguler luar
            setNis('');
            setIsAutoNis(true);
            setNisn('');
            setNik('');
            setKk('');
            setName('');
            setGender('L');
            setBornIn('');
            setBornAt('');
            setPhone('');
            setLastEducation('');

            setFatherName('');
            setFatherNik('');
            setFatherJob('');
            setFatherPhone('');

            setMotherName('');
            setMotherNik('');
            setMotherJob('');
            setMotherPhone('');

            setGuardianName('');
            setGuardianNik('');
            setGuardianRelation('');
            setGuardianJob('');
            setGuardianPhone('');

            setAddress('');
            setVillage('');
            setDistrict('');
            setPostalCode('');
            const currentPeriod = periods[0] || '1446-1447';
            setPeriod(currentPeriod);
            setProgramId('');
            setStatus('Aktif');

            // Ambil nomor induk santri otomatis dari backend
            fetchAutoNis(currentPeriod);
        }
    }, [open, editingStudent]);

    // Fungsi fetch NIS otomatis dari backend
    const fetchAutoNis = async (selectedPeriod) => {
        try {
            const res = await triggerGenerateNis({ period: selectedPeriod }).unwrap();
            if (res?.data?.nis) {
                setNis(res.data.nis);
            }
        } catch (err) {
            console.error('Gagal generate NIS otomatis:', err);
        }
    };

    // Handler ganti periode: refresh NIS otomatis jika dalam mode auto
    const handlePeriodChange = (val) => {
        setPeriod(val);
        if (isAutoNis && !editingStudent) {
            fetchAutoNis(val);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!name.trim()) {
            toast.error('Nama lengkap siswa wajib diisi');
            setActiveTab('personal');
            return;
        }

        const payload = {
            nis: nis || null,
            nisn: nisn || null,
            nik: nik || null,
            kk: kk || null,
            name: name.trim(),
            gender,
            is_mukim: isMukim,
            born_in: bornIn || null,
            born_at: bornAt || null,
            phone: phone || null,
            last_education: lastEducation || null,

            // Data Orang Tua
            father_name: fatherName || null,
            father_nik: fatherNik || null,
            father_job: fatherJob || null,
            father_phone: fatherPhone || null,

            mother_name: motherName || null,
            mother_nik: motherNik || null,
            mother_job: motherJob || null,
            mother_phone: motherPhone || null,

            guardian_name: guardianName || null,
            guardian_nik: guardianNik || null,
            guardian_relation: guardianRelation || null,
            guardian_job: guardianJob || null,
            guardian_phone: guardianPhone || null,

            // Fallback parent utama
            parent_name: fatherName || guardianName || motherName || null,
            parent_phone: fatherPhone || guardianPhone || motherPhone || null,
            parent_id: fatherNik || guardianNik || motherNik || kk || null,

            // Alamat & Akademik
            address: address || null,
            village: village || null,
            district: district || null,
            postal_code: postalCode || null,
            period: period || null,
            program_id: programId ? parseInt(programId, 10) : null,
            status,
        };

        try {
            if (editingStudent) {
                await updateStudent({ id: editingStudent.id, ...payload }).unwrap();
                toast.success('Data siswa berhasil diperbarui');
            } else {
                await createStudent(payload).unwrap();
                toast.success(`Siswa berhasil didaftarkan (NIS: ${payload.nis || 'Dibuat Sistem'})`);
            }
            onClose();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan pendaftaran siswa');
        }
    };

    const isSubmitting = isCreating || isUpdating;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={editingStudent ? "Ubah Data Siswa / Santri" : "Formulir Pendaftaran Siswa Baru"}
            maxWidth="max-w-3xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition"
                    >
                        Batal
                    </button>
                    <div className="flex items-center gap-2">
                        {activeTab !== 'personal' && (
                            <button
                                type="button"
                                onClick={() => setActiveTab(activeTab === 'academic' ? 'parents' : 'personal')}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Sebelumnya
                            </button>
                        )}
                        {activeTab !== 'academic' ? (
                            <button
                                type="button"
                                onClick={() => setActiveTab(activeTab === 'personal' ? 'parents' : 'academic')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#093c30] hover:bg-[#072d24] rounded-md transition shadow-xs"
                            >
                                Lanjut
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#093c30] hover:bg-[#072d24] rounded-md transition shadow-xs disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        {editingStudent ? 'Simpan Perubahan' : 'Daftarkan Siswa Sekarang'}
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            <div className="space-y-5">
                {/* 1. Pemilihan Tipe Kesiswaan */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Tipe Kesiswaan
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <label 
                            onClick={() => setIsMukim(false)}
                            className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all ${
                                !isMukim 
                                    ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500' 
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <input 
                                type="radio" 
                                name="isMukim" 
                                checked={!isMukim} 
                                onChange={() => setIsMukim(false)}
                                className="mt-1 text-emerald-600 focus:ring-emerald-500" 
                            />
                            <div>
                                <p className="font-bold text-xs">Siswa Reguler Luar (Kalong)</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Murid non-mukim yang bersekolah dan tidak tinggal di asrama pesantren.
                                </p>
                            </div>
                        </label>

                        <label 
                            onClick={() => setIsMukim(true)}
                            className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all ${
                                isMukim 
                                    ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500' 
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <input 
                                type="radio" 
                                name="isMukim" 
                                checked={isMukim} 
                                onChange={() => setIsMukim(true)}
                                className="mt-1 text-emerald-600 focus:ring-emerald-500" 
                            />
                            <div>
                                <p className="font-bold text-xs">Santri Mukim Pesantren</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Santri mukim penuh di pondok, mengikuti kurikulum diniyah & pengasuhan asrama.
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* 2. TAB NAVIGASI FORM */}
                <div className="flex border-b border-slate-200">
                    <button
                        type="button"
                        onClick={() => setActiveTab('personal')}
                        className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                            activeTab === 'personal'
                                ? 'border-[#093c30] text-[#093c30] bg-emerald-50/30'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <User className="w-3.5 h-3.5" />
                        1. Data Siswa &amp; Kependudukan
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('parents')}
                        className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                            activeTab === 'parents'
                                ? 'border-[#093c30] text-[#093c30] bg-emerald-50/30'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        2. Data Orang Tua &amp; Wali
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('academic')}
                        className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                            activeTab === 'academic'
                                ? 'border-[#093c30] text-[#093c30] bg-emerald-50/30'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Home className="w-3.5 h-3.5" />
                        3. Alamat &amp; Akademik
                    </button>
                </div>

                {/* 3. KONTEN TAB */}
                {/* TAB 1: IDENTITAS SISWA */}
                {activeTab === 'personal' && (
                    <div className="space-y-4 animate-in fade-in">
                        {/* Auto-NIS Card */}
                        <div className="p-3.5 bg-gradient-to-r from-emerald-50/80 to-slate-50 border border-emerald-200/80 rounded-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                            Nomor Induk Siswa (NIS)
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                                            <Sparkles className="w-3 h-3" />
                                            Otomatis Sistem (SMPT Format)
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Dibentuk otomatis berdasarkan angkatan hijriah: <code className="font-mono text-emerald-800 bg-emerald-100/60 px-1 py-0.2 rounded font-semibold">{period ? period.substring(0, 4) : '1446'}0197xxx</code>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={nis}
                                        onChange={(e) => {
                                            setNis(e.target.value);
                                            setIsAutoNis(false);
                                        }}
                                        placeholder="Generating NIS..."
                                        className="w-36 px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-sm text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fetchAutoNis(period)}
                                        disabled={isGeneratingNis}
                                        title="Generate ulang NIS otomatis"
                                        className="p-1.5 bg-white border border-slate-300 text-slate-600 hover:text-emerald-700 hover:border-emerald-500 rounded transition"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isGeneratingNis ? 'animate-spin text-emerald-600' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Nama Lengkap Siswa <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Contoh: Muhammad Farhan Al-Ghifari"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Jenis Kelamin <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                >
                                    <option value="L">Laki-laki (Banin)</option>
                                    <option value="P">Perempuan (Banat)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Nomor Induk Kependudukan (NIK)
                                </label>
                                <input
                                    type="text"
                                    maxLength="16"
                                    value={nik}
                                    onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                                    placeholder="16 digit NIK Siswa"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Nomor Kartu Keluarga (No. KK)
                                </label>
                                <input
                                    type="text"
                                    maxLength="16"
                                    value={kk}
                                    onChange={(e) => setKk(e.target.value.replace(/\D/g, ''))}
                                    placeholder="16 digit No. KK"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Tempat Lahir
                                </label>
                                <input
                                    type="text"
                                    value={bornIn}
                                    onChange={(e) => setBornIn(e.target.value)}
                                    placeholder="Kota/Kabupaten Lahir"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Tanggal Lahir
                                </label>
                                <input
                                    type="date"
                                    value={bornAt}
                                    onChange={(e) => setBornAt(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    NISN (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={nisn}
                                    onChange={(e) => setNisn(e.target.value)}
                                    placeholder="Nomor Induk Siswa Nasional"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Asal Sekolah / Madrasah Terakhir
                                </label>
                                <input
                                    type="text"
                                    value={lastEducation}
                                    onChange={(e) => setLastEducation(e.target.value)}
                                    placeholder="Contoh: MI Nurul Jadid / SDN 1"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: DATA ORANG TUA / WALI */}
                {activeTab === 'parents' && (
                    <div className="space-y-5 animate-in fade-in">
                        {/* 1. DATA AYAH */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-3">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                                Data Ayah Kandung
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Ayah</label>
                                    <input
                                        type="text"
                                        value={fatherName}
                                        onChange={(e) => setFatherName(e.target.value)}
                                        placeholder="Nama Lengkap Ayah"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">NIK Ayah</label>
                                    <input
                                        type="text"
                                        maxLength="16"
                                        value={fatherNik}
                                        onChange={(e) => setFatherNik(e.target.value.replace(/\D/g, ''))}
                                        placeholder="16 digit NIK Ayah"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pekerjaan Ayah</label>
                                    <input
                                        type="text"
                                        value={fatherJob}
                                        onChange={(e) => setFatherJob(e.target.value)}
                                        placeholder="Contoh: Wiraswasta / Guru / Petani"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">No. HP / WhatsApp Ayah</label>
                                    <input
                                        type="text"
                                        value={fatherPhone}
                                        onChange={(e) => setFatherPhone(e.target.value)}
                                        placeholder="08..."
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. DATA IBU */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-3">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-violet-600"></span>
                                Data Ibu Kandung
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Ibu</label>
                                    <input
                                        type="text"
                                        value={motherName}
                                        onChange={(e) => setMotherName(e.target.value)}
                                        placeholder="Nama Lengkap Ibu"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">NIK Ibu</label>
                                    <input
                                        type="text"
                                        maxLength="16"
                                        value={motherNik}
                                        onChange={(e) => setMotherNik(e.target.value.replace(/\D/g, ''))}
                                        placeholder="16 digit NIK Ibu"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pekerjaan Ibu</label>
                                    <input
                                        type="text"
                                        value={motherJob}
                                        onChange={(e) => setMotherJob(e.target.value)}
                                        placeholder="Contoh: Ibu Rumah Tangga / PNS"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">No. HP / WhatsApp Ibu</label>
                                    <input
                                        type="text"
                                        value={motherPhone}
                                        onChange={(e) => setMotherPhone(e.target.value)}
                                        placeholder="08..."
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. DATA WALI (OPSIONAL) */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-3">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                Data Wali Santri (Jika Berbeda dari Orang Tua)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Wali</label>
                                    <input
                                        type="text"
                                        value={guardianName}
                                        onChange={(e) => setGuardianName(e.target.value)}
                                        placeholder="Nama Lengkap Wali"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hubungan Wali</label>
                                    <input
                                        type="text"
                                        value={guardianRelation}
                                        onChange={(e) => setGuardianRelation(e.target.value)}
                                        placeholder="Contoh: Paman / Kakek / Saudara"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">No. HP / WhatsApp Wali</label>
                                    <input
                                        type="text"
                                        value={guardianPhone}
                                        onChange={(e) => setGuardianPhone(e.target.value)}
                                        placeholder="08..."
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">NIK Wali</label>
                                    <input
                                        type="text"
                                        maxLength="16"
                                        value={guardianNik}
                                        onChange={(e) => setGuardianNik(e.target.value.replace(/\D/g, ''))}
                                        placeholder="16 digit NIK Wali"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: ALAMAT & AKADEMIK */}
                {activeTab === 'academic' && (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Angkatan / Periode Masuk <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={period}
                                    onChange={(e) => handlePeriodChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                >
                                    {periods.length > 0 ? (
                                        periods.map((p) => (
                                            <option key={p} value={p}>Angkatan {p}</option>
                                        ))
                                    ) : (
                                        <option value="1446-1447">Angkatan 1446-1447</option>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Program Pendidikan Awal
                                </label>
                                <select
                                    value={programId}
                                    onChange={(e) => setProgramId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                >
                                    <option value="">-- Belum Ditentukan --</option>
                                    {programs.map((prog) => (
                                        <option key={prog.id} value={prog.id}>{prog.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Alamat Domisili / Tempat Tinggal
                            </label>
                            <textarea
                                rows="2"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Jalan, RT/RW, Dusun..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            ></textarea>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Desa / Kelurahan</label>
                                <input
                                    type="text"
                                    value={village}
                                    onChange={(e) => setVillage(e.target.value)}
                                    placeholder="Nama Desa"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Kecamatan</label>
                                <input
                                    type="text"
                                    value={district}
                                    onChange={(e) => setDistrict(e.target.value)}
                                    placeholder="Nama Kecamatan"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Kode Pos</label>
                                <input
                                    type="text"
                                    value={postalCode}
                                    onChange={(e) => setPostalCode(e.target.value)}
                                    placeholder="Kode Pos"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Status Siswa
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full sm:w-1/2 px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                            >
                                <option value="Aktif">Aktif</option>
                                <option value="Tidak Aktif">Tidak Aktif</option>
                                <option value="Lulus">Lulus</option>
                                <option value="Mutasi">Mutasi</option>
                                <option value="Keluar">Keluar</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
