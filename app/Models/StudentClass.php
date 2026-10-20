<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentClass extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'joined_at' => 'date',
        'left_at'   => 'date',
    ];

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function educationalInstitution()
    {
        return $this->belongsTo(EducationalInstitution::class, 'educational_institution_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function classGroup()
    {
        return $this->belongsTo(ClassGroup::class, 'class_group_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'aktif');
    }

    /**
     * Tandai siswa pindah level (untuk mode Tahfidz Leveling).
     */
    public function promoteToLevel(ClassGroup $newGroup, string $note = ''): self
    {
        $this->update([
            'status'  => 'pindah_level',
            'left_at' => today(),
            'note'    => $note,
        ]);

        return self::create([
            'academic_year_id'          => $this->academic_year_id,
            'educational_institution_id'=> $this->educational_institution_id,
            'student_id'                => $this->student_id,
            'class_group_id'            => $newGroup->id,
            'joined_at'                 => today(),
            'status'                    => 'aktif',
            'note'                      => "Naik level dari: {$this->classGroup->name}",
        ]);
    }
}
