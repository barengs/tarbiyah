import React, { useState } from 'react';
import { 
    useGetLessonHoursQuery, 
    useCreateLessonHourMutation, 
    useUpdateLessonHourMutation, 
    useDeleteLessonHourMutation 
} from '../../store/slices/lessonHourApi';
import { useGetProgramsQuery } from '../../store/slices/institutionApi';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Plus, Edit2, Trash2, Clock, Coffee, School, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';

export default function LessonHourPage() {
    const [programFilter, setProgramFilter] = useState('');
    const { data: programsData } = useGetProgramsQuery();
    const programs = programsData?.data || [];

    const { data: lessonHoursData, isLoading } = useGetLessonHoursQuery(
        programFilter ? { program_id: programFilter } : undefined
    );
    const lessonHours = lessonHoursData?.data || [];

    const [createLessonHour, { isLoading: isCreating }] = useCreateLessonHourMutation();
    const [updateLessonHour, { isLoading: isUpdating }] = useUpdateLessonHourMutation();
    const [deleteLessonHour, { isLoading: isDeleting }] = useDeleteLessonHourMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Form fields
    const [name, setName] = useState('');
    const [startTime, setStartTime] = useState('07:30');
    const [endTime, setEndTime] = useState('08:15');
    const [order, setOrder] = useState(1);
    const [isBreak, setIsBreak] = useState(false);
    const [programId, setProgramId] = useState('');

    const formatTime = (time) => {
        if (!time) return '-';
        return String(time).substring(0, 5);
    };

    const calculateDuration = (start, end) => {
        if (!start || !end) return '-';
        try {
            const [sh, sm] = String(start).split(':').map(Number);
            const [eh, em] = String(end).split(':').map(Number);
            if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return '-';
            const diff = (eh * 60 + em) - (sh * 60 + sm);
            return diff > 0 ? `${diff} Menit` : '-';
        } catch {
            return '-';
        }
    };

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setStartTime('07:30');
        setEndTime('08:15');
        setOrder(lessonHours.length + 1);
        setIsBreak(false);
        setProgramId(programFilter && programFilter !== 'general' ? String(programFilter) : '');
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name || '');
        setStartTime(formatTime(item.start_time) !== '-' ? formatTime(item.start_time) : '07:30');
        setEndTime(formatTime(item.end_time) !== '-' ? formatTime(item.end_time) : '08:15');
        setOrder(item.order || 1);
        setIsBreak(!!item.is_break);
        setProgramId(item.program_id ? String(item.program_id) : '');
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name,
            start_time: startTime,
            end_time: endTime,
            order: Number(order) || 1,
            is_break: isBreak,
            program_id: programId ? Number(programId) : null,
            educational_institution_id: null,
        };

        try {
            if (editingItem) {
                await updateLessonHour({ id: editingItem.id, ...payload }).unwrap();
                toast.success('Jam pelajaran berhasil diperbarui');
            } else {
                await createLessonHour(payload).unwrap();
                toast.success('Jam pelajaran berhasil ditambahkan');
            }
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan jam pelajaran');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteLessonHour(deleteTarget.id).unwrap();
            toast.success('Jam pelajaran berhasil dihapus');
            setDeleteTarget(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus jam pelajaran');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Nama Sesi / Jam',
            render: (row) => (
                <div className="flex items-center gap-2.5">
                    <span className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                        row.is_break ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                        {row.is_break ? <Coffee className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </span>
                    <div>
                        <span className="font-bold text-slate-800 block text-sm">{row.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                            Urutan: Ke-{row.order ?? row.id}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'time_slot',
            label: 'Rentang Waktu',
            render: (row) => (
                <div className="font-mono text-xs">
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {formatTime(row.start_time)} - {formatTime(row.end_time)} WIB
                    </span>
                </div>
            ),
        },
        {
            key: 'duration',
            label: 'Durasi',
            render: (row) => (
                <span className="text-xs font-semibold text-slate-600">
                    {calculateDuration(row.start_time, row.end_time)}
                </span>
            ),
        },
        {
            key: 'type',
            label: 'Tipe Sesi',
            render: (row) =>
                row.is_break ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Coffee className="w-3 h-3" />
                        Istirahat
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        KBM Efektif
                    </span>
                ),
        },
        {
            key: 'program',
            label: 'Program Pesantren',
            render: (row) => {
                const prog = row.program || programs.find((p) => Number(p.id) === Number(row.program_id));
                const isTibyan = prog?.name?.toLowerCase().includes('tibyan') || prog?.code === 'TBY';
                const isKubar = prog?.name?.toLowerCase().includes('kubar') || prog?.code === 'KBR';

                if (prog) {
                    return (
                        <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold border ${
                                isTibyan
                                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                                    : isKubar
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                        >
                            <School className="w-3.5 h-3.5" />
                            Program {prog.name}{prog.code ? ` (${prog.code})` : ''}
                        </span>
                    );
                }

                return (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <School className="w-3.5 h-3.5 text-slate-400" />
                        Umum (Semua Program)
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
                        title="Edit Jam Pelajaran"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Hapus Jam Pelajaran"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="p-2 bg-emerald-50 text-emerald-700 rounded-md">
                            <Clock className="w-5 h-5" />
                        </span>
                        Jam Pelajaran (KBM)
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Atur konfigurasi slot jam belajar harian santri, jam istirahat, dan waktu efektif madrasah.
                    </p>
                </div>
                <div>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0b57d0] text-white font-semibold text-sm rounded-md hover:bg-[#0842a0] transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Jam Pelajaran
                    </button>
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={lessonHours}
                isLoading={isLoading}
                emptyMessage="Belum ada slot jam pelajaran diset"
                filters={
                    <div className="flex items-center gap-1.5">
                        <select
                            value={programFilter}
                            onChange={(e) => setProgramFilter(e.target.value)}
                            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-[#093c30] focus:border-[#093c30] transition-colors cursor-pointer shadow-2xs"
                        >
                            <option value="">Semua Program</option>
                            {programs.map((prog) => (
                                <option key={prog.id} value={prog.id}>
                                    Program {prog.name}{prog.code ? ` (${prog.code})` : ''}
                                </option>
                            ))}
                            <option value="general">Umum (Semua Program)</option>
                        </select>
                    </div>
                }
            />

            {/* Modal Tambah/Edit Jam Pelajaran */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Jam Pelajaran' : 'Tambah Jam Pelajaran Baru'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Nama Sesi / Jam *
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Jam Ke-1, Jam Ke-2, Istirahat Dhuha"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Waktu Mulai *
                            </label>
                            <input
                                type="time"
                                required
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Waktu Selesai *
                            </label>
                            <input
                                type="time"
                                required
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Nomor Urutan
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={order}
                                onChange={(e) => setOrder(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Program Pesantren
                            </label>
                            <select
                                value={programId}
                                onChange={(e) => setProgramId(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            >
                                <option value="">Umum (Berlaku Semua Program)</option>
                                {programs.map((prog) => (
                                    <option key={prog.id} value={prog.id}>
                                        Program {prog.name}{prog.code ? ` (${prog.code})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isBreak}
                                onChange={(e) => setIsBreak(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            Tandai Sebagai Sesi Istirahat (Bukan Jam KBM)
                        </label>
                        <p className="text-[11px] text-slate-400 mt-1 pl-6">
                            Sesi istirahat tidak akan dihitung sebagai beban mengajar guru atau jam mata pelajaran.
                        </p>
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
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#0b57d0] rounded-md hover:bg-[#0842a0] disabled:opacity-50"
                        >
                            {isCreating || isUpdating ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Jam Pelajaran"
                message={`Yakin ingin menghapus ${deleteTarget?.name} (${formatTime(deleteTarget?.start_time)} - ${formatTime(deleteTarget?.end_time)})?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
