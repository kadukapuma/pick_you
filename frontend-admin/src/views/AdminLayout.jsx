import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAdmin } from '../context/AdminContext'
import echo from '../echo'
import {
    clearAdminNotifications,
    fetchAdminNotifications,
    markAdminNotificationsRead,
} from '../services/adminApi'
import useDrivers from '../hooks/useDrivers'
import useVehicles from '../hooks/useVehicles'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'

import Swal from 'sweetalert2'
import './AdminLayout.css'

const AdminLayout = () => {
    const { admin, signOut, token } = useAdmin()
    const driversState = useDrivers(token)
    const vehiclesState = useVehicles(token)
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [notifications, setNotifications] = useState([])

    const formatNotification = useCallback((payload) => {
        const createdAtValue = payload?.created_at ?? payload?.createdAt
        const createdAt = createdAtValue ? new Date(createdAtValue) : new Date()
        const id = payload?.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

        return {
            id,
            type: payload?.type || 'system',
            title: payload?.title || 'Notification',
            message: payload?.message || '',
            data: payload?.data || {},
            createdAt: createdAt.toISOString(),
            timeLabel: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
            await markAdminNotificationsRead(token)
            setNotifications((prev) =>
                prev.map((item) => (item.read ? item : { ...item, read: true })),
            )
        } catch (error) {
            console.error('Failed to mark notifications as read:', error)
        }
    }, [token])

    const clearNotifications = useCallback(async () => {
        if (!token) return

        try {
            await clearAdminNotifications(token)
            setNotifications([])
        } catch (error) {
            console.error('Failed to clear notifications:', error)
        }
    }, [token])

    const addNotification = useCallback((payload) => {
        const nextNotification = formatNotification(payload)

        setNotifications((prev) => {
            if (prev.some((item) => item.id === nextNotification.id)) {
                return prev
            }
            return [nextNotification, ...prev].slice(0, 20)
        })
    }, [formatNotification])

    useEffect(() => {
        if (!token) {
            setNotifications([])
            return
        }

        const loadNotifications = async () => {
            try {
                const data = await fetchAdminNotifications(token)
                const next = (data.notifications || []).map(formatNotification)
                setNotifications(next)
            } catch (error) {
                console.error('Failed to load notifications:', error)
            }
        }

        loadNotifications()
    }, [token, formatNotification])

    useEffect(() => {
        if (!token) {
            setNotifications([])
            return
        }

        const channel = echo.channel('admin.notifications')
        const handleNotification = (payload) => addNotification(payload)

        channel.listen('AdminNotification', handleNotification)

        return () => {
            channel.stopListening('AdminNotification', handleNotification)
            echo.leave('admin.notifications')
        }
    }, [token, addNotification])

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
                />

                <main className="content">
                    <Outlet context={{ driversState, vehiclesState }} />
                </main>
            </div>
        </div>
    )
}

export default AdminLayout
