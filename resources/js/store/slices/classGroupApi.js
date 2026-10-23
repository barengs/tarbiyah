import { apiSlice } from './apiSlice';

export const classGroupApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getClassGroups: builder.query({
            query: (params) => ({
                url: 'master/class-groups',
                params,
            }),
            providesTags: ['ClassGroup'],
        }),
        getClassGroup: builder.query({
            query: (id) => `master/class-groups/${id}`,
            providesTags: (result, error, id) => [{ type: 'ClassGroup', id }],
        }),
        createClassGroup: builder.mutation({
            query: (data) => ({
                url: 'master/class-groups',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['ClassGroup'],
        }),
        updateClassGroup: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `master/class-groups/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['ClassGroup'],
        }),
        deleteClassGroup: builder.mutation({
            query: (id) => ({
                url: `master/class-groups/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['ClassGroup'],
        }),
        addStudentToGroup: builder.mutation({
            query: ({ groupId, ...data }) => ({
                url: `master/class-groups/${groupId}/students`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['ClassGroup', 'Student'],
        }),
        removeStudentFromGroup: builder.mutation({
            query: ({ groupId, studentId }) => ({
                url: `master/class-groups/${groupId}/students/${studentId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['ClassGroup', 'Student'],
        }),
        promoteTahfidzLevel: builder.mutation({
            query: ({ groupId, ...data }) => ({
                url: `master/class-groups/${groupId}/promote-tahfidz`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['ClassGroup', 'Student'],
        }),
        assignSubjectToGroup: builder.mutation({
            query: ({ groupId, ...data }) => ({
                url: `master/class-groups/${groupId}/assign-subject`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['ClassGroup'],
        }),
        getPromotionCandidates: builder.query({
            query: (classGroupId) => `master/class-groups/${classGroupId}/promotion-candidates`,
            providesTags: (result, error, id) => [{ type: 'ClassGroup', id: `candidates-${id}` }],
        }),
        bulkPromoteStudents: builder.mutation({
            query: (data) => ({
                url: 'master/class-groups/bulk-promote',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['ClassGroup', 'Student'],
        }),
    }),
});

export const {
    useGetClassGroupsQuery,
    useGetClassGroupQuery,
    useCreateClassGroupMutation,
    useUpdateClassGroupMutation,
    useDeleteClassGroupMutation,
    useAddStudentToGroupMutation,
    useRemoveStudentFromGroupMutation,
    usePromoteTahfidzLevelMutation,
    useAssignSubjectToGroupMutation,
    useGetPromotionCandidatesQuery,
    useBulkPromoteStudentsMutation,
} = classGroupApi;
