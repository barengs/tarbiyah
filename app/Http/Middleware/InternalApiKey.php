<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InternalApiKey
{
    /**
     * Validasi X-Internal-Key header untuk komunikasi service-to-service.
     * Memungkinkan SMPT backend & Bank Santri memanggil Tarbiyah tanpa JWT.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $expectedKey = config('services.smpt.internal_key');
        $providedKey = $request->header('X-Internal-Key');

        if (empty($expectedKey) || $providedKey !== $expectedKey) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Unauthorized: Invalid Internal API Key.',
            ], 401);
        }

        return $next($request);
    }
}
