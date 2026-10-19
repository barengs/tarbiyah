import { apiSlice } from './apiSlice';

export const teacherApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getTeachers: builder.query({
            query: (params) => ({
                url: 'master/teachers',
                params,
            }),
            providesTags: ['Teacher'],
        }),
        createTeacher: builder.mutation({
            query: (data) => ({
                url: 'master/teachers',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Teacher'],
        }),
        updateTeacher: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `master/teachers/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Teacher'],
        }),
        deleteTeacher: builder.mutation({
            query: (id) => ({
                url: `master/teachers/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Teacher'],
        }),
    }),
});

export const {
    useGetTeachersQuery,
    useCreateTeacherMutation,
    useUpdateTeacherMutation,
    useDeleteTeacherMutation,
} = teacherApi;
