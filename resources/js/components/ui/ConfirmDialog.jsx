import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
    open,
    title,
    message,
    onConfirm,
    onCancel,
    isLoading,
    confirmLabel = 'Ya, Hapus',
    loadingLabel = 'Memproses...',
    confirmTone = 'danger',
}) {
    const btnToneClass =
        confirmTone === 'primary'
            ? 'bg-emerald-700 hover:bg-emerald-800'
            : confirmTone === 'amber'
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-rose-600 hover:bg-rose-700';

    const iconBgClass =
        confirmTone === 'primary' ? 'bg-emerald-50' : 'bg-amber-50';
    const iconColorClass =
        confirmTone === 'primary' ? 'text-emerald-600' : 'text-amber-600';

    return (
        <Modal open={open} title={title} onClose={onCancel}>
            <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-md ${iconBgClass}`}>
                    <AlertTriangle className={`w-6 h-6 ${iconColorClass}`} />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed pt-1.5">{message}</p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                >
                    Batal
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 transition-colors ${btnToneClass}`}
                >
                    {isLoading ? loadingLabel : confirmLabel}
                </button>
            </div>
        </Modal>
    );
}
