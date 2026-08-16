import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Shield } from 'lucide-react';

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
  const [rememberMe, setRememberMe] = useState(false);
  
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
    <div className="min-h-screen flex items-center justify-center bg-[#121212] text-white p-6 font-sans relative overflow-hidden select-none">
      {/* Background glow */}
      <div className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#FF6D6D]/5 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 z-10">
        {/* Title Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#FF6D6D] mb-1">
            <Shield className="w-6 h-6" />
            <span className="text-sm font-semibold tracking-wide uppercase">TravelSafetySOS</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </h1>
          <p className="text-sm text-zinc-400">
            {isLogin ? 'Welcome back! Login to continue.' : 'Create an account to stay safe.'}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              {/* Full Name */}
              <div className="space-y-1">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Full Name"
                  className="w-full px-4 py-4 bg-transparent border border-zinc-800 focus:border-[#FF6D6D] text-white text-base rounded-xl transition-all outline-none"
                  required
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Phone Number"
                  className="w-full px-4 py-4 bg-transparent border border-zinc-800 focus:border-[#FF6D6D] text-white text-base rounded-xl transition-all outline-none"
                  required
                />
              </div>
            </>
          )}

          {/* Email */}
          <div className="space-y-1">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Email"
              className="w-full px-4 py-4 bg-transparent border border-zinc-800 focus:border-[#FF6D6D] text-white text-base rounded-xl transition-all outline-none"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-1 relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Password"
              className="w-full px-4 py-4 bg-transparent border border-zinc-800 focus:border-[#FF6D6D] text-white text-base rounded-xl transition-all outline-none pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {!isLogin && (
            /* MPIN */
            <div className="space-y-1">
              <input
                type="password"
                name="mpin"
                value={formData.mpin}
                onChange={handleInputChange}
                placeholder="4-Digit Security MPIN"
                maxLength={4}
                pattern="[0-9]{4}"
                className="w-full px-4 py-4 bg-transparent border border-zinc-800 focus:border-[#FF6D6D] text-white text-base rounded-xl transition-all outline-none text-center tracking-[0.5em] font-mono"
                required
              />
            </div>
          )}

          {/* Remember Me and Forgot Password Row */}
          <div className="flex items-center justify-between text-sm pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-800 bg-transparent text-[#FF6D6D] focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-zinc-400">Remember Me</span>
            </label>
            <button
              type="button"
              className="text-[#FF6D6D] hover:text-[#ff7e7e] transition-all"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-4 bg-[#FF6D6D] hover:bg-[#ff7e7e] disabled:bg-zinc-800 text-white text-lg font-medium rounded-full shadow-md shadow-[#FF6D6D]/10 hover:shadow-[#FF6D6D]/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : isLogin ? (
              'Login'
            ) : (
              'Register'
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center text-sm text-zinc-400 pt-2">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-[#FF6D6D] hover:text-[#ff7e7e] font-semibold ml-1 transition-all"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

