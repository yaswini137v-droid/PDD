import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Home, Trash2, Plus, Crosshair, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const MapEventsHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
};

const defaultGreenIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 14px; height: 14px; border-radius: 50%; background: #10b981; border: 2px solid white; box-shadow: 0 0 10px rgba(16, 185, 129, 0.8);"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const defaultBlueIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 14px; height: 14px; border-radius: 50%; background: #3b82f6; border: 2px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);"></div>
      <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: #3b82f6; opacity: 0.2; transform: scale(1.8); animation: pulse-radar 2.5s infinite ease-out;"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const Geofences = () => {
  const [safePlaces, setSafePlaces] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    latitude: 13.2172,
    longitude: 79.1003,
    radius: 200,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { apiRequest } = useAuth();

  const fetchSafePlaces = async () => {
    try {
      const res = await apiRequest('/api/safeplaces');
      if (res.success) {
        setSafePlaces(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSafePlaces();
  }, []);

  const handleMapClick = (latlng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: Number(latlng.lat.toFixed(6)),
      longitude: Number(latlng.lng.toFixed(6)),
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await apiRequest('/api/safeplaces', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (res.success) {
        setFormData({
          name: '',
          latitude: formData.latitude,
          longitude: formData.longitude,
          radius: 200,
        });
        fetchSafePlaces();
      } else {
        setError(res.message);
      }
    } catch (err) {
      console.error(err);
      setError('Connection failure.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this geofence?')) return;
    try {
      const res = await apiRequest(`/api/safeplaces/${id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        fetchSafePlaces();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Geofences & Safe Places</h1>
              <p className="text-sm text-slate-500 font-medium">Establish and monitor virtual geographic boundaries</p>
            </div>
          </div>
        </div>

        {/* Main Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel p-6 space-y-4 shadow-sm border border-slate-200/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Home className="w-5 h-5 text-emerald-600" /> Add Safe Place
              </h2>
              
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200/60 text-red-600 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Place Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Home, Office, Parents House"
                    className="w-full glass-input text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: Number(e.target.value) })}
                      className="w-full glass-input text-xs font-mono font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: Number(e.target.value) })}
                      className="w-full glass-input text-xs font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Safe Radius</span>
                    <span className="text-emerald-600 font-mono text-sm">{formData.radius}m</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1500"
                    step="50"
                    value={formData.radius}
                    onChange={(e) => setFormData({ ...formData, radius: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 mt-2"
                  />
                  <div className="flex justify-between text-[9px] font-bold text-slate-400">
                    <span>50m</span>
                    <span>1.5km</span>
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-[11px] text-blue-700/90 leading-relaxed flex gap-2">
                    <Crosshair className="w-4 h-4 flex-shrink-0 text-blue-600" />
                    <span>Tip: Click anywhere on the map to automatically populate the latitude & longitude coordinates.</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 text-sm"
                >
                  <Plus className="w-4 h-4" /> Save Safe Zone
                </button>
              </form>
            </div>

            {/* List panel */}
            <div className="glass-panel p-6 space-y-4 shadow-sm border border-slate-200/50">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Existing Zones</h2>
              
              {loading ? (
                <div className="text-center py-4 text-slate-400 text-sm">Loading geofences...</div>
              ) : safePlaces.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-xs font-medium">No safe places added yet.</div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {safePlaces.map((place) => (
                    <div 
                      key={place._id} 
                      onClick={() => handleMapClick({ lat: place.latitude, lng: place.longitude })}
                      className="p-3 bg-white hover:bg-slate-50 border border-slate-200/60 rounded-xl flex justify-between items-center cursor-pointer transition-all hover:scale-[1.01] shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate text-sm">{place.name}</p>
                        <p className="text-[10px] font-extrabold text-slate-400 font-mono mt-0.5">Radius: {place.radius}m</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(place._id); }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right/Center panel - map */}
          <div className="lg:col-span-2 min-h-[500px] h-full lg:h-[700px] shadow-sm">
            <div className="w-full h-full rounded-2xl overflow-hidden relative border border-slate-200/60">
              <MapContainer
                center={[formData.latitude, formData.longitude]}
                zoom={14}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapEventsHandler onMapClick={handleMapClick} />

                {/* Draw currently placing marker and radius */}
                <Marker position={[formData.latitude, formData.longitude]} icon={defaultBlueIcon} />
                <Circle 
                  center={[formData.latitude, formData.longitude]} 
                  radius={formData.radius}
                  pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.12 }}
                />

                {/* Draw existing safe places */}
                {safePlaces.map((place) => (
                  <React.Fragment key={place._id}>
                    <Marker position={[place.latitude, place.longitude]} icon={defaultGreenIcon} />
                    <Circle 
                      center={[place.latitude, place.longitude]} 
                      radius={place.radius}
                      pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.08 }}
                    />
                  </React.Fragment>
                ))}
              </MapContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Geofences;
