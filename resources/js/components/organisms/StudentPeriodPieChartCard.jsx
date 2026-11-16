import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../atoms/Card';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
} from 'recharts';

/**
 * Organism Statistik Santri per Periode / Angkatan dalam bentuk Pie / Donut Chart.
 */
export default function StudentPeriodPieChartCard({
    data = [],
    totalSantri = 0,
    className = '',
}) {
    const computedTotal = totalSantri || data.reduce((acc, item) => acc + (item.value || 0), 0);
    const displayData = data.filter((d) => d.value > 0);

    return (
        <Card className={`h-full flex flex-col ${className}`}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <CardTitle>Statistik Santri per Periode</CardTitle>
                    <CardDescription>
                        Sebaran jumlah santri aktif berdasarkan angkatan / periode masuk (Hijriah).
                    </CardDescription>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md shrink-0 sm:self-end">
                    {computedTotal.toLocaleString('id-ID')} Santri
                </span>
            </CardHeader>

            <CardContent className="pt-4 pb-5 flex-1 flex items-center">
                {displayData.length === 0 ? (
                    <div className="w-full py-10 text-center text-xs text-slate-400">
                        Belum ada data santri per periode.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-5 w-full">
                        {/* PIE / DONUT CHART */}
                        <div className="h-[220px] w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={displayData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={58}
                                        outerRadius={84}
                                        paddingAngle={3}
                                        stroke="white"
                                        strokeWidth={2}
                                    >
                                        {displayData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color || '#093c30'} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, name) => [`${Number(value).toLocaleString('id-ID')} Santri`, `Periode ${name}`]}
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            borderRadius: '10px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                            fontSize: '12px',
                                        }}
                                    />
                                    <text
                                        x="50%"
                                        y="46%"
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        className="fill-slate-900 font-extrabold text-2xl"
                                    >
                                        {computedTotal.toLocaleString('id-ID')}
                                    </text>
                                    <text
                                        x="50%"
                                        y="60%"
                                        textAnchor="middle"
                                        className="fill-slate-500 font-medium text-[10px] uppercase tracking-wider"
                                    >
                                        Total Santri
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* LEGEND & DETAIL */}
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                            {displayData.map((item, idx) => (
                                <div key={item.name || idx} className="flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: item.color || '#093c30' }}
                                        />
                                        <span className="font-semibold text-slate-700 truncate">
                                            {item.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-bold text-slate-900">
                                            {Number(item.value).toLocaleString('id-ID')}
                                        </span>
                                        <span className="text-[11px] text-slate-500 w-11 text-right">
                                            ({item.percentage ?? 0}%)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
