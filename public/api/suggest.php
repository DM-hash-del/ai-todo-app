<?php
// POST /api/suggest: { description } -> { improvedName, tips[], category, model } | null.
// Port of the route in server/app.ts.

declare(strict_types=1);

require __DIR__ . '/lib.php';

require_post();
$description = validate_input(read_json_field('description'), 'description');

// Strict structured outputs accept `maxItems` but not string `maxLength`, so
// string limits are checked after parsing; an overlong answer becomes a 502.
$schema = [
    'type' => 'object',
    'properties' => [
        'improvedName' => ['type' => 'string'],
        'tips' => ['type' => 'array', 'items' => ['type' => 'string'], 'maxItems' => 3],
        'category' => ['type' => 'string'],
    ],
    'required' => ['improvedName', 'tips', 'category'],
    'additionalProperties' => false,
];

$validate = function (mixed $data): array {
    if (!is_array($data) || !is_array($data['tips'] ?? null) || !array_is_list($data['tips']) || count($data['tips']) > 3) {
        throw new AiRequestFailed('Model output does not match the suggestion schema');
    }
    return [
        'improvedName' => check_string($data['improvedName'] ?? null, MAX_INPUT_LENGTH, 'improvedName'),
        'tips' => array_map(fn ($tip) => check_string($tip, 200, 'tips[]'), $data['tips']),
        'category' => check_string($data['category'] ?? null, 40, 'category'),
    ];
};

try {
    $config = load_config();
    [$parsed, $model] = structured_response($config, [
        'model' => $config['suggest_model'],
        'instructions' =>
            'You improve to-do items. Suggest a clearer name, 1-3 practical tips, and a short category. ' .
            'If the name is already clear, return it unchanged as the improved name. ' .
            DATA_NOT_INSTRUCTIONS,
        'input' => $description,
        'max_output_tokens' => SUGGEST_MAX_OUTPUT_TOKENS,
    ], 'suggestion', $schema, $validate);
} catch (Throwable $e) {
    log_error($e);
    send_json(502, ['error' => 'AI request failed']);
}

// Tag the suggestion with the model that actually answered (e.g. a dated
// snapshot of the configured model) so the UI can attribute it. null stays null.
send_json(200, $parsed === null ? null : $parsed + ['model' => $model]);
