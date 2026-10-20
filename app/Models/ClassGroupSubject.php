<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassGroupSubject extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function classGroup()
    {
        return $this->belongsTo(ClassGroup::class, 'class_group_id');
    }

    public function study()
    {
        return $this->belongsTo(Study::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }
}
