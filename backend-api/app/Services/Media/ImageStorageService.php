<?php

namespace App\Services\Media;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class ImageStorageService
{
    public function store(
        UploadedFile $file,
        string $directory,
        string $prefix,
    ): string {
        $extension = $file->guessExtension()
            ?: $file->getClientOriginalExtension()
            ?: 'bin';
        $filename = Str::slug($prefix).'-'.Str::uuid().'.'.strtolower($extension);

        $storedPath = Storage::disk('public')->putFileAs(
            trim($directory, '/'),
            $file,
            $filename,
        );

        if (! $storedPath) {
            throw new RuntimeException('Failed to store uploaded image.');
        }

        return '/storage/'.ltrim(str_replace('\\', '/', $storedPath), '/');
    }

    public function url(?string $path): ?string
    {
        if (! $path || filter_var($path, FILTER_VALIDATE_URL)) {
            return $path;
        }

        return rtrim((string) config('app.url'), '/').'/'.ltrim($path, '/');
    }

    public function deleteLocal(?string $path): void
    {
        if (! $path || filter_var($path, FILTER_VALIDATE_URL)) {
            return;
        }

        $normalized = '/'.ltrim(str_replace('\\', '/', $path), '/');
        if (! str_starts_with($normalized, '/storage/')) {
            return;
        }

        Storage::disk('public')->delete(substr($normalized, strlen('/storage/')));
    }
}
