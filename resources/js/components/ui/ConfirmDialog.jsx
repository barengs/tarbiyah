import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, isLoading }) {
    return (
        <Modal open={open} title={title} onClose={onCancel}>
            <div className="flex items-start gap-4">
                <div className="p-2.5 bg-amber-50 rounded-md">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed pt-1.5">{message}</p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                >
                    Batal
                </button>
                <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 disabled:opacity-50 transition-colors"
                >
                    {isLoading ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
            </div>
        </Modal>
    );
}
