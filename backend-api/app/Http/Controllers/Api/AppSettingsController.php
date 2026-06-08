<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class AppSettingsController extends Controller
{
    /**
     * Get all app settings
     */
    public function index()
    {
        try {
            $settings = Setting::all();

            $formatted = [];
            foreach ($settings as $setting) {
                $formatted[$setting->key] = Setting::castValue($setting->value, $setting->type);
            }

            return response()->json([
                'success' => true,
                'message' => 'Settings retrieved successfully',
                'settings' => $formatted
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific setting
     */
    public function show($key)
    {
        try {
            $setting = Setting::where('key', $key)->first();

            if (!$setting) {
                return response()->json([
                    'success' => false,
                    'message' => 'Setting not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Setting retrieved successfully',
                'setting' => [
                    'key' => $setting->key,
                    'value' => Setting::castValue($setting->value, $setting->type),
                    'type' => $setting->type
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve setting',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a setting
     */
    public function update(Request $request, $key)
    {
        try {
            $request->validate([
                'value' => 'required',
                'type' => 'in:string,boolean,integer,json'
            ]);

            $setting = Setting::setSetting(
                $key,
                $request->value,
                $request->type ?? 'string'
            );

            return response()->json([
                'success' => true,
                'message' => 'Setting updated successfully',
                'setting' => [
                    'key' => $setting->key,
                    'value' => Setting::castValue($setting->value, $setting->type),
                    'type' => $setting->type
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update setting',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get maintenance mode status (public endpoint)
     */
    public function getMaintenanceMode()
    {
        try {
            $isEnabled = Setting::getSetting('maintenance_mode', false);

            return response()->json([
                'success' => true,
                'maintenance_mode' => $isEnabled
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve maintenance mode status',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
