import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MainLayout from './layouts/MainLayout';
import AuthMonitor from './components/AuthMonitor';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';

import '../css/app.css';

const App = () => {
    return (
        <Provider store={store}>
            <Router>
                <AuthMonitor>
                    <ToastContainer />
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/" element={<MainLayout />}>
                            <Route index element={<Dashboard />} />
                        </Route>
                    </Routes>
                </AuthMonitor>
            </Router>
        </Provider>
    );
};

const container = document.getElementById('app');
if (container) {
    if (!container._reactRoot) {
        container._reactRoot = createRoot(container);
    }
    container._reactRoot.render(<App />);
}
