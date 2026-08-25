import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAdmin } from '../context/AdminContext'

// Landing Views
import LandingLayout from '../views/Landing/LandingLayout'
import AboutUs from '../views/Landing/AboutUs'
import ContactUs from '../views/Landing/ContactUs'
import ForDrivers from '../views/Landing/ForDrivers'
import GetApp from '../views/Landing/GetApp/GetApp'
import PrivacyPolicy from '../views/Landing/PrivacyPolicy/PrivacyPolicy'
import TermsAndConditions from '../views/Landing/TermsAndConditions/TermsAndConditions'
import {
    PassengerPayment,
    PassengerPrivacy,
    PassengerRefund,
    PassengerTerms,
} from '../views/Landing/LegalDocuments/PassengerLegalPages'

// Admin Views
import AdminLayout from '../views/AdminLayout'
import Dashboard from '../views/Dashboard'
import DriverDetail from '../views/DriverDetail'
import Drivers from '../views/Drivers'
import Login from '../views/Login'
import VehicleDetail from '../views/VehicleDetail'
import Vehicles from '../views/Vehicles'
import Passengers from '../views/Passengers'
import PassengerDetail from '../views/PassengerDetail'
import Settings from '../views/Settings'
import FareConfigs from '../views/FareConfigs'
import Finance from '../views/Finance'
import CreditRefunds from '../views/CreditRefunds'
import Promotions from '../views/Promotions'
import Permissions from '../views/Permissions'
import Operators from '../views/Operators'
import VehicleTypes from '../views/VehicleTypes'
import LandingPage from '../views/Landing/LandingPage/LandingPage'
import Broadcasts from '../views/Broadcasts'

import SuperDashboard from '../views/SuperDashboard'
import Admins from '../views/Admins'
import Reports from '../views/Reports'
import ReportDetail from '../views/Reports/ReportDetail'

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
    const canManageCredits =
        admin?.role === 'super_admin' ||
        admin?.permissions?.includes('manage_passenger_credits')
    const canViewReports =
        admin?.role === 'super_admin' ||
        admin?.permissions?.includes('manage_reports')
    const canManagePromotions =
        admin?.role === 'super_admin' ||
        admin?.permissions?.includes('manage_promotions')

    return (
        <Routes>
            {/* Public Landing Area */}
            <Route path="/" element={<LandingLayout />}>
                <Route index element={<LandingPage />} />
                <Route path="for-drivers" element={<ForDrivers />} />
                <Route path="get-app" element={<GetApp />} />
                {/* <Route index element={<Home />} /> */}
                <Route path="about" element={<AboutUs />} />
                <Route path="contact" element={<ContactUs />} />
                <Route path="privacy-policy" element={<PrivacyPolicy />} />
                <Route path="terms-and-conditions" element={<TermsAndConditions />} />
                <Route path="passenger/terms-and-conditions" element={<PassengerTerms />} />
                <Route path="passenger/privacy-policy" element={<PassengerPrivacy />} />
                <Route path="passenger/payment-policy" element={<PassengerPayment />} />
                <Route path="passenger/cancellation-refund-policy" element={<PassengerRefund />} />
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
                    <Route path="customers/:passengerId" element={<PassengerDetail />} />
                    <Route path="fare-configs" element={<FareConfigs />} />
                    <Route path="finance" element={<Finance />} />
                    <Route
                        path="credit-refunds"
                        element={canManageCredits ? <CreditRefunds /> : <Navigate to="/admin-portal" replace />}
                    />
                    <Route
                        path="promotions"
                        element={canManagePromotions ? <Promotions /> : <Navigate to="/admin-portal" replace />}
                    />
                    <Route
                        path="reports"
                        element={canViewReports ? <Reports /> : <Navigate to="/admin-portal" replace />}
                    />
                    <Route
                        path="reports/:reportType"
                        element={canViewReports ? <ReportDetail /> : <Navigate to="/admin-portal" replace />}
                    />
                    <Route
                        path="vehicle-types"
                        element={canManageVehicleTypes ? <VehicleTypes /> : <Navigate to="/admin-portal" replace />}
                    />
                    <Route path="settings" element={<Settings />} />
                    <Route path="broadcasts" element={<Broadcasts />} />
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
