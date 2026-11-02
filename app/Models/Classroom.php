<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Classroom extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    public function educationalInstitution()
    {
        return $this->belongsTo(EducationalInstitution::class, 'educational_institution_id');
    }

    public function institution()
    {
        return $this->educationalInstitution();
    }

    public function classGroups()
    {
        return $this->hasMany(ClassGroup::class, 'classroom_id');
    }

    public function schedules()
    {
        return $this->hasMany(LessonSchedule::class, 'classroom_id');
    }
}
