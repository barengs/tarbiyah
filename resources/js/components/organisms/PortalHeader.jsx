import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

/**
 * Header portal login (mockup e-Panyeppen Portal):
 * Logo + menu navigasi publik + link masuk & CTA daftar PSB.
 */
export default function PortalHeader({ className = '' }) {
    return (
        <header
            className={`bg-white border-b border-slate-100 sticky top-0 z-40 ${className}`}
        >
            <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 lg:h-20 flex items-center justify-between gap-6">
                {/* Brand & Navigasi Menu */}
                <div className="flex items-center gap-10">
                    <Link to="/" className="flex items-center gap-3 shrink-0">
                        <span className="w-10 h-10 rounded-md bg-[#093c30] text-emerald-300 flex items-center justify-center shadow-sm">
                            <BookOpen className="w-5 h-5" />
                        </span>
                        <span className="leading-tight">
                            <span className="text-base font-extrabold text-slate-900 tracking-tight block">
                                e-Panyeppen
                            </span>
                            <span className="block text-[11px] text-slate-500 font-semibold">
                                Sistem Informasi Akademik &amp; Ma'had
                            </span>
                        </span>
                    </Link>

                    <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
                        <a href="#program" onClick={(e) => e.preventDefault()} className="hover:text-[#093c30] transition-colors">
                            Program
                        </a>
                        <a href="#psb" onClick={(e) => e.preventDefault()} className="hover:text-[#093c30] transition-colors">
                            Informasi PSB
                        </a>
                    </nav>
                </div>

                {/* Status Akademik & Triwulan di Sisi Kanan */}
                <div className="flex items-center gap-2 hidden sm:flex px-3 py-1.5 rounded-md bg-emerald-50/80 border border-emerald-100 text-xs font-semibold text-[#093c30]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Akademik Terjadwal &bull; 1446/1447 H
                </div>
            </div>
        </header>
    );
}
