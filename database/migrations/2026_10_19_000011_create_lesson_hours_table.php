<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('educational_institution_id')->nullable()->constrained('educational_institutions')->nullOnDelete();
            $table->string('name');
            $table->time('start_time');
            $table->time('end_time');
            $table->integer('order')->default(1);
            $table->boolean('is_break')->default(false);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_hours');
    }
};
