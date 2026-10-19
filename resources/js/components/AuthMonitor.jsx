import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { setCredentials, logOut } from '../store/slices/authSlice';

export default function AuthMonitor({ children }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useSelector((state) => state.auth);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && !isAuthenticated) {
            dispatch(setCredentials({ token, user: JSON.parse(localStorage.getItem('user')) || null }));
        }

        if (!token && location.pathname !== '/login') {
            navigate('/login');
        }
    }, [isAuthenticated, location.pathname, navigate, dispatch]);

    return children;
}
