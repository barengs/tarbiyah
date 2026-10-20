<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\LessonHour;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LessonHourController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = LessonHour::with('educationalInstitution');

            if ($request->has('educational_institution_id') && $request->query('educational_institution_id')) {
                $query->where('educational_institution_id', $request->query('educational_institution_id'));
            }

            if ($request->has('is_active')) {
                $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
            }

            $hours = $query->orderBy('order', 'asc')->get();

            return response()->json([
                'status'  => 'success',
                'message' => 'Data jam pelajaran berhasil diambil',
                'data'    => $hours,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving lesson hours: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data jam pelajaran',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'educational_institution_id' => 'nullable|exists:educational_institutions,id',
            'name'                       => 'required|string|max:100',
            'start_time'                 => 'required|date_format:H:i',
            'end_time'                   => 'required|date_format:H:i|after:start_time',
            'order'                      => 'nullable|integer',
            'is_break'                   => 'nullable|boolean',
            'description'                => 'nullable|string',
            'is_active'                  => 'nullable|boolean',
        ]);

        try {
            $hour = LessonHour::create($validated);

            return response()->json([
                'status'  => 'success',
                'message' => 'Jam pelajaran berhasil ditambahkan',
                'data'    => $hour->load('educationalInstitution'),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating lesson hour: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menambahkan jam pelajaran: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $hour = LessonHour::with('educationalInstitution')->find($id);

        if (!$hour) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Jam pelajaran tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail jam pelajaran berhasil diambil',
            'data'    => $hour,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $hour = LessonHour::find($id);

        if (!$hour) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Jam pelajaran tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'educational_institution_id' => 'nullable|exists:educational_institutions,id',
            'name'                       => 'sometimes|required|string|max:100',
            'start_time'                 => 'sometimes|required|date_format:H:i',
            'end_time'                   => 'sometimes|required|date_format:H:i',
            'order'                      => 'nullable|integer',
            'is_break'                   => 'nullable|boolean',
            'description'                => 'nullable|string',
            'is_active'                  => 'nullable|boolean',
        ]);

        try {
            $hour->update($validated);

            return response()->json([
                'status'  => 'success',
                'message' => 'Jam pelajaran berhasil diperbarui',
                'data'    => $hour->fresh('educationalInstitution'),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating lesson hour: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui jam pelajaran',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $hour = LessonHour::find($id);

        if (!$hour) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Jam pelajaran tidak ditemukan',
            ], 404);
        }

        try {
            $hour->delete();
            return response()->json([
                'status'  => 'success',
                'message' => 'Jam pelajaran berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting lesson hour: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghapus jam pelajaran',
            ], 500);
        }
    }
}
