<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\LessonHour;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Log;

class LessonHourController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:jam-pelajaran.create', only: ['store']),
            new Middleware('permission:jam-pelajaran.update', only: ['update']),
            new Middleware('permission:jam-pelajaran.delete', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        try {
            $user = auth('api')->user();
            $userProgramId = $user?->getActiveProgramId();

            $query = LessonHour::with(['program', 'educationalInstitution']);

            if ($userProgramId) {
                $query->where(function ($q) use ($userProgramId) {
                    $q->where('program_id', $userProgramId)
                        ->orWhereNull('program_id');
                });
            } elseif ($request->filled('program_id') && $request->query('program_id') !== 'all') {
                $progId = $request->query('program_id');
                if ($progId === 'general' || $progId === 'null') {
                    $query->whereNull('program_id');
                } elseif ($request->boolean('include_general')) {
                    $query->where(function ($q) use ($progId) {
                        $q->where('program_id', $progId)
                            ->orWhereNull('program_id');
                    });
                } else {
                    $query->where('program_id', $progId);
                }
            }

            if ($request->has('educational_institution_id') && $request->query('educational_institution_id')) {
                $query->where('educational_institution_id', $request->query('educational_institution_id'));
            }

            if ($request->has('is_active')) {
                $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
            }

            $hours = $query->orderBy('order', 'asc')->orderBy('start_time', 'asc')->get();

            return response()->json([
                'status' => 'success',
                'message' => 'Data jam pelajaran berhasil diambil',
                'data' => $hours,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving lesson hours: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengambil data jam pelajaran',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'program_id' => 'nullable|exists:programs,id',
            'educational_institution_id' => 'nullable|exists:educational_institutions,id',
            'name' => 'required|string|max:100',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'order' => 'nullable|integer',
            'is_break' => 'nullable|boolean',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $userProgramId = auth('api')->user()?->getActiveProgramId();
        if ($userProgramId) {
            $validated['program_id'] = $userProgramId;
        }

        try {
            $hour = LessonHour::create($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Jam pelajaran berhasil ditambahkan',
                'data' => $hour->load(['program', 'educationalInstitution']),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating lesson hour: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menambahkan jam pelajaran: '.$e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $hour = LessonHour::with(['program', 'educationalInstitution'])->find($id);

        if (! $hour) {
            return response()->json([
                'status' => 'error',
                'message' => 'Jam pelajaran tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Detail jam pelajaran berhasil diambil',
            'data' => $hour,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $hour = LessonHour::find($id);

        if (! $hour) {
            return response()->json([
                'status' => 'error',
                'message' => 'Jam pelajaran tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'program_id' => 'nullable|exists:programs,id',
            'educational_institution_id' => 'nullable|exists:educational_institutions,id',
            'name' => 'sometimes|required|string|max:100',
            'start_time' => 'sometimes|required|date_format:H:i',
            'end_time' => 'sometimes|required|date_format:H:i',
            'order' => 'nullable|integer',
            'is_break' => 'nullable|boolean',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $userProgramId = auth('api')->user()?->getActiveProgramId();
        if ($userProgramId) {
            $validated['program_id'] = $userProgramId;
        }

        try {
            $hour->update($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Jam pelajaran berhasil diperbarui',
                'data' => $hour->fresh(['program', 'educationalInstitution']),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating lesson hour: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memperbarui jam pelajaran',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $hour = LessonHour::find($id);

        if (! $hour) {
            return response()->json([
                'status' => 'error',
                'message' => 'Jam pelajaran tidak ditemukan',
            ], 404);
        }

        try {
            $hour->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Jam pelajaran berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting lesson hour: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus jam pelajaran',
            ], 500);
        }
    }
}
