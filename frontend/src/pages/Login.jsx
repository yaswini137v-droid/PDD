import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, Mail, User, Phone, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    mpin: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, register } = useAuth();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await login(formData.email, formData.password);
        if (!res.success) {
          setError(res.message || 'Login failed. Please check credentials.');
        }
      } else {
        // Validation checks
        if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.mpin) {
          setError('All fields are required.');
          setLoading(false);
          return;
        }
        if (formData.mpin.length !== 4 || isNaN(formData.mpin)) {
          setError('Security MPIN must be exactly 4 digits.');
          setLoading(false);
          return;
        }

        const res = await register(
          formData.name,
          formData.email,
          formData.phone,
          formData.password,
          formData.mpin
        );
        if (!res.success) {
          setError(res.message || 'Registration failed.');
        }
      }
    } catch (err) {
      setError('A network or server error occurred. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#f4f7fa] p-4 font-sans">
      {/* Decorative colored glow fields */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-200/40 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-pink-100/40 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel glass-panel-glow p-8 relative z-10">
        
        {/* Header Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600/10 border border-blue-600/20 rounded-2xl mb-3">
            <Shield className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none">TravelSafetySOS</h1>
          <p className="text-xs text-slate-500 mt-2 font-medium">Real-time Emergency Response & Trip Monitoring</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 mb-6">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${
              isLogin ? 'bg-white text-blue-600 shadow-sm border border-slate-200/30' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${
              !isLogin ? 'bg-white text-blue-600 shadow-sm border border-slate-200/30' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200/60 text-red-600 rounded-xl text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                    <User className="w-4.5 h-4.5 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="w-full glass-input pl-10 pr-4 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                    <Phone className="w-4.5 h-4.5 text-slate-400" />
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+91 90000 00000"
                    className="w-full glass-input pl-10 pr-4 text-sm"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                <Mail className="w-4.5 h-4.5 text-slate-400" />
              </span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                className="w-full glass-input pl-10 pr-4 text-sm"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                <Key className="w-4.5 h-4.5 text-slate-400" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter password"
                className="w-full glass-input pl-10 pr-10 text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            /* MPIN */
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">4-Digit Security MPIN</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                  <Shield className="w-4.5 h-4.5 text-slate-400" />
                </span>
                <input
                  type="password"
                  name="mpin"
                  value={formData.mpin}
                  onChange={handleInputChange}
                  placeholder="1234"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  className="w-full glass-input pl-10 pr-4 text-center tracking-[0.6em] font-mono text-base font-bold"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Required to check in and verify your safety on countdown alerts.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/15 hover:shadow-blue-600/25 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
