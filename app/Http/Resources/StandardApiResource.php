<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Models\EducationalInstitution;

class StandardApiResource extends JsonResource
{
    public static $message;
    public static $status;

    public static function forMessage(string $message, int $status = 200)
    {
        self::$message = $message;
        self::$status = $status;
        return self::class;
    }

    public function toArray(Request $request): array
    {
        return [
            'message' => self::$message,
            'data' => $this->resolve(),
        ];
    }

    public function __construct($resource, $message = null, $status = 200)
    {
        parent::__construct($resource);
        self::$message = $message;
        self::$status = $status;
    }
}
