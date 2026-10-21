<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MeetingSchedule extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function classScheduleDetail()
    {
        return $this->belongsTo(ClassScheduleDetail::class, 'class_schedule_detail_id', 'id');
    }

    public function presences()
    {
        return $this->hasMany(Presence::class);
    }
}
