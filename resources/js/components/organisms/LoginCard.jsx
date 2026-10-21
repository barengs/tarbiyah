import React, { useState } from 'react';
import { Card } from '../atoms/Card';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import Input from '../atoms/Input';
import Checkbox from '../atoms/Checkbox';
import {
    CreditCard,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    MessageCircle,
    Server,
    ExternalLink,
    HelpCircle,
} from 'lucide-react';

/**
 * Organism Card Login Utama: e-Panyeppen Portal
 */
export default function LoginCard({
    onSubmit,
    isLoading = false,
    className = '',
}) {
    const [loginInput, setLoginInput] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit) {
            onSubmit({ loginInput, password, rememberMe });
        }
    };

    return (
        <Card className={`p-8 lg:p-10 bg-white border-slate-200 shadow-sm relative overflow-hidden ${className}`}>
            {/* Header Form */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <span className="text-[11px] font-extrabold tracking-[0.14em] text-[#093c30] uppercase block border-l-2 border-[#093c30] pl-2 leading-none mb-2">
                        Pintu Masuk Terpadu
                    </span>
                    <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        Sistem Informasi Akademik &amp; Ma&rsquo;had
                    </h2>
                    <p className="mt-2 text-xs lg:text-sm text-slate-500 leading-relaxed max-w-lg">
                        Silakan pilih peruntukan akses Anda untuk memuat lingkungan dasbor dan kurikulum yang sesuai.
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <Input
                    label="NISN Santri / No. Virtual Account / Email"
                    id="loginInput"
                    type="text"
                    required
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    placeholder="Contoh: 0089234812 atau admin@tarbiyah.id"
                    icon={CreditCard}
                    trailing={
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer">
                            <HelpCircle className="w-3.5 h-3.5" />
                            Format Akun
                        </span>
                    }
                />

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[13px] font-semibold text-slate-700">
                            Kata Sandi Portal <span className="text-rose-500">*</span>
                        </label>
                        <a
                            href="#lupa-sandi"
                            onClick={(e) => {
                                e.preventDefault();
                                alert('Silakan hubungi Sekretariat IT via WhatsApp Helpdesk untuk reset kata sandi.');
                            }}
                            className="text-xs font-semibold text-[#b45309] hover:underline"
                        >
                            Lupa Kata Sandi?
                        </a>
                    </div>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                            <Lock className="w-4 h-4" />
                        </div>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Masukkan kata sandi terdaftar"
                            className="block w-full rounded-md border border-slate-300 pl-10 pr-11 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#093c30] focus:ring-2 focus:ring-[#093c30]/10 bg-white"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                    <Checkbox
                        id="rememberMe"
                        label="Ingat sesi di perangkat ini (30 hari)"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Server className="w-3 h-3 text-slate-400" />
                        Server ID: SBY-JKT-01
                    </span>
                </div>

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={isLoading}
                    icon={ArrowRight}
                    iconPosition="right"
                    className="w-full text-base font-bold shadow-md bg-[#093c30] hover:bg-[#062c23] py-3.5 rounded-md"
                >
                    Masuk ke Sistem Akademik
                </Button>
            </form>

            {/* Divider Instant Auth */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 font-bold tracking-wider text-slate-400">
                        Atau Autentikasi Instan
                    </span>
                </div>
            </div>

            {/* WhatsApp OTP Button */}
            <div>
                <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => alert('Fitur WhatsApp OTP Portal terhubung dengan nomor HP wali/santri terdaftar.')}
                    className="w-full justify-between border-slate-200 bg-sky-50/50 hover:bg-sky-50 text-slate-700 py-3"
                >
                    <span className="flex items-center gap-2 font-semibold text-slate-800">
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        Masuk Cepat via WhatsApp OTP
                    </span>
                    <Badge variant="blue" size="xs">
                        Gratis &amp; Cepat
                    </Badge>
                </Button>
            </div>

            {/* Footer Form: PSB Link */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
                Belum terdaftar sebagai santri aktif?{' '}
                <a
                    href="#psb"
                    onClick={(e) => {
                        e.preventDefault();
                        alert('Pendaftaran Santri Baru (PSB) 2025/2026 dibuka.');
                    }}
                    className="font-bold text-[#b45309] hover:underline inline-flex items-center gap-1"
                >
                    Pendaftaran Santri Baru (PSB) 2025/2026
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        </Card>
    );
}
