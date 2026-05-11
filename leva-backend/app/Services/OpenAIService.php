<?php

namespace App\Services;

use App\Models\ScrapedTool;
use OpenAI\Laravel\Facades\OpenAI;
use RuntimeException;

class OpenAIService
{
    public function embedText(string $text): array
    {
        $response = OpenAI::embeddings()->create([
            'model' => config('services.openai.embedding_model'),
            'input' => $text,
        ]);

        return $response->embeddings[0]->embedding ?? [];
    }

    public function decomposeTask(string $text, array $userProfile): array
    {
        $response = OpenAI::responses()->create([
            'model' => config('services.openai.chat_model'),
            'input' => [[
                'role' => 'system',
                'content' => [[
                    'type' => 'input_text',
                    'text' => $this->buildSystemPrompt($userProfile),
                ]],
            ], [
                'role' => 'user',
                'content' => [[
                    'type' => 'input_text',
                    'text' => $text,
                ]],
            ]],
            'text' => [
                'format' => [
                    'type' => 'json_schema',
                    'name' => 'task_decomposition',
                    'strict' => true,
                    'schema' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'required' => ['title', 'sub_tasks'],
                        'properties' => [
                            'title' => [
                                'type' => 'string',
                            ],
                            'sub_tasks' => [
                                'type' => 'array',
                                'minItems' => 3,
                                'maxItems' => 6,
                                'items' => [
                                    'type' => 'object',
                                    'additionalProperties' => false,
                                    'required' => [
                                        'judul_tugas',
                                        'deskripsi',
                                        'tips',
                                        'estimasi_waktu',
                                        'kategori_alat_ai_yang_rekomendasi',
                                    ],
                                    'properties' => [
                                        'judul_tugas' => ['type' => 'string'],
                                        'deskripsi' => ['type' => 'string'],
                                        'tips' => ['type' => 'string'],
                                        'estimasi_waktu' => ['type' => 'string'],
                                        'kategori_alat_ai_yang_rekomendasi' => [
                                            'type' => 'string',
                                            'enum' => ['Research', 'Writing', 'Coding', 'Data', 'Academic', 'Productivity'],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            'temperature' => 0.4,
            'max_output_tokens' => 1400,
        ]);

        $rawText = $response->outputText;

        if (!is_string($rawText) || trim($rawText) === '') {
            throw new RuntimeException('OpenAI returned an empty decomposition response.');
        }

        $decoded = json_decode($rawText, true);

        if (!is_array($decoded) || !isset($decoded['title'], $decoded['sub_tasks']) || !is_array($decoded['sub_tasks'])) {
            throw new RuntimeException('OpenAI returned invalid decomposition JSON.');
        }

        return $decoded;
    }

    public function classifyBookmark(ScrapedTool $tool, array $userProfile): array
    {
        $response = OpenAI::responses()->create([
            'model' => config('services.openai.chat_model'),
            'input' => [[
                'role' => 'system',
                'content' => [[
                    'type' => 'input_text',
                    'text' => $this->buildBookmarkSystemPrompt($userProfile),
                ]],
            ], [
                'role' => 'user',
                'content' => [[
                    'type' => 'input_text',
                    'text' => $this->buildBookmarkToolPrompt($tool),
                ]],
            ]],
            'text' => [
                'format' => [
                    'type' => 'json_schema',
                    'name' => 'bookmark_classification',
                    'strict' => true,
                    'schema' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'required' => ['utility_priority', 'semantic_keywords'],
                        'properties' => [
                            'utility_priority' => [
                                'type' => 'string',
                                'enum' => ['must_try', 'very_good', 'niche', 'optional'],
                            ],
                            'semantic_keywords' => [
                                'type' => 'array',
                                'minItems' => 5,
                                'maxItems' => 5,
                                'items' => [
                                    'type' => 'string',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            'temperature' => 0.2,
            'max_output_tokens' => 300,
        ]);

        $rawText = $response->outputText;

        if (!is_string($rawText) || trim($rawText) === '') {
            throw new RuntimeException('OpenAI returned an empty bookmark classification response.');
        }

        $decoded = json_decode($rawText, true);

        if (
            !is_array($decoded) ||
            !isset($decoded['utility_priority'], $decoded['semantic_keywords']) ||
            !is_array($decoded['semantic_keywords']) ||
            count($decoded['semantic_keywords']) !== 5
        ) {
            throw new RuntimeException('OpenAI returned invalid bookmark classification JSON.');
        }

        return [
            'utility_priority' => $decoded['utility_priority'],
            'semantic_keywords' => array_values($decoded['semantic_keywords']),
        ];
    }

    public function generateSearchRecommendationReason(ScrapedTool $tool, array $userProfile): string
    {
        $response = OpenAI::responses()->create([
            'model' => config('services.openai.chat_model'),
            'input' => [[
                'role' => 'system',
                'content' => [[
                    'type' => 'input_text',
                    'text' => 'Berikan satu kalimat singkat dalam bahasa Indonesia yang menjelaskan kenapa tool ini relevan untuk user. Jangan lebih dari 20 kata.',
                ]],
            ], [
                'role' => 'user',
                'content' => [[
                    'type' => 'input_text',
                    'text' => sprintf(
                        "major: %s\nsemester: %s\ntool: %s\ncategory: %s\ndescription: %s",
                        $userProfile['major'] ?? 'Mahasiswa',
                        $userProfile['semester'] ?? 'tidak diketahui',
                        $tool->name,
                        $tool->category,
                        $tool->description
                    ),
                ]],
            ]],
            'max_output_tokens' => 60,
            'temperature' => 0.2,
        ]);

        return trim($response->outputText ?? '') ?: 'Direkomendasikan berdasarkan relevansi semantik';
    }

    public function generateChatReply(string $message, array $contextTools, string $language = 'id'): array
    {
        $context = collect($contextTools)
            ->values()
            ->map(function (ScrapedTool $tool, int $index) {
                return sprintf(
                    "%d. Name: %s | Category: %s | URL: %s | Description: %s",
                    $index + 1,
                    $tool->name,
                    $tool->category,
                    $tool->url,
                    $tool->description
                );
            })
            ->implode("\n");

        $targetLanguage = $language === 'en' ? 'English' : 'Bahasa Indonesia';

        $response = OpenAI::responses()->create([
            'model' => config('services.openai.chat_model'),
            'input' => [[
                'role' => 'system',
                'content' => [[
                    'type' => 'input_text',
                    'text' => "Anda adalah asisten rekomendasi alat AI untuk mahasiswa. Hanya gunakan tools yang ada di context berikut. Dilarang merekomendasikan tools lain. Jawab dalam {$targetLanguage}. Jika context tidak cukup, katakan secara jujur.",
                ]],
            ], [
                'role' => 'user',
                'content' => [[
                    'type' => 'input_text',
                    'text' => "Context Tools:\n{$context}\n\nPertanyaan User:\n{$message}",
                ]],
            ]],
            'max_output_tokens' => 400,
            'temperature' => 0.4,
        ]);

        $reply = trim($response->outputText ?? '');

        if ($reply === '') {
            throw new RuntimeException('OpenAI returned an empty chat response.');
        }

        return ['reply' => $reply];
    }

    private function buildSystemPrompt(array $userProfile): string
    {
        $major = $userProfile['major'] ?? 'Mahasiswa';
        $semester = $userProfile['semester'] ?? 'tidak diketahui';
        $language = $userProfile['language_preference'] ?? 'id';

        return <<<PROMPT
Anda adalah insinyur alur kerja perilaku yang mensintesis metodologi Atomic Habits dengan pola KERNEL.

Konteks user:
- major: {$major}
- semester: {$semester}
- language_preference: {$language}

Aturan wajib:
- Pecah menjadi minimal 3 dan maksimal 6 sub-task.
- Setiap sub-task harus konkret, actionable, dan cukup kecil untuk dimulai sekarang juga.
- Setiap sub-task harus realistis diselesaikan dalam kurang dari 30 menit.
- Tulis deskripsi 2-3 kalimat.
- Tulis tips 1-2 kalimat yang konkret.
- kategori_alat_ai_yang_rekomendasi harus salah satu: Research, Writing, Coding, Data, Academic, Productivity.
- Judul keseluruhan harus ringkas dan relevan dengan tugas user.
- Balas hanya JSON valid sesuai schema.
PROMPT;
    }

    private function buildBookmarkSystemPrompt(array $userProfile): string
    {
        $major = $userProfile['major'] ?? 'Mahasiswa';
        $semester = $userProfile['semester'] ?? 'tidak diketahui';
        $language = $userProfile['language_preference'] ?? 'id';

        return <<<PROMPT
Anda adalah agen auditor utilitas alat AI untuk mahasiswa dengan pola KERNEL.

Konteks user:
- major: {$major}
- semester: {$semester}
- language_preference: {$language}

Aturan wajib:
- utility_priority harus salah satu: must_try, very_good, niche, optional.
- semantic_keywords harus berisi tepat 5 string unik.
- Nilai prioritas harus mempertimbangkan relevansi nyata untuk mahasiswa, kemudahan mulai, dan potensi dampak.
- Balas hanya JSON valid sesuai schema.
PROMPT;
    }

    private function buildBookmarkToolPrompt(ScrapedTool $tool): string
    {
        return <<<PROMPT
Klasifikasikan tool berikut:
- name: {$tool->name}
- category: {$tool->category}
- pricing_type: {$tool->pricing_type}
- description: {$tool->description}
PROMPT;
    }
}
