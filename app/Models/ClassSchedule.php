<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassSchedule extends Model
{
    use HasFactory;

    protected $table = 'class_schedules';
    protected $guarded = ['id'];

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function educationalInstitution()
    {
        return $this->belongsTo(EducationalInstitution::class, 'educational_institution_id');
    }

    public function details()
    {
        return $this->hasMany(ClassScheduleDetail::class);
    }

    public function lessonSession()
    {
        return $this->belongsTo(LessonSession::class, 'lesson_session_id');
    }
}
