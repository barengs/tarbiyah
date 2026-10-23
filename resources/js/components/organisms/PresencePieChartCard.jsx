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
 * Organism Statistik Presensi Santri dalam bentuk Pie Chart / Donut Chart
 * Menggunakan data riil dari database endpoint dashboard/stats
 */
export default function PresencePieChartCard({
    pieData = [],
    summary = {},
    className = '',
}) {
    const totalPresensi = pieData.reduce((acc, c) => acc + (c.value || 0), 0);

    // Ambil data yang punya value agar pie chart tidak kosong
    const displayData = pieData.filter((d) => d.value > 0);
    const centerRate = summary.rate || 0;

    return (
        <Card className={`h-full flex flex-col ${className}`}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <CardTitle>Statistik Presensi & Kedisiplinan Santri</CardTitle>
                    <CardDescription>
                        Komposisi kehadiran santri berdasarkan catatan presensi jamaah, KBM, dan Halaqah.
                    </CardDescription>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md shrink-0 sm:self-end">
                    {summary.total_log || totalPresensi || 0} Catatan Presensi
                </span>
            </CardHeader>

            <CardContent className="pt-4 pb-5">
                <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-5">
                    {/* PIE CHART */}
                    <div className="h-[200px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={displayData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    stroke="white"
                                    strokeWidth={2}
                                >
                                    {displayData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                        fontSize: '12px',
                                    }}
                                />
                                {/* Center label */}
                                <text
                                    x="50%"
                                    y="46%"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    className="fill-slate-900 font-extrabold text-3xl"
                                >
                                    {centerRate}%
                                </text>
                                <text
                                    x="50%"
                                    y="60%"
                                    textAnchor="middle"
                                    className="fill-slate-500 font-medium text-[10px] uppercase tracking-wider"
                                >
                                    Tingkat Kehadiran
                                </text>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* LEGEND & SUMMARY */}
                    <div className="space-y-4">
                        {pieData.map((item, idx) => {
                            const pct = item.percentage || 0;
                            return (
                                <div key={idx} className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <span
                                            className="w-3 h-3 rounded-sm shrink-0"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="font-bold text-slate-800">{item.name}</span>
                                                <span className="text-slate-500">
                                                    {pct}% <span className="font-bold text-slate-800">({item.value})</span>
                                                </span>
                                            </div>
                                            {/* Mini Progress Bar */}
                                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${pct}%`, backgroundColor: item.color }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                            <p className="text-slate-500">
                                Rerata kehadiran <strong className="text-emerald-700">{centerRate}%</strong> menunjukkan{' '}
                                <strong className="text-slate-900">{summary.status_label || 'Disiplin Sangat Baik'}</strong>
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
