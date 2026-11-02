import React, { useState, useMemo } from 'react';
import {
    useGetStudiesQuery,
    useCreateStudyMutation,
    useUpdateStudyMutation,
    useDeleteStudyMutation,
    useImportStudiesMutation,
} from '../../store/slices/studyApi';
import { useGetInstitutionsQuery } from '../../store/slices/institutionApi';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
    Plus,
    Edit2,
    Trash2,
    BookOpen,
    Layers,
    ShieldAlert,
    Sparkles,
    Download,
    Upload,
    FileSpreadsheet,
    FileDown,
    X,
} from 'lucide-react';
import { toast } from 'react-toastify';

const STUDY_TYPE_META = {
    khusus: {
        label: 'Mapel Khusus (Inti)',
        desc: 'Masuk Jadwal KBM • Wajib Remidi bila nilai < KKM',
        badgeClass: 'bg-emerald-50 text-[#093c30] border-emerald-300',
    },
    reguler: {
        label: 'Mapel Reguler',
        desc: 'Masuk Jadwal KBM • Penilaian Akhir Triwulan',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    },
    muatan_lokal: {
        label: 'Muatan Lokal (Non-Kelas)',
        desc: 'Tidak Masuk Jadwal KBM • Penunjang Nilai Triwulan',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    },
};

