import { apiSlice } from './apiSlice';

export const classroomApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getClassrooms: builder.query({
            query: (params) => ({
                url: 'master/classrooms',
                params,
            }),
            providesTags: (result) =>
                result?.data
                    ? [
                          ...result.data.map(({ id }) => ({ type: 'Classroom', id })),
                          { type: 'Classroom', id: 'LIST' },
                      ]
                    : [{ type: 'Classroom', id: 'LIST' }],
        }),
        getClassroom: builder.query({
            query: (id) => `master/classrooms/${id}`,
            providesTags: (result, error, id) => [{ type: 'Classroom', id }],
        }),
        createClassroom: builder.mutation({
            query: (data) => ({
                url: 'master/classrooms',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [{ type: 'Classroom', id: 'LIST' }],
        }),
        updateClassroom: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `master/classrooms/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'Classroom', id },
                { type: 'Classroom', id: 'LIST' },
            ],
        }),
        deleteClassroom: builder.mutation({
            query: (id) => ({
                url: `master/classrooms/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Classroom', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetClassroomsQuery,
    useGetClassroomQuery,
    useCreateClassroomMutation,
    useUpdateClassroomMutation,
    useDeleteClassroomMutation,
} = classroomApi;

