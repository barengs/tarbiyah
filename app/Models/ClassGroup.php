<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClassGroup extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function program()
    {
        return $this->belongsTo(Program::class, 'program_id');
    }

    public function educationalInstitution()
    {
        return $this->belongsTo(EducationalInstitution::class, 'educational_institution_id');
    }

    public function education()
    {
        return $this->belongsTo(Education::class, 'education_id');
    }

    public function educationClass()
    {
        return $this->belongsTo(EducationClass::class, 'education_class_id');
    }

    public function classroom()
    {
        return $this->belongsTo(Classroom::class, 'classroom_id');
    }

    public function homeroomTeacher()
    {
        return $this->belongsTo(Teacher::class, 'homeroom_teacher_id');
    }

    public function studentClasses()
    {
        return $this->hasMany(StudentClass::class, 'class_group_id');
    }

    public function activeStudents()
    {
        return $this->studentClasses()->where('status', 'aktif');
    }

    public function subjects()
    {
        return $this->hasMany(ClassGroupSubject::class, 'class_group_id');
    }

    public function schedules()
    {
        return $this->hasMany(LessonSchedule::class, 'class_group_id');
    }

    public function isLeveling(): bool
    {
        return $this->progression_type === 'leveling';
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
