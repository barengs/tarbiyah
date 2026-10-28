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
        getStudentById: builder.query({
            query: (id) => `master/students/${id}`,
            providesTags: (result, error, id) => [{ type: 'Student', id }],
        }),
        getUnassignedStudents: builder.query({
            query: (params) => ({
                url: 'master/students/unassigned',
                params,
            }),
            providesTags: ['Student', 'StudentClass'],
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
            invalidatesTags: (result, error, { id }) => ['Student', { type: 'Student', id }],
        }),
        deleteStudent: builder.mutation({
            query: (id) => ({
                url: `master/students/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Student'],
        }),
        bulkAssignStudents: builder.mutation({
            query: (data) => ({
                url: 'master/students/bulk-assign',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Student', 'ClassGroup'],
        }),
        bulkAssignProgram: builder.mutation({
            query: (data) => ({
                url: 'master/students/bulk-assign-program',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Student', 'StudentClass', 'ClassGroup'],
        }),
        getPullPreview: builder.query({
            query: () => ({
                url: 'master/students/pull-preview',
            }),
            providesTags: ['Student'],
        }),
        generateNis: builder.query({
            query: (params) => ({
                url: 'master/students/generate-nis',
                params,
            }),
        }),
        pullStudentsFromSmpt: builder.mutation({
            query: () => ({
                url: 'master/students/pull-from-smpt',
                method: 'POST',
            }),
            invalidatesTags: ['Student'],
        }),
    }),
});

export const {
    useGetStudentsQuery,
    useGetStudentByIdQuery,
    useGetUnassignedStudentsQuery,
    useCreateStudentMutation,
    useUpdateStudentMutation,
    useDeleteStudentMutation,
    useBulkAssignStudentsMutation,
    useGetPullPreviewQuery,
    useLazyGetPullPreviewQuery,
    usePullStudentsFromSmptMutation,
    useBulkAssignProgramMutation,
    useGenerateNisQuery,
    useLazyGenerateNisQuery,
} = studentApi;