export default function StudyPage() {
    const [instFilter, setInstFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const { data: instData } = useGetInstitutionsQuery();
    const institutions = instData?.data || [];

    const { data: studyData, isLoading } = useGetStudiesQuery(
        instFilter ? { educational_institution_id: instFilter } : undefined
    );
    const studies = useMemo(() => {
        const raw = studyData?.data || [];
        if (typeFilter === 'all') return raw;
        return raw.filter((s) => (s.study_type || 'reguler') === typeFilter);
    }, [studyData, typeFilter]);

    const [createStudy, { isLoading: isCreating }] = useCreateStudyMutation();
    const [updateStudy, { isLoading: isUpdating }] = useUpdateStudyMutation();
    const [deleteStudy, { isLoading: isDeleting }] = useDeleteStudyMutation();
    const [importStudies, { isLoading: isImporting }] = useImportStudiesMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [studyType, setStudyType] = useState('reguler');
    const [kkm, setKkm] = useState(75);
    const [institutionId, setInstitutionId] = useState('');
    const [description, setDescription] = useState('');

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setCode('');
        setStudyType('reguler');
        setKkm(75);
        setInstitutionId(instFilter || '');
        setDescription('');
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name || '');
        setCode(item.code || '');
        setStudyType(item.study_type || 'reguler');
        setKkm(item.kkm || 75);
        setInstitutionId(item.educational_institution_id || '');
        setDescription(item.description || '');
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name,
            code: code || null,
            study_type: studyType,
            kkm: Number(kkm),
            educational_institution_id: institutionId || null,
            description: description || null,
        };

        try {
            if (editingItem) {
                await updateStudy({ id: editingItem.id, ...payload }).unwrap();
                toast.success('Mata pelajaran berhasil diperbarui');
            } else {
                await createStudy(payload).unwrap();
                toast.success('Mata pelajaran berhasil dibuat');
            }
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan mata pelajaran');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteStudy(deleteTarget.id).unwrap();
            toast.success('Mata pelajaran berhasil dihapus');
            setDeleteTarget(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus mata pelajaran');
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const token = localStorage.getItem('token');
            const url = `/api/master/studies/export${instFilter ? `?educational_institution_id=${instFilter}` : ''}`;
            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
            });
            if (!res.ok) throw new Error('Gagal mengunduh file Excel');
            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `Master_Mata_Pelajaran_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
            toast.success('Data mata pelajaran berhasil diekspor');
        } catch (e) {
            toast.error(e.message || 'Gagal mengekspor Excel');
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/master/studies/template', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Gagal mengunduh template');
            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'Template_Import_Mata_Pelajaran.xlsx';
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
            const res = await importStudies(formData).unwrap();
            toast.success(res.message || 'Import mata pelajaran berhasil');
            setImportModalOpen(false);
            setImportFile(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal mengimpor mata pelajaran');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Mata Pelajaran / Fan Kitab',
            render: (row) => (
                <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-md bg-emerald-50 text-[#093c30] flex items-center justify-center shrink-0 border border-emerald-100">
                        <BookOpen className="w-4 h-4" />
                    </span>
                    <div>
                        <span className="font-bold text-slate-800 block text-sm">{row.name}</span>
                        {row.code && (
                            <span className="text-[11px] font-mono text-slate-400">
                                Kode: {row.code}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'study_type',
            label: 'Kategori Kurikulum',
            render: (row) => {
                const meta = STUDY_TYPE_META[row.study_type || 'reguler'] || STUDY_TYPE_META.reguler;
                return (
                    <div>
                        <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.badgeClass}`}
                        >
                            {meta.label}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{meta.desc}</p>
                    </div>
                );
            },
        },
        {
            key: 'kkm',
            label: 'KKM Minimal',
            render: (row) => (
                <span className="font-mono font-bold text-slate-800 text-sm">
                    {Number(row.kkm).toFixed(0)}
                </span>
            ),
        },
        {
            key: 'institution',
            label: 'Institusi Pengampu',
            render: (row) => (
                <span className="text-xs text-slate-600 font-medium">
                    {row.educational_institution?.name || (
                        <span className="text-slate-400 italic">Semua Lembaga</span>
                    )}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => openEditModal(row)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        title="Edit Mapel"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(row)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Hapus Mapel"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header & Subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-[#093c30]" />
                        Mata Pelajaran & Kurikulum
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Kelola data mata pelajaran, KKM standar, dan kategori mapel khusus diniyah / reguler / muatan lokal.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                        title="Ekspor seluruh mata pelajaran ke Excel"
                    >
                        <Download className="w-4 h-4 text-emerald-600" />
                        {isExporting ? 'Mengekspor...' : 'Ekspor Excel'}
                    </button>
                    <button
                        onClick={() => setImportModalOpen(true)}
                        className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        title="Impor mata pelajaran massal dari file Excel"
                    >
                        <Upload className="w-4 h-4 text-blue-600" /> Impor Excel
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0b57d0] rounded-md hover:bg-[#0842a0] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" /> Tambah Mata Pelajaran
                    </button>
                </div>
            </div>

            {/* Filter Tabs & Data Table */}
            <DataTable
                columns={columns}
                data={studies}
                isLoading={isLoading}
                searchPlaceholder="Cari nama atau kode mata pelajaran..."
                filterElement={
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-[#093c30] focus:border-[#093c30] transition-colors cursor-pointer shadow-2xs"
                        >
                            <option value="all">Semua Kategori Kurikulum</option>
                            <option value="khusus">Mapel Khusus (Inti Diniyah)</option>
                            <option value="reguler">Mapel Reguler (Formal/Kemenag)</option>
                            <option value="muatan_lokal">Muatan Lokal (Non-Kelas)</option>
                        </select>

                        <select
                            value={instFilter}
                            onChange={(e) => setInstFilter(e.target.value)}
                            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-[#093c30] focus:border-[#093c30] transition-colors cursor-pointer shadow-2xs"
                        >
                            <option value="">Semua Institusi Pengampu</option>
                            {institutions.map((inst) => (
                                <option key={inst.id} value={inst.id}>
                                    {inst.name}
                                </option>
                            ))}
                        </select>
                    </div>
                }
            />

            {/* Modal Tambah/Edit Mapel */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Nama Mata Pelajaran / Fan Kitab *
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Fiqih Fathul Qorib / Bahasa Arab / Matematika"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Kategori Kurikulum *
                        </label>
                        <select
                            value={studyType}
                            onChange={(e) => setStudyType(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white font-medium"
                        >
                            <option value="khusus">
                                Mapel Khusus (Inti Diniyah - Wajib KKM & Ada Remidi)
                            </option>
                            <option value="reguler">
                                Mapel Reguler (Kemenag / Umum - Masuk Jadwal KBM)
                            </option>
                            <option value="muatan_lokal">
                                Muatan Lokal (Penunjang / Non-Kelas)
                            </option>
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">
                            {STUDY_TYPE_META[studyType]?.desc}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Kode Mapel
                            </label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Contoh: FQH-07 / MLK-01"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                KKM Minimal *
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                required
                                value={kkm}
                                onChange={(e) => setKkm(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Institusi / Lembaga
                        </label>
                        <select
                            value={institutionId}
                            onChange={(e) => setInstitutionId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                        >
                            <option value="">Umum (Berlaku Semua Lembaga)</option>
                            {institutions.map((inst) => (
                                <option key={inst.id} value={inst.id}>
                                    {inst.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Keterangan / Silabus
                        </label>
                        <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Deskripsi kitab atau materi pelajaran..."
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || isUpdating}
                            className="px-4 py-2 text-xs font-bold text-white bg-[#0b57d0] rounded-md hover:bg-[#0842a0] disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                            {isCreating || isUpdating ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Impor Excel */}
            <Modal
                open={importModalOpen}
                title="Impor Mata Pelajaran dari Excel"
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
                                    Gunakan template Excel standar agar nama mapel, kode, KKM, dan kategori dapat dipetakan secara akurat.
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

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Mata Pelajaran"
                message={`Yakin ingin menghapus ${deleteTarget?.name}? Data nilai dan jadwal yang menggunakan mapel ini dapat terpengaruh.`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
