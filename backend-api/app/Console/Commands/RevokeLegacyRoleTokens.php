<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Laravel\Sanctum\PersonalAccessToken;

class RevokeLegacyRoleTokens extends Command
{
    protected $signature = 'multi-role:revoke-legacy-tokens {--force : Delete matching tokens}';

    protected $description = 'List or revoke legacy Sanctum tokens with wildcard abilities';

    public function handle(): int
    {
        $tokens = PersonalAccessToken::query()->get()->filter(
            fn (PersonalAccessToken $token) => in_array('*', $token->abilities ?? [], true),
        );
        $this->info("Found {$tokens->count()} legacy wildcard token(s).");

        if (! $this->option('force')) {
            $this->comment('Dry run only. Re-run with --force after the app adoption window.');

            return self::SUCCESS;
        }

        PersonalAccessToken::query()->whereKey($tokens->pluck('id'))->delete();
        $this->info('Legacy wildcard tokens revoked.');

        return self::SUCCESS;
    }
}
