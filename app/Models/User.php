<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;
use Spatie\Permission\Traits\HasRoles;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasRoles, LogsActivity;

    protected $table = 'users';
    protected $guard_name = 'api';

    protected $fillable = [
        'id',
        'name',
        'email',
        'password',
        'role',
        'role_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
    }

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     */
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Dapatkan Program ID aktif dari role user (jika role dibatasi per program).
     * Mengembalikan null jika superadmin/admin atau jika role bersifat global.
     */
    public function getActiveProgramId(): ?int
    {
        if ($this->hasRole('superadmin')) {
            return null;
        }

        foreach ($this->roles as $r) {
            if (!empty($r->program_id)) {
                return (int) $r->program_id;
            }
        }

        return null;
    }

    /**
     * Cek apakah user memiliki akses cross-program (Global scope).
     */
    public function isGlobalProgramScope(): bool
    {
        return $this->getActiveProgramId() === null;
    }

    /**
     * Return a key value array, containing any custom claims to be added to the JWT.
     */
    public function getJWTCustomClaims(): array
    {
        $activeRole = $this->roles->first();
        $programId = $this->getActiveProgramId();

        return [
            'name'       => $this->name,
            'email'      => $this->email,
            'role'       => $this->role ?? $activeRole?->name ?? 'staf',
            'roles'      => $this->getRoleNames()->toArray(),
            'program_id' => $programId,
            'program'    => $activeRole?->program ? [
                'id'   => $activeRole->program->id,
                'name' => $activeRole->program->name,
                'code' => $activeRole->program->code,
            ] : null,
        ];
    }

    /**
     * Activity log configuration.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'email', 'role'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('user_management');
    }
}
