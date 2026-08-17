<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Laravel\Sanctum\PersonalAccessToken;

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
        'manage_vehicle_types',
        'manage_passengers',
        'manage_fare_configs',
        'manage_notifications',
        'manage_passenger_credits',
        'manage_finance',
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
        'phone_normalized',
        'password',
        'role',
        'is_active',
        'is_verified',
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
        'profile_picture',
        'profile_picture_url',
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
            'is_verified' => 'boolean',
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

    public function roles(): HasMany
    {
        return $this->hasMany(UserRole::class);
    }

    public function hasRole(string $role): bool
    {
        if (! $this->exists) {
            return $this->role === $role;
        }

        return $this->roles()->where('role', $role)->exists()
            || (! $this->roles()->exists() && $this->role === $role);
    }

    public function hasActiveRole(string $role): bool
    {
        if (! $this->exists) {
            return $this->role === $role;
        }

        return $this->roles()->where('role', $role)->where('is_active', true)->exists()
            || (! $this->roles()->exists() && $this->role === $role);
    }

    public function ensureRole(string $role, bool $active = true): UserRole
    {
        return $this->roles()->updateOrCreate(
            ['role' => $role],
            ['is_active' => $active],
        );
    }

    public function canActAs(string $role): bool
    {
        if ($this->is_active === false || ! $this->hasActiveRole($role)) {
            return false;
        }

        $token = $this->currentAccessToken();
        if ($token === null) {
            return $this->role === $role;
        }

        if (! $token instanceof PersonalAccessToken || ! $token->exists) {
            return $token->can('role:' . $role);
        }

        $abilities = $token->abilities ?? [];
        if (in_array('role:' . $role, $abilities, true)) {
            return true;
        }

        $allowLegacyTokens = ! app()->bound('config')
            || (bool) config('auth.allow_legacy_role_tokens', true);

        return $allowLegacyTokens && in_array('*', $abilities, true) && $this->role === $role;
    }

    public function activeRole(): ?string
    {
        foreach ([self::ROLE_PASSENGER, self::ROLE_DRIVER, self::ROLE_SUPER_ADMIN, self::ROLE_ADMIN, self::ROLE_OPERATOR] as $role) {
            if ($this->canActAs($role)) {
                return $role;
            }
        }

        return null;
    }

    /** @return array<int, string> */
    public function activeRoles(): array
    {
        $roles = $this->roles()->where('is_active', true)->pluck('role')->values()->all();

        return $roles === [] && $this->role ? [$this->role] : $roles;
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

    public function getProfilePictureAttribute(): ?string
    {
        return $this->profilePictureUrl();
    }

    public function getProfilePictureUrlAttribute(): ?string
    {
        return $this->profilePictureUrl();
    }

    private function profilePictureUrl(): ?string
    {
        $path = $this->profile_picture_path;

        if (! $path || filter_var($path, FILTER_VALIDATE_URL)) {
            return $path;
        }

        return rtrim((string) config('app.url'), '/') . '/' . ltrim($path, '/');
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

    public function deviceTokens()
    {
        return $this->hasMany(DeviceToken::class);
    }
}
