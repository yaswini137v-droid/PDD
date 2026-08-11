import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ShieldAlert, Navigation, Home, Users, ArrowRight, CheckCircle, Smartphone, Map, Bell } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-900 flex flex-col font-sans selection:bg-blue-500 selection:text-white overflow-x-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/40 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-pink-100/40 blur-[100px] pointer-events-none"></div>

      {/* Navigation Header */}
      <header className="w-full py-4 px-6 md:px-12 flex justify-between items-center bg-white/60 backdrop-blur border-b border-slate-200/80 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 border border-blue-600/20 rounded-xl">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">TravelSafetySOS</span>
            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Guard System</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="px-5 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100/80 rounded-xl transition-all"
          >
            Sign In
          </Link>
          <Link
            to="/login"
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 border border-blue-600/20 rounded-full text-blue-700 text-xs font-extrabold uppercase tracking-wider">
            <CheckCircle className="w-3.5 h-3.5" /> 100% Free Open-Source Mapping
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Your Smart Real-Time <br />
            <span className="text-blue-600">Safety Guard</span> On The Go
          </h1>
          <p className="text-slate-600 text-base md:text-lg leading-relaxed max-w-xl">
            Protect yourself and your loved ones while traveling. A unified tracking platform that monitors your route, warns on boundary deviation, and alerts emergency guardians if safety timelines expire.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link
              to="/login"
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              Access Web Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#mobile-app"
              className="px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Smartphone className="w-4 h-4" /> Download Mobile App
            </a>
          </div>
        </div>

        {/* Hero Interactive Mockup */}
        <div className="relative flex justify-center items-center">
          {/* Dashboard Glass Mock Card */}
          <div className="w-full max-w-md bg-white/80 border border-slate-200/80 rounded-3xl p-6 shadow-2xl shadow-slate-900/5 relative z-10">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-600" />
                <span className="font-extrabold text-slate-800 text-sm">Trip Monitoring Simulator</span>
              </div>
              <span className="inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-radar-emerald"></span>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Destination</p>
                <p className="font-extrabold text-sm text-slate-800 mt-0.5">Bazar Street, Chittoor</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Travel Mode</p>
                  <p className="font-bold text-xs text-slate-700 mt-0.5">Ola Cab</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vehicle No.</p>
                  <p className="font-mono font-bold text-xs text-slate-700 mt-0.5">TN 09 AB 1234</p>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 border border-blue-100/50 rounded-xl flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ETA Timeout Grace</p>
                  <p className="font-extrabold text-xs text-blue-600 mt-0.5">15:00 countdown</p>
                </div>
                <div className="px-3 py-1 bg-blue-100 border border-blue-200 text-blue-700 font-extrabold text-[10px] rounded-lg">
                  MPIN SECURED
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 flex gap-3">
              <div className="w-10 h-10 bg-red-100 border border-red-200 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800">Automatic SOS Ready</p>
                <p className="text-[10px] text-slate-500 leading-normal">Escalates to guardians if check-in MPIN is not submitted on timeout.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Workflows Section */}
      <section className="bg-white border-y border-slate-200 py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Platform Core Features</h2>
            <p className="text-slate-600 text-sm">
              Integrated real-time pipelines connecting maps, background location tracking, and emergency alarms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 - SOS */}
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 hover:shadow-lg transition-all hover:scale-[1.01]">
              <div className="w-12 h-12 bg-red-100 border border-red-200 text-red-600 rounded-2xl flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">🚨 SOS Dispatch</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Trigger emergency mode with a cancelable countdown on your mobile screen. Instantly broadcasts your current coordinates, sounds siren alarms on the web console, and shares location maps with your emergency contacts.
              </p>
            </div>

            {/* Card 2 - Journey */}
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 hover:shadow-lg transition-all hover:scale-[1.01]">
              <div className="w-12 h-12 bg-blue-100 border border-blue-200 text-blue-600 rounded-2xl flex items-center justify-center">
                <Navigation className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">🗺️ Journey Planner</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Choose destinations via address search or by double-tapping the interactive map, configure travel details (cabs, license plates), customize safe boundary zones, and monitor live coordinates until you reach your target.
              </p>
            </div>

            {/* Card 3 - Geofence */}
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 hover:shadow-lg transition-all hover:scale-[1.01]">
              <div className="w-12 h-12 bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Home className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">🛡️ Geofence Events</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Create static geofences around destinations like Home or Work. Kotlin-based foreground location services check geodesic distances to ensure you stay inside safe boundaries, triggering alerts if you depart unexpectedly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile app install guide */}
      <section id="mobile-app" className="max-w-6xl mx-auto px-6 py-20 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Hassle-Free Mobile Deployment
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            The Android application runs on native background service layers without demanding Google Cloud billing configurations. It uses local broadcast receivers to track geofence boundaries and coordinate emergency SOS tasks seamlessly.
          </p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-slate-700">Native Android foreground location tracking services.</p>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-slate-700">MPIN-secured timer checks for travel safety countdowns.</p>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-slate-700">Card-free OpenStreetMap loading out of the box.</p>
            </div>
          </div>
        </div>
        <div className="p-8 bg-white border border-slate-200/80 rounded-3xl space-y-6 shadow-xl shadow-slate-900/5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="font-extrabold text-slate-800 text-sm">24/7 Security Assurance</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Guardian Synchronization</p>
                <p className="text-[10px] text-slate-500 leading-normal">Add multiple emergency contacts who receive automatic SOS alerts when danger arises.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Offline Fail-Safe Channels</p>
                <p className="text-[10px] text-slate-500 leading-normal">Geofences run directly on hardware receivers, tracking safety metrics even when cellular networks fail.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 bg-pink-50 text-pink-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Privacy-First Data Principles</p>
                <p className="text-[10px] text-slate-500 leading-normal">Your telemetry metrics are completely private, checked and recorded only during active journeys.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto w-full py-8 border-t border-slate-200 bg-white text-center text-xs text-slate-500 relative z-10">
        <p>&copy; {new Date().getFullYear()} TravelSafetySOS Guard System. All rights reserved.</p>
        <p className="mt-1 text-[10px] text-slate-400">Powered by OpenStreetMap. No Google Cloud billing required.</p>
      </footer>
    </div>
  );
};

export default Landing;
