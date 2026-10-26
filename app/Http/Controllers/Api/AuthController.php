<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Tymon\JWTAuth\Exceptions\JWTException;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $loginInput = $request->input('email') ?? $request->input('username');
        $password   = $request->input('password');

        if (empty($loginInput) || empty($password)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Email/Username dan Password wajib diisi.',
            ], 422);
        }

        $user = User::with('roles')
            ->where('email', $loginInput)
            ->orWhere('name', $loginInput)
            ->first();

        if (!$user || !Hash::check($password, $user->password)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Email atau Password salah.',
            ], 401);
        }

        try {
            if (!$token = JWTAuth::fromUser($user)) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Gagal membuat token autentikasi.',
                ], 401);
            }
        } catch (JWTException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal membuat token: ' . $e->getMessage(),
            ], 500);
        }

        return $this->respondWithToken($token, $user);
    }

    public function me()
    {
        $user = auth('api')->user();
        if ($user) {
            $user->load(['roles.permissions', 'permissions']);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $user,
        ]);
    }

    public function logout()
    {
        auth('api')->logout();
        return response()->json([
            'status'  => 'success',
            'message' => 'Berhasil logout.',
        ]);
    }

    public function refresh()
    {
        try {
            $token = auth('api')->refresh();
            $user = auth('api')->user();
            if ($user) {
                $user->load('roles');
            }
            return $this->respondWithToken($token, $user);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Token tidak valid untuk di-refresh: ' . $e->getMessage(),
            ], 401);
        }
    }

    public function menus(Request $request)
    {
        return app(SecurityController::class)->sidebar($request);
    }

    protected function respondWithToken($token, $user = null)
    {
        $userData = $user ?? auth('api')->user();
        if ($userData && !$userData->relationLoaded('roles')) {
            $userData->load('roles');
        }

        return response()->json([
            'status'       => 'success',
            'access_token' => $token,
            'token_type'   => 'bearer',
            'expires_in'   => auth('api')->factory()->getTTL() * 60,
            'user'         => $userData,
        ]);
    }

    /**
     * POST /api/auth/sso
     * SSO Handover dari portal pesantren (smpt) ke tarbiyah.
     */
    public function ssoHandover(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string',
        ]);

        try {
            $smptUser = JWTAuth::setToken($validated['token'])->getPayload();
        } catch (JWTException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'SSO gagal: token pesantren tidak valid atau kedaluwarsa.',
            ], 401);
        }

        $email = $smptUser['email'] ?? null;
        if (empty($email)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'SSO gagal: token tidak memuat email pengguna.',
            ], 401);
        }

        // Petakan role smpt ke 5 role familiar Tarbiyah
        $rawRole = $smptUser['role'] ?? ($smptUser['roles'][0] ?? 'staf');
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

        $user = User::where('email', $email)->first();
        if (!$user) {
            $user = User::create([
                'name'     => $smptUser['name'] ?? ($smptUser['sub_name'] ?? $email),
                'email'    => $email,
                'password' => Hash::make(Str::random(32)),
                'role'     => $tarbiyahRole,
            ]);
        } else {
            $user->update([
                'name' => $smptUser['name'] ?? ($smptUser['sub_name'] ?? $email),
                'role' => $tarbiyahRole,
            ]);
        }

        // Pastikan role Spatie tersinkronisasi
        $roleModel = Role::where('name', $tarbiyahRole)->where('guard_name', 'api')->first();
        if ($roleModel) {
            $user->syncRoles([$roleModel]);
        }

        try {
            $token = JWTAuth::fromUser($user);
        } catch (JWTException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'SSO gagal membuat token tarbiyah: ' . $e->getMessage(),
            ], 500);
        }

        Log::info("SSO Handover dari smpt: {$user->email} (role: {$tarbiyahRole}) berhasil masuk ke tarbiyah.");

        return $this->respondWithToken($token, $user->fresh()->load('roles'));
    }
}
