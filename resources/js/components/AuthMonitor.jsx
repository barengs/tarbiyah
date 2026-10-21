import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { setCredentials, logOut } from '../store/slices/authSlice';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function AuthMonitor({ children }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useSelector((state) => state.auth);
    const ssoProcessed = useRef(false);

    useEffect(() => {
        // 1. Deteksi SSO Handover (?token=...) dari portal pesantren
        const searchParams = new URLSearchParams(location.search);
        const ssoToken = searchParams.get('token');

        if (ssoToken && !ssoProcessed.current) {
            ssoProcessed.current = true;
            axios.post('/api/auth/sso', { token: ssoToken })
                .then((res) => {
                    if (res.data.status === 'success') {
                        dispatch(setCredentials({
                            token: res.data.access_token,
                            user: res.data.user
                        }));
                        toast.success(`Selamat datang via SSO, ${res.data.user?.name || ''}!`);
                        // Bersihkan token dari URL query param agar rapi
                        navigate(location.pathname, { replace: true });
                    }
                })
                .catch((err) => {
                    toast.error(err.response?.data?.message || 'Gagal login via SSO Pesantren.');
                    navigate('/login', { replace: true });
                });
            return;
        }

        // 2. Local storage session check
        const token = localStorage.getItem('token');
        if (token && !isAuthenticated) {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                dispatch(setCredentials({ token, user }));
            } catch (e) {
                dispatch(logOut());
            }
        }

        // 3. Redirect ke login jika tidak ada token & bukan di halaman login
        if (!token && !ssoToken && location.pathname !== '/login') {
            navigate('/login');
        }
    }, [isAuthenticated, location.pathname, location.search, navigate, dispatch]);

    return children;
}
