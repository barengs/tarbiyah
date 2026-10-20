import { apiSlice } from './apiSlice';

export const lessonHourApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getLessonHours: builder.query({
            query: (params) => ({
                url: 'master/lesson-hours',
                params,
            }),
            providesTags: ['LessonHour'],
        }),
        createLessonHour: builder.mutation({
            query: (data) => ({
                url: 'master/lesson-hours',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['LessonHour'],
        }),
        updateLessonHour: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `master/lesson-hours/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['LessonHour'],
        }),
        deleteLessonHour: builder.mutation({
            query: (id) => ({
                url: `master/lesson-hours/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['LessonHour'],
        }),
    }),
});

export const {
    useGetLessonHoursQuery,
    useCreateLessonHourMutation,
    useUpdateLessonHourMutation,
    useDeleteLessonHourMutation,
} = lessonHourApi;
