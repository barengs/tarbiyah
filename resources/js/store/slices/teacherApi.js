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
        getTeacherById: builder.query({
            query: (id) => `master/teachers/${id}`,
            providesTags: (result, error, id) => [{ type: 'Teacher', id }],
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
            invalidatesTags: (result, error, { id }) => ['Teacher', { type: 'Teacher', id }],
        }),
        assignTeacherStudies: builder.mutation({
            query: ({ id, study_ids }) => ({
                url: `master/teachers/${id}/studies`,
                method: 'POST',
                body: { study_ids },
            }),
            invalidatesTags: (result, error, { id }) => ['Teacher', { type: 'Teacher', id }, 'Study'],
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
    useGetTeacherByIdQuery,
    useCreateTeacherMutation,
    useUpdateTeacherMutation,
    useAssignTeacherStudiesMutation,
    useDeleteTeacherMutation,
} = teacherApi;
