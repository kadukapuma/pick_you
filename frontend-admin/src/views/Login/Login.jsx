import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import './Login.css'

const Login = () => {
    const { signIn, verifyAdmin2FA } = useAdmin()
    const navigate = useNavigate()
    const [form, setForm] = useState({ email: '', password: '', code: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [require2FA, setRequire2FA] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (require2FA) {
                await verifyAdmin2FA({ email: form.email, code: form.code })
                navigate('/')
            } else {
                const response = await signIn({ email: form.email, password: form.password })
                if (response.require_2fa) {
                    setRequire2FA(true)
                } else {
                    navigate('/')
                }
            }
        } catch (loginError) {
            setError(loginError.message)
        } finally {
            setLoading(false)
        }
    }

    if (require2FA) {
        return (
            <div className="login-page">
                <div className="login-left">
                    <div className="login-brand-overlay">
                        <div className="brand-icon">
                            <span className="material-icons">security</span>
                        </div>
                        <h1>PICK YOU</h1>
                    </div>
                </div>

                <div className="login-right">
                    <div className="login-card">
                        <div className="login-form-logo">
                            <span className="material-icons">vibration</span>
                        </div>

                        <h3>SECURITY</h3>
                        <p className="subtitle">Enter the 4-digit code sent to your email</p>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <div className="input-wrapper">
                                    <span className="material-icons">key</span>
                                    <input
                                        type="text"
                                        placeholder="ENTER CODE"
                                        required
                                        autoFocus
                                        maxLength={4}
                                        value={form.code}
                                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                                        style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px' }}
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="form-error" style={{ color: '#fa5252', marginBottom: 20, fontSize: 13, fontWeight: 600 }}>
                                    {error}
                                </p>
                            )}

                            <button type="submit" className="btn-signin" disabled={loading}>
                                {loading ? 'VERIFYING...' : 'CONFIRM ACCESS'}
                            </button>

                            <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: '#868e96', fontSize: '12px', marginTop: '16px', cursor: 'pointer', fontWeight: 600, width: '100%' }}
                                onClick={() => {
                                    setRequire2FA(false)
                                    setForm({ ...form, code: '' })
                                    setError('')
                                }}
                            >
                                BACK TO LOGIN
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="login-page">
            <div className="login-left">
                <div className="login-brand-overlay">
                    <div className="brand-icon">
                        <span className="material-icons">layers</span>
                    </div>
                    <h1>PICK YOU</h1>
                </div>
            </div>

            <div className="login-right">
                <div className="login-card">
                    <div className="login-form-logo">
                        <span className="material-icons">account_circle</span>
                    </div>

                    <h3>LOGIN</h3>
                    <p className="subtitle">welcome to the website</p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <div className="input-wrapper">
                                <span className="material-icons">email</span>
                                <input
                                    type="email"
                                    placeholder="EMAIL ADDRESS"
                                    required
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="input-wrapper">
                                <span className="material-icons">lock</span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="PASSWORD"
                                    required
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                />
                                <span
                                    className="material-icons toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </div>
                        </div>

                        <div className="form-options">
                            <label className="remember-me">
                                <input type="checkbox" style={{ marginRight: 8 }} />
                                Remember
                            </label>
                            <a href="#" className="forgot-password">Forget Password ?</a>
                        </div>

                        {error && (
                            <p className="form-error" style={{ color: '#fa5252', marginBottom: 20, fontSize: 13, fontWeight: 600 }}>
                                {error}
                            </p>
                        )}

                        <button type="submit" className="btn-signin" disabled={loading}>
                            {loading ? 'WAIT...' : 'LOGIN'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Login

