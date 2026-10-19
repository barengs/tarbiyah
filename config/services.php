<?php

return [

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'smpt' => [
        'core_url'     => env('SMPT_CORE_URL', 'http://localhost:8000'),
        'api_url'      => env('SMPT_API_URL', 'http://localhost:8000/api'),
        'internal_key' => env('INTERNAL_API_KEY', 'smpt-tarbiyah-internal-secret-2026'),
    ],

    'bank_santri' => [
        'url'          => env('BANK_SANTRI_URL', 'http://localhost:8001'),
        'internal_key' => env('BANK_SANTRI_INTERNAL_KEY', 'smpt-banksantri-internal-secret-2026'),
    ],

];
