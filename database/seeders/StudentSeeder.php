<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Log;

class StudentSeeder extends Seeder
{
    /**
     * Data siswa tidak di-generate dummy dari seeder lokal.
     * Seluruh data santri mukim berasal dari penarikan data riil (Master Santri SMPT)
     * melalui fitur 'Tarik Data Santri Baru dari SMPT' di UI atau endpoint internal.
     */
    public function run(): void
    {
        Log::info('StudentSeeder: Data dummy santri dinonaktifkan. Data siswa murni berasal dari Master Santri SMPT.');
    }
}