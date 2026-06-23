# Driver ride notifications (WebSocket + Redis)

## How it works

1. Passenger books → API finds **online** drivers with a row in `driver_locations`, sorted by distance (PostGIS `<->`).
2. Driver IDs are pushed to Redis list `ride:matching_drivers:{rideId}` — **nearest first**.
3. **One driver at a time** receives the offer (sequential dispatch, good for accept/reject logic):
   - `ride:current_driver:{rideId}` = who sees the popup now
   - WebSocket event `RideRequestedTargeted` on `driver.rides.{driverId}`
   - After `RIDE_DRIVER_OFFER_SECONDS` (default **12**), queue worker moves to the **next** driver (`lpop` was already done; next `targetNextDriver` pops the list)
4. Driver app must be **online** with **GPS synced** (`POST /driver-locations`) or they are **not** in the nearby queue.
5. WebSocket stays **connected** while online (persistent Pusher) so the popup is instant.
6. HTTP fallback only if the socket is down for 4+ seconds.

### Why it can feel “slow”

| Cause | Fix |
|--------|-----|
| Driver not in `driver_locations` | Go online (app now sends GPS automatically) |
| You are 2nd/3rd in the Redis queue | Wait until the first driver’s 12s window ends |
| WebSocket reconnecting each time | Fixed: one Pusher connection per session |
| Modal slide animation | Fixed: instant modal + short motion |

This is **not** a broadcast-to-all-drivers-at-once system (that causes race conditions). It is a **nearest-first queue**.

This pattern scales: each online driver holds one WebSocket, not thousands of HTTP polls per minute.

## Backend (required)

In `backend-api/.env`:

```env
BROADCAST_CONNECTION=reverb
QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1

REVERB_APP_ID=my-app-id
REVERB_APP_KEY=app-key
REVERB_APP_SECRET=my-app-secret
REVERB_HOST=0.0.0.0
REVERB_PORT=8080
REVERB_SCHEME=http
```

Run these processes (separate terminals):

```bash
php artisan reverb:start
php artisan queue:work
php artisan serve
```

`BROADCAST_CONNECTION=log` or `null` will **never** push rides to the app — only log them.

## Driver app `.env`

Match Reverb host/key with the API:

```env
EXPO_PUBLIC_WS_HOST=192.168.1.7
EXPO_PUBLIC_WS_PORT=8080
EXPO_PUBLIC_WS_SCHEME=http
EXPO_PUBLIC_REVERB_APP_KEY=app-key
```

Restart Expo: `npx expo start --clear`

## UI status

- **"Live — trips arrive instantly"** → WebSocket connected.
- **"Reconnecting… (backup sync active)"** → using rare HTTP fallback only.

## Redis looks empty — is that normal?

Yes, for matching keys. The API uses **short-lived** Redis keys:

- `ride:matching_drivers:{rideId}` — queue of driver IDs (deleted when ride ends)
- `ride:current_driver:{rideId}` — who is being offered the ride now (deleted on accept/reject/timeout)

They are **not** permanent ride storage. Ride data lives in **PostgreSQL** (`rides` table). After 15 seconds with no accept, `ProcessRideTimeout` moves to the next driver and keys update — so Redis can be empty even though the WebSocket already fired.

## Empty `/driver/ride-requests`

`{"data": []}` is normal when:

- No passenger has requested a ride targeted to you, or
- The 15s window expired and the ride moved to another driver, or
- You are offline / wrong vehicle type.

You should **not** see that request every 5 seconds anymore.

## Production (100k+ drivers)

- Run **Reverb** behind a load balancer with sticky sessions or use **Pusher/Ably** managed WebSockets.
- Keep **Redis** for matching queues and `ride:current_driver:*`.
- Use **horizon** / multiple `queue:work` workers for `ProcessRideTimeout`.
- Do **not** poll ride lists on an interval for all drivers.
