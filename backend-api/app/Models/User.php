<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

use App\Models\RolePermission;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    const ROLE_SUPER_ADMIN = 'super_admin';
    const ROLE_ADMIN = 'admin';
    const ROLE_OPERATOR = 'operator';
    const ROLE_DRIVER = 'driver';
    const ROLE_PASSENGER = 'passenger';

    public const AVAILABLE_PERMISSIONS = [
        'manage_admins',
        'manage_operators',
        'create_operators',
        'manage_role_permissions',
        'manage_drivers',
        'manage_vehicles',
        'manage_passengers',
        'manage_fare_configs',
        'manage_notifications',
    ];

    public const MANAGEABLE_ROLES = [
        self::ROLE_ADMIN,
        self::ROLE_OPERATOR,
        // Drivers and passengers are not managed via the admin permissions UI
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'password',
        'role',
        'is_active',
        'profile_picture_path',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'permissions',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public static function availablePermissions(): array
    {
        return self::AVAILABLE_PERMISSIONS;
    }

    public static function manageableRoles(): array
    {
        return self::MANAGEABLE_ROLES;
    }

    public function rolePermissions(): HasMany
    {
        return $this->hasMany(RolePermission::class, 'role', 'role');
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->role === self::ROLE_SUPER_ADMIN) {
            return true;
        }

        return in_array($permission, $this->permissions, true);
    }

    public function getPermissionsAttribute(): array
    {
        if ($this->role === self::ROLE_SUPER_ADMIN) {
            return self::availablePermissions();
        }

        if (! $this->relationLoaded('rolePermissions')) {
            $this->load('rolePermissions');
        }

        return $this->rolePermissions
            ->pluck('permission')
            ->filter()
            ->values()
            ->all();
    }

    public function passenger()
    {
        return $this->hasOne(Passenger::class);
    }

    public function driver()
    {
        return $this->hasOne(Driver::class);
    }

    public function otpVerifications()
    {
        return $this->hasMany(OtpVerification::class);
    }
}
