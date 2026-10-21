<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EducationClass extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    public function education()
    {
        return $this->belongsTo(Education::class, 'education_id');
    }

    public function classGroups()
    {
        return $this->hasMany(ClassGroup::class, 'education_class_id');
    }
}
