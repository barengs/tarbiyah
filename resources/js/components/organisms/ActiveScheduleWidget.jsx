import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../atoms/Card';
import ScheduleItem from '../molecules/ScheduleItem';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Organism Jadwal Halaqah & KBM Berlangsung Saat Ini
 * Terkoneksi real-time dengan database LessonSchedule & TeachingJournal.
 */
export default function ActiveScheduleWidget({
    schedules = [],
    currentTimeRange = '09:40 - 11:15 WIB',
    totalRooms = 48,
    className = '',
}) {
    return (
        <Card className={`h-full flex flex-col ${className}`}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    <div>
                        <CardTitle>Jadwal Halaqah & KBM Berlangsung Saat Ini</CardTitle>
                        <CardDescription>
                            Sesi KBM Pagi Jam Pelajaran ke-3 & ke-4 integrasi Kurikulum Diniyah & Formal
                        </CardDescription>
                    </div>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md shrink-0 self-start sm:self-auto">
                    {currentTimeRange}
                </span>
            </CardHeader>

            <CardContent className="space-y-3 flex-1 pt-3">
                {schedules.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                        Tidak ada sesi KBM yang berlangsung saat ini.
                    </div>
                ) : (
                    schedules.map((s) => (
                        <ScheduleItem
                            key={s.id}
                            subject={s.subject}
                            category={s.category}
                            teacher={s.teacher}
                            room={s.room}
                            time={s.time}
                            status={s.status}
                            remaining={s.remaining}
                            studyType={s.category}
                        />
                    ))
                )}
            </CardContent>

            <CardFooter>
                <Link
                    to="/kbm"
                    className="flex items-center gap-1.5 font-bold text-[#093c30] hover:underline"
                >
                    Lihat Seluruh {totalRooms} Ruang Belajar Terjadwal
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Server Sinkron: Real-time
                </span>
            </CardFooter>
        </Card>
    );
}
