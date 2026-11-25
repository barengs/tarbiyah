import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../atoms/Card';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
} from 'recharts';
import { Building2, Layers, Users } from 'lucide-react';

const FALLBACK_COLORS = [
    '#093c30',
    '#059669',
    '#0284c7',
    '#d97706',
    '#7c3aed',
    '#e11d48',
    '#0d9488',
    '#4f46e5',
    '#64748b',
];

/**
 * Organism Statistik Sebaran Siswa pada Setiap Kelas di Dalam Jenjang Pendidikan (Pie / Donut Chart).
 * Ditempatkan tepat di bawah Stat Cards pada Dashboard.
 */
export default function InstitutionClassPieChartCard({
    institutions = [],
    className = '',
}) {
    // Mode tampilan: 'classes' (Per Tingkat Kelas) | 'rombels' (Per Rombel)
    const [mode, setMode] = useState('classes');

    const totalAllStudents = institutions.reduce((acc, inst) => acc + (inst.count || 0), 0);

    if (!institutions || institutions.length === 0) {
        return null;
    }

    // Responsif grid kolom berdasarkan jumlah jenjang pendidikan
    const gridColsClass =
        institutions.length === 1
            ? 'grid-cols-1'
            : institutions.length === 2
            ? 'grid-cols-1 lg:grid-cols-2'
            : institutions.length === 3
            ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';

    return (
        <Card className={`overflow-hidden ${className}`}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-md bg-emerald-50 text-[#093c30] border border-emerald-200">
                            <Building2 className="w-4 h-4" />
                        </span>
                        <CardTitle>Sebaran Santri per Kelas dalam Jenjang Pendidikan</CardTitle>
                    </div>
                    <CardDescription className="mt-1">
                        Proporsi dan distribusi jumlah santri aktif pada setiap kelas di masing-masing jenjang pendidikan.
                    </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                    {/* Toggle Per Tingkat Kelas vs Per Rombel */}
                    <div className="inline-flex items-center bg-slate-100 p-1 rounded-md border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setMode('classes')}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                                mode === 'classes'
                                    ? 'bg-white text-[#093c30] shadow-2xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            Per Tingkat Kelas
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('rombels')}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                                mode === 'rombels'
                                    ? 'bg-white text-[#093c30] shadow-2xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            Per Rombel
                        </button>
                    </div>

                    <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md">
                        Total: {totalAllStudents.toLocaleString('id-ID')} Santri
                    </span>
                </div>
            </CardHeader>

            <CardContent className="pt-5 pb-5">
                <div className={`grid ${gridColsClass} gap-4`}>
                    {institutions.map((inst) => {
                        const rawList =
                            mode === 'rombels'
                                ? inst.rombels || []
                                : inst.classes && inst.classes.length > 0
                                ? inst.classes
                                : inst.rombels || [];

                        const activeSlices = rawList.filter((item) => (item.value || 0) > 0);
                        const instTotal =
                            inst.count || rawList.reduce((sum, item) => sum + (item.value || 0), 0);
                        const isTibyan =
                            inst.program_code === 'TBY' ||
                            inst.program_name?.toLowerCase().includes('tibyan');

                        return (
                            <div
                                key={inst.id || inst.name}
                                className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 hover:bg-white hover:shadow-xs transition-all"
                            >
                                {/* Header Jenjang */}
                                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200/70">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <h4
                                                className="text-sm font-bold text-slate-900 truncate"
                                                title={inst.name}
                                            >
                                                {inst.name}
                                            </h4>
                                            {inst.program_name && (
                                                <span
                                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                                        isTibyan
                                                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                                                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                    }`}
                                                >
                                                    {inst.program_name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            {rawList.length}{' '}
                                            {mode === 'rombels' ? 'Rombel Terdaftar' : 'Tingkat Kelas'}
                                        </p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-white text-[#093c30] border border-slate-200 shrink-0 shadow-2xs">
                                        {instTotal.toLocaleString('id-ID')} Santri
                                    </span>
                                </div>

                                {/* Pie / Donut Chart */}
                                {activeSlices.length === 0 ? (
                                    <div className="h-[185px] flex flex-col items-center justify-center text-center text-xs text-slate-400">
                                        <p className="font-medium">
                                            Belum ada santri terjadwal di kelas jenjang ini.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="h-[185px] w-full flex items-center justify-center my-1">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={activeSlices}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={46}
                                                    outerRadius={70}
                                                    paddingAngle={3}
                                                    stroke="white"
                                                    strokeWidth={2}
                                                >
                                                    {activeSlices.map((entry, idx) => (
                                                        <Cell
                                                            key={`cell-${inst.id}-${idx}`}
                                                            fill={
                                                                entry.color ||
                                                                FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
                                                            }
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value, name, props) => [
                                                        `${Number(value).toLocaleString('id-ID')} Santri (${
                                                            props?.payload?.percentage ?? 0
                                                        }%)`,
                                                        name,
                                                    ]}
                                                    contentStyle={{
                                                        backgroundColor: '#ffffff',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e2e8f0',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                                        fontSize: '12px',
                                                    }}
                                                />
                                                <text
                                                    x="50%"
                                                    y="46%"
                                                    textAnchor="middle"
                                                    dominantBaseline="central"
                                                    className="fill-slate-900 font-extrabold text-lg"
                                                >
                                                    {instTotal.toLocaleString('id-ID')}
                                                </text>
                                                <text
                                                    x="50%"
                                                    y="60%"
                                                    textAnchor="middle"
                                                    className="fill-slate-500 font-semibold text-[9px] uppercase tracking-wider"
                                                >
                                                    {inst.short || 'Santri'}
                                                </text>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Daftar Kelas & Persentase */}
                                <div className="space-y-1.5 pt-2 border-t border-slate-200/70 max-h-[150px] overflow-y-auto pr-1">
                                    {rawList.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 italic text-center py-2">
                                            Belum ada kelas terdaftar
                                        </p>
                                    ) : (
                                        rawList.map((cls, idx) => (
                                            <div
                                                key={cls.id || cls.name || idx}
                                                className="flex items-center justify-between gap-2 text-xs py-0.5"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                cls.color ||
                                                                FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
                                                        }}
                                                    />
                                                    <span
                                                        className="font-semibold text-slate-700 truncate"
                                                        title={cls.name}
                                                    >
                                                        {cls.name}
                                                    </span>
                                                    {mode === 'classes' && cls.rombels_count > 0 && (
                                                        <span className="text-[10px] text-slate-400 shrink-0">
                                                            ({cls.rombels_count} Rombel)
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="font-bold text-slate-900">
                                                        {Number(cls.value || 0).toLocaleString('id-ID')}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 w-11 text-right">
                                                        ({cls.percentage ?? 0}%)
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
