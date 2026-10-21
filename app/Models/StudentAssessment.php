<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentAssessment extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'final_knowledge_score' => 'decimal:2',
        'final_skill_score' => 'decimal:2',
        'final_score' => 'decimal:2',
    ];

    public function classScheduleDetail()
    {
        return $this->belongsTo(ClassScheduleDetail::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function academicQuarter()
    {
        return $this->belongsTo(AcademicQuarter::class);
    }

    public function assessmentScores()
    {
        return $this->hasMany(AssessmentScore::class);
    }
}
