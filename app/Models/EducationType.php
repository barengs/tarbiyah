<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EducationType extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    public function institutions()
    {
        return $this->hasMany(EducationalInstitution::class, 'education_type_id');
    }
}
