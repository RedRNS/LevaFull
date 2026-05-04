<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class OnboardingService
{
    public function complete(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data) {

            $this->validate($data);

            $profile = $this->createProfile($user, $data);

            // future: VectorService
            // $this->vectorService->storeProfile($profile);

            $this->activateUser($user);

            return $user->refresh();
        });
    }

    private function validate(array $data): void
    {
        Validator::make($data, [
            'major' => ['required', 'string', 'max:255'],
            'semester' => ['required', 'integer', 'min:1', 'max:14'],
            'language_preference' => ['required', 'string', 'max:20'],
            'learning_style' => ['required', 'string', 'max:50'],
        ])->validate();
    }

    private function createProfile(User $user, array $data): UserProfile
    {
        if ($user->profile) {
            throw new ConflictHttpException('User already completed onboarding.');
        }

        return UserProfile::create([
            'user_id' => $user->id,
            'major' => $data['major'],
            'semester' => $data['semester'],
            'language_preference' => $data['language_preference'],
            'learning_style' => $data['learning_style'],
        ]);
    }

    private function activateUser(User $user): void
    {
        $user->update([
            'status' => User::STATUS_ACTIVE,
        ]);
    }
}
