import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { setCredentials, logOut } from '../store/slices/authSlice';
import { apiSlice } from '../store/slices/apiSlice';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function AuthMonitor({ children }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, token: reduxToken } = useSelector((state) => state.auth);
    const ssoProcessed = useRef(false);
    const profileVerifiedForToken = useRef(null);

    useEffect(() => {
        // 1. Deteksi SSO Handover (?token=...) dari portal pesantren
        const searchParams = new URLSearchParams(location.search);
        const ssoToken = searchParams.get('token');

        if (ssoToken && !ssoProcessed.current) {
            ssoProcessed.current = true;
            axios.post('/api/auth/sso', { token: ssoToken })
                .then((res) => {
                    if (res.data.status === 'success') {
                        dispatch(apiSlice.util.resetApiState());
                        dispatch(setCredentials({
                            token: res.data.access_token,
                            user: res.data.user
                        }));
                        profileVerifiedForToken.current = res.data.access_token;
                        toast.success(`Selamat datang via SSO, ${res.data.user?.name || ''}!`);
                        // Bersihkan token dari URL query param agar rapi
                        navigate(location.pathname, { replace: true });
                    }
                })
                .catch((err) => {
                    dispatch(logOut());
                    dispatch(apiSlice.util.resetApiState());
                    toast.error(err.response?.data?.message || 'Gagal login via SSO Pesantren.');
                    navigate('/login', { replace: true });
                });
            return;
        }

        // 2. Local storage session check & server-side profile verification
        const token = localStorage.getItem('token');
        if (token && !isAuthenticated) {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                dispatch(setCredentials({ token, user }));
            } catch (e) {
                dispatch(logOut());
                dispatch(apiSlice.util.resetApiState());
            }
        }

        if (token && profileVerifiedForToken.current !== token && location.pathname !== '/login') {
            profileVerifiedForToken.current = token;
            axios.get('/api/auth/profile', {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((res) => {
                    if (res.data?.status === 'success' && res.data?.data) {
                        const freshUser = res.data.data;
                        const storedRaw = localStorage.getItem('user');
                        let storedUser = null;
                        try {
                            storedUser = storedRaw ? JSON.parse(storedRaw) : null;
                        } catch (_) {}

                        // Jika akun berubah (misal karena perbaikan collision ID), bersihkan seluruh cache API
                        if (storedUser && (storedUser.id !== freshUser.id || storedUser.email !== freshUser.email)) {
                            dispatch(apiSlice.util.resetApiState());
                        }
                        dispatch(setCredentials({ token, user: freshUser }));
                    }
                })
                .catch((err) => {
                    if (err.response?.status === 401) {
                        profileVerifiedForToken.current = null;
                        dispatch(logOut());
                        dispatch(apiSlice.util.resetApiState());
                        navigate('/login', { replace: true });
                    }
                });
        }

        // 3. Redirect ke login jika tidak ada token & bukan di halaman login
        if (!token && !ssoToken && location.pathname !== '/login') {
            navigate('/login');
        }
    }, [isAuthenticated, reduxToken, location.pathname, location.search, navigate, dispatch]);

    return children;
}
