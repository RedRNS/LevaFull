<?php

namespace App\Http\Controllers;

use App\Services\OnboardingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class OnboardingController extends Controller
{
    public function __construct(
        protected OnboardingService $onboardingService
    ) {}

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $updatedUser = $this->onboardingService->complete(
            $user,
            $request->all()
        );

        return response()->json([
            'message' => 'Onboarding completed successfully',
            'data' => [
                'user' => $this->formatUserDetail(
                    $updatedUser->load('profile')
                ),
            ],
        ]);
    }

    private function formatUserDetail($user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'status' => $user->status,
            'profile' => $user->profile ? [
                'major' => $user->profile->major,
                'semester' => $user->profile->semester,
                'language_preference' => $user->profile->language_preference,
                'learning_style' => $user->profile->learning_style,
            ] : null,
        ];
    }
}
