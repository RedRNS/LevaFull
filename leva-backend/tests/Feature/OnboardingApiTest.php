<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OnboardingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_complete_onboarding(): void
    {
        $user = User::factory()->create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'status' => User::STATUS_PENDING,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/onboarding', [
            'major' => 'Informatika',
            'semester' => 3,
            'language_preference' => 'id',
            'learning_style' => 'visual',
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Onboarding completed successfully',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => 'John Doe',
                        'email' => 'john@example.com',
                        'status' => User::STATUS_ACTIVE,
                        'profile' => [
                            'major' => 'Informatika',
                            'semester' => 3,
                            'language_preference' => 'id',
                            'learning_style' => 'visual',
                        ],
                    ],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'status' => User::STATUS_ACTIVE,
        ]);

        $this->assertDatabaseHas('user_profiles', [
            'user_id' => $user->id,
            'major' => 'Informatika',
            'semester' => 3,
        ]);
    }

    public function test_onboarding_requires_authentication(): void
    {
        $response = $this->postJson('/api/onboarding', [
            'major' => 'Informatika',
            'semester' => 3,
            'language_preference' => 'id',
            'learning_style' => 'visual',
        ]);

        $response
            ->assertUnauthorized()
            ->assertJson([
                'message' => 'Unauthenticated.',
            ]);
    }

    public function test_onboarding_requires_valid_payload(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/onboarding', [
            'major' => '',
            'semester' => 15,
            'language_preference' => '',
            'learning_style' => '',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'major',
                'semester',
                'language_preference',
                'learning_style',
            ]);
    }

    public function test_onboarding_rejects_user_with_existing_profile(): void
    {
        $user = User::factory()->create([
            'status' => User::STATUS_ACTIVE,
        ]);

        UserProfile::create([
            'user_id' => $user->id,
            'major' => 'Informatika',
            'semester' => 3,
            'language_preference' => 'id',
            'learning_style' => 'visual',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/onboarding', [
            'major' => 'Informatika',
            'semester' => 4,
            'language_preference' => 'id',
            'learning_style' => 'visual',
        ]);

        $response
            ->assertConflict()
            ->assertJson([
                'message' => 'User already completed onboarding.',
            ]);
    }
}
