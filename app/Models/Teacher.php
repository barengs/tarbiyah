<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Teacher extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

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
