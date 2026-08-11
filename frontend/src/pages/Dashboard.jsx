import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import DashboardMap from '../components/DashboardMap';
import { Shield, ShieldAlert, Navigation, Home, Users, LogOut, PhoneCall, AlertTriangle, CheckCircle, RefreshCw, Crosshair } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout, apiRequest } = useAuth();
  const { socket, connected } = useSocket();

  const [activeAlerts, setActiveAlerts] = useState([]);
  const [activeJourneys, setActiveJourneys] = useState([]);
  const [safePlaces, setSafePlaces] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const audioCtxRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  // Synthesize alarm sirens when active SOS alerts exist
  const startSiren = () => {
    if (audioCtxRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
      let toggle = false;

      sirenIntervalRef.current = setInterval(() => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'suspended') return;
        
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();

        osc.type = 'sawtooth';
        const freq = toggle ? 750 : 550;
        osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
        osc.frequency.exponentialRampToValueAtTime(toggle ? 550 : 750, audioCtxRef.current.currentTime + 0.35);

        gain.gain.setValueAtTime(0.12, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.38);

        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);

        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 0.4);

        toggle = !toggle;
      }, 400);
    } catch (err) {
      console.error('Audio synthesizer init blocked:', err);
    }
  };

  const stopSiren = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const alertsRes = await apiRequest('/api/alerts/active');
      if (alertsRes.success) {
        setActiveAlerts(alertsRes.data);
      }

      const journeyRes = await apiRequest('/api/journey/active');
      if (journeyRes.success && journeyRes.data) {
        setActiveJourneys([journeyRes.data]);
      } else {
        setActiveJourneys([]);
      }

      const safeRes = await apiRequest('/api/safeplaces');
      if (safeRes.success) {
        setSafePlaces(safeRes.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeAlerts.length > 0) {
      startSiren();
    } else {
      stopSiren();
    }
    return () => stopSiren();
  }, [activeAlerts]);

  useEffect(() => {
    if (!socket) return;

    if (user) {
      socket.emit('join_user', user._id);
    }

    socket.on('sos_triggered', (alertData) => {
      console.log('Real-time SOS Alert received:', alertData);
      setActiveAlerts((prev) => {
        if (prev.some(a => a._id === alertData.alertId)) return prev;
        const newAlert = {
          _id: alertData.alertId,
          latitude: alertData.latitude,
          longitude: alertData.longitude,
          triggerType: alertData.triggerType,
          createdAt: alertData.createdAt,
          user: alertData.user,
          journey: alertData.journey,
        };
        return [newAlert, ...prev];
      });
    });

    socket.on('sos_resolved', (data) => {
      setActiveAlerts((prev) => prev.filter(a => a._id !== data.alertId));
    });

    socket.on('journey_started', (journeyData) => {
      if (journeyData.user?.id === user?._id) {
        fetchData();
      }
    });

    socket.on('journey_updated', (updateData) => {
      setActiveJourneys((prev) => 
        prev.map((j) => {
          if (j._id === updateData.journeyId) {
            return {
              ...j,
              currentLatitude: updateData.latitude,
              currentLongitude: updateData.longitude,
            };
          }
          return j;
        })
      );
    });

    socket.on('journey_completed', (data) => {
      if (data.userId === user?._id) {
        setActiveJourneys([]);
      }
    });

    return () => {
      socket.off('sos_triggered');
      socket.off('sos_resolved');
      socket.off('journey_started');
      socket.off('journey_updated');
      socket.off('journey_completed');
    };
  }, [socket, user]);

  const handleResolveAlert = async () => {
    try {
      const res = await apiRequest('/api/alerts/resolve', {
        method: 'POST',
      });
      if (res.success) {
        setActiveAlerts((prev) => prev.filter(a => a.user?._id !== user?._id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleZoomLocation = (lat, lng) => {
    setSelectedLocation({ lat, lng, time: Date.now() });
  };

  const activeJourney = activeJourneys[0] || null;
  const mySOSAlert = activeAlerts.find(a => a.user?.id === user?._id || a.user?._id === user?._id);

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-850 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* 1. Global Hazard flashing banner */}
      {activeAlerts.length > 0 && (
        <div className="hazard-alert py-3.5 px-4 border-b border-red-500/30 flex justify-between items-center text-red-900 relative z-50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></div>
            <ShieldAlert className="w-6 h-6 text-red-600 animate-bounce" />
            <p className="text-sm font-extrabold tracking-wide uppercase">
              🚨 Emergency Alert: {activeAlerts.length} active SOS signal(s) detected!
            </p>
          </div>
          {mySOSAlert && (
            <button
              onClick={handleResolveAlert}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 font-extrabold text-xs text-white rounded-xl shadow-md uppercase transition-all"
            >
              Resolve My Alert
            </button>
          )}
        </div>
      )}

      {/* 2. Top Header Navigation (Light Theme) */}
      <header className="py-4 px-6 border-b border-slate-200 bg-white/70 backdrop-blur flex justify-between items-center relative z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 border border-blue-600/20 rounded-xl">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">TravelSafetySOS</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
              {connected ? 'WS Synchronized' : 'WS Connecting...'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 font-bold hidden md:inline">
            Active session: <span className="text-blue-600 font-extrabold">{user?.name}</span>
          </span>
          <button
            onClick={logout}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-500 transition-all active:scale-95"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 3. Main Dashboard Grid */}
      <main className="flex-grow p-4 md:p-6 grid grid-cols-1 xl:grid-cols-4 gap-6 relative z-10 max-w-[1920px] mx-auto w-full">
        
        {/* Left Side: Control widgets */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          
          {/* Quick Menu Card */}
          <div className="glass-panel p-5 space-y-4 shadow-sm border border-slate-200/50">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Control Menu</h3>
            <div className="grid grid-cols-3 gap-2">
              <Link 
                to="/geofences" 
                className="p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 text-slate-800 rounded-xl flex flex-col items-center gap-1.5 transition-all hover:scale-[1.02] shadow-sm text-center"
              >
                <Home className="w-5 h-5 text-emerald-600" />
                <span className="text-[10px] font-bold text-slate-700">Geofences</span>
              </Link>
              <Link 
                to="/contacts" 
                className="p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 text-slate-800 rounded-xl flex flex-col items-center gap-1.5 transition-all hover:scale-[1.02] shadow-sm text-center"
              >
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-[10px] font-bold text-slate-700">Guardians</span>
              </Link>
              <Link 
                to="/sos" 
                className="p-2.5 bg-red-50 hover:bg-red-100/80 border border-red-200/60 text-red-700 rounded-xl flex flex-col items-center gap-1.5 transition-all hover:scale-[1.02] shadow-sm text-center"
              >
                <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse" />
                <span className="text-[10px] font-bold text-red-750">Trigger SOS</span>
              </Link>
            </div>
          </div>

          {/* Active travel journey details */}
          <div className="glass-panel p-5 flex-grow flex flex-col min-h-[250px] shadow-sm border border-slate-200/50">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" /> Your Active Journey
            </h3>
            
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Syncing statuses...</div>
            ) : !activeJourney ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                <Navigation className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-slate-500 text-sm font-bold">No active journey</p>
                <p className="text-[10px] text-slate-400 max-w-[200px] mt-1 leading-normal">Start a journey in the mobile app to activate real-time web tracking.</p>
              </div>
            ) : (
              <div className="flex-grow space-y-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Destination</label>
                  <p className="text-sm font-extrabold text-slate-800 leading-snug">{activeJourney.destinationName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Travel Mode</label>
                    <p className="text-xs font-bold text-slate-700">{activeJourney.travelMode}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Vehicle Num</label>
                    <p className="text-xs font-mono font-bold text-slate-700 truncate">{activeJourney.vehicleNumber || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Expected Arrival</label>
                  <p className="text-xs font-bold text-pink-600 font-mono">
                    {new Date(activeJourney.expectedReachTime).toLocaleTimeString()}
                  </p>
                </div>
                
                <div className="pt-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    activeJourney.status === 'active' ? 'bg-blue-100 border border-blue-200 text-blue-700' :
                    activeJourney.status === 'grace_period' ? 'bg-yellow-100 border border-yellow-200 text-yellow-700 animate-pulse' :
                    activeJourney.status === 'check_in_requested' ? 'bg-orange-100 border border-orange-200 text-orange-700 animate-pulse' :
                    'bg-red-100 border border-red-200 text-red-700'
                  }`}>
                    {activeJourney.status.replace('_', ' ')}
                  </span>
                </div>
                
                <button
                  onClick={() => handleZoomLocation(
                    activeJourney.currentLatitude || activeJourney.destinationLatitude, 
                    activeJourney.currentLongitude || activeJourney.destinationLongitude
                  )}
                  className="w-full mt-2 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Crosshair className="w-3.5 h-3.5" /> Locate On Map
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center: Live tracking map layer */}
        <div className="xl:col-span-2 min-h-[450px] lg:min-h-[600px] h-full shadow-sm">
          <DashboardMap 
            activeAlerts={activeAlerts} 
            activeJourneys={activeJourneys} 
            safePlaces={safePlaces}
            selectedLocation={selectedLocation}
          />
        </div>

        {/* Right Side: Emergency logs log lists */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="glass-panel p-5 flex-grow flex flex-col min-h-[400px] shadow-sm border border-slate-200/50">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" /> Active Emergency Logs
              </h3>
              <button 
                onClick={fetchData} 
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                title="Refresh logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="flex-grow flex items-center justify-center text-slate-400 text-sm">Syncing alerts directory...</div>
            ) : activeAlerts.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-emerald-600 text-sm font-bold glow-text-emerald">All Users Safe</p>
                <p className="text-[10px] text-slate-400 max-w-[200px] mt-1 leading-normal">No active SOS alerts or safety timeouts reported.</p>
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto space-y-3 pr-1 max-h-[500px]">
                {activeAlerts.map((alert) => (
                  <div 
                    key={alert._id}
                    className="p-4 bg-red-50 hover:bg-red-100/50 border border-red-200 rounded-xl relative overflow-hidden transition-all hover:scale-[1.01] shadow-sm"
                  >
                    <div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-red-500 pulse-radar-rose"></div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="font-extrabold text-sm text-red-700 uppercase tracking-wide">🚨 SOS Triggered</p>
                        <p className="text-xs text-slate-800 font-extrabold mt-0.5">{alert.user?.name}</p>
                      </div>
                      
                      <div className="text-[11px] text-slate-600 space-y-0.5 font-semibold">
                        <p>Phone: <span className="font-mono text-slate-900">{alert.user?.phone}</span></p>
                        <p>Trigger: <span className="text-red-600 font-bold capitalize">{alert.triggerType.replace('_', ' ')}</span></p>
                        <p>Time: {new Date(alert.createdAt).toLocaleTimeString()}</p>
                        {alert.journey?.destinationName && (
                          <p className="truncate">Trip Destination: {alert.journey.destinationName}</p>
                        )}
                      </div>
                      
                      <div className="pt-2 border-t border-red-200/50 flex justify-between items-center">
                        <button
                          onClick={() => handleZoomLocation(alert.latitude, alert.longitude)}
                          className="px-2.5 py-1 bg-white hover:bg-red-50 border border-red-200 text-[10px] text-red-700 font-bold rounded shadow-sm"
                        >
                          Show on Map
                        </button>
                        <a
                          href={`tel:${alert.user?.phone}`}
                          className="p-1 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded border border-red-200/50 shadow-sm"
                          title="Call User"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;
