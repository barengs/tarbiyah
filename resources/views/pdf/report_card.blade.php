<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan Hasil Belajar - {{ $student->name }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 24px;
            font-size: 11pt;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #0f766e;
            padding-bottom: 12px;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 16pt;
            color: #0f766e;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .header h2 {
            margin: 4px 0;
            font-size: 13pt;
            color: #0f172a;
        }
        .header p {
            margin: 0;
            font-size: 9pt;
            color: #64748b;
        }
        .info-table {
            width: 100%;
            margin-bottom: 20px;
            border-collapse: collapse;
        }
        .info-table td {
            padding: 4px 6px;
            font-size: 10pt;
            vertical-align: top;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .data-table th, .data-table td {
            border: 1px solid #cbd5e1;
            padding: 7px 10px;
            font-size: 10pt;
        }
        .data-table th {
            background-color: #f1f5f9;
            color: #334155;
            text-align: center;
            font-weight: bold;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        
        .section-title {
            font-size: 11pt;
            font-weight: bold;
            color: #0f766e;
            margin-bottom: 6px;
            text-transform: uppercase;
        }
        .notes-box {
            border: 1px solid #cbd5e1;
            padding: 10px;
            background-color: #f8fafc;
            border-radius: 4px;
            font-size: 9.5pt;
            min-height: 40px;
            margin-bottom: 16px;
        }
        .signatures {
            width: 100%;
            margin-top: 30px;
            border-collapse: collapse;
        }
        .signatures td {
            text-align: center;
            font-size: 10pt;
            vertical-align: top;
            width: 33.33%;
        }
        .sign-space {
            height: 60px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $inst->name ?? 'Lembaga Pendidikan Pesantren' }}</h1>
        <h2>Laporan Hasil Belajar Santri / Siswa (Rapor)</h2>
        <p>{{ $inst->address ?? 'Komplek Pondok Pesantren' }} • Telp: {{ $inst->phone ?? '-' }}</p>
    </div>

    <table class="info-table">
        <tr>
            <td width="18%" class="bold">Nama Siswa</td>
            <td width="2%">:</td>
            <td width="30%">{{ $student->name }}</td>
            <td width="18%" class="bold">Kelas / Rombel</td>
            <td width="2%">:</td>
            <td width="30%">{{ $classGroup->name }}</td>
        </tr>
        <tr>
            <td class="bold">NIS / NISN</td>
            <td>:</td>
            <td>{{ $student->nis }} / {{ $student->nisn ?? '-' }}</td>
            <td class="bold">Semester</td>
            <td>:</td>
            <td>{{ ucfirst($report->semester) }} ({{ $report->academicYear->year ?? '2026/2027' }})</td>
        </tr>
        <tr>
            <td class="bold">Status Kesiswaan</td>
            <td>:</td>
            <td>{{ $student->is_mukim ? 'Santri Mukim Pesantren' : 'Siswa Reguler Luar' }}</td>
            <td class="bold">Peringkat Kelas</td>
            <td>:</td>
            <td><strong style="color: #0f766e;">Ke-{{ $report->rank ?? '-' }}</strong></td>
        </tr>
    </table>

    <div class="section-title">A. Capaian Nilai Akademik & Mata Pelajaran</div>
    <table class="data-table">
        <thead>
            <tr>
                <th width="5%">No</th>
                <th>Mata Pelajaran</th>
                <th width="12%">KKM</th>
                <th width="15%">Nilai Akhir</th>
                <th width="12%">Predikat</th>
                <th width="18%">Keterangan</th>
            </tr>
        </thead>
        <tbody>
            @if(!empty($report->grades_summary))
                @foreach($report->grades_summary as $idx => $g)
                    <tr>
                        <td class="text-center">{{ $idx + 1 }}</td>
                        <td>{{ $g['study_name'] }}</td>
                        <td class="text-center">{{ number_format($g['kkm'], 0) }}</td>
                        <td class="text-center bold">{{ number_format($g['score'], 1) }}</td>
                        <td class="text-center bold">{{ $g['predicate'] }}</td>
                        <td class="text-center" style="font-size: 9pt;">
                            {{ $g['score'] >= $g['kkm'] ? 'Tuntas' : 'Perlu Bimbingan' }}
                        </td>
                    </tr>
                @endforeach
                <tr style="background-color: #f8fafc; font-weight: bold;">
                    <td colspan="3" class="text-right">Rata-Rata Nilai Keseluruhan:</td>
                    <td class="text-center" style="color: #0f766e; font-size: 11pt;">{{ number_format($report->average_score, 1) }}</td>
                    <td colspan="2"></td>
                </tr>
            @else
                <tr>
                    <td colspan="6" class="text-center" style="color: #94a3b8; padding: 20px;">Belum ada nilai terinput</td>
                </tr>
            @endif
        </tbody>
    </table>

    <div class="section-title">B. Capaian Hafalan Al-Qur'an (Tahfidz)</div>
    <div class="notes-box">
        {{ $report->tahfidz_notes ?? 'Santri aktif mengikuti setoran halaqah harian dan menjaga hafalan (muraja\'ah).' }}
    </div>

    <div style="display: table; width: 100%;">
        <div style="display: table-cell; width: 45%; vertical-align: top;">
            <div class="section-title">C. Rekapitulasi Kehadiran</div>
            <table class="data-table" style="margin-bottom: 0;">
                <tr>
                    <td>Hadir</td>
                    <td class="text-center bold">{{ $report->attendance_summary['hadir'] ?? 0 }} Hari</td>
                </tr>
                <tr>
                    <td>Izin</td>
                    <td class="text-center bold">{{ $report->attendance_summary['izin'] ?? 0 }} Hari</td>
                </tr>
                <tr>
                    <td>Sakit</td>
                    <td class="text-center bold">{{ $report->attendance_summary['sakit'] ?? 0 }} Hari</td>
                </tr>
                <tr>
                    <td>Alpa (Tanpa Keterangan)</td>
                    <td class="text-center bold">{{ $report->attendance_summary['alpa'] ?? 0 }} Hari</td>
                </tr>
            </table>
        </div>
        <div style="display: table-cell; width: 5%;"></div>
        <div style="display: table-cell; width: 50%; vertical-align: top;">
            <div class="section-title">D. Catatan Wali Kelas</div>
            <div class="notes-box" style="min-height: 95px;">
                {{ $report->homeroom_notes ?? 'Tingkatkan terus semangat belajar dan kedisiplinan dalam menuntut ilmu di madrasah.' }}
            </div>
        </div>
    </div>

    <table class="signatures">
        <tr>
            <td>
                Mengetahui,<br>Orang Tua / Wali Santri
                <div class="sign-space"></div>
                ( ......................................... )
            </td>
            <td>
                Diberikan di: Pesantren<br>Tanggal: {{ date('d F Y') }}<br>Wali Kelas
                <div class="sign-space"></div>
                <strong>{{ $teacher->name ?? '( ......................................... )' }}</strong>
            </td>
            <td>
                Mengetahui,<br>Kepala Sekolah / Madrasah
                <div class="sign-space"></div>
                <strong>( ......................................... )</strong>
            </td>
        </tr>
    </table>
</body>
</html>
