# Pick You

Pick You is a ride-hailing style monorepo with a Laravel backend, two Expo mobile apps, and a Vite admin dashboard.

## Project Structure

- `backend-api/` - Laravel API backend
- `DriverApp/` - Expo React Native app for drivers
- `PassengerApp/` - Expo React Native app for passengers
- `frontend-admin/` - React + Vite admin dashboard

## Technologies Used

- Backend: PHP, Laravel 12, Sanctum, Reverb, Predis, Tinker, queue worker
- Driver app: Expo, React Native, TypeScript, Expo Router, React Navigation, Axios, Pusher
- Passenger app: Expo, React Native, TypeScript, Expo Router, NativeWind, React Navigation
- Admin panel: React, Vite, React Router, Laravel Echo, Pusher, SweetAlert2
- Tooling: npm, Composer, ESLint, TypeScript, Tailwind CSS

## Requirements

- Node.js and npm
- PHP 8.2 or higher
- Composer
- MySQL or another compatible database
- Expo Go or an Android/iOS emulator for the mobile apps

## Commands You Use

### Backend API

Run the Laravel server:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

Run the queue worker:

```bash
php artisan queue:work
```

Run Reverb for realtime events:

```bash
php artisan reverb:start
```

Run migrations:

```bash
php artisan migrate
```

Install backend dependencies you added:

```bash
composer require predis/predis
composer require laravel/reverb
php artisan install:broadcasting
```

### Mobile and Admin Apps

Install JavaScript dependencies:

```bash
npm install
```

Install realtime packages for Laravel Echo and Pusher:

```bash
npm install laravel-echo pusher-js
```

Start the admin panel:

```bash
npm run dev
```

Start the Expo apps:

```bash
npx expo start --tunnel
```

## Setup Order

1. Install backend dependencies and frontend dependencies with `composer install` and `npm install` in the app folders.
2. Run `php artisan migrate` after your database is ready.
3. Start the backend with `php artisan serve --host=0.0.0.0 --port=8000`.
4. Start `php artisan queue:work` and `php artisan reverb:start` if you need jobs and realtime updates.
5. Start the admin panel with `npm run dev`.
6. Start the Expo mobile apps with `npx expo start --tunnel`.

## Environment Files

Each app may require its own `.env` or Expo environment values.

- Backend API: `backend-api/.env`
- Driver app: Expo environment values for the driver mobile app
- Passenger app: Expo environment values for the passenger mobile app
- Admin panel: Vite environment variables if needed

Do not commit secrets to GitHub. Keep API keys, database credentials, and service tokens only in local environment files.

## Notes

- If you change backend environment values, restart the Laravel server, queue worker, and Reverb process.
- Keep `.env` files ignored before pushing to GitHub.
