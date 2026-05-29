<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value', 'type'];
    public $timestamps = true;

    /**
     * Get a setting value by key
     */
    public static function getSetting($key, $default = null)
    {
        $setting = self::where('key', $key)->first();

        if (!$setting) {
            return $default;
        }

        // Cast value based on type
        return self::castValue($setting->value, $setting->type);
    }

    /**
     * Set a setting value by key
     */
    public static function setSetting($key, $value, $type = 'string')
    {
        return self::updateOrCreate(
            ['key' => $key],
            ['value' => is_array($value) ? json_encode($value) : (string)$value, 'type' => $type]
        );
    }

    /**
     * Cast value based on type - public static method
     */
    public static function castValue($value, $type)
    {
        switch ($type) {
            case 'boolean':
                return $value === '1' || $value === true || $value === 'true';
            case 'integer':
                return (int)$value;
            case 'json':
                return json_decode($value, true);
            default:
                return $value;
        }
    }
}
