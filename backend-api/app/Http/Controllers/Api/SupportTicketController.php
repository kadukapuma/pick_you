<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class SupportTicketController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $data = SupportTicket::all();
        return $this->success($data, 'SupportTicket list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $data = SupportTicket::create($request->all());
        return $this->success($data, 'SupportTicket created successfully.', 201);
    }

    public function show($id)
    {
        $data = SupportTicket::find($id);
        if (!$data) return $this->error('SupportTicket not found.', 404);
        return $this->success($data, 'SupportTicket retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = SupportTicket::find($id);
        if (!$data) return $this->error('SupportTicket not found.', 404);
        $data->update($request->all());
        return $this->success($data, 'SupportTicket updated successfully.');
    }

    public function destroy($id)
    {
        $data = SupportTicket::find($id);
        if (!$data) return $this->error('SupportTicket not found.', 404);
        $data->delete();
        return $this->success(null, 'SupportTicket deleted successfully.');
    }
}
