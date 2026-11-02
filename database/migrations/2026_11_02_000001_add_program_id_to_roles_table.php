<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->foreignId('program_id')
                ->nullable()
                ->after('guard_name')
                ->constrained('programs')
                ->nullOnDelete();
        });

        // Seed / inisialisasi default roles berbasis cakupan program pesantren
        $now = now();
        $rolesToSeed = [
            [
                'name'       => 'staf-kubar',
                'guard_name' => 'api',
                'program_id' => 2, // Kubar
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name'       => 'staf-tibyan',
                'guard_name' => 'api',
                'program_id' => 1, // Tibyan
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name'       => 'asatidz-kubar',
                'guard_name' => 'api',
                'program_id' => 2, // Kubar
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name'       => 'asatidz-tibyan',
                'guard_name' => 'api',
                'program_id' => 1, // Tibyan
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name'       => 'walikelas-kubar',
                'guard_name' => 'api',
                'program_id' => 2, // Kubar
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name'       => 'walikelas-tibyan',
                'guard_name' => 'api',
                'program_id' => 1, // Tibyan
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        foreach ($rolesToSeed as $r) {
            $exists = DB::table('roles')->where('name', $r['name'])->where('guard_name', 'api')->first();
            if (!$exists) {
                $roleId = DB::table('roles')->insertGetId($r);

                // Copy default menus from base role (staf/asatidz/walikelas) jika ada
                $baseName = explode('-', $r['name'])[0];
                $baseRole = DB::table('roles')->where('name', $baseName)->where('guard_name', 'api')->first();
                if ($baseRole) {
                    $baseMenus = DB::table('role_menu')->where('role_id', $baseRole->id)->get();
                    foreach ($baseMenus as $bm) {
                        DB::table('role_menu')->insertOrIgnore([
                            'role_id' => $roleId,
                            'menu_id' => $bm->menu_id,
                        ]);
                    }

                    $basePerms = DB::table('role_has_permissions')->where('role_id', $baseRole->id)->get();
                    foreach ($basePerms as $bp) {
                        DB::table('role_has_permissions')->insertOrIgnore([
                            'role_id'       => $roleId,
                            'permission_id' => $bp->permission_id,
                        ]);
                    }
                }
            } else {
                DB::table('roles')->where('id', $exists->id)->update(['program_id' => $r['program_id']]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropForeign(['program_id']);
            $table->dropColumn('program_id');
        });
    }
};

