import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import academicContextReducer from './slices/academicContextSlice';
import { apiSlice } from './slices/apiSlice';

// Import all API slices for injectEndpoints registration
import './slices/academicApi';
import './slices/institutionApi';
import './slices/teacherApi';
import './slices/studentApi';
import './slices/studyApi';
import './slices/classGroupApi';
import './slices/lessonHourApi';
import './slices/scheduleApi';
import './slices/journalApi';
import './slices/assessmentApi';
import './slices/reportApi';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        academicContext: academicContextReducer,
        [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(apiSlice.middleware),
});
