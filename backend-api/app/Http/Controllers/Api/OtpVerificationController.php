<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OtpVerification;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class OtpVerificationController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $data = OtpVerification::all();
        return $this->success($data, 'OtpVerification list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $data = OtpVerification::create($request->all());
        return $this->success($data, 'OtpVerification created successfully.', 201);
    }

    public function show($id)
    {
        $data = OtpVerification::find($id);
        if (!$data) return $this->error('OtpVerification not found.', 404);
        return $this->success($data, 'OtpVerification retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = OtpVerification::find($id);
        if (!$data) return $this->error('OtpVerification not found.', 404);
        $data->update($request->all());
        return $this->success($data, 'OtpVerification updated successfully.');
    }

    public function destroy($id)
    {
        $data = OtpVerification::find($id);
        if (!$data) return $this->error('OtpVerification not found.', 404);
        $data->delete();
        return $this->success(null, 'OtpVerification deleted successfully.');
    }
}
