<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Tymon\JWTAuth\Exceptions\JWTException;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\User;
use Illuminate\Support\Facades\Log;

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

        $user = User::where('email', $loginInput)
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
        return response()->json([
            'status' => 'success',
            'data'   => auth('api')->user(),
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
            return $this->respondWithToken($token, auth('api')->user());
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Token tidak valid untuk di-refresh: ' . $e->getMessage(),
            ], 401);
        }
    }

    protected function respondWithToken($token, $user = null)
    {
        return response()->json([
            'status'       => 'success',
            'access_token' => $token,
            'token_type'   => 'bearer',
            'expires_in'   => auth('api')->factory()->getTTL() * 60,
            'user'         => $user ?? auth('api')->user(),
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

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $smptUser['name'] ?? ($smptUser['sub_name'] ?? $email),
                'role' => 'guru',
            ]
        );

        try {
            $token = JWTAuth::fromUser($user);
        } catch (JWTException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'SSO gagal membuat token tarbiyah: ' . $e->getMessage(),
            ], 500);
        }

        Log::info("SSO Handover dari smpt: {$user->email} masuk ke tarbiyah.");

        return $this->respondWithToken($token, $user);
    }
}
