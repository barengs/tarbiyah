import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import axios from 'axios';
import { toast } from 'react-toastify';
import AuthLayout from '../layouts/AuthLayout';
import AuthTemplate from '../components/templates/AuthTemplate';

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleLogin = async ({ loginInput, password, rememberMe }) => {
        setIsLoading(true);
        try {
            const response = await axios.post('/api/auth/login', {
                email: loginInput,
                password,
            });

            if (response.data.status === 'success') {
                dispatch(
                    setCredentials({
                        token: response.data.access_token,
                        user: response.data.user,
                    })
                );
                toast.success(`Selamat datang, ${response.data.user?.name || 'Mudir'}!`);
                navigate('/');
            }
        } catch (error) {
            toast.error(
                error.response?.data?.message ||
                    'Autentikasi gagal. Periksa kembali NISN / Email dan Kata Sandi Anda.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <AuthTemplate onSubmit={handleLogin} isLoading={isLoading} />
        </AuthLayout>
    );
}
