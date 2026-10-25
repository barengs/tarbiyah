import React, { useEffect } from 'react';
import Modal from '../ui/Modal';
import { 
    useLazyGetPullPreviewQuery, 
    usePullStudentsFromSmptMutation 
} from '../../store/slices/studentApi';
import { 
    RefreshCw, 
    Users, 
    CheckCircle2, 
    UserPlus, 
    AlertTriangle, 
    ShieldCheck, 
    Database, 
    ArrowRight,
    MapPin
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function PullStudentsModal({ open, onClose, onFinish }) {
    const [fetchPreview, { data: previewResponse, isLoading: isPreviewLoading, isFetching, error }] = useLazyGetPullPreviewQuery();
    const [pullStudents, { isLoading: isPulling }] = usePullStudentsFromSmptMutation();

    useEffect(() => {
        if (open) {
            fetchPreview();
        }
    }, [open, fetchPreview]);

    const preview = previewResponse?.data || null;

    const handleExecutePull = async () => {
        try {
            const res = await pullStudents().unwrap();
            toast.success(res?.message || 'Data santri berhasil disinkronkan dari SMPT');
            if (onFinish) onFinish();
            onClose();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menarik data dari SMPT');
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Penarikan Data Santri Baru dari SMPT"
            maxWidth="max-w-3xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    <button
                        type="button"
                        onClick={() => fetchPreview()}
                        disabled={isPreviewLoading || isFetching || isPulling}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-600' : 'text-slate-400'}`} />
                        <span>Perbarui Pratinjau</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isPulling}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleExecutePull}
                            disabled={isPreviewLoading || isPulling || !preview}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#093c30] hover:bg-[#062c23] rounded-md transition shadow-xs disabled:opacity-50"
                        >
                            {isPulling ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                                    <span>Sedang Menarik Data...</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>
                                        {preview?.new_students > 0
                                            ? `Tarik Sekarang (${preview.new_students} Santri Baru)`
                                            : 'Sinkronkan Ulang Seluruh Data'}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-5">
                {/* Deskripsi Alur */}
                <p className="text-xs text-slate-600 leading-relaxed">
                    Sistem akan memindai seluruh data santri mukim aktif di database utama kepesantrenan (<code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]">smpt</code>) dan mencocokkannya dengan data di sistem Tarbiyah sebelum penarikan dieksekusi.
                </p>

                {/* State Loading Pratinjau */}
                {(isPreviewLoading || (isFetching && !preview)) && (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                        <RefreshCw className="w-7 h-7 text-[#093c30] animate-spin" />
                        <div>
                            <p className="text-sm font-bold text-slate-800">Menghubungkan ke SMPT Core...</p>
                            <p className="text-xs text-slate-500 mt-0.5">Mengkalkulasi jumlah santri baru dan memvalidasi integritas data.</p>
                        </div>
                    </div>
                )}

                {/* State Error Pratinjau */}
                {error && !isPreviewLoading && (
                    <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-xs">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-sm">Gagal Mengambil Pratinjau Data</p>
                            <p className="mt-1">{error?.data?.message || 'Pastikan server SMPT aktif dan internal key sesuai.'}</p>
                            <button
                                type="button"
                                onClick={() => fetchPreview()}
                                className="mt-2 text-rose-700 underline font-semibold hover:text-rose-900"
                            >
                                Coba Hubungkan Lagi
                            </button>
                        </div>
                    </div>
                )}

                {/* Konten Pratinjau Siap */}
                {preview && !isPreviewLoading && (
                    <>
                        {/* 3 Kartu Ringkasan Statistik */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* 1. Total di SMPT */}
                            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total di SMPT</span>
                                    <Database className="w-4 h-4 text-slate-400" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-1.5">
                                    <span className="text-2xl font-extrabold text-slate-900 leading-tight">
                                        {preview.total_smpt?.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-slate-500 font-medium">Santri</span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Data aktif di database pusat</p>
                            </div>

                            {/* 2. Sudah Terdaftar */}
                            <div className="p-3.5 rounded-lg border border-emerald-100 bg-emerald-50/40">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Sudah Terdaftar</span>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-1.5">
                                    <span className="text-2xl font-extrabold text-emerald-900 leading-tight">
                                        {preview.already_in_tarbiyah?.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-emerald-700 font-medium">Santri</span>
                                </div>
                                <p className="text-[10px] text-emerald-700/80 mt-1">Akan diperbarui jika ada mutasi</p>
                            </div>

                            {/* 3. Santri Baru */}
                            <div className="p-3.5 rounded-lg border border-[#093c30]/20 bg-emerald-50/80">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-[#093c30] uppercase tracking-wider">Santri Baru</span>
                                    <UserPlus className="w-4 h-4 text-[#093c30]" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-1.5">
                                    <span className="text-2xl font-extrabold text-[#093c30] leading-tight">
                                        +{preview.new_students?.toLocaleString()}
                                    </span>
                                    <span className="text-xs font-bold text-[#093c30]">Siap Ditarik</span>
                                </div>
                                <p className="text-[10px] text-slate-600 mt-1">Belum masuk di buku induk Tarbiyah</p>
                            </div>
                        </div>

                        {/* Validasi Integritas Gender: Santri 100% Banin / Putra */}
                        {preview.has_female_anomaly ? (
                            <div className="p-3.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-900 flex items-start gap-3 text-xs animate-in fade-in">
                                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-[13px] text-rose-800">
                                        Peringatan: Kesalahan Algoritma Terdeteksi ({preview.female_anomaly_count} Santri Perempuan)
                                    </p>
                                    <p className="mt-0.5 text-rose-700 leading-relaxed">
                                        {preview.anomaly_message || 'Sesuai ketentuan pesantren saat ini, tidak ada santri berjenis kelamin perempuan. Seluruh data otomatis distandarkan sebagai Banin (Laki-laki) saat disimpan.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 rounded-lg border border-emerald-200/90 bg-emerald-50/60 text-emerald-900 flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <div>
                                        <span className="font-bold text-slate-800">Validasi Integritas Gender: </span>
                                        <span className="text-emerald-800 font-semibold">100% Banin (Laki-laki)</span>
                                        <span className="text-slate-500 text-[11px] block sm:inline sm:ml-1">
                                            &bull; Tidak ditemukan santri perempuan (sesuai ketentuan pesantren).
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                    Valid L
                                </span>
                            </div>
                        )}

                        {/* Tabel Pratinjau Sampel Santri */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    Sampel Pratinjau Data Santri
                                </p>
                                <span className="text-[11px] text-slate-400">
                                    Menampilkan {preview.preview_sample?.length || 0} dari {preview.total_smpt} santri
                                </span>
                            </div>

                            <div className="border border-slate-200 rounded-md overflow-hidden max-h-56 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                                        <tr>
                                            <th className="py-2 px-3 font-semibold">Status</th>
                                            <th className="py-2 px-3 font-semibold">NIS</th>
                                            <th className="py-2 px-3 font-semibold">Nama Santri</th>
                                            <th className="py-2 px-3 font-semibold">Gender</th>
                                            <th className="py-2 px-3 font-semibold">Wilayah Asal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {preview.preview_sample?.map((item) => (
                                            <tr key={item.nis} className="hover:bg-slate-50/70">
                                                <td className="py-2 px-3">
                                                    {item.is_new ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#093c30] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                            <UserPlus className="w-2.5 h-2.5" />
                                                            Santri Baru
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                            Sudah Ada
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3 font-mono font-medium text-slate-700">
                                                    {item.nis}
                                                </td>
                                                <td className="py-2 px-3 font-bold text-slate-900">
                                                    {item.name}
                                                </td>
                                                <td className="py-2 px-3">
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                                                        L (Banin)
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 text-slate-500 truncate max-w-[140px]">
                                                    {item.village}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
