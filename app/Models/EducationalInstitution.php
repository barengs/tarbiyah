<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EducationalInstitution extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'progression_type' => 'string',
    ];

    public function educationType()
    {
        return $this->belongsTo(EducationType::class, 'education_type_id');
    }

    public function educations()
    {
        return $this->hasMany(Education::class, 'educational_institution_id');
    }

    public function classrooms()
    {
        return $this->hasMany(Classroom::class, 'educational_institution_id');
    }

    public function headmaster()
    {
        return $this->belongsTo(Teacher::class, 'headmaster_id');
    }
}
