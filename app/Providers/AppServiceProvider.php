<?php

namespace App\Providers;

use App\AI\ConfiguredFakeAssistantModelClient;
use App\AI\Contracts\AssistantModelClient;
use App\AI\OpenRouterAssistantModelClient;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(AssistantModelClient::class, function ($app) {
            $fixturePath = config('services.openrouter.fake_responses_file');

            if (is_string($fixturePath) && $fixturePath !== '') {
                return new ConfiguredFakeAssistantModelClient($fixturePath);
            }

            return $app->make(OpenRouterAssistantModelClient::class);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
