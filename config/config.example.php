<?php
// Copy to config/config.php (gitignored) and fill it in. This directory is
// outside the web root (public/), so the key is never served.
return [
    'openai_api_key' => 'sk-...',
    // Model for POST /api/suggest (the Improve button).
    'suggest_model' => '',
    // Model for POST /api/complete (type-ahead). It's sent `reasoning.effort: none`,
    // so pick a model that accepts that.
    'complete_model' => '',
    // Optional: a different API base URL (a proxy, or a local fake for testing).
    // 'base_url' => 'https://api.openai.com/v1',
];
