<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AcademicQuarter extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'start_date'         => 'date',
        'end_date'           => 'date',
        'grading_start_date' => 'date',
        'grading_end_date'   => 'date',
        'active'             => 'boolean',
    ];

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }
}
