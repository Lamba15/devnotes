<?php

namespace App\Providers;

use App\AI\ConfiguredFakeAssistantModelClient;
use App\AI\Contracts\AssistantModelClient;
use App\AI\OpenRouterAssistantModelClient;
use App\Models\AuditLog;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
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

        if (! app()->runningInConsole()) {
            $forwardedProto = strtolower((string) request()->headers->get('x-forwarded-proto', ''));

            if (request()->isSecure() || str_contains($forwardedProto, 'https')) {
                URL::forceScheme('https');
            }
        }

        Event::listen(Login::class, function (Login $event): void {
            AuditLog::query()->create([
                'user_id' => $event->user->getAuthIdentifier(),
                'event' => 'auth.login',
                'source' => 'web',
                'subject_type' => User::class,
                'subject_id' => $event->user->getAuthIdentifier(),
            ]);
        });

        Event::listen(Logout::class, function (Logout $event): void {
            if (! $event->user) {
                return;
            }

            AuditLog::query()->create([
                'user_id' => $event->user->getAuthIdentifier(),
                'event' => 'auth.logout',
                'source' => 'web',
                'subject_type' => User::class,
                'subject_id' => $event->user->getAuthIdentifier(),
            ]);
        });

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
