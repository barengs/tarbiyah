<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LessonSchedule extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'day'       => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Map angka hari ke nama hari dalam Bahasa Indonesia.
     */
    public static array $dayNames = [
        1 => 'Senin',
        2 => 'Selasa',
        3 => 'Rabu',
        4 => 'Kamis',
        5 => 'Jumat',
        6 => 'Sabtu',
        7 => 'Ahad',
    ];

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function academicQuarter()
    {
        return $this->belongsTo(AcademicQuarter::class);
    }

    public function schedulePeriod()
    {
        return $this->belongsTo(SchedulePeriod::class, 'schedule_period_id');
    }

    /**
     * Scope jadwal yang termasuk dalam periode jadwal aktif dan sedang berlaku.
     */
    public function scopeFromActivePeriod($query, ?string $date = null)
    {
        return $query->whereHas('schedulePeriod', function ($q) use ($date) {
            $q->effective($date);
        });
    }

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

    public function lessonHour()
    {
        return $this->belongsTo(LessonHour::class, 'lesson_hour_id');
    }

    public function classroom()
    {
        return $this->belongsTo(Classroom::class);
    }

    public function getDayNameAttribute(): string
    {
        return self::$dayNames[$this->day] ?? "Hari-{$this->day}";
    }
}
