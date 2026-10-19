<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full bg-[#f8fafc]">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>Tarbiyah - Manajemen Pendidikan & Akademik</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <!-- Global Config & SSO Bridge -->
    <script>
        window.config = {
            app_name: "{{ config('app.name') }}",
            app_url: "{{ config('app.url') }}",
            smpt_url: "{{ config('services.smpt.core_url') }}",
            bank_url: "{{ config('services.bank_santri.url') }}"
        };

        // SSO Bridge: Tangkap token dari URL dan simpan ke localStorage
        (function() {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            if (token) {
                localStorage.setItem('token', token);
                // Bersihkan token dari URL agar tidak terbaca di address bar
                const nextURL = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, nextURL);
            }
        })();
    </script>

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body class="h-full font-sans antialiased text-slate-800 bg-[#f8fafc] overflow-hidden">
    <div id="app" class="h-full"></div>
</body>
</html>
