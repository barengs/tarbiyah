<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Education extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'educations';
    protected $guarded = ['id'];

    public function institution()
    {
        return $this->belongsTo(EducationalInstitution::class, 'educational_institution_id');
    }
}
