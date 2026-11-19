<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Student extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $appends = ['photo_url'];

    protected $casts = [
        'born_at'    => 'date',
        'is_mukim'   => 'boolean',
        'village_id' => 'integer',
        'program_id' => 'integer',
        'hostel_id'  => 'integer',
    ];

    /**
     * URL publik foto santri (diambil dari storage lokal jika ada, atau dari api.tamjid.or.id).
     */
    public function getPhotoUrlAttribute(): ?string
    {
        $photo = $this->attributes['photo'] ?? null;
        if (empty($photo)) {
            return null;
        }

        if (preg_match('/^(https?:\/\/|data:)/i', $photo)) {
            return $photo;
        }

        $cleanPath = ltrim($photo, '/');
        if (str_starts_with($cleanPath, 'storage/')) {
            $cleanPath = substr($cleanPath, strlen('storage/'));
        }

        if (Storage::disk('public')->exists($cleanPath)) {
            return asset('storage/'.$cleanPath);
        }

        $smptPublicUrl = rtrim(config('services.smpt.public_url', 'https://api.tamjid.or.id'), '/');

        return "{$smptPublicUrl}/storage/{$cleanPath}";
    }

    /**
     * Accessor untuk nama lengkap santri.
     */
    public function getNameAttribute(): string
    {
        if (!empty($this->attributes['name'])) {
            return $this->attributes['name'];
        }
        $full = trim(($this->first_name ?? '') . ' ' . ($this->last_name ?? ''));
        return $full !== '' ? $full : ($this->nis ?? 'Santri');
    }

    /**
     * Accessor NISN: Pada sistem ini, NIS merangkap sebagai NISN resmi.
     */
    public function getNisnAttribute(): ?string
    {
        return $this->nis;
    }

    /**
     * Mutator agar penyimpanan nama otomatis mengisi first_name & last_name jika belum terisi.
     */
    public function setNameAttribute($value): void
    {
        $this->attributes['name'] = $value;
        if (empty($this->attributes['first_name']) && !empty($value)) {
            $parts = explode(' ', trim($value), 2);
            $this->attributes['first_name'] = $parts[0] ?? $value;
            $this->attributes['last_name']  = $parts[1] ?? null;
        }
    }

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

    public function studentClasses()
    {
        return $this->hasMany(StudentClass::class);
    }

    public function activeClass()
    {
        return $this->hasOne(StudentClass::class)->whereIn('status', ['Aktif', 'aktif']);
    }

    public function classGroups()
    {
        return $this->belongsToMany(ClassGroup::class, 'student_classes')
            ->withPivot(['academic_year_id', 'educational_institution_id', 'joined_at', 'left_at', 'status', 'note'])
            ->withTimestamps();
    }

    public function program()
    {
        return $this->belongsTo(Program::class, 'program_id');
    }
}
