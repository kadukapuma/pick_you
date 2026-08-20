<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Media\ImageStorageService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class StudentVerificationController extends Controller
{
    use ApiResponse;

    public function show(Request $request, ImageStorageService $images)
    {
        $passenger = $request->user()->passenger;
        if (!$passenger) {
            return $this->error('Passenger profile not found', 404);
        }

        $verification = $passenger->studentVerification;
        if (!$verification) {
            return $this->success(['status' => 'none'], 'No student application submitted.');
        }

        return $this->success([
            'status' => $verification->status,
            'university_name' => $verification->university_name,
            'card_front' => $images->url($verification->card_front_path),
            'card_back' => $images->url($verification->card_back_path),
            'rejection_reason' => $verification->rejection_reason,
            'submitted_at' => $verification->created_at,
            'reviewed_at' => $verification->reviewed_at,
        ], 'Student verification retrieved successfully.');
    }

    public function store(Request $request, ImageStorageService $images)
    {
        $passenger = $request->user()->passenger;
        if (!$passenger) {
            return $this->error('Passenger profile not found', 404);
        }

        $request->validate([
            'university_name' => 'required|string|max:255',
            'card_front' => 'required|image|mimes:jpeg,png,jpg,gif|max:4096',
            'card_back' => 'required|image|mimes:jpeg,png,jpg,gif|max:4096',
        ]);

        $existing = $passenger->studentVerification;
        $previousFront = $existing?->card_front_path;
        $previousBack = $existing?->card_back_path;

        $frontPath = $images->store(
            $request->file('card_front'),
            "passengers/{$passenger->id}/student-verification",
            'card-front',
        );

        $backPath = $images->store(
            $request->file('card_back'),
            "passengers/{$passenger->id}/student-verification",
            'card-back',
        );

        $verification = $passenger->studentVerification()->updateOrCreate(
            ['passenger_id' => $passenger->id],
            [
                'university_name' => $request->university_name,
                'card_front_path' => $frontPath,
                'card_back_path' => $backPath,
                'status' => 'pending',
                'rejection_reason' => null,
                'reviewed_by' => null,
                'reviewed_at' => null,
            ]
        );

        $images->deleteLocal($previousFront);
        $images->deleteLocal($previousBack);

        return $this->success([
            'status' => $verification->status,
            'university_name' => $verification->university_name,
            'card_front' => $images->url($verification->card_front_path),
            'card_back' => $images->url($verification->card_back_path),
        ], 'Student application submitted successfully.', 201);
    }
}
