<?php

namespace App\Console\Commands;

use App\Services\Auth\PhoneNumberNormalizer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ReportPhoneIdentityConflicts extends Command
{
    protected $signature = 'multi-role:audit-phones';

    protected $description = 'Report invalid and duplicate normalized user phone identities';

    public function handle(PhoneNumberNormalizer $phones): int
    {
        $groups = [];
        $invalid = [];
        DB::table('users')->select(['id', 'phone'])->orderBy('id')->get()->each(
            function ($user) use ($phones, &$groups, &$invalid) {
                try {
                    $groups[$phones->normalize((string) $user->phone)][] = $user->id;
                } catch (InvalidArgumentException) {
                    $invalid[] = [$user->id, $user->phone];
                }
            },
        );

        $duplicates = array_filter($groups, fn (array $ids) => count($ids) > 1);
        if ($invalid !== []) {
            $this->warn('Invalid phone numbers:');
            $this->table(['User ID', 'Phone'], $invalid);
        }
        if ($duplicates !== []) {
            $this->warn('Normalized phone conflicts:');
            $this->table(
                ['Normalized phone', 'User IDs'],
                collect($duplicates)->map(fn ($ids, $phone) => [$phone, implode(', ', $ids)])->values(),
            );
        }
        if ($invalid === [] && $duplicates === []) {
            $this->info('No phone identity conflicts found.');
        }

        return $duplicates === [] ? self::SUCCESS : self::FAILURE;
    }
}
