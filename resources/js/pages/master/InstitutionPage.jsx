import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { getUserProgramId, hasPermission } from '../../utils/access';
import {
    useGetInstitutionsQuery,
    useCreateInstitutionMutation,
    useUpdateInstitutionMutation,
    useDeleteInstitutionMutation,
    useImportInstitutionsMutation,
    useGetEducationsQuery,
    useCreateEducationMutation,
    useDeleteEducationMutation,
    useGetProgramsQuery,
    useSyncProgramsFromSmptMutation,
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
    Download,
    FileSpreadsheet,
    FileDown,
    Image as ImageIcon,
    Phone,
    Mail,
    MapPin,
    Calendar,
    CheckCircle2,
    Tag,
    RefreshCw,
    X,
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
    const user = useSelector((state) => state.auth?.user);
    const userProgramId = getUserProgramId(user);
    const canCreateInst = hasPermission(user, 'jenjang.create');
    const [activeTab, setActiveTab] = useState('institutions'); // 'institutions' | 'programs'

    // ================== INSTITUSI & JENJANG ==================
    const { data: response, isLoading } = useGetInstitutionsQuery();
    const institutions = response?.data || [];

    const { data: programRes, isFetching: isFetchingPrograms } = useGetProgramsQuery();
    const programs = programRes?.data || [];
    const [syncProgramsFromSmpt, { isLoading: isSyncingPrograms }] = useSyncProgramsFromSmptMutation();

    const [createInstitution, { isLoading: isCreating }] = useCreateInstitutionMutation();
    const [updateInstitution, { isLoading: isUpdating }] = useUpdateInstitutionMutation();
    const [deleteInstitution, { isLoading: isDeleting }] = useDeleteInstitutionMutation();
    const [importInstitutions, { isLoading: isImporting }] = useImportInstitutionsMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [selectedInstForDetail, setSelectedInstForDetail] = useState(null);

    // Form state Institusi
    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [programId, setProgramId] = useState('');
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

    // ================== PROGRAM PESANTREN (Tamjid) HANDLER ==================
    const handleSyncPrograms = async () => {
        try {
            const res = await syncProgramsFromSmpt().unwrap();
            toast.success(res?.message || 'Program pesantren berhasil disinkronkan dari Tamjid');
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyinkronkan program pesantren dari Tamjid');
        }
    };

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setShortName('');
        setProgramId(userProgramId ? String(userProgramId) : '');
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
        setProgramId(item.program_id ? String(item.program_id) : '');
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
        if (programId) formData.append('program_id', programId);
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
            if (selectedInstForDetail && selectedInstForDetail.id === editingItem?.id) {
                setSelectedInstForDetail((prev) => ({
                    ...prev,
                    name,
                    short_name: shortName,
                    program_id: programId,
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

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/master/institutions/export', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
            });
            if (!res.ok) throw new Error('Gagal mengekspor data institusi');
            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `Master_Institusi_Pendidikan_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
            toast.success('Data institusi & jenjang berhasil diekspor');
        } catch (e) {
            toast.error(e.message || 'Gagal mengekspor data');
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/master/institutions/template', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Gagal mengunduh template');
            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'Template_Import_Institusi_Pendidikan.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (e) {
            toast.error(e.message || 'Gagal mengunduh template');
        }
    };

    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!importFile) {
            toast.error('Pilih file Excel terlebih dahulu');
            return;
        }

        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const res = await importInstitutions(formData).unwrap();
            toast.success(res.message || 'Import data institusi berhasil');
            setImportModalOpen(false);
            setImportFile(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal mengimpor data institusi');
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

    const institutionColumns = [
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
                                NPSN/NSM: {row.registration_number || '-'}
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
            key: 'program',
            label: 'Program Pesantren',
            render: (row) => (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Tag className="w-3 h-3 text-emerald-600" />
                    {row.program?.name || '-'}
                </span>
            ),
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

    const programColumns = [
        {
            key: 'name',
            label: 'Program Pesantren (Tamjid)',
            render: (row) => (
                <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 font-bold text-xs">
                        {row.code || 'PRG'}
                    </span>
                    <div>
                        <span className="font-bold text-slate-900 text-sm block">{row.name}</span>
                        {row.description && (
                            <span className="text-xs text-slate-400 block line-clamp-1">{row.description}</span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'code',
            label: 'Kode',
            render: (row) => <span className="font-mono text-xs font-semibold text-slate-700">{row.code || '-'}</span>,
        },
        {
            key: 'usage',
            label: 'Institusi Terhubung',
            render: (row) => (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Building2 className="w-3.5 h-3.5" />
                    {row.institutions_count ?? 0} Lembaga
                </span>
            ),
        },
    ];

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header & Subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-[#093c30]" />
                        Institusi &amp; Program Pesantren
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola lembaga pendidikan formal &amp; kepesantrenan, tingkat/jenjang, relasi program pesantren (Tamjid), dan mekanisme kenaikan kelas.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {activeTab === 'institutions' ? (
                        <>
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                                title="Ekspor seluruh institusi ke Excel"
                            >
                                <Download className="w-4 h-4 text-emerald-600" />
                                {isExporting ? 'Mengekspor...' : 'Ekspor Excel'}
                            </button>
                            {canCreateInst && (
                            <>
                            <button
                                onClick={() => setImportModalOpen(true)}
                                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                title="Impor institusi dari Excel"
                            >
                                <Upload className="w-4 h-4 text-blue-600" /> Impor Excel
                            </button>
                            <button
                                onClick={openCreateModal}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b57d0] text-white rounded-md text-xs font-semibold hover:bg-[#0842a0] shadow-xs transition-colors cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah Lembaga
                            </button>
                            </>
                            )}
                        </>
                    ) : !userProgramId ? (
                        <button
                            onClick={handleSyncPrograms}
                            disabled={isSyncingPrograms}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-md text-xs font-semibold hover:bg-emerald-800 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isSyncingPrograms ? 'animate-spin' : ''}`} />
                            {isSyncingPrograms ? 'Menyinkronkan...' : 'Sinkronkan Program Tamjid'}
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Sub-tab navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('institutions')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                        activeTab === 'institutions'
                            ? 'border-[#093c30] text-[#093c30]'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Building2 className="w-4 h-4" />
                    Institusi &amp; Jenjang ({institutions.length})
                </button>
                <button
                    onClick={() => setActiveTab('programs')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                        activeTab === 'programs'
                            ? 'border-[#093c30] text-[#093c30]'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Tag className="w-4 h-4" />
                    Program Pesantren ({programs.length})
                </button>
            </div>

            {/* TAB CONTENT 1: INSTITUSI PENDIDIKAN */}
            {activeTab === 'institutions' && (
                <>
                    <DataTable
                        columns={institutionColumns}
                        data={institutions}
                        isLoading={isLoading}
                        searchPlaceholder="Cari nama atau singkatan institusi..."
                        onRowClick={(row) => setSelectedInstForDetail(row)}
                    />

                    {/* Preview Detail Panel jika ada institusi yang diklik */}
                    {selectedInstForDetail && (
                        <div className="border border-slate-200 bg-white rounded-lg p-5 shadow-xs space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    {selectedInstForDetail.logo ? (
                                        <img
                                            src={`/storage/${selectedInstForDetail.logo}`}
                                            alt={selectedInstForDetail.name}
                                            className="w-12 h-12 object-contain rounded-md border border-slate-200 p-1"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-md bg-emerald-50 text-[#093c30] border border-emerald-200 flex items-center justify-center font-bold text-sm">
                                            {selectedInstForDetail.short_name || <Building2 className="w-6 h-6" />}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900">{selectedInstForDetail.name}</h3>
                                        <p className="text-xs text-slate-500">
                                            {selectedInstForDetail.short_name} • {selectedInstForDetail.program?.name || 'Program Umum'} • Model Kenaikan:{' '}
                                            <span className="font-semibold text-slate-700">
                                                {PROGRESSION_TYPES[selectedInstForDetail.progression_type]?.badgeLabel}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedInstForDetail(null)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
                                <div>
                                    <span className="text-slate-400 block font-medium">No. Registrasi / NPSN / NSM</span>
                                    <span className="text-slate-800 font-mono font-bold mt-0.5 block">
                                        {selectedInstForDetail.registration_number || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">Kontak (Telepon &amp; Email)</span>
                                    <span className="text-slate-800 mt-0.5 block">
                                        {selectedInstForDetail.phone || '-'}{' '}
                                        {selectedInstForDetail.email ? `(${selectedInstForDetail.email})` : ''}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">Alamat Lembaga</span>
                                    <span className="text-slate-800 mt-0.5 block">
                                        {selectedInstForDetail.address || '-'}
                                    </span>
                                </div>
                            </div>

                            {selectedInstForDetail.letterhead && (
                                <div className="pt-3 border-t border-slate-100">
                                    <span className="text-xs font-semibold text-slate-500 block mb-1.5">
                                        Pratinjau Kop Surat Resmi Rapor:
                                    </span>
                                    <img
                                        src={`/storage/${selectedInstForDetail.letterhead}`}
                                        alt="Kop Surat"
                                        className="w-full max-h-24 object-contain rounded border border-slate-200 bg-slate-50 p-1"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* TAB CONTENT 2: PROGRAM PESANTREN (Tamjid) */}
            {activeTab === 'programs' && (
                <div className="space-y-4">
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-md text-xs text-emerald-900">
                        <p className="font-semibold">Program Pesantren (Sumber Data: Tamjid)</p>
                        <p className="mt-0.5 text-emerald-800">
                            Pendidikan mengikuti program pesantren yang dikelola dari Tamjid (seperti Kubar dan Tibyan). Gunakan tombol <strong>Sinkronkan Program Tamjid</strong> jika ada perubahan data program di Tamjid.
                        </p>
                    </div>

                    <DataTable
                        columns={programColumns}
                        data={programs}
                        isLoading={isFetchingPrograms}
                        searchPlaceholder="Cari nama program pesantren..."
                    />
                </div>
            )}

            {/* ═══════════════════ MODAL TAMBAH/EDIT INSTITUSI ═══════════════════ */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Institusi Pendidikan' : 'Tambah Institusi Pendidikan Baru'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Nama Lembaga Pendidikan *
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Contoh: SMP Islam / Madrasah Diniyah Ula"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Singkatan / Kode
                            </label>
                            <input
                                type="text"
                                value={shortName}
                                onChange={(e) => setShortName(e.target.value)}
                                placeholder="Contoh: SMP-IT / MD-ULA"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Program Pesantren (Tamjid)
                            </label>
                            {userProgramId ? (
                                <div className="mt-1 px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 text-slate-700 font-semibold">
                                    {programs.find((p) => Number(p.id) === userProgramId)?.name || `Program #${userProgramId}`}
                                </div>
                            ) : (
                                <select
                                    value={programId}
                                    onChange={(e) => setProgramId(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                                >
                                    <option value="">-- Pilih Program Pesantren --</option>
                                    {programs.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.code || 'PRG'})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Model Evaluasi &amp; Kenaikan *
                            </label>
                            <select
                                value={progressionType}
                                onChange={(e) => setProgressionType(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                            >
                                <option value="triwulan">Triwulanan (Pesantren Salaf / Diniyah)</option>
                                <option value="semester">Semesteran (Formal - SMP/SMA/MTs)</option>
                                <option value="leveling">Leveling Dinamis (Tahfidz / Milestone)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                No. Registrasi / NPSN / NSM
                            </label>
                            <input
                                type="text"
                                value={regNumber}
                                onChange={(e) => setRegNumber(e.target.value)}
                                placeholder="Nomor resmi lembaga"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Nomor Telepon / WA
                            </label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="08xxxxxxxxxx"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Alamat Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="madrasah@pesantren.id"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Alamat Lembaga
                        </label>
                        <textarea
                            rows={2}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Alamat lengkap lokasi madrasah/gedung..."
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Logo & Kop Surat Upload */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Logo Resmi Lembaga
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoChange}
                                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-300 rounded-md p-1"
                            />
                            {logoPreview && (
                                <div className="mt-2 flex items-center gap-2">
                                    <img src={logoPreview} alt="Logo" className="w-10 h-10 object-contain rounded border p-1" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLogoFile(null);
                                            setLogoPreview(null);
                                            setRemoveLogo(true);
                                        }}
                                        className="text-xs text-rose-600 hover:underline cursor-pointer"
                                    >
                                        Hapus Logo
                                    </button>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Kop Surat PDF (Rapor)
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLetterheadChange}
                                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-300 rounded-md p-1"
                            />
                            {letterheadPreview && (
                                <div className="mt-2 flex items-center gap-2">
                                    <img src={letterheadPreview} alt="Kop Surat" className="h-10 object-contain rounded border p-1" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLetterheadFile(null);
                                            setLetterheadPreview(null);
                                            setRemoveLetterhead(true);
                                        }}
                                        className="text-xs text-rose-600 hover:underline cursor-pointer"
                                    >
                                        Hapus Kop Surat
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
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

            {/* ═══════════════════ MODAL IMPOR EXCEL INSTITUSI ═══════════════════ */}
            <Modal
                open={importModalOpen}
                title="Impor Institusi & Jenjang dari Excel"
                onClose={() => {
                    setImportModalOpen(false);
                    setImportFile(null);
                }}
            >
                <form onSubmit={handleImportSubmit} className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-start gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                            <div className="text-xs text-blue-800 space-y-1">
                                <p className="font-semibold">Format Pengisian Data</p>
                                <p>
                                    Anda dapat mengimpor institusi sekaligus daftar jenjangnya (dipisahkan koma). Gunakan template resmi untuk menghindari kesalahan format.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 underline mt-1 cursor-pointer"
                                >
                                    <FileDown className="w-3.5 h-3.5" /> Unduh Template Excel (.xlsx)
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Pilih File Excel (.xlsx / .xls / .csv)
                        </label>
                        <input
                            type="file"
                            required
                            accept=".xlsx,.xls,.csv"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                            className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-300 rounded-md p-1"
                        />
                        {importFile && (
                            <p className="text-[11px] text-emerald-700 font-medium mt-1">
                                File terpilih: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                            </p>
                        )}
                    </div>

                    <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => {
                                setImportModalOpen(false);
                                setImportFile(null);
                            }}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isImporting || !importFile}
                            className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                            <Upload className="w-4 h-4" />
                            {isImporting ? 'Memproses File...' : 'Mulai Impor'}
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

            {/* Confirm Delete Institusi */}
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
