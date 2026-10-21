import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink, UserPlus } from 'lucide-react';

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
                {/* Brand */}
                <Link to="/login" className="flex items-center gap-3 shrink-0">
                    <span className="w-10 h-10 rounded-md bg-[#093c30] text-emerald-300 flex items-center justify-center shadow-sm">
                        <BookOpen className="w-5 h-5" />
                    </span>
                    <span className="leading-tight">
                        <span className="flex items-center gap-1.5">
                            <span className="text-base font-extrabold text-slate-900 tracking-tight">
                                e-Panyeppen
                            </span>
                            <span className="text-[9px] font-bold text-white bg-[#093c30] px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                                Portal
                            </span>
                        </span>
                        <span className="block text-[11px] text-slate-400 font-medium">
                            PesantrenPro &bull; Sistem Akademik
                        </span>
                    </span>
                </Link>

                {/* Navigasi Menu */}
                <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
                    <a href="#program" onClick={(e) => e.preventDefault()} className="hover:text-[#093c30] transition-colors">
                        Program
                    </a>
                    <a href="#psb" onClick={(e) => e.preventDefault()} className="hover:text-[#093c30] transition-colors">
                        Informasi PSB
                    </a>
                </nav>

                {/* Aksi Kanan */}
                <div className="flex items-center gap-3">
                    <Link
                        to="/login"
                        className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-[#093c30] transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Masuk Portal
                    </Link>
                    <button
                        type="button"
                        onClick={() => alert('Form Pendaftaran Santri Baru (PSB) 2025/2026.')}
                        className="inline-flex items-center gap-2 bg-[#093c30] hover:bg-[#062c23] text-white text-sm font-bold px-4 lg:px-5 py-2.5 rounded-md shadow-sm transition-all active:scale-95"
                    >
                        <UserPlus className="w-4 h-4" />
                        Daftar PSB
                    </button>
                </div>
            </div>
        </header>
    );
}
