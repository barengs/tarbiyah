<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentQuarterlyScore extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'original_score' => 'decimal:2',
        'remedial_score' => 'decimal:2',
        'final_score'    => 'decimal:2',
        'is_remedial'    => 'boolean',
        'is_locked'      => 'boolean',
        'locked_at'      => 'datetime',
    ];

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function academicQuarter()
    {
        return $this->belongsTo(AcademicQuarter::class, 'academic_quarter_id');
    }

    public function classGroup()
    {
        return $this->belongsTo(ClassGroup::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function study()
    {
        return $this->belongsTo(Study::class);
    }
}

