import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Crosshair, ArrowLeft, ShieldCheck, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const SosTrigger = () => {
  const { apiRequest } = useAuth();
  const [sosActive, setSosActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState({ lat: 13.2172, lng: 79.1003 }); // Default Chittoor
  const [gpsStatus, setGpsStatus] = useState('Default Coordinates');
  const [guardians, setGuardians] = useState([]);

  // Synthesize warning beacon sound locally on trigger
  const audioCtxRef = useRef(null);
  const soundIntervalRef = useRef(null);

  const startSiren = () => {
    if (audioCtxRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
      let toggle = false;

      soundIntervalRef.current = setInterval(() => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'suspended') return;
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(toggle ? 780 : 580, audioCtxRef.current.currentTime);
        osc.frequency.exponentialRampToValueAtTime(toggle ? 580 : 780, audioCtxRef.current.currentTime + 0.35);

        gain.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.38);

        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);

        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 0.4);
        toggle = !toggle;
      }, 400);
    } catch (err) {
      console.error(err);
    }
  };

  const stopSiren = () => {
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
      soundIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  // Fetch guardians list and check current active alert
  const syncStatus = async () => {
    try {
      // Load emergency contacts
      const contactsRes = await apiRequest('/api/contacts');
      if (contactsRes.success) {
        setGuardians(contactsRes.data);
      }

      // Check if user already has active alerts
      const activeRes = await apiRequest('/api/alerts/active');
      if (activeRes.success) {
        // Check if there is an alert corresponding to this logged-in user
        // For testing, we check if any active alert matches our profile
        const myAlert = activeRes.data.find(a => a.user?._id === activeRes.userId);
        if (myAlert) {
          setSosActive(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    syncStatus();
    detectLocation();
    return () => stopSiren();
  }, []);

  useEffect(() => {
    if (sosActive) {
      startSiren();
    } else {
      stopSiren();
    }
  }, [sosActive]);

  const detectLocation = () => {
    setGpsStatus('Detecting GPS location...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
          });
          setGpsStatus('High-Accuracy GPS Sync Active');
        },
        (error) => {
          console.warn('Geolocation access denied:', error.message);
          setGpsStatus('GPS Denied - Fallback Coordinates');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGpsStatus('Browser Geolocation Unsupported');
    }
  };

  const handleTriggerSOS = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await apiRequest('/api/alerts/trigger', {
        method: 'POST',
        body: JSON.stringify({
          latitude: coords.lat,
          longitude: coords.lng,
          triggerType: 'manual_sos',
        }),
      });

      if (res.success) {
        setSosActive(true);
      } else {
        setError(res.message || 'SOS dispatch failed.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveSOS = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await apiRequest('/api/alerts/resolve', {
        method: 'POST',
      });

      if (res.success) {
        setSosActive(false);
      } else {
        setError(res.message || 'Resolve failed.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">SOS Emergency Trigger</h1>
              <p className="text-sm text-slate-500 font-medium">Broadcast immediate danger signals to your guardians</p>
            </div>
          </div>
        </div>

        {/* Main Split Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left panel - Coordinates Details */}
          <div className="space-y-6 md:col-span-1">
            <div className="glass-panel p-6 space-y-4 shadow-sm border border-slate-200/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <MapPin className="w-5 h-5 text-blue-600" /> Location Context
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GPS Mode Status</label>
                  <p className="text-xs font-bold text-slate-700">{gpsStatus}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={coords.lat}
                      onChange={(e) => setCoords({ ...coords, lat: Number(e.target.value) })}
                      className="w-full glass-input text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={coords.lng}
                      onChange={(e) => setCoords({ ...coords, lng: Number(e.target.value) })}
                      className="w-full glass-input text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <button
                  onClick={detectLocation}
                  className="w-full mt-2 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Crosshair className="w-3.5 h-3.5" /> Re-Scan GPS
                </button>
              </div>
            </div>

            {/* Emergency contacts summary card */}
            <div className="glass-panel p-6 space-y-4 shadow-sm border border-slate-200/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Users className="w-5 h-5 text-slate-400" /> Guardians to Notify
              </h2>
              
              {guardians.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No emergency contacts configured.</p>
              ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {guardians.map((g) => (
                    <div key={g._id} className="p-3 bg-white border border-slate-200/60 rounded-xl shadow-sm flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{g.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{g.phone}</p>
                      </div>
                      <span className="text-[9px] bg-blue-50 border border-blue-100 text-blue-700 font-extrabold px-2 py-0.5 rounded-full uppercase">
                        {g.relationship || 'Guardian'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right panel - SOS button ripple */}
          <div className="md:col-span-2 glass-panel p-8 flex flex-col items-center justify-center min-h-[400px] shadow-sm border border-slate-200/50 relative overflow-hidden">
            
            {/* Visual warning border if active */}
            {sosActive && (
              <div className="absolute inset-0 border-4 border-red-500/30 hazard-alert pointer-events-none rounded-2xl"></div>
            )}

            {error && (
              <div className="mb-6 w-full max-w-sm p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold text-center">
                {error}
              </div>
            )}

            {/* Pulsing button container */}
            <div className="relative flex justify-center items-center h-64 w-64">
              {sosActive && (
                <>
                  <div className="absolute w-56 h-56 rounded-full bg-red-500/10 border border-red-500/20 animate-ping"></div>
                  <div className="absolute w-44 h-44 rounded-full bg-red-500/15 border border-red-500/30 animate-pulse"></div>
                </>
              )}

              <button
                onClick={sosActive ? handleResolveSOS : handleTriggerSOS}
                disabled={loading}
                className={`w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 shadow-lg outline-none border-0 ${
                  sosActive 
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30' 
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                }`}
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ShieldAlert className="w-8 h-8 mb-1.5 animate-bounce" />
                    <span className="font-extrabold text-2xl uppercase tracking-wider">
                      {sosActive ? 'RESOLVE' : 'SOS'}
                    </span>
                  </>
                )}
              </button>
            </div>

            <div className="text-center max-w-sm mt-4 space-y-2">
              <p className="text-sm font-bold text-slate-800">
                {sosActive ? '🚨 EMERGENCY ALARM ACTIVE' : 'TAP BUTTON TO EMIT SOS SIGNAL'}
              </p>
              <p className="text-xs text-slate-500 leading-normal">
                {sosActive 
                  ? 'Guardians are notified. Click RESOLVE to cancel warning signals and stop audible sirens.' 
                  : 'Requires browser geolocation access. Instantly updates the live control desk.'}
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default SosTrigger;
