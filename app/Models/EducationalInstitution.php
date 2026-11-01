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

    protected $appends = ['logo_url', 'letterhead_url'];

    public function getLogoUrlAttribute(): ?string
    {
        if (empty($this->logo)) {
            return null;
        }
        if (str_starts_with($this->logo, 'http://') || str_starts_with($this->logo, 'https://') || str_starts_with($this->logo, '/')) {
            return $this->logo;
        }
        return asset('storage/' . ltrim($this->logo, '/'));
    }

    public function getLetterheadUrlAttribute(): ?string
    {
        if (empty($this->letterhead)) {
            return null;
        }
        if (str_starts_with($this->letterhead, 'http://') || str_starts_with($this->letterhead, 'https://') || str_starts_with($this->letterhead, '/')) {
            return $this->letterhead;
        }
        return asset('storage/' . ltrim($this->letterhead, '/'));
    }

    public function educationType()
    {
        return $this->belongsTo(EducationType::class, 'education_type_id');
    }

    public function educations()
    {
        return $this->hasMany(Education::class, 'educational_institution_id');
    }

    public function classes()
    {
        return $this->hasMany(EducationClass::class, 'educational_institution_id');
    }

    public function classGroups()
    {
        return $this->hasMany(ClassGroup::class, 'educational_institution_id');
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
