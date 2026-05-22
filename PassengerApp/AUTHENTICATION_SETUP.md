# Passenger Authentication Integration Guide

## ✅ Setup Complete

All necessary files have been created and integrated for passenger authentication with your Laravel backend.

---

## 📁 File Structure Created

```
frontend/app/
├── services/
│   ├── api/
│   │   ├── config.ts           ← API configuration (base URL, endpoints)
│   │   ├── apiClient.ts        ← Fetch-based HTTP client
│   │   └── index.ts            ← Exports
│   ├── auth/
│   │   ├── authService.ts      ← Auth API calls (register, login, logout)
│   │   ├── storageService.ts   ← Token/user persistence (AsyncStorage)
│   │   └── index.ts            ← Exports
├── context/
│   └── AuthContext.tsx         ← Global auth state management
├── hooks/
│   └── useAuth.ts              ← Custom auth hook
├── (auth)/
│   ├── signup.tsx              ← ✅ Updated with backend integration
│   └── signin.tsx              ← ✅ Updated with backend integration
├── _layout.tsx                 ← ✅ Updated with auth routing logic
└── components/
    └── CustomDrawerContent.tsx ← ✅ Updated with logout functionality
```

---

## 🔌 Backend Connection

**Backend URL:** `http://192.168.1.200:8000/api`

All requests automatically include the JWT token in the `Authorization: Bearer <token>` header.

### API Endpoints Used:

- `POST /register` - Create new passenger account
- `POST /login` - Authenticate passenger
- `POST /logout` - Logout and invalidate token
- `POST /otp/send` - Send OTP (future use)
- `GET /user` - Get current user (protected)

---

## 🚀 How It Works

### 1. **Signup Flow**

```
User fills signup form → Validation → Call authService.register()
→ Stored in backend DB → Token saved locally → Auto-login → Navigate to home
```

**Signup Form Fields:**

- First Name (required)
- Last Name (required)
- Email (required, valid email format)
- Phone (required, min 10 digits)
- Password (required, min 8 characters)
- Password Confirmation (must match)

**Error Handling:**

- Backend validation errors displayed to user
- Form field validation before submission
- Loading state during API call
- Auto-clear errors when user starts typing

---

### 2. **Login Flow**

```
User enters credentials → Validation → Call authService.login()
→ Token received & saved → User data saved → Navigate to home
```

**Login Form Fields:**

- Email (required, valid format)
- Password (required, min 8 characters)

**Error Handling:**

- Invalid credentials error from backend
- Form validation
- Loading state with spinner
- Network error handling

---

### 3. **Token Persistence**

- Token saved to **AsyncStorage** (device storage)
- User data also persisted
- On app restart: AuthContext checks storage → Auto-restores session
- No need to login again if token is valid
- Token automatically included in all API requests

---

### 4. **Logout**

- User taps "Logout" in drawer
- Confirmation alert shown
- Logout API called to invalidate token on backend
- Local storage cleared
- Auto-redirect to signin screen

---

## 📦 Dependencies Required

Make sure you have these installed in your frontend:

```bash
npm install @react-native-async-storage/async-storage
```

**Already installed (existing dependencies):**

- expo-router (routing)
- react-native (UI)
- react-native-safe-area-context
- react-native-gesture-handler
- @react-navigation/drawer

---

## 🔒 Authentication Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Root Layout (_layout.tsx)                 │
│              Wraps with AuthProvider & RideSearch            │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │  AuthContext Check  │
                    │ isAuthenticated?    │
                    └────────┬────────────┘
                             │
              ┌──────────────┴──────────────┐
              ↓                             ↓
        ┌──────────────┐           ┌──────────────┐
        │  (auth)      │           │  (drawer)    │
        │  Stack       │           │  Stack       │
        │              │           │              │
        │ - signup     │           │ - home       │
        │ - signin     │           │ - account    │
        │ - verify     │           │ - etc...     │
        └──────────────┘           └──────────────┘
```

---

## 🛠️ API Client Features

**apiClient.ts** provides:

- ✅ Automatic token attachment to headers
- ✅ Timeout handling (30 seconds default)
- ✅ Request/response error handling
- ✅ JSON request/response formatting
- ✅ Network error detection
- ✅ HTTP methods: GET, POST, PUT, DELETE

**Usage Example:**

```typescript
const response = await apiClient.post("/login", {
  email: "user@example.com",
  password: "password123",
});

