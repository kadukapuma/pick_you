# Environment Configuration for Frontend Admin

This guide explains how to configure the API URL and WebSocket host for the admin panel.

## Environment Variables

The admin panel uses two environment variables defined in `.env`:

### 1. VITE_API_BASE_URL
The base URL for your Laravel backend API.

**Format:** `http://YOUR_IP:PORT/api`

**Examples:**
- Local network: `http://192.168.1.7:8000/api`
- Home network: `http://192.168.8.135:8000/api`
- Remote server: `http://159.198.75.110/api`
- With ngrok: `https://your-subdomain.ngrok.io/api`

### 2. VITE_WS_HOST
The WebSocket host for real-time notifications (Laravel Reverb).

**Format:** `YOUR_IP` (just the IP, no port)

**Examples:**
- Local network: `192.168.1.7`
- Home network: `192.168.8.135`
- Remote server: `159.198.75.110`

## How to Change the API URL

1. Open the `.env` file in the `frontend-admin` directory:
   ```bash
   cd frontend-admin
   code .env
   ```

2. Update the values:
   ```env
   VITE_API_BASE_URL=http://YOUR_NEW_IP:8000/api
   VITE_WS_HOST=YOUR_NEW_IP
   ```

3. **Important:** Restart the development server for changes to take effect:
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

## Quick IP Change Script

If you frequently need to switch between different environments, you can create a simple script:

```bash
#!/bin/bash
# change_ip.sh

if [ -z "$1" ]; then
    echo "Usage: ./change_ip.sh <new_ip>"
    exit 1
fi

NEW_IP=$1

# Update .env file
sed -i "s/VITE_API_BASE_URL=.*/VITE_API_BASE_URL=http:\/\/$NEW_IP:8000\/api/" .env
sed -i "s/VITE_WS_HOST=.*/VITE_WS_HOST=$NEW_IP/" .env

echo "Updated .env with IP: $NEW_IP"
echo "Remember to restart the dev server: npm run dev"
```

Make it executable:
```bash
chmod +x change_ip.sh
```

Usage:
```bash
./change_ip.sh 192.168.1.7
```

## Troubleshooting

If you're still having connection issues after updating the IP:

1. **Clear browser cache** - The old URL might be cached
2. **Check firewall** - Ensure port 8000 is open on your backend machine
3. **Verify backend is running** - Test with: `curl http://YOUR_IP:8000/api/app-settings/maintenance-mode`
4. **Restart everything** - Stop both backend and frontend, then start them again

## All Apps Configuration

Remember, you have multiple apps that need the correct IP:

- **PassengerApp**: Uses `EXPO_PUBLIC_API_URL` in `PassengerApp/.env`
- **DriverApp**: Uses `EXPO_PUBLIC_API_URL` in `DriverApp/.env`
- **frontend-admin**: Uses `VITE_API_BASE_URL` and `VITE_WS_HOST` in `frontend-admin/.env`

Change the IP in all relevant `.env` files when switching environments.
