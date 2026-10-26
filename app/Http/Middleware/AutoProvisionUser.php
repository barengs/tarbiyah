<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\User;
use App\Models\Role;
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
                
                // Extract role (supporting roles array or single role claim from SMPT/Tarbiyah JWTs)
                $rolesClaim = $payload->get('roles') ?? $payload->get('role');
                $rawRole = is_array($rolesClaim) ? reset($rolesClaim) : $rolesClaim;
                
                $roleMap = [
                    'superadmin' => 'superadmin',
                    'admin'      => 'admin',
                    'asatidz'    => 'asatidz',
                    'guru'       => 'asatidz',
                    'staf'       => 'staf',
                    'staff'      => 'staf',
                    'walikelas'  => 'walikelas',
                ];
                $tarbiyahRole = $roleMap[strtolower((string) $rawRole)] ?? 'staf';

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
                                'name'     => $name ?? $email,
                                'email'    => $email,
                                'password' => Str::random(16),
                                'role'     => $tarbiyahRole,
                            ]);
                            Log::info("Auto-provisioned new user in Tarbiyah: {$email} with ID: {$subId} and role: {$tarbiyahRole}");
                        }
                    }

                    if ($user) {
                        // Pastikan role Spatie tersinkron jika belum punya
                        if ($user->roles->isEmpty()) {
                            $roleModel = Role::where('name', $tarbiyahRole)->where('guard_name', 'api')->first();
                            if ($roleModel) {
                                $user->syncRoles([$roleModel]);
                            }
                        }

                        auth('api')->login($user);
                        return $next($request);
                    }
                }
            }
        } catch (\Tymon\JWTAuth\Exceptions\TokenExpiredException $e) {
            // Let the auth:api middleware handle expired tokens
        } catch (\Exception $e) {
            Log::error("Auto-provisioning critical failure: " . $e->getMessage() . " Trace: " . $e->getTraceAsString());
        }

        return $next($request);
    }
}
