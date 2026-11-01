import React, { useState } from 'react';
import { 
    useGetInstitutionsQuery, 
    useCreateInstitutionMutation, 
    useUpdateInstitutionMutation, 
    useDeleteInstitutionMutation,
    useGetEducationsQuery,
    useCreateEducationMutation,
    useDeleteEducationMutation
} from '../../store/slices/institutionApi';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { 
    Plus, 
    Edit2, 
    Trash2, 
    Layers, 
    Building2, 
    Upload, 
    Image as ImageIcon, 
    Phone, 
    Mail, 
    MapPin, 
    Calendar, 
    CheckCircle2, 
    X
} from 'lucide-react';
import { toast } from 'react-toastify';

const PROGRESSION_TYPES = {
    triwulan: {
        label: 'Triwulanan (Pesantren Salaf / Diniyah)',
        badgeLabel: 'Triwulanan (Pesantren)',
        badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        desc: 'Evaluasi hasil belajar per triwulan (Triwulan I s/d IV) dan penentuan kenaikan kelas pada akhir Triwulan IV.',
    },
    semester: {
        label: 'Semesteran (Formal - SMP/SMA/MTs/MA)',
        badgeLabel: 'Semesteran (Formal)',
        badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
        desc: 'Kenaikan kelas berlangsung setahun sekali / berbasis semester genap.',
    },
    leveling: {
        label: 'Leveling Dinamis (Tahfidz / Milestone Mingguan)',
        badgeLabel: 'Leveling Dinamis (Tahfidz)',
        badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
        desc: 'Santri dapat naik level sewaktu-waktu ketika target setoran/hafalan tercapai.',
    },
};

