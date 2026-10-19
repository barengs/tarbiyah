<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InstitutionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'education_type_id' => $this->education_type_id,
            'education_type' => $this->whenLoaded('educationType', fn() => [
                'id' => $this->educationType->id,
                'name' => $this->educationType->name,
            ]),
            'registration_number' => $this->registration_number,
            'name' => $this->name,
            'short_name' => $this->short_name,
            'progression_type' => $this->progression_type,
            'address' => $this->address,
            'phone' => $this->phone,
            'email' => $this->email,
            'logo' => $this->logo,
            'status' => $this->status,
            'created_at' => $this->created_at,
        ];
    }
}
