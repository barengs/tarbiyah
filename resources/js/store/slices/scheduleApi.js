import { apiSlice } from './apiSlice';

export const scheduleApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getSchedulePeriods: builder.query({
            query: (params) => ({
                url: 'main/schedule-periods',
                params,
            }),
            providesTags: ['SchedulePeriod'],
        }),
        createSchedulePeriod: builder.mutation({
            query: (data) => ({
                url: 'main/schedule-periods',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['SchedulePeriod', 'Schedule', 'Dashboard'],
        }),
        updateSchedulePeriod: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `main/schedule-periods/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['SchedulePeriod', 'Schedule', 'Dashboard'],
        }),
        deleteSchedulePeriod: builder.mutation({
            query: (id) => ({
                url: `main/schedule-periods/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['SchedulePeriod', 'Schedule', 'Dashboard'],
        }),
        activateSchedulePeriod: builder.mutation({
            query: (id) => ({
                url: `main/schedule-periods/${id}/activate`,
                method: 'POST',
            }),
            invalidatesTags: ['SchedulePeriod', 'Schedule', 'Dashboard'],
        }),
        deactivateSchedulePeriod: builder.mutation({
            query: (id) => ({
                url: `main/schedule-periods/${id}/deactivate`,
                method: 'POST',
            }),
            invalidatesTags: ['SchedulePeriod', 'Schedule', 'Dashboard'],
        }),
        resetSchedulePeriod: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `main/schedule-periods/${id}/reset`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['SchedulePeriod', 'Schedule', 'Dashboard'],
        }),
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
            invalidatesTags: ['Schedule', 'SchedulePeriod'],
        }),
        updateSchedule: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `main/schedules/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Schedule', 'SchedulePeriod'],
        }),
        deleteSchedule: builder.mutation({
            query: (id) => ({
                url: `main/schedules/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Schedule', 'SchedulePeriod'],
        }),
        copyPeriodSchedule: builder.mutation({
            query: (data) => ({
                url: 'main/schedules/copy-period',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Schedule', 'SchedulePeriod'],
        }),
        copyAcademicYearSchedule: builder.mutation({
            query: (data) => ({
                url: 'main/schedules/copy-academic-year',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Schedule', 'SchedulePeriod', 'ClassGroup'],
        }),
    }),
});

export const {
    useGetSchedulePeriodsQuery,
    useCreateSchedulePeriodMutation,
    useUpdateSchedulePeriodMutation,
    useDeleteSchedulePeriodMutation,
    useActivateSchedulePeriodMutation,
    useDeactivateSchedulePeriodMutation,
    useResetSchedulePeriodMutation,
    useGetSchedulesQuery,
    useCreateScheduleMutation,
    useUpdateScheduleMutation,
    useDeleteScheduleMutation,
    useCopyPeriodScheduleMutation,
    useCopyAcademicYearScheduleMutation,
} = scheduleApi;
