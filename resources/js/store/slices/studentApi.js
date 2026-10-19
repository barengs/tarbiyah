import { apiSlice } from './apiSlice';

export const studentApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getStudents: builder.query({
            query: (params) => ({
                url: 'master/students',
                params,
            }),
            providesTags: ['Student'],
        }),
        createStudent: builder.mutation({
            query: (data) => ({
                url: 'master/students',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Student'],
        }),
        updateStudent: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `master/students/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Student'],
        }),
        deleteStudent: builder.mutation({
            query: (id) => ({
                url: `master/students/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Student'],
        }),
    }),
});

export const {
    useGetStudentsQuery,
    useCreateStudentMutation,
    useUpdateStudentMutation,
    useDeleteStudentMutation,
} = studentApi;
