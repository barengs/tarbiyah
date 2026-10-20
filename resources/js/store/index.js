import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { apiSlice } from './slices/apiSlice';

// Import all slices for injectEndpoints registration
import './slices/institutionApi';
import './slices/teacherApi';
import './slices/studentApi';
import './slices/studyApi';
import './slices/classGroupApi';
import './slices/lessonHourApi';
import './slices/scheduleApi';
import './slices/journalApi';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(apiSlice.middleware),
});
