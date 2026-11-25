<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AutoProvisionUser
{
    /**
     * Handle an incoming request.
     * Auto-provisions user locally from JWT token claims if they don't exist yet,
     * and prevents account leakage when numeric user IDs (sub) differ between services.
     */
    public function handle(Request $request, Closure $next)
    {
        // Support token passed via query parameter (e.g., for direct browser PDF/Excel downloads)
        if ($queryToken = $request->query('token')) {
            $request->headers->set('Authorization', 'Bearer ' . $queryToken);
        }

        try {
            if ($token = JWTAuth::getToken()) {
                $payload = JWTAuth::getPayload($token);
                $subId = $payload->get('sub');
                $email = $payload->get('email');
                $name  = $payload->get('name');

                // Check if already authenticated AND verify email matches token payload to prevent ID collision leakage
                $currentUser = auth('api')->user();
                if ($currentUser && (!$email || strcasecmp($currentUser->email, $email) === 0)) {
                    if ($currentUser->roles->isEmpty() && !empty($currentUser->role)) {
                        $roleModel = Role::where('name', $currentUser->role)->where('guard_name', 'api')->first();
                        if ($roleModel) {
                            $currentUser->syncRoles([$roleModel]);
                        }
                    }
                    return $next($request);
                }

                // Extract role (supporting roles array or single role claim from Tamjid/Tarbiyah JWTs)
                $rolesClaim = $payload->get('roles') ?? $payload->get('role');
                $rawRole = is_array($rolesClaim) ? reset($rolesClaim) : $rolesClaim;
                $accessiblePrograms = $payload->get('accessible_program_ids');
                if ($payload->get('is_super_admin') === true) {
                    $rawRole = 'superadmin';
                }

                $tarbiyahRole = User::mapExternalRole((string) $rawRole, is_array($accessiblePrograms) ? $accessiblePrograms : null);

                if ($email) {
                    // 1. Always match by email first to prevent cross-service ID collision
                    $user = User::where('email', $email)->first();

                    // 2. If not found by email, check if subId is free before creating
                    if (!$user) {
                        $idTaken = $subId ? User::where('id', $subId)->exists() : true;
                        $createData = [
                            'name'     => $name ?? $email,
                            'email'    => $email,
                            'password' => Hash::make(Str::random(24)),
                            'role'     => $tarbiyahRole,
                        ];
                        if (!$idTaken && is_numeric($subId)) {
                            $createData['id'] = (int) $subId;
                        }

                        $user = User::create($createData);
                        Log::info("Auto-provisioned new user in Tarbiyah: {$email} (ID: {$user->id}, role: {$tarbiyahRole})");
                    }

                    if ($user) {
                        // Pastikan role Spatie tersinkron jika belum punya
                        if ($user->roles->isEmpty()) {
                            $roleToAssign = $user->role ?: $tarbiyahRole;
                            $roleModel = Role::where('name', $roleToAssign)->where('guard_name', 'api')->first()
                                ?? Role::where('name', $tarbiyahRole)->where('guard_name', 'api')->first();
                            if ($roleModel) {
                                $user->syncRoles([$roleModel]);
                            }
                        }

                        auth('api')->setUser($user);
                        auth('api')->login($user);
                        return $next($request);
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
