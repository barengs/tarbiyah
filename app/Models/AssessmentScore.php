<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssessmentScore extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'score' => 'decimal:2',
        'date'  => 'date',
    ];

    public function assessment()
    {
        return $this->belongsTo(Assessment::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Relasi ke skema smpt (migrasi data 1:1).
     */
    public function studentAssessment()
    {
        return $this->belongsTo(StudentAssessment::class);
    }
}
