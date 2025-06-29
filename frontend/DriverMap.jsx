import React, { useEffect, useState } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl';

const darkStyle = 'mapbox://styles/mapbox/navigation-night-v1';

const routeLayer = {
  id: 'route',
  type: 'line',
  paint: {
    'line-color': '#1fbad6',
    'line-width': 4,
  },
};

const DriverMap = ({ driverLocation, patientLocation, mapboxToken }) => {
  const [route, setRoute] = useState(null);

  useEffect(() => {
    if (!driverLocation || !patientLocation || !mapboxToken) return;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLocation.longitude},${driverLocation.latitude};${patientLocation.longitude},${patientLocation.latitude}?geometries=geojson&access_token=${mapboxToken}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setRoute(data.routes[0].geometry))
      .catch(() => setRoute(null));
  }, [driverLocation, patientLocation, mapboxToken]);

  const initialView = driverLocation ||
    patientLocation || { longitude: 0, latitude: 0 };

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Map
        initialViewState={{
          longitude: initialView.longitude,
          latitude: initialView.latitude,
          zoom: 12,
        }}
        mapboxAccessToken={mapboxToken}
        style={{ width: '100%', height: '100%' }}
        mapStyle={darkStyle}
      >
        {patientLocation && (
          <Marker
            latitude={patientLocation.latitude}
            longitude={patientLocation.longitude}
            color="red"
          />
        )}
        {route && (
          <Source id="route" type="geojson" data={route}>
            <Layer {...routeLayer} />
          </Source>
        )}
      </Map>
    </div>
  );
};

export default DriverMap;
