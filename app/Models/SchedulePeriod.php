<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SchedulePeriod extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'effective_start_date' => 'date:Y-m-d',
        'effective_end_date'   => 'date:Y-m-d',
        'is_active'            => 'boolean',
        'activated_at'         => 'datetime',
    ];

    protected $appends = [
        'is_effective_now',
        'validity_status',
        'validity_label',
    ];

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function academicQuarter()
    {
        return $this->belongsTo(AcademicQuarter::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function schedules()
    {
        return $this->hasMany(LessonSchedule::class, 'schedule_period_id');
    }

    /**
     * Scope untuk periode jadwal yang berstatus aktif dan berada dalam masa berlaku.
     */
    public function scopeEffective($query, ?string $date = null)
    {
        $checkDate = $date ? Carbon::parse($date)->toDateString() : now()->toDateString();

        return $query->where('is_active', true)
            ->where(function ($q) use ($checkDate) {
                $q->whereNull('effective_start_date')
                    ->orWhereDate('effective_start_date', '<=', $checkDate);
            })
            ->where(function ($q) use ($checkDate) {
                $q->whereNull('effective_end_date')
                    ->orWhereDate('effective_end_date', '>=', $checkDate);
            });
    }

    /**
     * Cek apakah periode jadwal berlaku pada tanggal tertentu.
     */
    public function isEffectiveOn(?string $date = null): bool
    {
        if (! $this->is_active) {
            return false;
        }

        $checkDate = $date ? Carbon::parse($date)->toDateString() : now()->toDateString();

        if ($this->effective_start_date && $checkDate < $this->effective_start_date->toDateString()) {
            return false;
        }

        if ($this->effective_end_date && $checkDate > $this->effective_end_date->toDateString()) {
            return false;
        }

        return true;
    }

    public function getIsEffectiveNowAttribute(): bool
    {
        return $this->isEffectiveOn();
    }

    public function getValidityStatusAttribute(): string
    {
        if (! $this->is_active) {
            return 'draft';
        }

        $today = now()->toDateString();

        if ($this->effective_start_date && $today < $this->effective_start_date->toDateString()) {
            return 'scheduled';
        }

        if ($this->effective_end_date && $today > $this->effective_end_date->toDateString()) {
            return 'expired';
        }

        return 'active';
    }

    public function getValidityLabelAttribute(): string
    {
        return match ($this->validity_status) {
            'active'    => 'Aktif & Berlaku',
            'scheduled' => 'Aktif (Menunggu Masa Berlaku)',
            'expired'   => 'Masa Berlaku Berakhir',
            default     => 'Belum Berlaku (Draft)',
        };
    }
}
