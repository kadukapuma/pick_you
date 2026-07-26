<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rating;
use App\Models\Ride;
use App\Services\Ratings\DriverRatingService;
use App\Services\Rides\RideStateMachine;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RatingController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly DriverRatingService $driverRatings) {}

    public function index()
    {
        $data = Rating::all();

        return $this->success($data, 'Rating list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $request->validate([
            'ride_id' => ['required', 'integer', 'exists:rides,id'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'review' => ['nullable', 'string', 'max:2000'],
        ]);
        $ride = Ride::findOrFail($request->ride_id);
        if ($request->user()->cannot('view', $ride) || (int) $ride->passenger_id !== (int) $request->user()->passenger->id) {
            return $this->error('You are not authorized to rate this ride.', 403);
        }
        if ($ride->status !== RideStateMachine::COMPLETED || ! $ride->driver_id) {
            return $this->error('Only completed rides can be rated.', 422);
        }

        $result = DB::transaction(function () use ($request, $ride) {
            $rating = Rating::updateOrCreate(
                ['ride_id' => $ride->id],
                [
                    'passenger_id' => $ride->passenger_id,
                    'driver_id' => $ride->driver_id,
                    'rating' => $request->rating,
                    'review' => $request->review,
                ],
            );

            $driverAverageRating = $this->driverRatings->refreshAverage($ride->driver);

            return [
                'rating' => $rating->fresh(),
                'driver_rating' => $driverAverageRating,
            ];
        });

        return $this->success($result, 'Rating saved successfully.', 201);
    }

    public function show(Request $request, $id)
    {
        $data = Rating::find($id);
        if (! $data) {
            return $this->error('Rating not found.', 404);
        }
        if ($request->user()->cannot('view', $data->ride)) {
            return $this->error('You are not authorized to view this rating.', 403);
        }

        return $this->success($data, 'Rating retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = Rating::find($id);
        if (! $data) {
            return $this->error('Rating not found.', 404);
        }
        $data->update($request->all());

        return $this->success($data, 'Rating updated successfully.');
    }

    public function destroy($id)
    {
        $data = Rating::find($id);
        if (! $data) {
            return $this->error('Rating not found.', 404);
        }
        $data->delete();

        return $this->success(null, 'Rating deleted successfully.');
    }
}
