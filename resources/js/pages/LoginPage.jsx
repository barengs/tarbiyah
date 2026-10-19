import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import axios from 'axios';
import { toast } from 'react-toastify';
import { GraduationCap } from 'lucide-react';

export default function LoginPage() {
    const [loginInput, setLoginInput] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await axios.post('/api/auth/login', {
                email: loginInput,
                password,
            });

            if (response.data.status === 'success') {
                dispatch(setCredentials({
                    token: response.data.access_token,
                    user: response.data.user
                }));
                toast.success('Login berhasil!');
                navigate('/');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal login, periksa kembali akun Anda.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div className="w-14 h-14 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md">
                    <GraduationCap className="w-8 h-8" />
                </div>
                <h2 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight">Tarbiyah</h2>
                <p className="mt-1 text-sm text-slate-500 font-medium">Sistem Manajemen Pendidikan & Akademik</p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700">Email atau Nama Pengguna</label>
                            <input
                                type="text"
                                required
                                value={loginInput}
                                onChange={(e) => setLoginInput(e.target.value)}
                                className="mt-1.5 block w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                placeholder="guru@pesantren.id"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700">Kata Sandi</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1.5 block w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
                        >
                            {isLoading ? 'Memproses...' : 'Masuk ke Tarbiyah'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
