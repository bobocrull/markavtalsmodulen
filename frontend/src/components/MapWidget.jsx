import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Komponent för att fånga klickhändelser på kartan vid ritning
function MapDrawingEvents({ isDrawing, routeCoordinates, onRouteUpdate }) {
  useMapEvents({
    click(e) {
      if (isDrawing && onRouteUpdate) {
        const { lat, lng } = e.latlng;
        onRouteUpdate([...routeCoordinates, [lat, lng]]);
      }
    }
  });
  return null;
}

// Fix för standardikoner i Leaflet vid bundling
delete L.Icon.Default.prototype._getIconUrl;

// Hjälpfunktion för att generera färgkodade marker-ikoner
const createStatusIcon = (status) => {
  let color = '#ef4444'; // Red for draft
  if (status === 'processing' || status === 'sent') {
    color = '#f59e0b'; // Yellow for sent
  } else if (status === 'signed' || status === 'completed') {
    color = '#10b981'; // Green for signed
  }

  const svgHtml = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="0.2"/>
      <circle cx="12" cy="12" r="6" fill="${color}"/>
      <circle cx="12" cy="12" r="6" stroke="#ffffff" stroke-width="1.5"/>
    </svg>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-status-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

function MapViewController({ center, zoom, routeCoordinates, isDrawing }) {
  const map = useMap();
  
  useEffect(() => {
    // Om vi ritar, låt beredaren styra kameran fritt utan automatiska hopp
    if (isDrawing) {
      return;
    }

    if (routeCoordinates && routeCoordinates.length > 1) {
      try {
        const bounds = L.latLngBounds(routeCoordinates);
        map.fitBounds(bounds, { padding: [30, 30] });
      } catch (e) {
        console.error('Kunde inte passa kartans gränser:', e);
      }
    } else if (center && center[0] && center[1]) {
      map.setView(center, zoom || 12);
    }
  }, [center, zoom, routeCoordinates, isDrawing, map]);

  return null;
}

function MapWidget({ landowners, center, zoom, routeCoordinates = [], onRouteUpdate, isDrawing = false }) {
  const defaultCenter = center && center[0] ? center : [59.3293, 18.0686];
  const defaultZoom = zoom || 12;

  // Gruppera markägare per geografisk koordinat (för att visa delat ägande på samma fastighet)
  const groupedMarkers = {};
  landowners.forEach(owner => {
    if (owner.latitude && owner.longitude) {
      // Skapa en unik nyckel baserat på koordinaterna (avrundat till 5 decimaler)
      const latKey = parseFloat(owner.latitude).toFixed(5);
      const lngKey = parseFloat(owner.longitude).toFixed(5);
      const key = `${latKey},${lngKey}`;

      if (!groupedMarkers[key]) {
        groupedMarkers[key] = {
          latitude: owner.latitude,
          longitude: owner.longitude,
          properties: owner.properties_list || 'Fastighet',
          owners: []
        };
      }
      
      groupedMarkers[key].owners.push(owner);

      // Slå ihop fastighetsbeteckningar om de skiljer sig åt
      if (owner.properties_list && groupedMarkers[key].properties !== owner.properties_list) {
        const existingProps = groupedMarkers[key].properties.split(', ');
        if (!existingProps.includes(owner.properties_list)) {
          groupedMarkers[key].properties = [...existingProps, owner.properties_list].join(', ');
        }
      }
    }
  });

  // Bestäm färgstatus för en koordinat baserat på alla dess delägare
  const getGroupStatus = (owners) => {
    if (owners.some(o => o.status === 'draft')) return 'draft'; // Röd om någon delägare har status draft
    if (owners.some(o => o.status === 'processing' || o.status === 'sent')) return 'sent'; // Gul om under behandling
    return 'completed'; // Grön om alla delägare är klara/signerade
  };

  return (
    <div className="map-container" style={{ cursor: isDrawing ? 'crosshair' : 'grab' }}>
      <MapContainer center={defaultCenter} zoom={defaultZoom} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> bidragsgivare'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewController 
          center={defaultCenter} 
          zoom={defaultZoom} 
          routeCoordinates={routeCoordinates}
          isDrawing={isDrawing}
        />
        
        {/* Rita ledningssträckning */}
        <MapDrawingEvents 
          isDrawing={isDrawing} 
          routeCoordinates={routeCoordinates} 
          onRouteUpdate={onRouteUpdate} 
        />
        
        {routeCoordinates && routeCoordinates.length > 0 && (
          <Polyline 
            positions={routeCoordinates} 
            color="#5FC891" 
            weight={4}
            dashArray="5, 8"
          />
        )}
        
        {Object.keys(groupedMarkers).map((key) => {
          const marker = groupedMarkers[key];
          const groupStatus = getGroupStatus(marker.owners);

          return (
            <Marker 
              key={key} 
              position={[marker.latitude, marker.longitude]} 
              icon={createStatusIcon(groupStatus)}
            >
              <Popup>
                <div style={{ color: '#000', fontFamily: 'var(--font-body)', fontSize: '0.85rem', minWidth: '200px' }}>
                  <strong style={{ fontSize: '0.95rem', display: 'block', borderBottom: '1px solid #ccc', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                    {marker.properties}
                  </strong>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {marker.owners.map((owner) => (
                      <div key={owner.id} style={{ borderBottom: '1px dashed #eee', paddingBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{owner.name}</span>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: 'bold', 
                            padding: '0.1rem 0.3rem', 
                            borderRadius: '4px',
                            backgroundColor: owner.status === 'completed' || owner.status === 'signed' ? '#d1fae5' : owner.status === 'draft' ? '#fee2e2' : '#fef3c7',
                            color: owner.status === 'completed' || owner.status === 'signed' ? '#065f46' : owner.status === 'draft' ? '#991b1b' : '#92400e'
                          }}>
                            {owner.status.toUpperCase()}
                          </span>
                        </div>
                        {owner.compensation_sum ? (
                          <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem', color: '#555' }}>
                            Ersättning: {owner.compensation_sum.toLocaleString('sv-SE')} kr
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default MapWidget;
