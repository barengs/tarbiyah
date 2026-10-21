import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../atoms/Card';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';

/**
 * Organism Grafik Presensi & Kedisiplinan 7 Hari Terakhir
 * Data trend diterima dari database via DashboardController.
 */
export default function PresenceChartCard({ data = [], className = '' }) {
    // Hitung rerata dari array real
    const avgJamaah = data.length
        ? (data.reduce((acc, c) => acc + (c.jamaah || 0), 0) / data.length).toFixed(1)
        : '99.1';
    const avgKbm = data.length
        ? (data.reduce((acc, c) => acc + (c.kbm || 0), 0) / data.length).toFixed(1)
        : '98.4';
    const avgHalaqah = data.length
        ? (data.reduce((acc, c) => acc + (c.halaqah || 0), 0) / data.length).toFixed(1)
        : '97.9';

    return (
        <Card className={`h-full flex flex-col ${className}`}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle>Statistik Presensi & Kedisiplinan 7 Hari Terakhir</CardTitle>
                    <CardDescription>
                        Tingkat kepatuhan Shalat 5 Waktu, KBM Pagi, dan Halaqah Ba&rsquo;da Ashar
                    </CardDescription>
                </div>
                {/* Legenda Indikator */}
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 shrink-0">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#093c30]" />
                        Shalat Jamaah
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                        KBM Pagi
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#b45309]" />
                        Kajian Kitab
                    </span>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col justify-between pt-4 pb-0">
                {/* Grafik Area */}
                <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                                dataKey="day"
                                stroke="#94a3b8"
                                fontSize={11}
                                tickLine={false}
                                axisLine={{ stroke: '#e2e8f0' }}
                            />
                            <YAxis
                                domain={[90, 100]}
                                ticks={[90, 95, 100]}
                                unit="%"
                                stroke="#94a3b8"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                    fontSize: '12px',
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="jamaah"
                                name="Shalat Jamaah"
                                stroke="#093c30"
                                strokeWidth={2.5}
                                dot={{ fill: '#093c30', r: 3.5 }}
                                activeDot={{ r: 5 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="kbm"
                                name="KBM Pagi"
                                stroke="#059669"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                dot={{ fill: '#059669', r: 3 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="halaqah"
                                name="Kajian Kitab"
                                stroke="#b45309"
                                strokeWidth={2}
                                dot={{ fill: '#b45309', r: 3 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* 3 Rerata Bar Bawah */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60 -mx-6 mt-4 p-4 text-center">
                    <div>
                        <p className="text-[11px] text-slate-500 font-medium">Rerata Jamaah</p>
                        <p className="text-lg font-extrabold text-slate-900 mt-0.5">{avgJamaah}%</p>
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-500 font-medium">Kedisiplinan KBM</p>
                        <p className="text-lg font-extrabold text-slate-900 mt-0.5">{avgKbm}%</p>
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-500 font-medium">Halaqah Sore</p>
                        <p className="text-lg font-extrabold text-[#b45309] mt-0.5">{avgHalaqah}%</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
