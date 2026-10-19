<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'santri_id' => $this->santri_id,
            'nis' => $this->nis,
            'name' => $this->name,
            'gender' => $this->gender,
            'is_mukim' => $this->is_mukim,
            'status' => $this->status,
            'created_at' => $this->created_at,
        ];
    }
}
