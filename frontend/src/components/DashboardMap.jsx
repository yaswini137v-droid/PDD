import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';

// Helper to center the map dynamically when active markers change
const RecenterMap = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
};

// Create premium custom markers using Leaflet's divIcon
const createUserIcon = () => L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="position: relative; width: 24px; height: 24px;">
      <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: #3b82f6; opacity: 0.3; transform: scale(2); animation: pulse-radar 2s infinite ease-out;"></div>
      <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 50%; background: #3b82f6; border: 2px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const createSosIcon = () => L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="position: relative; width: 32px; height: 32px;">
      <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: #ef4444; opacity: 0.4; transform: scale(2.2); animation: pulse-radar 1.2s infinite ease-out;"></div>
      <div style="position: absolute; top: 6px; left: 6px; width: 20px; height: 20px; border-radius: 50%; background: #ef4444; border: 2px solid white; box-shadow: 0 0 15px #ef4444; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-weight: 800; font-size: 10px; font-family: sans-serif;">SOS</span>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const createDestinationIcon = () => L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #ec4899; border: 2px solid white; box-shadow: 0 0 10px rgba(236, 72, 153, 0.8);"></div>
      <div style="position: absolute; bottom: 0; width: 2px; height: 12px; background: #ec4899;"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

const createSafePlaceIcon = (name) => L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="position: relative; width: 20px; height: 20px;">
      <div style="width: 14px; height: 14px; border-radius: 50%; background: #10b981; border: 2px solid white; box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const DashboardMap = ({ 
  activeAlerts = [], 
  activeJourneys = [], 
  safePlaces = [], 
  selectedLocation = null 
}) => {
  // Center map on selected location, first active alert, first active journey, or default center (India / Chittoor coordinate defaults)
  const defaultCenter = [13.2172, 79.1003]; // Chittoor (Bazar Street region)
  
  let mapCenter = defaultCenter;
  let zoom = 13;

  if (selectedLocation) {
    mapCenter = [selectedLocation.lat, selectedLocation.lng];
    zoom = 15;
  } else if (activeAlerts.length > 0) {
    mapCenter = [activeAlerts[0].latitude, activeAlerts[0].longitude];
    zoom = 14;
  } else if (activeJourneys.length > 0) {
    const activeJ = activeJourneys[0];
    mapCenter = [activeJ.currentLatitude || activeJ.destinationLatitude, activeJ.currentLongitude || activeJ.destinationLongitude];
    zoom = 14;
  }

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden relative shadow-inner shadow-slate-950 border border-slate-800">
      <MapContainer 
        center={mapCenter} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        className="w-full h-full"
      >
        {/* OpenStreetMap tiles for light theme */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap center={mapCenter} zoom={zoom} />

        {/* 1. Draw Active SOS Alerts */}
        {activeAlerts.map((alert) => (
          <React.Fragment key={alert._id}>
            <Marker 
              position={[alert.latitude, alert.longitude]} 
              icon={createSosIcon()}
            >
              <Popup className="dark-popup">
                <div className="p-1">
                  <h4 className="font-bold text-red-500 text-sm">🚨 SOS ALERT</h4>
                  <p className="text-xs font-semibold">User: {alert.user?.name}</p>
                  <p className="text-xs">Phone: {alert.user?.phone}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Reason: <span className="text-red-400 capitalize">{alert.triggerType.replace('_', ' ')}</span>
                  </p>
                  <p className="text-xs text-slate-400">Time: {new Date(alert.createdAt).toLocaleTimeString()}</p>
                </div>
              </Popup>
            </Marker>
            {/* Visual Red Alert Circle */}
            <Circle 
              center={[alert.latitude, alert.longitude]}
              radius={100}
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.15 }}
            />
          </React.Fragment>
        ))}

        {/* 2. Draw Active Journeys */}
        {activeJourneys.map((journey) => {
          const userPos = [
            journey.currentLatitude || journey.destinationLatitude,
            journey.currentLongitude || journey.destinationLongitude
          ];
          const destPos = [journey.destinationLatitude, journey.destinationLongitude];

          return (
            <React.Fragment key={journey._id}>
              {/* User Current Position */}
              <Marker position={userPos} icon={createUserIcon()}>
                <Popup>
                  <div>
                    <h4 className="font-bold text-blue-400 text-sm">📍 Traveling</h4>
                    <p className="text-xs font-semibold">User: {journey.user?.name || 'Self'}</p>
                    <p className="text-xs">Mode: {journey.travelMode} {journey.vehicleNumber ? `(${journey.vehicleNumber})` : ''}</p>
                    <p className="text-xs text-slate-400">To: {journey.destinationName}</p>
                    <p className="text-xs text-slate-400">ETA: {new Date(journey.expectedReachTime).toLocaleTimeString()}</p>
                  </div>
                </Popup>
              </Marker>

              {/* Destination Marker & Geofence Circle */}
              <Marker position={destPos} icon={createDestinationIcon()}>
                <Popup>
                  <div>
                    <h4 className="font-bold text-pink-400 text-sm">🏁 Destination</h4>
                    <p className="text-xs">{journey.destinationName}</p>
                    <p className="text-xs text-slate-400">Safe Zone Radius: {journey.destinationRadius}m</p>
                  </div>
                </Popup>
              </Marker>

              <Circle 
                center={destPos}
                radius={journey.destinationRadius}
                pathOptions={{ color: '#ec4899', fillColor: '#ec4899', fillOpacity: 0.1 }}
              />
            </React.Fragment>
          );
        })}

        {/* 3. Draw Static Safe Places */}
        {safePlaces.map((place) => (
          <React.Fragment key={place._id}>
            <Marker 
              position={[place.latitude, place.longitude]} 
              icon={createSafePlaceIcon()}
            >
              <Popup>
                <div>
                  <h4 className="font-bold text-emerald-400 text-sm">🛡️ Safe Place</h4>
                  <p className="text-xs font-semibold">{place.name}</p>
                  <p className="text-xs text-slate-400">Radius: {place.radius}m</p>
                </div>
              </Popup>
            </Marker>
            <Circle 
              center={[place.latitude, place.longitude]}
              radius={place.radius}
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.08 }}
            />
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
};

export default DashboardMap;
