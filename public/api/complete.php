<?php
// POST /api/complete: { text } -> { completion } | null. Type-ahead for the
// new-task input; port of the route in server/app.ts. The client only shows
// completions that start with what the user typed.

declare(strict_types=1);

require __DIR__ . '/lib.php';

require_post();
$text = validate_input(read_json_field('text'), 'text');

// The whole name (typed text plus continuation), which must itself be sendable to /api/suggest.
$schema = [
    'type' => 'object',
    'properties' => ['completion' => ['type' => 'string']],
    'required' => ['completion'],
    'additionalProperties' => false,
];

$validate = function (mixed $data): array {
    if (!is_array($data)) {
        throw new AiRequestFailed('Model output does not match the completion schema');
    }
    return ['completion' => check_string($data['completion'] ?? null, MAX_INPUT_LENGTH, 'completion')];
};

try {
    $config = load_config();
    [$parsed] = structured_response($config, [
        'model' => $config['complete_model'],
        'reasoning' => ['effort' => 'none'],
        'instructions' =>
            'You autocomplete to-do item names as the user types. Continue the partial text into a short, clear task name. ' .
            'Return the whole name: it must start with exactly the text the user typed (same spelling, spacing and case), ' .
            'followed by your continuation. Keep it under 60 characters. ' .
            'If the text already reads as a complete task name, return it unchanged. ' .
            DATA_NOT_INSTRUCTIONS,
        'input' => $text,
        'max_output_tokens' => COMPLETE_MAX_OUTPUT_TOKENS,
    ], 'completion', $schema, $validate);
} catch (Throwable $e) {
    log_error($e);
    send_json(502, ['error' => 'AI request failed']);
}

// null when the model refused or produced nothing parseable.
send_json(200, $parsed);
