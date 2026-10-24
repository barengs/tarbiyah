import { createSlice } from '@reduxjs/toolkit';

/**
 * ================================================================
 * ACADEMIC CONTEXT SLICE (GLOBAL SELECTOR PERIODE AKADEMIK)
 * ================================================================
 * Mengelola periode akademik (Tahun Akademik + Sub-Akademik Triwulan)
 * yang dipilih secara global melalui Navbar Dropdown.
 *
 * Seluruh modul (Dashboard, Presensi, KBM, Nilai Imtihan, Rapor)
 * membaca state ini untuk mengunci scope data akademik.
 * State di-persist ke localStorage agar pilihan tidak hilang saat refresh.
 */

const STORAGE_KEY = 'academicContext';

const loadFromStorage = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const initialState = loadFromStorage() || {
    selectedYearId: null,
    selectedYearName: '',
    selectedQuarterId: null,
    selectedQuarterName: '',
    isSystemActive: true,
    fullLabel: '',
};

const persistToStorage = (state) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        /* silent storage error */
    }
};

const academicContextSlice = createSlice({
    name: 'academicContext',
    initialState,
    reducers: {
        /**
         * Set periode akademik global terpilih (dipanggil dari Navbar dropdown
         * maupun dari halaman master setelah memilih periode)
         */
        setAcademicPeriod: (state, action) => {
            const {
                selectedYearId,
                selectedYearName,
                selectedQuarterId,
                selectedQuarterName,
                isSystemActive = true,
                fullLabel,
            } = action.payload;

            state.selectedYearId = selectedYearId;
            state.selectedYearName = selectedYearName || '';
            state.selectedQuarterId = selectedQuarterId;
            state.selectedQuarterName = selectedQuarterName || '';
            state.isSystemActive = isSystemActive;
            state.fullLabel = fullLabel ||
                (selectedYearName ? `Tahun Akademik ${selectedYearName} ${selectedQuarterName || ''}`.trim() : '');

            persistToStorage(state);
        },

        /**
         * Reset ke periode aktif sistem (live) — biasanya dipanggil setelah
         * fetch GetActiveAcademicYear
         */
        resetToSystemActive: (state, action) => {
            const { activeYearId, activeYearName, activeQuarterId, activeQuarterName } = action.payload;

            state.selectedYearId = activeYearId ?? state.selectedYearId;
            state.selectedYearName = activeYearName ?? state.selectedYearName;
            state.selectedQuarterId = activeQuarterId ?? state.selectedQuarterId;
            state.selectedQuarterName = activeQuarterName ?? state.selectedQuarterName;
            state.isSystemActive = true;
            state.fullLabel = activeYearName
                ? `Tahun Akademik ${activeYearName} ${activeQuarterName || ''}`.trim()
                : '';

            persistToStorage(state);
        },

        /**
         * Reset penuh konteks akademik (misal saat user logout / ganti profil)
         */
        clearAcademicContext: (state) => {
            state.selectedYearId = null;
            state.selectedYearName = '';
            state.selectedQuarterId = null;
            state.selectedQuarterName = '';
            state.isSystemActive = true;
            state.fullLabel = '';
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch {
                /* silent */
            }
        },
    },
});

export const { setAcademicPeriod, resetToSystemActive, clearAcademicContext } = academicContextSlice.actions;
export default academicContextSlice.reducer;
