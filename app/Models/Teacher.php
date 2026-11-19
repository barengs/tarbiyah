<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Teacher extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $appends = ['photo_url'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * URL publik foto guru/staf (diambil dari storage lokal jika ada, atau dari api.tamjid.or.id).
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

        if (str_starts_with($cleanPath, 'uploads/')) {
            return "{$smptPublicUrl}/storage/{$cleanPath}";
        }

        return "{$smptPublicUrl}/storage/uploads/logos/large/{$cleanPath}";
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function studies()
    {
        return $this->belongsToMany(Study::class, 'teacher_studies', 'teacher_id', 'study_id')
            ->withTimestamps();
    }

    public function homeroomClassGroups()
    {
        return $this->hasMany(ClassGroup::class, 'homeroom_teacher_id');
    }

    public function schedules()
    {
        return $this->hasMany(LessonSchedule::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
