import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logOut } from '../../store/slices/authSlice';
import { ChevronDown, LogOut, User, ShieldCheck } from 'lucide-react';
import Avatar from '../atoms/Avatar';

const ROLE_LABEL = {
    mudir: 'Mudir Ma\u2019had',
    admin: 'Administrator',
    guru: 'Guru / Pengampu',
};

export default function UserDropdown() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((s) => s.auth);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = () => {
        dispatch(logOut());
        navigate('/login');
    };

    const name = user?.name || 'Pengguna';
    const role = ROLE_LABEL[user?.role] || user?.role || 'Staff Akademik';

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2.5 pl-1 pr-1.5 py-0.5 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left"
            >
                <Avatar name={name} size="md" status="online" />
                <span className="hidden lg:block leading-tight">
                    <span className="block text-[13px] font-bold text-slate-800 max-w-[160px] truncate">{name}</span>
                    <span className="block text-[11px] text-slate-500">{role}</span>
                </span>
                <ChevronDown className={`hidden lg:block w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-10 w-64 bg-white border border-slate-200 rounded-md shadow-md z-50 overflow-hidden transition-all duration-150">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                        <Avatar name={name} size="sm" />
                        <div className="min-w-0">
                            <p className="text-[13px] font-bold text-slate-800 truncate">{name}</p>
                            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <div className="p-2">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] text-slate-600 rounded hover:bg-slate-50">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Role: <b className="text-slate-800 capitalize">{user?.role || '-'}</b></span>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] text-slate-600 rounded hover:bg-slate-50">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>ID: <b className="text-slate-800">{user?.id || '-'}</b></span>
                        </div>
                    </div>
                    <div className="p-2 border-t border-slate-100">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Keluar dari Sistem
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