export default function InstitutionPage() {
    const { data: response, isLoading } = useGetInstitutionsQuery();
    const institutions = response?.data || [];

    const [createInstitution, { isLoading: isCreating }] = useCreateInstitutionMutation();
    const [updateInstitution, { isLoading: isUpdating }] = useUpdateInstitutionMutation();
    const [deleteInstitution, { isLoading: isDeleting }] = useDeleteInstitutionMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [selectedInstForDetail, setSelectedInstForDetail] = useState(null);

    // Form state
    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [progressionType, setProgressionType] = useState('triwulan');
    const [regNumber, setRegNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');

    // Logo & Letterhead state
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [removeLogo, setRemoveLogo] = useState(false);

    const [letterheadFile, setLetterheadFile] = useState(null);
    const [letterheadPreview, setLetterheadPreview] = useState(null);
    const [removeLetterhead, setRemoveLetterhead] = useState(false);

    // Jenjang management modal state
    const [selectedInstForLevels, setSelectedInstForLevels] = useState(null);
    const [newLevelName, setNewLevelName] = useState('');
    const [newLevelOrder, setNewLevelOrder] = useState(1);
    const { data: educationsRes } = useGetEducationsQuery(selectedInstForLevels?.id, {
        skip: !selectedInstForLevels,
    });
    const educations = educationsRes?.data || [];
    const [createEducation] = useCreateEducationMutation();
    const [deleteEducation] = useDeleteEducationMutation();

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setShortName('');
        setProgressionType('triwulan');
        setRegNumber('');
        setPhone('');
        setEmail('');
        setAddress('');
        setLogoFile(null);
        setLogoPreview(null);
        setRemoveLogo(false);
        setLetterheadFile(null);
        setLetterheadPreview(null);
        setRemoveLetterhead(false);
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name || '');
        setShortName(item.short_name || '');
        setProgressionType(item.progression_type || 'triwulan');
        setRegNumber(item.registration_number || '');
        setPhone(item.phone || '');
        setEmail(item.email || '');
        setAddress(item.address || '');

        setLogoFile(null);
        setLogoPreview(item.logo_url || (item.logo ? `/storage/${item.logo}` : null));
        setRemoveLogo(false);

        setLetterheadFile(null);
        setLetterheadPreview(item.letterhead_url || (item.letterhead ? `/storage/${item.letterhead}` : null));
        setRemoveLetterhead(false);

        setModalOpen(true);
    };

    const handleLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('File logo harus berupa gambar (PNG, JPG, SVG, WebP)');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                toast.error('Ukuran logo maksimal 2 MB');
                return;
            }
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
            setRemoveLogo(false);
        }
    };

    const handleLetterheadChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('File kop surat harus berupa gambar (PNG, JPG, WebP)');
                return;
            }
            if (file.size > 4 * 1024 * 1024) {
                toast.error('Ukuran kop surat maksimal 4 MB');
                return;
            }
            setLetterheadFile(file);
            setLetterheadPreview(URL.createObjectURL(file));
            setRemoveLetterhead(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', name);
        if (shortName) formData.append('short_name', shortName);
        formData.append('progression_type', progressionType);
        if (regNumber) formData.append('registration_number', regNumber);
        if (phone) formData.append('phone', phone);
        if (email) formData.append('email', email);
        if (address) formData.append('address', address);

        if (logoFile) {
            formData.append('logo', logoFile);
        } else if (removeLogo) {
            formData.append('remove_logo', '1');
        }

        if (letterheadFile) {
            formData.append('letterhead', letterheadFile);
        } else if (removeLetterhead) {
            formData.append('remove_letterhead', '1');
        }

        try {
            if (editingItem) {
                await updateInstitution({ id: editingItem.id, body: formData }).unwrap();
                toast.success('Institusi berhasil diperbarui');
            } else {
                await createInstitution(formData).unwrap();
                toast.success('Institusi berhasil ditambahkan');
            }
            setModalOpen(false);
            if (selectedInstForDetail && editingItem && selectedInstForDetail.id === editingItem.id) {
                setSelectedInstForDetail((prev) => ({
                    ...prev,
                    name,
                    short_name: shortName,
                    progression_type: progressionType,
                    registration_number: regNumber,
                    phone,
                    email,
                    address,
                    logo_url: logoPreview,
                    letterhead_url: letterheadPreview,
                }));
            }
        } catch (err) {
            toast.error(err.data?.message || 'Gagal menyimpan institusi');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteInstitution(deleteTarget.id).unwrap();
            toast.success('Institusi berhasil dihapus');
            if (selectedInstForDetail?.id === deleteTarget.id) {
                setSelectedInstForDetail(null);
            }
            setDeleteTarget(null);
        } catch (err) {
            toast.error(err.data?.message || 'Gagal menghapus institusi');
        }
    };

    const handleAddEducation = async (e) => {
        e.preventDefault();
        if (!newLevelName) return;
        try {
            await createEducation({
                educational_institution_id: selectedInstForLevels.id,
                name: newLevelName,
                level: parseInt(newLevelOrder, 10),
            }).unwrap();
            setNewLevelName('');
            setNewLevelOrder(educations.length + 2);
            toast.success('Jenjang berhasil ditambahkan');
        } catch (err) {
            toast.error(err.data?.message || 'Gagal menambah jenjang');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Nama Lembaga',
            render: (row) => {
                const logoSrc = row.logo_url || (row.logo ? `/storage/${row.logo}` : null);
                return (
                    <div className="flex items-center gap-3">
                        {logoSrc ? (
                            <img
                                src={logoSrc}
                                alt={row.short_name || row.name}
                                className="w-9 h-9 rounded-md object-contain border border-slate-200 bg-white p-0.5 shrink-0"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-md bg-emerald-50 text-[#093c30] border border-emerald-200 flex items-center justify-center shrink-0 font-bold text-xs uppercase">
                                {row.short_name ? row.short_name.substring(0, 2) : <Building2 className="w-4 h-4" />}
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="font-semibold text-slate-900 hover:text-[#0b57d0] transition-colors truncate">
                                {row.name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">
                                NSP/NPSN: {row.registration_number || '-'}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'short_name',
            label: 'Singkatan',
            render: (row) => <span className="font-medium text-slate-700">{row.short_name || '-'}</span>,
        },
        {
            key: 'progression_type',
            label: 'Model Kenaikan',
            render: (row) => {
                const conf = PROGRESSION_TYPES[row.progression_type] || PROGRESSION_TYPES.triwulan;
                return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border ${conf.badgeCls}`}>
                        {conf.badgeLabel}
                    </span>
                );
            },
        },
        {
            key: 'educations',
            label: 'Tingkat / Jenjang',
            render: (row) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInstForLevels(row);
                        setNewLevelOrder((row.educations?.length || 0) + 1);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                    <Layers className="w-3.5 h-3.5" />
                    {row.educations?.length || 0} Tingkat
                </button>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => openEditModal(row)}
                        title="Edit Lembaga"
                        className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(row)}
                        title="Hapus Lembaga"
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Institusi &amp; Jenjang Pendidikan</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola data lembaga pendidikan pesantren &amp; formal beserta logo, kop surat, dan mekanisme kenaikan kelas (Triwulanan / Semesteran / Leveling).
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0b57d0] text-white rounded-md text-sm font-semibold hover:bg-[#0842a0] shadow-sm transition-colors cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Lembaga
                </button>
            </div>

            {/* Tabel Lembaga dengan fitur klik baris untuk melihat detail */}
            <DataTable 
                columns={columns} 
                data={institutions} 
                isLoading={isLoading} 
                emptyMessage="Belum ada lembaga terdaftar"
                onRowClick={(row) => setSelectedInstForDetail(row)}
            />

            {/* ═══════════════════ MODAL DETIL INSTITUSI PENDIDIKAN ═══════════════════ */}
            <Modal
                open={!!selectedInstForDetail}
                title="Rincian Institusi Pendidikan"
                maxWidth="max-w-3xl"
                onClose={() => setSelectedInstForDetail(null)}
                footer={
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-slate-400">
                            ID Lembaga: #{selectedInstForDetail?.id}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const inst = selectedInstForDetail;
                                    setSelectedInstForDetail(null);
                                    setSelectedInstForLevels(inst);
                                    setNewLevelOrder((inst.educations?.length || 0) + 1);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md cursor-pointer"
                            >
                                <Layers className="w-3.5 h-3.5" />
                                Kelola Tingkat / Jenjang
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const inst = selectedInstForDetail;
                                    setSelectedInstForDetail(null);
                                    openEditModal(inst);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-md cursor-pointer"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit Data Lembaga
                            </button>
                        </div>
                    </div>
                }
            >
                {selectedInstForDetail && (
                    <div className="space-y-5">
                        {/* 1. Header Kop Surat / Banner */}
                        {selectedInstForDetail.letterhead_url || selectedInstForDetail.letterhead ? (
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shadow-xs">
                                <div className="text-[11px] font-bold text-slate-500 uppercase px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                                    <span>Kop Surat Resmi Lembaga</span>
                                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                                        Aktif
                                    </span>
                                </div>
                                <div className="p-3 bg-white flex items-center justify-center max-h-48 overflow-hidden">
                                    <img
                                        src={selectedInstForDetail.letterhead_url || `/storage/${selectedInstForDetail.letterhead}`}
                                        alt="Kop Surat"
                                        className="w-full object-contain max-h-40"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
                                Belum ada kop surat resmi yang diunggah untuk lembaga ini.
                            </div>
                        )}

                        {/* 2. Informasi Utama & Logo */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50/70 border border-slate-200 rounded-lg">
                            {selectedInstForDetail.logo_url || selectedInstForDetail.logo ? (
                                <img
                                    src={selectedInstForDetail.logo_url || `/storage/${selectedInstForDetail.logo}`}
                                    alt={selectedInstForDetail.name}
                                    className="w-16 h-16 rounded-lg object-contain bg-white border border-slate-200 p-1 shrink-0 shadow-2xs"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-lg bg-emerald-100 text-[#093c30] border border-emerald-200 flex items-center justify-center shrink-0 font-bold text-xl uppercase">
                                    {selectedInstForDetail.short_name?.substring(0, 2) || <Building2 className="w-8 h-8" />}
                                </div>
                            )}

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                                        {selectedInstForDetail.name}
                                    </h3>
                                    {selectedInstForDetail.short_name && (
                                        <span className="px-2 py-0.5 text-xs font-semibold bg-slate-200 text-slate-700 rounded">
                                            {selectedInstForDetail.short_name}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 font-mono mt-1 flex flex-wrap items-center gap-3">
                                    <span>NSP / NPSN: <strong>{selectedInstForDetail.registration_number || '-'}</strong></span>
                                    <span>•</span>
                                    <span>Status: <strong className="text-emerald-700 uppercase">Aktif</strong></span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Kartu Model Kenaikan Kelas */}
                        {(() => {
                            const conf = PROGRESSION_TYPES[selectedInstForDetail.progression_type] || PROGRESSION_TYPES.triwulan;
                            return (
                                <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-1.5 shadow-2xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4 text-[#0b57d0]" />
                                            Mekanisme Kenaikan Kelas
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${conf.badgeCls}`}>
                                            {conf.badgeLabel}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        {conf.desc}
                                    </p>
                                </div>
                            );
                        })()}

                        {/* 4. Grid Kontak & Alamat */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                                <span className="text-slate-400 font-semibold uppercase text-[10px] block">Kontak Lembaga</span>
                                <div className="flex items-center gap-2 text-slate-700 font-medium pt-1">
                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{selectedInstForDetail.phone || 'Belum diisi'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-700 font-medium">
                                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{selectedInstForDetail.email || 'Belum diisi'}</span>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                                <span className="text-slate-400 font-semibold uppercase text-[10px] block">Alamat Domisili</span>
                                <div className="flex items-start gap-2 text-slate-700 font-medium pt-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                    <span className="leading-snug">{selectedInstForDetail.address || 'Belum diisi'}</span>
                                </div>
                            </div>
                        </div>

                        {/* 5. Daftar Jenjang / Tingkat Kelas yang Bernaung */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                <span className="flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                                    Tingkat / Jenjang Kelas Terdaftar ({selectedInstForDetail.educations?.length || 0}):
                                </span>
                            </div>

                            {(!selectedInstForDetail.educations || selectedInstForDetail.educations.length === 0) ? (
                                <p className="text-xs text-slate-400 italic">
                                    Belum ada tingkat/jenjang yang ditambahkan pada lembaga ini.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {selectedInstForDetail.educations.map((item) => (
                                        <span
                                            key={item.id}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-800 shadow-2xs"
                                        >
                                            <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">
                                                {item.level}
                                            </span>
                                            <span>{item.name}</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* ═══════════════════ MODAL TAMBAH / EDIT INSTITUSI ═══════════════════ */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Institusi Pendidikan' : 'Tambah Institusi Pendidikan'}
                maxWidth="max-w-2xl"
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nama Lembaga & Singkatan */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Nama Lembaga *
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Contoh: Kubar (Kuliyyah Tarbiyah Pesantren)"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Singkatan
                            </label>
                            <input
                                type="text"
                                value={shortName}
                                onChange={(e) => setShortName(e.target.value)}
                                placeholder="Kubar / Tibyan / MTs"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* NSP / NPSN & Model Kenaikan Kelas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                NSP / NPSN
                            </label>
                            <input
                                type="text"
                                value={regNumber}
                                onChange={(e) => setRegNumber(e.target.value)}
                                placeholder="KBR-PANYEPPEN-01"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Model Kenaikan Kelas *
                            </label>
                            <select
                                value={progressionType}
                                onChange={(e) => setProgressionType(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium text-slate-900"
                            >
                                <option value="triwulan">Triwulanan (Pesantren Salaf / Diniyah - Triwulan I s/d IV)</option>
                                <option value="semester">Semesteran (Formal - SMP/SMA/MTs/MA)</option>
                                <option value="leveling">Leveling Dinamis (Tahfidz / Milestone Mingguan)</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600">
                        <strong className="text-slate-800">Mekanisme Kenaikan: </strong>
                        {PROGRESSION_TYPES[progressionType]?.desc}
                    </div>

                    {/* Upload Logo Lembaga & Kop Surat */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        {/* 1. Upload Logo */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Logo Lembaga
                            </label>
                            <div className="flex items-center gap-3">
                                {logoPreview && !removeLogo ? (
                                    <div className="relative w-16 h-16 rounded-md border border-slate-200 bg-white p-1 shrink-0">
                                        <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLogoFile(null);
                                                setLogoPreview(null);
                                                setRemoveLogo(true);
                                            }}
                                            className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 cursor-pointer"
                                            title="Hapus Logo"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-md border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                        <ImageIcon className="w-6 h-6" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer shadow-2xs">
                                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                                        Pilih Logo (PNG/JPG)
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                            onChange={handleLogoChange}
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="text-[10px] text-slate-400 mt-1">Maks. 2MB. Format persegi 1:1 direkomendasikan.</p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Upload Kop Surat */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Kop Surat Resmi
                            </label>
                            <div className="flex items-center gap-3">
                                {letterheadPreview && !removeLetterhead ? (
                                    <div className="relative w-24 h-16 rounded-md border border-slate-200 bg-white p-1 shrink-0">
                                        <img src={letterheadPreview} alt="Kop Surat Preview" className="w-full h-full object-contain" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLetterheadFile(null);
                                                setLetterheadPreview(null);
                                                setRemoveLetterhead(true);
                                            }}
                                            className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 cursor-pointer"
                                            title="Hapus Kop Surat"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-24 h-16 rounded-md border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                        <ImageIcon className="w-6 h-6" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer shadow-2xs">
                                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                                        Pilih Kop Surat (PNG/JPG)
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={handleLetterheadChange}
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="text-[10px] text-slate-400 mt-1">Maks. 4MB. Digunakan sebagai header dokumen/rapor.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Kontak & Alamat */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Telepon</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="021-..."
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@pesantren.id"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Alamat Lembaga</label>
                        <textarea
                            rows={2}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Alamat lengkap pondok pesantren / madrasah..."
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || isUpdating}
                            className="px-5 py-2 text-sm font-semibold text-white bg-[#0b57d0] rounded-md hover:bg-[#0842a0] disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                            {isCreating || isUpdating ? 'Menyimpan...' : 'Simpan Institusi'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ═══════════════════ MODAL KELOLA JENJANG / TINGKAT ═══════════════════ */}
            <Modal
                open={!!selectedInstForLevels}
                title={`Jenjang / Tingkat: ${selectedInstForLevels?.name || ''}`}
                onClose={() => setSelectedInstForLevels(null)}
            >
                <div className="space-y-5">
                    <form onSubmit={handleAddEducation} className="flex gap-2">
                        <input
                            type="text"
                            required
                            placeholder={selectedInstForLevels?.progression_type === 'leveling' ? 'Contoh: Juz 30' : 'Contoh: Ula 1 / Kelas 7'}
                            value={newLevelName}
                            onChange={(e) => setNewLevelName(e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <input
                            type="number"
                            min="1"
                            required
                            placeholder="Level"
                            value={newLevelOrder}
                            onChange={(e) => setNewLevelOrder(e.target.value)}
                            className="w-20 px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <button
                            type="submit"
                            className="px-3.5 py-2 bg-[#0b57d0] text-white rounded-md text-sm font-semibold hover:bg-[#0842a0] flex items-center gap-1 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" /> Tambah
                        </button>
                    </form>

                    <div className="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        {educations.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">Belum ada tingkat terdaftar</div>
                        ) : (
                            educations.map((item) => (
                                <div key={item.id} className="p-3 flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                                            {item.level}
                                        </span>
                                        <span className="font-semibold text-slate-800">{item.name}</span>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await deleteEducation(item.id).unwrap();
                                                toast.success('Jenjang dihapus');
                                            } catch (err) {
                                                toast.error('Gagal menghapus');
                                            }
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Institusi Pendidikan"
                message={`Yakin ingin menghapus ${deleteTarget?.name}? Data tingkat kelas terkait juga akan terhapus.`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
