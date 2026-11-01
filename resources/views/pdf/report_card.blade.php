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
            font-size: 10.5pt;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            border-bottom: 2.5px solid #093c30;
            padding-bottom: 12px;
            margin-bottom: 18px;
        }
        .header h1 {
            margin: 0;
            font-size: 14pt;
            color: #093c30;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .header h2 {
            margin: 3px 0;
            font-size: 11.5pt;
            color: #0f172a;
            text-transform: uppercase;
        }
        .header p {
            margin: 0;
            font-size: 8.5pt;
            color: #64748b;
        }
        .info-table {
            width: 100%;
            margin-bottom: 18px;
            border-collapse: collapse;
        }
        .info-table td {
            padding: 4px 6px;
            font-size: 9.5pt;
            vertical-align: top;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
        }
        .data-table th, .data-table td {
            border: 1px solid #cbd5e1;
            padding: 7px 10px;
            font-size: 9.5pt;
        }
        .data-table th {
            background-color: #093c30;
            color: #ffffff;
            text-align: center;
            font-weight: bold;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        
        .section-title {
            font-size: 10.5pt;
            font-weight: bold;
            color: #093c30;
            margin-bottom: 6px;
            text-transform: uppercase;
        }
        .notes-box {
            border: 1px solid #cbd5e1;
            padding: 10px 12px;
            background-color: #f8fafc;
            border-radius: 4px;
            font-size: 9.5pt;
            min-height: 85px;
            margin-bottom: 16px;
        }
        .signatures {
            width: 100%;
            margin-top: 28px;
            border-collapse: collapse;
        }
        .signatures td {
            text-align: center;
            font-size: 9.5pt;
            vertical-align: top;
            width: 33.33%;
        }
        .sign-space {
            height: 55px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>PONDOK PESANTREN MIFTAHUL ULUM PANYEPPEN</h1>
        <h2>BAGIAN PENDIDIKAN DAN PENGAJARAN (TARBIYAH WA TA'LIM)</h2>
        <p>Jl. Raya Panyeppen, Potoan Daya, Palengaan, Pamekasan, Jawa Timur 69362 • Website: panyeppen.id</p>
    </div>

    <table class="info-table">
        <tr>
            <td width="18%" class="bold">Nama Santri</td>
            <td width="2%">:</td>
            <td width="30%">{{ $student->name }}</td>
            <td width="18%" class="bold">Program / Jenjang</td>
            <td width="2%">:</td>
            <td width="30%">{{ $classGroup->program->name ?? $inst->short_name ?? 'Tarbiyah' }} — {{ $classGroup->education->name ?? '-' }}</td>
        </tr>
        <tr>
            <td class="bold">NIS / NISN</td>
            <td>:</td>
            <td>{{ $student->nis }} / {{ $student->nisn ?? '-' }}</td>
            <td class="bold">Kelas / Rombel</td>
            <td>:</td>
            <td>{{ $classGroup->name }}</td>
        </tr>
        <tr>
            <td class="bold">Status Kesiswaan</td>
            <td>:</td>
            <td>{{ $student->is_mukim ? 'Santri Mukim Pesantren' : 'Siswa Reguler Luar' }}</td>
            <td class="bold">Periode / Tahun</td>
            <td>:</td>
            <td>{{ $report->academicQuarter->name ?? strtoupper(str_replace('_', ' ', $report->semester)) }} ({{ $report->academicYear->year ?? '1446/1447' }})</td>
        </tr>
        <tr>
            <td class="bold">Wali Kelas</td>
            <td>:</td>
            <td>{{ $teacher->name ?? '-' }}</td>
            <td class="bold">Peringkat Kelas</td>
            <td>:</td>
            <td><strong style="color: #093c30;">Peringkat {{ $report->rank ?? '-' }}</strong></td>
        </tr>
        <tr>
            <td class="bold">Progres Rata-rata</td>
            <td>:</td>
            <td>
                @if($report->previous_average !== null)
                    @php $delta = round((float)$report->average_score - (float)$report->previous_average, 1); @endphp
                    {{ number_format((float)$report->previous_average, 1) }} &rarr; <strong>{{ number_format((float)$report->average_score, 1) }}</strong>
                    ({{ $delta >= 0 ? '+' . $delta : $delta }})
                @else
                    <strong>{{ number_format((float)$report->average_score, 1) }}</strong> (Triwulan Awal)
                @endif
            </td>
            <td class="bold">Status Kenaikan</td>
            <td>:</td>
            <td>
                @php
                    $promoLabel = match($report->promotion_status ?? '') {
                        'layak_naik' => 'Layak Naik Kelas',
                        'lulus_remidi' => 'Layak Naik (Tuntas Remidi)',
                        'remidi_khusus' => 'Wajib Remidi Mapel Khusus',
                        default => ($report->average_score >= 65 ? 'Layak Naik Kelas' : 'Perlu Evaluasi / Remidi'),
                    };
                @endphp
                <strong style="color: #093c30;">{{ $promoLabel }}</strong>
            </td>
        </tr>
    </table>

    <div class="section-title">A. Capaian Nilai Akhir Triwulan &amp; Penunjang Muatan Lokal</div>
    <table class="data-table">
        <thead>
            <tr>
                <th width="5%">No.</th>
                <th>Mata Pelajaran / Fan Kitab</th>
                <th width="18%">Kategori Mapel</th>
                <th width="8%">KKM</th>
                <th width="12%">Nilai Akhir</th>
                <th width="9%">Predikat</th>
                <th width="20%">Ketuntasan / Remidi</th>
            </tr>
        </thead>
        <tbody>
            @if(!empty($report->grades_summary))
                @foreach($report->grades_summary as $idx => $g)
                    @php
                        $typeLabel = match($g['study_type'] ?? 'reguler') {
                            'khusus' => 'Mapel Khusus (Inti)',
                            'muatan_lokal' => 'Muatan Lokal (Penunjang)',
                            default => 'Mapel Reguler',
                        };
                        $scoreVal = (float) ($g['score'] ?? 0);
                        $kkmVal = (float) ($g['kkm'] ?? 65);
                    @endphp
                    <tr>
                        <td class="text-center">{{ $idx + 1 }}</td>
                        <td>{{ $g['study_name'] }}</td>
                        <td class="text-center" style="font-size: 8.5pt;">{{ $typeLabel }}</td>
                        <td class="text-center">{{ number_format($kkmVal, 0) }}</td>
                        <td class="text-center bold">{{ number_format($scoreVal, 1) }}</td>
                        <td class="text-center bold">{{ $g['predicate'] ?? '-' }}</td>
                        <td class="text-center" style="font-size: 8.5pt;">
                            @if(!empty($g['is_remedial']) && isset($g['remedial_score']) && $g['remedial_score'] !== null)
                                Tuntas Remidi (Awal: {{ number_format((float)$g['original_score'], 0) }})
                            @elseif(($g['study_type'] ?? '') === 'muatan_lokal')
                                Penunjang Nilai
                            @elseif($scoreVal >= $kkmVal)
                                Tuntas
                            @elseif(($g['study_type'] ?? '') === 'khusus')
                                Wajib Remidi Khusus
                            @else
                                Belum Tuntas
                            @endif
                        </td>
                    </tr>
                @endforeach
                <tr style="background-color: #f8fafc; font-weight: bold;">
                    <td colspan="4" class="text-right">Rata-Rata Nilai Akhir Triwulan:</td>
                    <td class="text-center" style="color: #093c30; font-size: 10.5pt;">{{ number_format((float)$report->average_score, 1) }}</td>
                    <td colspan="2"></td>
                </tr>
            @else
                <tr>
                    <td colspan="7" class="text-center" style="color: #94a3b8; padding: 20px;">Belum ada nilai akhir triwulan terinput</td>
                </tr>
            @endif
        </tbody>
    </table>

    <div style="display: table; width: 100%;">
        <div style="display: table-cell; width: 45%; vertical-align: top;">
            <div class="section-title">B. Rekapitulasi Kehadiran (KBM)</div>
            <table class="data-table" style="margin-bottom: 0;">
                <tr>
                    <td>Hadir (H)</td>
                    <td class="text-center bold">{{ $report->attendance_summary['hadir'] ?? 0 }} Pertemuan</td>
                </tr>
                <tr>
                    <td>Izin (I)</td>
                    <td class="text-center bold">{{ $report->attendance_summary['izin'] ?? 0 }} Pertemuan</td>
                </tr>
                <tr>
                    <td>Sakit (S)</td>
                    <td class="text-center bold">{{ $report->attendance_summary['sakit'] ?? 0 }} Pertemuan</td>
                </tr>
                <tr>
                    <td>Alpa / Tanpa Keterangan (A)</td>
                    <td class="text-center bold">{{ $report->attendance_summary['alpa'] ?? 0 }} Pertemuan</td>
                </tr>
            </table>
        </div>
        <div style="display: table-cell; width: 5%;"></div>
        <div style="display: table-cell; width: 50%; vertical-align: top;">
            <div class="section-title">C. Catatan & Evaluasi Wali Kelas</div>
            <div class="notes-box">
                {{ $report->homeroom_notes ?? 'Tingkatkan terus semangat belajar, muthala\'ah kitab, dan kedisiplinan dalam menuntut ilmu di pesantren.' }}
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
                Pamekasan, {{ date('d F Y') }}<br>Wali Kelas / Musyrif Rombel
                <div class="sign-space"></div>
                <strong>{{ $teacher->name ?? '( ......................................... )' }}</strong>
            </td>
            <td>
                Mengesahkan,<br>Kepala / Mudir Tarbiyah
                <div class="sign-space"></div>
                <strong>{{ $inst->headmaster_name ?? '( ......................................... )' }}</strong>
            </td>
        </tr>
    </table>
</body>
</html>
