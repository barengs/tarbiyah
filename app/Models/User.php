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

    protected $appends = [
        'program_id',
        'permission_names',
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
     * Cek apakah user adalah superadmin sistem.
     */
    public function isSuperAdmin(): bool
    {
        return $this->hasRole('superadmin') || strtolower((string) $this->role) === 'superadmin';
    }

    /**
     * Petakan role dari JWT eksternal (Tamjid/SMPT) ke role Tarbiyah yang sesuai,
     * termasuk mempertimbangkan cakupan program (Tibyan=1, Kubar=2).
     */
    public static function mapExternalRole(?string $rawRole, ?array $accessibleProgramIds = null): string
    {
        $normalized = strtolower(trim((string) $rawRole));
        $slugged = \Illuminate\Support\Str::slug($normalized);

        // Jika role persis sudah ada di tabel roles Tarbiyah, gunakan langsung
        if ($slugged && Role::where('name', $slugged)->where('guard_name', 'api')->exists()) {
            return $slugged;
        }

        $baseRole = match ($normalized) {
            'superadmin', 'sysadmin' => 'superadmin',
            'admin', 'admin kepala sekolah', 'sekretaris umum', 'admin pendidikan' => 'admin',
            'asatidz', 'guru', 'pengajar', 'ustadz' => 'asatidz',
            'walikelas', 'wali kelas' => 'walikelas',
            default => 'staf',
        };

        // Jika memiliki scope spesifik 1 program (1 = Tibyan, 2 = Kubar) dan bukan superadmin/admin
        if (in_array($baseRole, ['staf', 'asatidz', 'walikelas'], true) && is_array($accessibleProgramIds) && count($accessibleProgramIds) === 1) {
            $progId = (int) reset($accessibleProgramIds);
            $suffix = $progId === 1 ? 'tibyan' : ($progId === 2 ? 'kubar' : null);
            if ($suffix) {
                $scopedName = "{$baseRole}-{$suffix}";
                if (Role::where('name', $scopedName)->where('guard_name', 'api')->exists()) {
                    return $scopedName;
                }
            }
        }

        return $baseRole;
    }

    /**
     * Dapatkan Program ID aktif dari role user (jika role dibatasi per program).
     * Mengembalikan null jika superadmin/admin atau jika role bersifat global.
     */
    public function getActiveProgramId(): ?int
    {
        if ($this->isSuperAdmin()) {
            return null;
        }

        foreach ($this->roles as $r) {
            if (!empty($r->program_id)) {
                return (int) $r->program_id;
            }
        }

        if (!empty($this->role)) {
            $progId = Role::where('name', $this->role)->where('guard_name', 'api')->value('program_id');
            if (!empty($progId)) {
                return (int) $progId;
            }
        }

        return null;
    }

    public function getProgramIdAttribute(): ?int
    {
        return $this->getActiveProgramId();
    }

    public function getPermissionNamesAttribute(): array
    {
        if ($this->isSuperAdmin()) {
            return ['*'];
        }

        return $this->getAllPermissions()->pluck('name')->values()->toArray();
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
