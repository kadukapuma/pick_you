<?php

namespace Tests\Unit\Services\Media;

use App\Services\Media\ImageStorageService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageStorageServiceTest extends TestCase
{
    private ImageStorageService $images;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->images = app(ImageStorageService::class);
    }

    public function test_stores_an_image_on_the_public_disk_and_returns_a_public_path(): void
    {
        $path = $this->images->store(
            UploadedFile::fake()->image('avatar.jpg'),
            'users/15/profiles',
            'profile',
        );

        $this->assertStringStartsWith('/storage/users/15/profiles/profile-', $path);
        Storage::disk('public')->assertExists($this->diskPath($path));
    }

    public function test_replacing_a_local_image_deletes_the_previous_file(): void
    {
        Storage::disk('public')->put('users/15/profiles/old.jpg', 'old image');

        $path = $this->images->store(
            UploadedFile::fake()->image('new.jpg'),
            'users/15/profiles',
            'profile',
        );
        $this->images->deleteLocal('/storage/users/15/profiles/old.jpg');

        Storage::disk('public')->assertMissing('users/15/profiles/old.jpg');
        Storage::disk('public')->assertExists($this->diskPath($path));
    }

    public function test_replacing_a_cloudinary_url_only_writes_the_new_local_file(): void
    {
        $path = $this->images->store(
            UploadedFile::fake()->image('new.jpg'),
            'users/15/profiles',
            'profile',
        );
        $this->images->deleteLocal('https://res.cloudinary.com/demo/image/upload/profile.jpg');

        Storage::disk('public')->assertExists($this->diskPath($path));
        $this->assertCount(1, Storage::disk('public')->allFiles());
    }

    public function test_url_resolution_preserves_remote_urls_and_resolves_local_paths(): void
    {
        config(['app.url' => 'https://picku.lk']);

        $this->assertSame(
            'https://res.cloudinary.com/demo/image/upload/profile.jpg',
            $this->images->url('https://res.cloudinary.com/demo/image/upload/profile.jpg'),
        );
        $this->assertSame(
            'https://picku.lk/storage/users/15/profiles/profile.jpg',
            $this->images->url('/storage/users/15/profiles/profile.jpg'),
        );
    }

    private function diskPath(string $publicPath): string
    {
        return substr($publicPath, strlen('/storage/'));
    }
}
