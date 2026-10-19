<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class AutoProvisionUser
{
    /**
     * Handle an incoming request.
     * Auto-provisions user locally from JWT token claims if they don't exist yet.
     */
    public function handle(Request $request, Closure $next)
    {
        // Support token passed via query parameter (e.g., for direct browser PDF/Excel downloads)
        if ($queryToken = $request->query('token')) {
            $request->headers->set('Authorization', 'Bearer ' . $queryToken);
        }

        try {
            // Check if already authenticated by ID
            if ($user = auth('api')->user()) {
                return $next($request);
            }

            // Not authenticated locally, check if we have a valid token
            if ($token = JWTAuth::getToken()) {
                $payload = JWTAuth::getPayload($token);
                $subId = $payload->get('sub');
                $email = $payload->get('email');
                $name  = $payload->get('name');

                if ($email) {
                    // 1. Try to find user by ID first (sub claim)
                    $user = User::find($subId);

                    if (!$user) {
                        // 2. Try to find by email
                        $user = User::where('email', $email)->first();

                        if (!$user) {
                            // 3. Create user if doesn't exist anywhere
                            $user = User::create([
                                'id'       => $subId,
                                'name'     => $name ?? 'External User',
                                'email'    => $email,
                                'password' => Str::random(16),
                                'role'     => $payload->get('role') ?? 'staff',
                            ]);
                            Log::info("Auto-provisioned new user in Tarbiyah: {$email} with ID: {$subId}");
                        } else {
                            Log::warning("User exists by email but ID mismatch: Token sub is {$subId}, DB ID is {$user->id}");
                        }
                    }

                    if ($user) {
                        auth('api')->login($user);
                    }
                }
            }
        } catch (\Tymon\JWTAuth\Exceptions\TokenExpiredException $e) {
            // Let the auth:api middleware handle expired tokens
        } catch (\Exception $e) {
            Log::error("Auto-provisioning critical failure: " . $e->getMessage());
        }

        return $next($request);
    }
}
