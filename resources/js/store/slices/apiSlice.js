import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logOut } from './authSlice';

const baseQuery = fetchBaseQuery({
    baseUrl: '/api/',
    prepareHeaders: (headers) => {
        const token = localStorage.getItem('token');
        if (token) {
            headers.set('authorization', `Bearer ${token}`);
        }
        headers.set('Accept', 'application/json');
        return headers;
    },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
    let result = await baseQuery(args, api, extraOptions);
    if (result.error && result.error.status === 401) {
        // Abaikan jika sedang memanggil endpoint auth sendiri (misal login)
        const urlStr = typeof args === 'string' ? args : args?.url || '';
        if (!urlStr.includes('auth/login')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            api.dispatch(logOut());
            if (window.location.pathname !== '/login') {
                window.location.href = '/login?expired=1';
            }
        }
    }
    return result;
};

export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: [
        'Institution',
        'EducationLevel',
        'Teacher',
        'Student',
        'AcademicYear',
        'AcademicQuarter',
        'ClassGroup',
        'Study',
        'LessonHour',
        'Schedule',
        'Journal',
        'Presence',
        'Assessment',
        'ReportCard',
        'SecurityMenu',
        'SecurityRole',
        'SecurityPermission',
        'SecurityUser',
        'SidebarMenu',
    ],
    endpoints: () => ({}),
});
