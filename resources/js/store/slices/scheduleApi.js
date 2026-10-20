import { apiSlice } from './apiSlice';

export const scheduleApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getSchedules: builder.query({
            query: (params) => ({
                url: 'main/schedules',
                params,
            }),
            providesTags: ['Schedule'],
        }),
        createSchedule: builder.mutation({
            query: (data) => ({
                url: 'main/schedules',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Schedule'],
        }),
        updateSchedule: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `main/schedules/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Schedule'],
        }),
        deleteSchedule: builder.mutation({
            query: (id) => ({
                url: `main/schedules/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Schedule'],
        }),
    }),
});

export const {
    useGetSchedulesQuery,
    useCreateScheduleMutation,
    useUpdateScheduleMutation,
    useDeleteScheduleMutation,
} = scheduleApi;
