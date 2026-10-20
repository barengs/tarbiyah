<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Study extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'kkm'       => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function educationalInstitution()
    {
        return $this->belongsTo(EducationalInstitution::class, 'educational_institution_id');
    }

    public function teachers()
    {
        return $this->belongsToMany(Teacher::class, 'teacher_studies', 'study_id', 'teacher_id')
                    ->withTimestamps();
    }

    public function classGroupSubjects()
    {
        return $this->hasMany(ClassGroupSubject::class, 'study_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