if (response.success) {
  // Handle success
} else {
  // Handle errors
  console.log(response.errors); // Validation errors from backend
  console.log(response.message); // Error message
}
```

---

## 🔐 Storage Service Features

**storageService.ts** handles:

- ✅ Token save/retrieve
- ✅ User data save/retrieve
- ✅ Authentication check
- ✅ Secure device storage (AsyncStorage)
- ✅ Clear on logout

**Available Methods:**

```typescript
await StorageService.saveToken(token);
await StorageService.getToken();
await StorageService.saveUser(user);
await StorageService.getUser();
await StorageService.isAuthenticated();
await StorageService.clearAuth();
```

---

## ⚙️ Auth Context & Hooks

**AuthContext.tsx** provides:

- ✅ Global `user`, `token`, `isAuthenticated` state
- ✅ `isLoading` state for API calls
- ✅ Error state management
- ✅ Auto-restore session on app startup
- ✅ `login()`, `register()`, `logout()` functions

**Usage in Components:**

```typescript
import { useAuth } from '../hooks/useAuth';

export function MyComponent() {
  const { user, isLoading, error, logout } = useAuth();

  return (
    // Component JSX
  );
}
```

---

## 📱 Screen Implementation Details

### Signup Screen (`(auth)/signup.tsx`)

- ✅ All form fields connected to state
- ✅ Real-time validation with error display
- ✅ Form validation before submission
- ✅ Loading state during registration
- ✅ Error messages from backend
- ✅ Navigation to home on success
- ✅ Link to signin screen

### Signin Screen (`(auth)/signin.tsx`)

- ✅ Email and password fields
- ✅ Form validation
- ✅ Loading spinner during login
- ✅ Error display
- ✅ Navigation to home on success
- ✅ Link to signup screen
- ✅ Forgot password button (UI only)

---

## 🎯 Testing the Integration

### 1. **Test Signup**

```
1. Go to Signup screen
2. Fill in all fields
3. Click "Sign Up"
4. Should see loading spinner
5. On success → Navigate to Home
6. Check browser/network tab → POST /register called
```

### 2. **Test Login**

```
1. Go to Signin screen
2. Enter the email and password you registered with
3. Click "Sign In"
4. Should see loading spinner
5. On success → Navigate to Home
```

### 3. **Test Token Persistence**

```
1. Login successfully
2. Force close the app
3. Reopen the app
4. Should skip auth screens and go straight to Home
5. Logout from drawer
6. Reopen → Should go to signin screen
```

### 4. **Test Logout**

```
1. Login successfully
2. Open drawer
3. Tap "Logout"
4. Confirm logout
5. Should redirect to signin
6. Check AsyncStorage is cleared
```

---

## 🐛 Troubleshooting

### **"Network error" when logging in**

- Check backend is running at `http://192.168.1.200:8000`
- Verify network connectivity
- Check firewall isn't blocking port 8000
- Backend should be accessible from your device

### **"Token not included in requests"**

- Token is automatically included by apiClient
- Check if token was saved (use React DevTools to inspect storage)
- Check if backend is validating `Authorization` header

### **"User stays logged in after logout"**

- Ensure `StorageService.clearAuth()` is called
- Check AsyncStorage is working properly
- Restart the development server

### **"Backend returns 401 Unauthorized"**

- Token may have expired (set longer expiration in backend if needed)
- Check token format: should be `Bearer <token>`
- Verify token is being saved correctly

### **Cannot read property 'user' errors**

- Ensure AuthProvider wraps the entire app in `_layout.tsx`
- Use `useAuth` hook only inside components wrapped by AuthProvider
- Check useAuth hook is imported from correct path

---

## 📝 Environment Configuration

To change backend URL:

**File:** `app/services/api/config.ts`

```typescript
export const API_CONFIG = {
  BASE_URL: "http://192.168.1.200:8000/api", // ← Change this
  TIMEOUT: 30000,
  HEADERS: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};
```

---

## 🔄 Next Steps

### Future Enhancements:

1. **OTP Verification** - Integrate the verify-number screen with OTP endpoint
2. **Forgot Password** - Implement password reset flow
3. **Profile Picture Upload** - Add image upload to `/user/profile-picture`
4. **Complete Driver Profile** - For drivers, add `/driver/complete-profile` flow
5. **Biometric Login** - Add fingerprint/face ID authentication
6. **Refresh Tokens** - Implement token refresh mechanism
7. **2FA** - Add two-factor authentication

---

## ✨ Features Included

✅ Fetch-based API client (no external HTTP library needed)  
✅ JWT token management  
✅ Automatic token persistence  
✅ Global auth state management  
✅ Form validation  
✅ Error handling & display  
✅ Loading states  
✅ Automatic session restoration  
✅ Secure logout  
✅ User data caching

---

## 📞 Backend API Compatibility

**Backend Framework:** Laravel 11+  
**Auth Method:** Laravel Sanctum (Token-based)  
**Token Format:** Bearer token  
**Response Format:** JSON with `data`, `message`, `errors` keys

Your backend is fully compatible with this frontend implementation.

---

**Last Updated:** May 20, 2026  
**Frontend:** React Native (Expo)  
**Backend:** Laravel with Sanctum  
**Connection:** Fetch API with automatic token management
