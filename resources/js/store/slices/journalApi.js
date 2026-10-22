import { apiSlice } from './apiSlice';

export const journalApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getListWithPresence: builder.query({
            query: (params) => ({
                url: 'main/journals/list-with-presence',
                params,
            }),
            providesTags: ['Journal'],
        }),
        getJournals: builder.query({
            query: (params) => ({
                url: 'main/journals',
                params,
            }),
            providesTags: ['Journal'],
        }),
        getJournal: builder.query({
            query: (id) => `main/journals/${id}`,
            providesTags: (result, error, id) => [{ type: 'Journal', id }],
        }),
        getAttendanceSheet: builder.query({
            query: (params) => ({
                url: 'main/journals/sheet',
                params,
            }),
            providesTags: ['Journal'],
        }),
        getDayGrid: builder.query({
            query: (params) => ({
                url: 'main/journals/day-grid',
                params,
            }),
            providesTags: ['Journal'],
        }),
        getRangeGrid: builder.query({
            query: (params) => ({
                url: 'main/journals/range-grid',
                params,
            }),
            providesTags: ['Journal'],
        }),
        saveDayGrid: builder.mutation({
            query: (data) => ({
                url: 'main/journals/save-day-grid',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Journal'],
        }),
        saveMultiDayGrid: builder.mutation({
            query: (data) => ({
                url: 'main/journals/save-multiday-grid',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Journal'],
        }),
        createJournal: builder.mutation({
            query: (data) => ({
                url: 'main/journals',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Journal'],
        }),
        batchPresence: builder.mutation({
            query: (data) => ({
                url: 'main/journals/batch-presence',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Journal'],
        }),
        updateJournal: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `main/journals/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Journal'],
        }),
        deleteJournal: builder.mutation({
            query: (id) => ({
                url: `main/journals/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Journal'],
        }),
        updatePresences: builder.mutation({
            query: ({ journal_id, journalId, ...data }) => ({
                url: `main/journals/${journal_id || journalId}/presences`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Journal'],
        }),
        getJournalRecap: builder.query({
            query: (params) => ({
                url: 'main/journals/recap',
                params,
            }),
            providesTags: ['Journal'],
        }),
    }),
});

export const {
    useGetListWithPresenceQuery,
    useGetJournalsQuery,
    useGetJournalQuery,
    useGetAttendanceSheetQuery,
    useGetDayGridQuery,
    useGetRangeGridQuery,
    useSaveDayGridMutation,
    useSaveMultiDayGridMutation,
    useCreateJournalMutation,
    useBatchPresenceMutation,
    useUpdateJournalMutation,
    useDeleteJournalMutation,
    useUpdatePresencesMutation,
    useGetJournalRecapQuery,
} = journalApi;
