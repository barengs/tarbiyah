<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Tymon\JWTAuth\Exceptions\JWTException;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\User;

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
}
