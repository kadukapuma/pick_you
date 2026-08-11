<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendBulkCampaignJob;
use App\Models\Setting;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AppUpdateController extends Controller
{
    use ApiResponse;

    public function show(string $app)
    {
        abort_unless(in_array($app, ['passenger', 'driver'], true), 404);

        return $this->success(
            Setting::getSetting("app_update_{$app}", $this->defaultPolicy($app)),
            'App update policy retrieved successfully.'
        );
    }

    public function downloads()
    {
        return $this->success([
            'passenger' => $this->publicRelease('passenger'),
            'driver' => $this->publicRelease('driver'),
        ], 'App downloads retrieved successfully.');
    }

    public function download(string $app)
    {
        $this->assertApp($app);
        $release = Setting::getSetting("app_release_{$app}");

        abort_unless($release && Storage::disk('local')->exists($release['path']), 404, 'APK not found.');

        return Storage::disk('local')->download(
            $release['path'],
            "picku-{$app}-{$release['version']}.apk",
            ['Content-Type' => 'application/vnd.android.package-archive']
        );
    }

    public function current(string $app)
    {
        $this->assertApp($app);

        return $this->success($this->publicRelease($app), 'Current APK release retrieved successfully.');
    }

    public function upload(Request $request, string $app)
    {
        $this->assertApp($app);
        $validated = $request->validate([
            'version' => ['required', 'string', 'regex:/^\d+\.\d+\.\d+$/'],
            'apk' => 'required|file|max:262144',
        ]);

        $apk = $request->file('apk');
        if (strtolower($apk->getClientOriginalExtension()) !== 'apk') {
            throw ValidationException::withMessages(['apk' => 'The uploaded file must have an .apk extension.']);
        }

        $handle = fopen($apk->getRealPath(), 'rb');
        $signature = $handle ? fread($handle, 2) : '';
        if ($handle) fclose($handle);
        if ($signature !== 'PK') {
            throw ValidationException::withMessages(['apk' => 'The uploaded file is not a valid Android APK archive.']);
        }

        $version = $validated['version'];
        $sha256 = hash_file('sha256', $apk->getRealPath());
        $size = $apk->getSize();
        $filename = "picku-{$app}-{$version}-".now()->format('YmdHis').'.apk';
        $path = $apk->storeAs("app-releases/{$app}", $filename, 'local');

        if (! $path) {
            return $this->error('The APK could not be stored.', 500);
        }

        $release = [
            'app' => $app,
            'version' => $version,
            'path' => $path,
            'original_name' => $apk->getClientOriginalName(),
            'size' => $size,
            'sha256' => $sha256,
            'uploaded_at' => now()->toIso8601String(),
            'uploaded_by' => $request->user()?->id,
        ];

        Setting::setSetting("app_release_{$app}", $release, 'json');
        $history = Setting::getSetting("app_release_history_{$app}", []);
        $history[] = $release;
        Setting::setSetting("app_release_history_{$app}", $history, 'json');

        return $this->success($this->publicRelease($app), 'APK uploaded successfully.');
    }

    public function publish(Request $request, string $app)
    {
        $this->assertApp($app);

        $validated = $request->validate([
            'latest_version' => ['required', 'string', 'regex:/^\d+\.\d+\.\d+$/'],
            'minimum_version' => ['required', 'string', 'regex:/^\d+\.\d+\.\d+$/'],
            'title' => 'required|string|max:100',
            'message' => 'required|string|max:500',
            'required' => 'sometimes|boolean',
        ]);

        if (version_compare($validated['minimum_version'], $validated['latest_version'], '>')) {
            return $this->error('Minimum version cannot be newer than the latest version.', 422, [
                'minimum_version' => ['Minimum version cannot be newer than the latest version.'],
            ]);
        }

        $release = Setting::getSetting("app_release_{$app}");
        if (! $release || ! Storage::disk('local')->exists($release['path'])) {
            return $this->error('Upload an APK for this app before publishing the update.', 422, [
                'apk' => ['No active APK is available.'],
            ]);
        }
        if ($release['version'] !== $validated['latest_version']) {
            return $this->error('The uploaded APK version must match the latest version.', 422, [
                'latest_version' => ["The active APK is version {$release['version']}."],
            ]);
        }

        $policy = [
            'app' => $app,
            'latest_version' => $validated['latest_version'],
            'minimum_version' => $validated['minimum_version'],
            'title' => $validated['title'],
            'message' => $validated['message'],
            'website_url' => rtrim(config('app.frontend_url'), '/').'/get-app',
            'required' => $validated['required'] ?? true,
            'published_at' => now()->toIso8601String(),
        ];

        Setting::setSetting("app_update_{$app}", $policy, 'json');

        SendBulkCampaignJob::dispatch($app, $policy['title'], $policy['message'], [
            'action' => 'app_update',
            'app' => $app,
        ]);

        return $this->success($policy, 'Required update published and notification campaign scheduled.');
    }

    private function defaultPolicy(string $app): array
    {
        return [
            'app' => $app,
            'latest_version' => '0.0.0',
            'minimum_version' => '0.0.0',
            'title' => 'Update',
            'message' => 'Download the new updated app from our website.',
            'website_url' => '',
            'required' => false,
            'published_at' => null,
        ];
    }

    private function publicRelease(string $app): ?array
    {
        $release = Setting::getSetting("app_release_{$app}");
        if (! $release || ! Storage::disk('local')->exists($release['path'])) return null;

        return [
            'app' => $app,
            'version' => $release['version'],
            'original_name' => $release['original_name'],
            'size' => $release['size'],
            'sha256' => $release['sha256'],
            'uploaded_at' => $release['uploaded_at'],
            'download_url' => route('app-downloads.download', ['app' => $app]),
        ];
    }

    private function assertApp(string $app): void
    {
        abort_unless(in_array($app, ['passenger', 'driver'], true), 404);
    }
}
