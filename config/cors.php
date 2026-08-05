<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | CORS is only enabled for the public portfolio API consumed by the
    | nouraboelsoud.com frontends. Everything else on this installation
    | stays same-origin: no credentials, no wildcard origins.
    |
    */

    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'POST', 'OPTIONS'],

    'allowed_origins' => [
        'https://nouraboelsoud.com',
        'https://www.nouraboelsoud.com',
        'https://beta.nouraboelsoud.com',
    ],

    'allowed_origins_patterns' => [
        '#^http://localhost(:\d+)?$#',
        // Local-network dev preview (Vite --host); private ranges only.
        '#^http://(127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
