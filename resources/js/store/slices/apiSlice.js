import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: '/api/',
        prepareHeaders: (headers) => {
            const token = localStorage.getItem('token');
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            headers.set('Accept', 'application/json');
            return headers;
        },
    }),
    tagTypes: ['Institution', 'EducationLevel', 'ClassGroup', 'Schedule', 'Assessment', 'Student'],
    endpoints: () => ({}),
});
