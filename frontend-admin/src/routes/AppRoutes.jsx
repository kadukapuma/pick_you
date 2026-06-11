import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAdmin } from '../context/AdminContext'

// Landing Views
import LandingLayout from '../views/Landing/LandingLayout'
import Home from '../views/Landing/Home'
import AboutUs from '../views/Landing/AboutUs'
import ContactUs from '../views/Landing/ContactUs'

// Admin Views
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
import VehicleTypes from '../views/VehicleTypes'

import SuperDashboard from '../views/SuperDashboard'
import Admins from '../views/Admins'

const RequireAuth = () => {
    const { isAuthenticated } = useAdmin()
    const location = useLocation()

    if (!isAuthenticated) {
        return <Navigate to="/admin-portal/login" replace state={{ from: location }} />
    }

    return <AdminLayout />
}

const AppRoutes = () => {
    const { isAuthenticated, admin } = useAdmin()
    const canManagePermissions = admin?.role === 'super_admin'
    const canManageOperators =
        admin?.role === 'super_admin' ||
        admin?.permissions?.includes('create_operators') ||
        admin?.permissions?.includes('manage_operators')
    const canManageVehicleTypes =
        admin?.role === 'super_admin' ||
        admin?.permissions?.includes('manage_vehicle_types')

    return (
        <Routes>
            {/* Public Landing Area */}
            <Route path="/" element={<LandingLayout />}>
                <Route index element={<Home />} />
                <Route path="about" element={<AboutUs />} />
                <Route path="contact" element={<ContactUs />} />
            </Route>

            {/* Hidden Admin Portal */}
            <Route path="/admin-portal">
                <Route
                    path="login"
                    element={isAuthenticated ? <Navigate to="/admin-portal" replace /> : <Login />}
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
                    <Route
                        path="vehicle-types"
                        element={canManageVehicleTypes ? <VehicleTypes /> : <Navigate to="/admin-portal" replace />}
                    />
                    <Route path="settings" element={<Settings />} />
                    <Route
                        path="operators"
                        element={canManageOperators ? <Operators /> : <Navigate to="/admin-portal" replace />}
                    />
                    <Route
                        path="permissions"
                        element={canManagePermissions ? <Permissions /> : <Navigate to="/admin-portal" replace />}
                    />

                    {admin?.role === 'super_admin' && (
                        <Route path="admins" element={<Admins />} />
                    )}
                </Route>
            </Route>

            {/* Fallback to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default AppRoutes
