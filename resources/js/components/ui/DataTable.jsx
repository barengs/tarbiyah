import React from 'react';
import { Inbox } from 'lucide-react';

export default function DataTable({ columns, data, isLoading, onRowClick, emptyMessage = 'Data tidak ditemukan' }) {
    if (isLoading) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-10 text-center text-slate-400 text-sm">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Memuat data...
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl">
                <div className="p-12 text-center text-slate-400">
                    <Inbox className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-medium">{emptyMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((row, idx) => (
                            <tr
                                key={row.id ?? idx}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-emerald-50/50' : 'hover:bg-slate-50'}`}
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className="px-5 py-3.5 text-sm text-slate-700">
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
