<?php

use App\Models\Menu;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel manajemen menu & pivot role_menu.
 * Mengikuti pola bank-santri + perbaikan:
 *  - kolom `slug` eksplisit (stabil, tidak dihitung dari name)
 *  - kolom `is_active` (menu bisa dinonaktifkan tanpa hapus)
 *  - kolom `permission_slug` (kunci stable matriks permission)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menus', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('icon')->nullable();
            $table->string('path')->nullable();
            $table->string('permission_slug')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_divider')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('parent_id')->references('id')->on('menus')->onDelete('cascade');
            $table->index('permission_slug');
        });

        Schema::create('role_menu', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained()->onDelete('cascade');
            $table->foreignId('menu_id')->constrained()->onDelete('cascade');
            $table->primary(['role_id', 'menu_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_menu');
        Schema::dropIfExists('menus');
    }
};
