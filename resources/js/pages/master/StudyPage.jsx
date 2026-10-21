import React, { useState } from 'react';
import { 
    useGetStudiesQuery, 
    useCreateStudyMutation, 
    useUpdateStudyMutation, 
    useDeleteStudyMutation 
} from '../../store/slices/studyApi';
import { useGetInstitutionsQuery } from '../../store/slices/institutionApi';
import { 
    useGetLessonHoursQuery, 
    useCreateLessonHourMutation, 
    useDeleteLessonHourMutation 
} from '../../store/slices/lessonHourApi';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Plus, Edit2, Trash2, Clock, BookOpen, Layers } from 'lucide-react';
import { toast } from 'react-toastify';

export default function StudyPage() {
    const [instFilter, setInstFilter] = useState('');
    const { data: instData } = useGetInstitutionsQuery();
    const institutions = instData?.data || [];

    const { data: studyData, isLoading } = useGetStudiesQuery(
        instFilter ? { educational_institution_id: instFilter } : undefined
    );
    const studies = studyData?.data || [];

    const [createStudy, { isLoading: isCreating }] = useCreateStudyMutation();
    const [updateStudy, { isLoading: isUpdating }] = useUpdateStudyMutation();
    const [deleteStudy, { isLoading: isDeleting }] = useDeleteStudyMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Form fields
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [kkm, setKkm] = useState(75);
    const [institutionId, setInstitutionId] = useState('');
    const [description, setDescription] = useState('');

    // Lesson Hours Modal State
    const [lessonHourModalOpen, setLessonHourModalOpen] = useState(false);
    const { data: lessonHoursData, isLoading: isLoadingHours } = useGetLessonHoursQuery(
        instFilter ? { educational_institution_id: instFilter } : undefined
    );
    const lessonHours = lessonHoursData?.data || [];
    const [createLessonHour] = useCreateLessonHourMutation();
    const [deleteLessonHour] = useDeleteLessonHourMutation();
    const [hourName, setHourName] = useState('');
    const [startTime, setStartTime] = useState('07:30');
    const [endTime, setEndTime] = useState('08:15');
    const [isBreak, setIsBreak] = useState(false);

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setCode('');
        setKkm(75);
        setInstitutionId(instFilter || '');
        setDescription('');
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name || '');
        setCode(item.code || '');
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

    const handleAddLessonHour = async (e) => {
        e.preventDefault();
        try {
            await createLessonHour({
                name: hourName,
                start_time: startTime,
                end_time: endTime,
                is_break: isBreak,
                educational_institution_id: instFilter || null,
            }).unwrap();
            toast.success('Jam pelajaran ditambahkan');
            setHourName('');
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menambah jam pelajaran');
        }
    };

    const columns = [
        {
            key: 'code',
            label: 'Kode & Mapel',
            render: (row) => (
                <div>
                    <span className="font-semibold text-slate-900">{row.name}</span>
                    <span className="text-xs text-slate-400 block font-mono">{row.code || 'Tanpa Kode'}</span>
                </div>
            ),
        },
        {
            key: 'institution',
            label: 'Lembaga / Jenjang',
            render: (row) => (
                <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-700">
                    {row.educational_institution?.name || 'Umum (Lintas Lembaga)'}
                </span>
            ),
        },
        {
            key: 'kkm',
            label: 'KKM Minimal',
            render: (row) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {Number(row.kkm).toFixed(0)}
                </span>
            ),
        },
        {
            key: 'teachers',
            label: 'Guru Pengampu',
            render: (row) => (
                <span className="text-xs text-slate-600">
                    {row.teachers?.length ? `${row.teachers.length} Guru` : 'Belum Ditugaskan'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        title="Edit Mapel"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kurikulum & Mata Pelajaran</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola katalog mata pelajaran, standar KKM, dan konfigurasi jam pelajaran harian.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setLessonHourModalOpen(true)}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white text-slate-700 font-semibold text-sm rounded-md border border-slate-300 hover:bg-slate-50 transition shadow-sm"
                    >
                        <Clock className="w-4 h-4 text-emerald-600" />
                        Jam Pelajaran
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-md hover:bg-emerald-700 transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Mapel
                    </button>
                </div>
            </div>

            {/* Filter Lembaga */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lembaga:</span>
                <select
                    value={instFilter}
                    onChange={(e) => setInstFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="">Semua Lembaga</option>
                    {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={studies}
                isLoading={isLoading}
                emptyMessage="Belum ada mata pelajaran terdaftar"
            />

            {/* Modal Tambah/Edit Mapel */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Nama Mata Pelajaran *</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Fiqih Ibadah / Matematika"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Kode Mapel</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="FQH-01"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">KKM Kelulusan *</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                required
                                value={kkm}
                                onChange={(e) => setKkm(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Institusi / Lembaga</label>
                        <select
                            value={institutionId}
                            onChange={(e) => setInstitutionId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        >
                            <option value="">Umum (Berlaku Semua Lembaga)</option>
                            {institutions.map((inst) => (
                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Keterangan / Silabus</label>
                        <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Deskripsi materi pelajaran..."
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
                            {isCreating || isUpdating ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Jam Pelajaran (Lesson Hours) */}
            <Modal
                open={lessonHourModalOpen}
                title="Konfigurasi Jam Pelajaran (KBM)"
                onClose={() => setLessonHourModalOpen(false)}
            >
                <div className="space-y-4">
                    <form onSubmit={handleAddLessonHour} className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                        <div className="font-semibold text-xs text-slate-700 uppercase tracking-wider">Tambah Jam Belajar / Istirahat</div>
                        <div className="grid grid-cols-3 gap-2">
                            <input
                                type="text"
                                required
                                placeholder="Jam Ke-1 / Istirahat"
                                value={hourName}
                                onChange={(e) => setHourName(e.target.value)}
                                className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs"
                            />
                            <input
                                type="time"
                                required
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs"
                            />
                            <input
                                type="time"
                                required
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isBreak}
                                    onChange={(e) => setIsBreak(e.target.checked)}
                                    className="rounded border-slate-300 text-emerald-600"
                                />
                                Sesi Istirahat (Bukan Jam KBM)
                            </label>
                            <button
                                type="submit"
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-md text-xs font-semibold hover:bg-emerald-700"
                            >
                                + Tambah Jam
                            </button>
                        </div>
                    </form>

                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md">
                        {lessonHours.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">Belum ada jam pelajaran diset</div>
                        ) : (
                            lessonHours.map((hour) => (
                                <div key={hour.id} className="p-3 flex items-center justify-between text-xs">
                                    <div>
                                        <span className="font-bold text-slate-800">{hour.name}</span>
                                        <span className="text-slate-400 ml-2 font-mono">
                                            {hour.start_time.substring(0, 5)} - {hour.end_time.substring(0, 5)}
                                        </span>
                                        {hour.is_break && (
                                            <span className="ml-2 px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-semibold">
                                                Istirahat
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await deleteLessonHour(hour.id).unwrap();
                                                toast.success('Jam pelajaran dihapus');
                                            } catch (err) {
                                                toast.error('Gagal menghapus');
                                            }
                                        }}
                                        className="text-slate-400 hover:text-rose-600 p-1"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Mata Pelajaran"
                message={`Yakin ingin menghapus ${deleteTarget?.name}?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
