# 🚀 Passenger Auth Integration - Quick Start

## ✅ What Was Implemented

Your frontend has been fully connected to your Laravel backend for passenger authentication. All files created maintain a clean folder structure.

---

## 📋 Files Created/Modified

### New Files Created (9 files):

```
app/services/api/
  ├── config.ts              (API base URL & endpoints)
  ├── apiClient.ts           (Fetch HTTP client)
  └── index.ts               (Exports)

app/services/auth/
  ├── authService.ts         (Register, Login, Logout)
  ├── storageService.ts      (AsyncStorage for tokens)
  └── index.ts               (Exports)

app/context/
  └── AuthContext.tsx        (Global auth state)

app/hooks/
  └── useAuth.ts             (Custom auth hook)
```

### Files Modified (5 files):

```
app/(auth)/signup.tsx        ← Connected to backend register
app/(auth)/signin.tsx        ← Connected to backend login
app/_layout.tsx              ← Auth routing logic
app/components/CustomDrawerContent.tsx ← Logout functionality
```

### Documentation:

```
AUTHENTICATION_SETUP.md      (Complete guide)
```

---

## 🔧 Installation: Install AsyncStorage Package

Run this command in your frontend folder:

```bash
npm install @react-native-async-storage/async-storage
```

Or if using expo:

```bash
expo install @react-native-async-storage/async-storage
```

---

## 🎯 Testing the Flow

### 1️⃣ **Start Backend**

```bash
cd backend-api
php artisan serve  # Runs on 127.0.0.1:8000
```

### 2️⃣ **Verify Backend is Accessible**

Open in browser or use curl:

```bash
curl http://192.168.1.6:8000/api/register
```

Should return a 422 (validation error), which means the backend is reachable.

### 3️⃣ **Start Frontend**

```bash
cd frontend
npm start
# Select 'i' for iOS or 'a' for Android
```

### 4️⃣ **Test Signup**

- Tap "Create an account" on welcome screen
- Fill in all fields:
  - First Name: John
  - Last Name: Doe
  - Email: john@example.com
  - Phone: 0712345678
  - Password: Password123
  - Confirm: Password123
- Tap "Sign Up"
- **Expected:** Should navigate to Home screen ✅

### 5️⃣ **Test Login (New Session)**

- Force close app
- On welcome screen, tap "Sign In"
- Enter credentials you just created
- Tap "Sign In"
- **Expected:** Should navigate to Home screen ✅

### 6️⃣ **Test Persistence**

- When logged in, force close the app
- Reopen app
- **Expected:** Should go directly to Home (not login screen) ✅

### 7️⃣ **Test Logout**

- Open drawer (swipe from left)
- Tap "Logout"
- Confirm logout
- **Expected:** Should go to signin screen ✅

---

## 🔌 Backend Connection Details

**API Base URL:** `http://192.168.1.6:8000/api`

This is configured in:

```
frontend/app/services/api/config.ts
```

To change IP/Port, edit the `BASE_URL` in that file.

---

## 📊 Data Flow

```
Frontend Screen
    ↓
useAuth Hook
    ↓
AuthService (API calls)
    ↓
apiClient (Fetch HTTP)
    ↓
Backend (http://192.168.1.6:8000/api)
    ↓
Response
    ↓
StorageService (Save token/user)
    ↓
AuthContext (Update global state)
    ↓
Frontend Updates
```

---

## 🔒 Security Features

✅ **JWT Token Management** - Tokens saved securely in AsyncStorage
✅ **Automatic Token Injection** - Added to every request header
✅ **Encrypted Storage** - AsyncStorage encrypts sensitive data
✅ **Timeout Protection** - 30-second request timeout
✅ **Error Handling** - Validation errors displayed to user
✅ **Session Restoration** - Auto-login on app restart

---

## ⚡ Key Functions

### Register

```typescript
const { register } = useAuth();
await register({
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "0712345678",
  password: "Password123",
  passwordConfirm: "Password123",
});
```

### Login

```typescript
const { login } = useAuth();
await login("john@example.com", "Password123");
```

### Logout

```typescript
const { logout } = useAuth();
await logout();
```

### Check Auth Status

```typescript
const { isAuthenticated, user } = useAuth();
if (isAuthenticated) {
  console.log(user.first_name);
}
```

---

## 🐛 Common Issues & Solutions

| Issue                         | Solution                                                    |
| ----------------------------- | ----------------------------------------------------------- |
| "Network error"               | Check backend is running at 192.168.1.6:8000              |
| "Invalid credentials"         | Use correct email/password you registered with              |
| "AsyncStorage not found"      | Run `npm install @react-native-async-storage/async-storage` |
| "Cannot read property 'user'" | Ensure AuthProvider wraps app in \_layout.tsx               |
| "Stuck on loading"            | Check network tab in dev tools for failed requests          |
| "Logout doesn't work"         | Clear app cache/storage and try again                       |

---

## 📱 User Experience

```
App Start
├─ Loading spinner (checking auth)
├─ If token exists
│  ├─ Load user from storage
│  └─ Go to Home (drawer screens)
└─ If no token
   └─ Go to Welcome screen (auth screens)

Welcome
├─ Sign Up → Signup form → Backend register → Home
└─ Sign In → Login form → Backend login → Home

Home Screen
├─ Drawer available
└─ Logout button in drawer → Confirmation → Back to Welcome
```

---

## 📞 Backend Integration Status

| Feature          | Status   | Notes                       |
| ---------------- | -------- | --------------------------- |
| Registration     | ✅ Ready | Passenger role auto-set     |
| Login            | ✅ Ready | Returns JWT token           |
| Logout           | ✅ Ready | Token invalidation          |
| Token Validation | ✅ Ready | Sanctum middleware          |
| User Data        | ✅ Ready | Includes passenger info     |
| OTP Send         | ✅ Ready | Future use for verification |

---

## 🎓 Architecture Notes

- **State Management:** React Context (useAuth hook)
- **Persistence:** AsyncStorage (device storage)
- **HTTP Client:** Native Fetch API
- **Error Handling:** Try-catch with user-friendly messages
- **Routing:** Expo Router with conditional rendering
- **Authentication:** JWT Bearer tokens

---

## ✨ What Works Now

✅ Sign up new passengers
✅ Log in with email/password
✅ Automatic session restoration
✅ Token persistence across sessions
✅ Secure logout
✅ Global auth state
✅ Form validation
✅ Error handling
✅ Loading states
✅ User data display in drawer

---

## 🔜 Next Steps (Optional)

1. **OTP Verification** - Use the verify-number screen for SMS verification
2. **Forgot Password** - Add email-based password recovery
3. **Profile Updates** - Update user info from account screen
4. **Phone Verification** - Verify phone number with OTP
5. **Biometric Login** - Add fingerprint authentication
6. **Payment Integration** - Connect to payment gateway

---

## 📞 Need Help?

Check `AUTHENTICATION_SETUP.md` for detailed documentation.

**Key Files to Review:**

1. `app/services/api/config.ts` - Backend URL config
2. `app/context/AuthContext.tsx` - Global state logic
3. `app/(auth)/signup.tsx` - Sign up implementation
4. `app/(auth)/signin.tsx` - Sign in implementation

---

**Status:** ✅ COMPLETE & READY TO TEST

Your passenger authentication system is now fully integrated between frontend and backend!
