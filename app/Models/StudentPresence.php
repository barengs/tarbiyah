<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentPresence extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function teachingJournal()
    {
        return $this->belongsTo(TeachingJournal::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
