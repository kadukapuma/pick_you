import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import echo from '../../echo'
import {
    clearAdminNotifications,
    fetchAdminNotifications,
    markAdminNotificationsRead,
    clearSuperAdminNotifications,
    fetchSuperAdminNotifications,
    markSuperAdminNotificationsRead,
    fetchMaintenanceMode,
} from '../../services/adminApi'
import useDrivers from '../../hooks/useDrivers'
import useVehicles from '../../hooks/useVehicles'
import Sidebar from '../../components/Sidebar/Sidebar'
import TopBar from '../../components/TopBar/TopBar'

import Swal from 'sweetalert2'
import './AdminLayout.css'

const AdminLayout = () => {
    const { admin, signOut, token } = useAdmin()
    const driversState = useDrivers(token)
    const vehiclesState = useVehicles(token)
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [maintenanceMode, setMaintenanceMode] = useState(false)

    const isSuperAdmin = admin?.role === 'super_admin'

    const formatNotification = useCallback((payload) => {
        // Handle both API response format and event payload format
        const createdAtValue = payload?.created_at ?? payload?.createdAt
        const createdAt = createdAtValue ? new Date(createdAtValue) : new Date()
        const id = payload?.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

        // Parse time with fallback
        let timeLabel = ''
        try {
            timeLabel = createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        } catch {
            timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }

        return {
            id,
            type: payload?.type || 'system',
            title: payload?.title || 'Notification',
            message: payload?.message || '',
            data: payload?.data || {},
            createdAt: createdAt.toISOString(),
            timeLabel,
            read: Boolean(payload?.is_read ?? payload?.read),
        }
    }, [])

    const unreadCount = useMemo(
        () => notifications.filter((item) => !item.read).length,
        [notifications],
    )

    const markAllRead = useCallback(async () => {
        if (!token) return

        try {
            if (isSuperAdmin) {
                await markSuperAdminNotificationsRead(token)
            } else {
                await markAdminNotificationsRead(token)
            }
            setNotifications((prev) =>
                prev.map((item) => (item.read ? item : { ...item, read: true })),
            )
        } catch (error) {
            console.error('Failed to mark notifications as read:', error)
        }
    }, [token, isSuperAdmin])

    const clearNotifications = useCallback(async () => {
        if (!token) return

        try {
            if (isSuperAdmin) {
                await clearSuperAdminNotifications(token)
            } else {
                await clearAdminNotifications(token)
            }
            setNotifications([])
        } catch (error) {
            console.error('Failed to clear notifications:', error)
        }
    }, [token, isSuperAdmin])

    const addNotification = useCallback((payload) => {
        const nextNotification = formatNotification(payload)

        setNotifications((prev) => {
            if (prev.some((item) => item.id === nextNotification.id)) {
                return prev
            }
            return [nextNotification, ...prev].slice(0, 20)
        })
    }, [formatNotification])

    const loadMaintenanceMode = useCallback(async () => {
        try {
            const result = await fetchMaintenanceMode()
            setMaintenanceMode(Boolean(result.maintenanceMode))
        } catch (error) {
            console.error('Failed to load maintenance mode status:', error)
        }
    }, [])

    useEffect(() => {
        if (!token) {
            setNotifications([])
            return
        }

        const loadNotifications = async () => {
            try {
                const data = isSuperAdmin
                    ? await fetchSuperAdminNotifications(token)
                    : await fetchAdminNotifications(token)
                const next = (data.notifications || []).map(formatNotification)
                setNotifications(next)
            } catch (error) {
                console.error('Failed to load notifications:', error)
            }
        }

        loadNotifications()
    }, [token, formatNotification, isSuperAdmin])

    useEffect(() => {
        loadMaintenanceMode()
    }, [loadMaintenanceMode])

    useEffect(() => {
        const handleMaintenanceUpdate = (event) => {
            const nextValue = event?.detail?.key === 'maintenance_mode'
                ? Boolean(event.detail.value)
                : null

            if (nextValue !== null) {
                setMaintenanceMode(nextValue)
                return
            }

            loadMaintenanceMode()
        }

        window.addEventListener('maintenance-mode-updated', handleMaintenanceUpdate)
        window.addEventListener('focus', loadMaintenanceMode)

        return () => {
            window.removeEventListener('maintenance-mode-updated', handleMaintenanceUpdate)
            window.removeEventListener('focus', loadMaintenanceMode)
        }
    }, [loadMaintenanceMode])

    useEffect(() => {
        if (!token) {
            setNotifications([])
            return
        }

        const channelName = isSuperAdmin ? 'superadmin.notifications' : 'admin.notifications'
        const eventName = isSuperAdmin ? 'SuperAdminNotification' : 'AdminNotification'

        // Ensure we're properly listening to the channel
        const channel = echo.channel(channelName)

        const handleNotification = (payload) => {
            console.log(`[${eventName}] Received notification:`, payload)
            addNotification(payload)
        }

        // Subscribe to the event
        channel.listen(eventName, handleNotification)

        return () => {
            // Properly unsubscribe
            channel.stopListening(eventName)
            echo.leaveChannel(channelName)
        }
    }, [token, addNotification, isSuperAdmin])

    const handleSignOut = () => {
        Swal.fire({
            title: 'Are you sure?',
            text: "You will be logged out of the admin panel.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#08d612',
            cancelButtonColor: '#1a1f2b',
            confirmButtonText: 'Yes, logout',
            background: '#ffffff',
            color: '#1a1f2b'
        }).then((result) => {
            if (result.isConfirmed) {
                signOut()
            }
        })
    }

    return (
        <div className={`app-shell ${isSidebarCollapsed ? 'collapsed' : ''}`}>
            <Sidebar
                admin={admin}
                isCollapsed={isSidebarCollapsed}
            />

            <div className="main-container">
                <TopBar
                    admin={admin}
                    onToggleSidebar={() => setSidebarCollapsed(!isSidebarCollapsed)}
                    isSidebarCollapsed={isSidebarCollapsed}
                    onSignOut={handleSignOut}
                    notifications={notifications}
                    unreadCount={unreadCount}
                    onMarkAllRead={markAllRead}
                    onClearNotifications={clearNotifications}
                    maintenanceMode={maintenanceMode}
                />

                <main className="content">
                    <Outlet context={{ driversState, vehiclesState }} />
                </main>
            </div>
        </div>
    )
}

export default AdminLayout
