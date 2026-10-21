<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'born_at'  => 'date',
        'is_mukim' => 'boolean',
    ];

    public function scopeMukim($query)
    {
        return $query->where('is_mukim', true);
    }

    public function scopeRegulerLuar($query)
    {
        return $query->where('is_mukim', false);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'aktif');
    }
}
