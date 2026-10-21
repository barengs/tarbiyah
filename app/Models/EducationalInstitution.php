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

    /**
     * Otomatis sinkronkan penamaan tarbiyah (name, address, dll)
     * dengan konvensi smpt (institution_name, institution_address, dll).
     */
    public function getNameAttribute($value)
    {
        return $value ?: $this->institution_name;
    }

    public function setNameAttribute($value)
    {
        $this->attributes['name'] = $value;
        if (empty($this->attributes['institution_name'])) {
            $this->attributes['institution_name'] = $value;
        }
    }

    public function getAddressAttribute($value)
    {
        return $value ?: $this->institution_address;
    }

    public function setAddressAttribute($value)
    {
        $this->attributes['address'] = $value;
        if (empty($this->attributes['institution_address'])) {
            $this->attributes['institution_address'] = $value;
        }
    }

    public function getPhoneAttribute($value)
    {
        return $value ?: $this->institution_phone;
    }

    public function setPhoneAttribute($value)
    {
        $this->attributes['phone'] = $value;
        if (empty($this->attributes['institution_phone'])) {
            $this->attributes['institution_phone'] = $value;
        }
    }

    public function getEmailAttribute($value)
    {
        return $value ?: $this->institution_email;
    }

    public function setEmailAttribute($value)
    {
        $this->attributes['email'] = $value;
        if (empty($this->attributes['institution_email'])) {
            $this->attributes['institution_email'] = $value;
        }
    }

    public function educationType()
    {
        return $this->belongsTo(EducationType::class, 'education_type_id');
    }

    public function educations()
    {
        return $this->hasMany(Education::class, 'educational_institution_id');
    }

    public function classrooms()
    {
        return $this->hasMany(Classroom::class, 'educational_institution_id');
    }

    public function headmaster()
    {
        return $this->belongsTo(Teacher::class, 'headmaster_id');
    }

    public function classSchedules()
    {
        return $this->hasMany(ClassSchedule::class);
    }
}
