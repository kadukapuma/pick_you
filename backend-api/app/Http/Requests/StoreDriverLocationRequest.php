<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreDriverLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canActAs(User::ROLE_DRIVER)
            && $this->user()?->driver !== null;
    }

    public function rules(): array
    {
        return [
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'ride_id' => ['nullable', 'integer', 'exists:rides,id'],
            'heading' => ['nullable', 'numeric', 'between:0,360'],
            'speed' => ['nullable', 'numeric', 'min:0', 'max:150'],
            'accuracy' => ['nullable', 'numeric', 'min:0', 'max:5000'],
            'recorded_at' => [
                'nullable',
                'date',
                'before_or_equal:'.now()->addMinutes(5)->toIso8601String(),
                'after_or_equal:'.now()->subHours(24)->toIso8601String(),
            ],
            'sequence' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
