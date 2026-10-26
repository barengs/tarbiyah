<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Menu extends Model
{
    protected $fillable = [
        'parent_id', 'slug', 'name', 'icon', 'path',
        'permission_slug', 'sort_order', 'is_divider', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_divider' => 'boolean',
            'is_active'  => 'boolean',
        ];
    }

    public function children()
    {
        return $this->hasMany(Menu::class, 'parent_id')->orderBy('sort_order');
    }

    public function parent()
    {
        return $this->belongsTo(Menu::class, 'parent_id');
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_menu');
    }

    /**
     * Kunci stable matriks permission: gunakan permission_slug, fallback ke slug.
     */
    public function getPermissionKey(): string
    {
        return $this->permission_slug ?: $this->slug;
    }
}
