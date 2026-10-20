<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeacherStudy extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function study()
    {
        return $this->belongsTo(Study::class);
    }
}
