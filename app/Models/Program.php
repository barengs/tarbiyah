<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Program extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $fillable = [
        'name',
        'code',
        'description',
    ];

    // ── Relasi: Program memiliki banyak Jenjang Pendidikan ──
    public function educations()
    {
        return $this->hasMany(Education::class, 'program_id');
    }

    // ── Relasi: Program memiliki banyak Rombongan Belajar ──
    public function classGroups()
    {
        return $this->hasMany(ClassGroup::class, 'program_id');
    }
}
