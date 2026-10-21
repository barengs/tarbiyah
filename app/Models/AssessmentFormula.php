<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssessmentFormula extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'knowledge_formula' => 'array',
        'skill_formula' => 'array',
        'attendance_weight' => 'decimal:2',
    ];

    public function classScheduleDetail()
    {
        return $this->belongsTo(ClassScheduleDetail::class);
    }
}
