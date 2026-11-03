<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Kartu Peserta Ujian - {{ $classGroup->name ?? 'Rombel' }}</title>
    <style>
        @page {
            margin: 15mm 12mm 15mm 12mm;
            size: A4 portrait;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 0;
            font-size: 8.5pt;
            line-height: 1.3;
        }
        .card-container {
            border: 1.5px solid #093c30;
            border-radius: 6px;
            padding: 12px 14px;
            margin-bottom: 16px;
            background-color: #ffffff;
            page-break-inside: avoid;
        }
        .page-break {
            page-break-after: always;
        }
        .header {
            text-align: center;
            border-bottom: 1.5px solid #093c30;
            padding-bottom: 6px;
            margin-bottom: 8px;
        }
        .header h1 {
            margin: 0;
            font-size: 11pt;
            color: #093c30;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 800;
        }
        .header h2 {
            margin: 2px 0;
            font-size: 9pt;
            color: #0f172a;
            font-weight: 700;
            text-transform: uppercase;
        }
        .header p {
            margin: 0;
            font-size: 7.5pt;
            color: #64748b;
        }
        .card-body {
            width: 100%;
            border-collapse: collapse;
        }
        .student-info {
            width: 72%;
            vertical-align: top;
        }
        .photo-box {
            width: 28%;
            text-align: right;
            vertical-align: top;
        }
        .photo-frame {
            display: inline-block;
            width: 65px;
            height: 85px;
            border: 1px dashed #94a3b8;
            border-radius: 4px;
            text-align: center;
            line-height: 85px;
            font-size: 7.5pt;
            color: #94a3b8;
            background-color: #f8fafc;
        }
        .photo-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 3px;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
        }
        .info-table td {
            padding: 2px 4px;
            font-size: 8pt;
            vertical-align: top;
        }
        .info-label {
            width: 80px;
            color: #475569;
            font-weight: 600;
        }
        .info-sep {
            width: 8px;
            text-align: center;
        }
        .info-val {
            color: #0f172a;
            font-weight: 700;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 7pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .badge-success {
            background-color: #ecfdf5;
            color: #065f46;
            border: 1px solid #10b981;
        }
        .badge-warning {
            background-color: #fffbeb;
            color: #92400e;
            border: 1px solid #f59e0b;
        }
        .badge-danger {
            background-color: #fef2f2;
            color: #991b1b;
            border: 1px solid #ef4444;
        }
        .schedule-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 8px;
        }
        .schedule-table th, .schedule-table td {
            border: 1px solid #cbd5e1;
            padding: 3px 6px;
            font-size: 7.5pt;
        }
        .schedule-table th {
            background-color: #093c30;
            color: #ffffff;
            font-weight: bold;
            text-align: center;
        }
        .rules-box {
            font-size: 6.8pt;
            color: #64748b;
            border-top: 1px dashed #cbd5e1;
            padding-top: 4px;
            margin-top: 4px;
        }
        .rules-box ol {
            margin: 2px 0 0 14px;
            padding: 0;
        }
        .signatures {
            width: 100%;
            margin-top: 6px;
            border-collapse: collapse;
        }
        .signatures td {
            text-align: center;
            font-size: 7.5pt;
            vertical-align: top;
            width: 50%;
        }
        .sign-space {
            height: 35px;
        }
        .text-center { text-align: center; }
        .cut-line {
            border-top: 1px dashed #94a3b8;
            margin: 12px 0;
            text-align: center;
            font-size: 6.5pt;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    @foreach ($cards as $idx => $card)
        <div class="card-container">
            <!-- HEADER KOP KARTU -->
            <div class="header">
                <h1>{{ $institution->institution_name ?? 'PESANTREN TARBIYAH ISLAMIYAH' }}</h1>
                <h2>KARTU PESERTA ASESMEN / UJIAN AKADEMIK</h2>
                <p>
                    {{ $academicYear->year ?? '1446/1447 H' }} &bull; {{ $quarter->name ?? 'Triwulan Berjalan' }}
                    @if (!empty($institution->address))
                        &bull; {{ $institution->address }}
                    @endif
                </p>
            </div>

            <!-- DATA SISWA & STATUS KEUANGAN -->
            <table class="card-body">
                <tr>
                    <td class="student-info">
                        <table class="info-table">
                            <tr>
                                <td class="info-label">Nomor Induk / NIS</td>
                                <td class="info-sep">:</td>
                                <td class="info-val">{{ $card['student']->nis }}</td>
                            </tr>
                            <tr>
                                <td class="info-label">Nama Siswa</td>
                                <td class="info-sep">:</td>
                                <td class="info-val">{{ $card['student']->name }}</td>
                            </tr>
                            <tr>
                                <td class="info-label">Rombongan Belajar</td>
                                <td class="info-sep">:</td>
                                <td class="info-val">{{ $classGroup->name }}</td>
                            </tr>
                            <tr>
                                <td class="info-label">Ruang Kelas Ujian</td>
                                <td class="info-sep">:</td>
                                <td class="info-val">{{ $classGroup->classroom->name ?? 'Ruang Madrasah' }}</td>
                            </tr>
                            <tr>
                                <td class="info-label">Status Administrasi</td>
                                <td class="info-sep">:</td>
                                <td>
                                    @if ($card['eligibility']['eligible'])
                                        <span class="badge badge-success">✓ Lunas / Memenuhi Syarat</span>
                                    @elseif ($card['eligibility']['status'] === 'offline_bypass' || $card['eligibility']['status'] === 'not_registered')
                                        <span class="badge badge-warning">✓ Dispensasi Sistem (Tervalidasi)</span>
                                    @else
                                        <span class="badge badge-danger">! Dispensasi Panitia Ujian</span>
                                    @endif
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td class="photo-box">
                        <div class="photo-frame">
                            @if (!empty($card['student']->photo))
                                <img src="{{ $card['student']->photo }}" alt="Foto">
                            @else
                                Pas Foto<br>3 x 4
                            @endif
                        </div>
                    </td>
                </tr>
            </table>

            <!-- TABEL JADWAL MATA PELAJARAN -->
            <table class="schedule-table">
                <thead>
                    <tr>
                        <th style="width: 25px;">No.</th>
                        <th>Mata Pelajaran</th>
                        <th style="width: 90px;">Hari / Tanggal</th>
                        <th style="width: 75px;">Waktu</th>
                        <th style="width: 75px;">Paraf Pengawas</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($studies as $sIdx => $study)
                        <tr>
                            <td class="text-center">{{ $sIdx + 1 }}</td>
                            <td><strong>{{ $study->name }}</strong> ({{ $study->code ?? '-' }})</td>
                            <td class="text-center">-</td>
                            <td class="text-center">-</td>
                            <td class="text-center"></td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="5" class="text-center" style="color: #64748b; padding: 8px;">Jadwal mata pelajaran akan diumumkan panitia.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>

            <!-- TATA TERTIB SINGKAT & TANDA TANGAN -->
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 55%; vertical-align: top;">
                        <div class="rules-box">
                            <strong>Tata Tertib Peserta:</strong>
                            <ol>
                                <li>Wajib membawa Kartu Peserta Ujian ini selama ujian berlangsung.</li>
                                <li>Hadir 10 menit sebelum ujian dimulai dengan seragam madrasah rapi.</li>
                                <li>Dilarang membawa alat komunikasi / contekan ke ruang ujian.</li>
                            </ol>
                        </div>
                    </td>
                    <td style="width: 45%; vertical-align: top;">
                        <table class="signatures">
                            <tr>
                                <td>
                                    Peserta Ujian,
                                    <div class="sign-space"></div>
                                    <strong>{{ $card['student']->name }}</strong>
                                </td>
                                <td>
                                    Panitia Asesmen,
                                    <div class="sign-space"></div>
                                    <strong>{{ $homeroomTeacher->name ?? 'Ketua Panitia' }}</strong>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>

        {{-- 2 kartu per lembar A4 --}}
        @if (($idx + 1) % 2 === 0 && ($idx + 1) < count($cards))
            <div class="page-break"></div>
        @elseif (($idx + 1) % 2 !== 0 && ($idx + 1) < count($cards))
            <div class="cut-line">-- - - - - - - - - - - - - - - - Gunting / Potong di Sini - - - - - - - - - - - - - - - --</div>
        @endif
    @endforeach
</body>
</html>
