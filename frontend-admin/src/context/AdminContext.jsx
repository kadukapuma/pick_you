import { useEffect, createContext, useContext, useMemo, useState } from 'react'
import {
    clearToken,
    getStoredToken,
    loginAdmin,
    logoutAdmin,
    storeToken,
    fetchMe,
    verify2FA,
} from '../services/adminApi'

const AdminContext = createContext(null)

const AdminProvider = ({ children }) => {
    const [token, setToken] = useState(() => getStoredToken())
    const [admin, setAdmin] = useState(null)
    const permissions = admin?.permissions || []

    useEffect(() => {
        if (token && !admin) {
            fetchMe(token)
                .then(user => setAdmin(user))
                .catch(() => {
                    clearToken()
                    setToken(null)
                })
        }
    }, [token, admin])

    const signIn = async ({ phone, password }) => {
        const data = await loginAdmin({ phone, password })

        // If 2FA is required, we don't set admin yet
        if (data.require_2fa) {
            return data
        }

        if (data.user?.role !== 'admin' && data.user?.role !== 'super_admin') {
            throw new Error('Access denied. Only administrators can access this panel.')
        }

        storeToken(data.token)
        setToken(data.token)
        // Fetch fresh user record (includes appended permissions)
        try {
            const me = await fetchMe(data.token)
            setAdmin(me)
        } catch (err) {
            // fallback to provided user
            setAdmin(data.user)
        }
        return data
    }

    const verifyAdmin2FA = async ({ phone, code }) => {
        const data = await verify2FA({ phone, code })

        storeToken(data.token)
        setToken(data.token)
        try {
            const me = await fetchMe(data.token)
            setAdmin(me)
        } catch (err) {
            setAdmin(data.user)
        }
        return data
    }

    const signOut = async () => {
        try {
            if (token) {
                await logoutAdmin(token)
            }
        } catch {
            // ignore logout errors to still clear local state
        }

        clearToken()
        setToken(null)
        setAdmin(null)
    }

    const value = useMemo(
        () => ({
            token,
            admin,
            permissions,
            hasPermission: (permission) => Boolean(admin?.role === 'super_admin' || permissions.includes(permission)),
            signIn,
            signOut,
            verifyAdmin2FA,
            isAuthenticated: Boolean(token),
        }),
        [token, admin, permissions],
    )

    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

const useAdmin = () => {
    const context = useContext(AdminContext)
    if (!context) {
        throw new Error('useAdmin must be used within AdminProvider')
    }
    return context
}

export { AdminProvider, useAdmin }
