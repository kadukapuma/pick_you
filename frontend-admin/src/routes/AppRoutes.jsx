import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAdmin } from '../context/AdminContext'
import AdminLayout from '../views/AdminLayout'
import Dashboard from '../views/Dashboard'
import DriverDetail from '../views/DriverDetail'
import Drivers from '../views/Drivers'
import Login from '../views/Login'
import NotFound from '../views/NotFound'
import VehicleDetail from '../views/VehicleDetail'
import Vehicles from '../views/Vehicles'
import Passengers from '../views/Passengers'
import Settings from '../views/Settings'
import FareConfigs from '../views/FareConfigs'
import Permissions from '../views/Permissions'
import Operators from '../views/Operators'

import SuperDashboard from '../views/SuperDashboard'
import Admins from '../views/Admins'

const RequireAuth = () => {
    const { isAuthenticated } = useAdmin()
    const location = useLocation()

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />
    }

    return <AdminLayout />
}

const AppRoutes = () => {
    const { isAuthenticated, admin } = useAdmin()
    const canManagePermissions = admin?.role === 'super_admin'
    const canManageOperators = admin?.role === 'super_admin' || admin?.permissions?.includes('create_operators')

    return (
        <Routes>
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
            />
            <Route element={<RequireAuth />}>
                <Route
                    index
                    element={admin?.role === 'super_admin' ? <SuperDashboard /> : <Dashboard />}
                />
                <Route path="drivers" element={<Drivers />} />
                <Route path="drivers/:driverId" element={<DriverDetail />} />
                <Route path="vehicles" element={<Vehicles />} />
                <Route path="vehicles/:vehicleId" element={<VehicleDetail />} />
                <Route path="customers" element={<Passengers />} />
                <Route path="fare-configs" element={<FareConfigs />} />
                <Route path="settings" element={<Settings />} />
                <Route
                    path="operators"
                    element={canManageOperators ? <Operators /> : <Navigate to="/" replace />}
                />
                <Route
                    path="permissions"
                    element={canManagePermissions ? <Permissions /> : <Navigate to="/" replace />}
                />

                {admin?.role === 'super_admin' && (
                    <Route path="admins" element={<Admins />} />
                )}
            </Route>
            <Route path="*" element={<NotFound />} />
        </Routes>
    )
}

export default AppRoutes
