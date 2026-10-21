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

    /**
     * Accessor & Mutator untuk sinkronisasi nama:
     * Menjembatani kolom `name` (tarbiyah) dengan `first_name` & `last_name` (smpt).
     */
    public function getNameAttribute($value)
    {
        if (!empty($value)) {
            return $value;
        }
        return trim(($this->first_name ?? '') . ' ' . ($this->last_name ?? ''));
    }

    public function setNameAttribute($value)
    {
        $this->attributes['name'] = $value;
        if (!empty($value) && empty($this->attributes['first_name'])) {
            $parts = explode(' ', trim($value), 2);
            $this->attributes['first_name'] = $parts[0] ?? $value;
            $this->attributes['last_name']  = $parts[1] ?? null;
        }
    }

    // Scopes
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
        return $query->whereIn('status', ['Aktif', 'aktif']);
    }

    // Relations
    public function studentClasses()
    {
        return $this->hasMany(StudentClass::class);
    }

    public function activeClass()
    {
        return $this->hasOne(StudentClass::class)->whereIn('status', ['aktif', 'disetujui']);
    }

    public function presences()
    {
        return $this->hasMany(Presence::class);
    }

    public function studentAssessments()
    {
        return $this->hasMany(StudentAssessment::class);
    }
}
