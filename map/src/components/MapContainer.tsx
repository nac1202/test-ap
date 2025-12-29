import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { fetchAircraftInJapan } from '../utils/api';
import type { OpenSkyState } from '../types';

const INITIAL_VIEW_STATE = {
  lng: 139.7671,
  lat: 35.6812,
  zoom: 6,
  pitch: 45,
  bearing: 0
};

// Mock data to use when API fails or manual mock mode is on
// Define outside component to persist reference
const getMockData = () => [
  {
    icao24: "test1", callsign: "JAL123", origin_country: "Japan", time_position: Date.now(), last_contact: Date.now(),
    longitude: 139.7671, latitude: 35.6812, baro_altitude: 1000, on_ground: false, velocity: 200, true_track: 0,
    vertical_rate: 0, sensors: [], geo_altitude: 1000, squawk: "1234", spi: false, position_source: 0
  },
  {
    icao24: "test2", callsign: "ANA456", origin_country: "Japan", time_position: Date.now(), last_contact: Date.now(),
    longitude: 140.0, latitude: 35.5, baro_altitude: 2000, on_ground: false, velocity: 220, true_track: 90,
    vertical_rate: 0, sensors: [], geo_altitude: 2000, squawk: "5678", spi: false, position_source: 0
  },
  {
    icao24: "test3", callsign: "SKY789", origin_country: "Japan", time_position: Date.now(), last_contact: Date.now(),
    longitude: 139.5, latitude: 36.0, baro_altitude: 3000, on_ground: false, velocity: 250, true_track: 180,
    vertical_rate: 0, sensors: [], geo_altitude: 3000, squawk: "9012", spi: false, position_source: 0
  }
];

const MapContainer: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [selectedAircraft, setSelectedAircraft] = useState<any | null>(null);
  const [useMock, setUseMock] = useState<boolean>(false);
  const [isWorldMode, setIsWorldMode] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(INITIAL_VIEW_STATE.zoom);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // Store history of positions for trails: icao24 -> array of coordinates
  const trailsRef = useRef<Map<string, [number, number][]>>(new Map());
  // Store current mock state to simulate movement
  const mockStateRef = useRef<OpenSkyState[]>(getMockData());

  // Initialize Map
  useEffect(() => {
    if (map.current) return; // Initialize only once
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [INITIAL_VIEW_STATE.lng, INITIAL_VIEW_STATE.lat],
      zoom: INITIAL_VIEW_STATE.zoom,
      pitch: 60, // Force 3D pitch
      bearing: INITIAL_VIEW_STATE.bearing,
      antialias: true
    } as maplibregl.MapOptions);

    map.current.on('load', () => {
      console.log("Map Loaded");

      const image = new Image(24, 24);
      image.onload = () => {
        if (!map.current) return;
        if (!map.current.hasImage('airplane-icon')) {
          map.current.addImage('airplane-icon', image);
        }
        console.log("Icon Added");
      };
      image.src = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22white%22%3E%3Cpath d=%22M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z%22/%3E%3C/svg%3E';
      // The original code had a duplicate addImage call here, which is now removed
      // as the onload handler correctly adds it once.

      // Source for 3D Buildings (GSI Experimental)
      // Retry GSI but with strict zoom limits to prevent crash
      map.current?.addSource('gsi-3d', {
        type: 'vector',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/{z}/{x}/{y}.pbf'],
        maxzoom: 16,
        minzoom: 4,
        attribution: 'GSI Japan'
      });

      // Layer for 3D Buildings
      map.current?.addLayer({
        'id': '3d-buildings',
        'source': 'gsi-3d',
        'source-layer': 'building',
        'type': 'fill-extrusion',
        'minzoom': 15, // Only show when very close to avoid memory crash
        'paint': {
          'fill-extrusion-color': [
            'match', ['get', 'ftCode'],
            3103, '#556677', // High-rise: bluish grey
            3102, '#666666', // Solid: standard grey
            '#777777' // Others: lighter grey
          ],
          'fill-extrusion-height': [
            'match', ['get', 'ftCode'],
            3103, 100, // High-rise buildings (approx 100m)
            3102, 40,  // Solid/Robust buildings (approx 40m)
            3111, 10,  // Ordinary buildings
            3112, 10,
            15 // Default fallback
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.8
        }
      });
      console.log("Added 3D building layer");

      // Source for trails - LineString
      map.current?.addSource('trails', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // Layer for trails
      map.current?.addLayer({
        id: 'aircraft-trails',
        type: 'line',
        source: 'trails',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#00aaff',
          'line-width': 3,
          'line-opacity': 0.8
        }
      });

      // Source for aircraft
      map.current?.addSource('aircraft', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current?.addLayer({
        id: 'aircraft-symbol',
        type: 'symbol',
        source: 'aircraft',
        layout: {
          'icon-image': 'airplane-icon',
          'icon-size': 1.0,
          'icon-allow-overlap': true,
          'icon-rotate': ['get', 'true_track'],
          'icon-rotation-alignment': 'map'
        },
        paint: { 'icon-color': '#ffffff' }
      });

      // Event handlers
      // Zoom update
      if (map.current) {

        map.current.on('move', () => {
          if (map.current) {
            setCurrentZoom(parseFloat(map.current.getZoom().toFixed(2)));
          }
        });

        // Error handler
        map.current.on('error', (e) => {
          console.error("Map Error:", e);
        });

        map.current.on('click', 'aircraft-symbol', (e) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            // @ts-ignore
            const coordinates = feature.geometry.coordinates.slice();
            const props = feature.properties;

            setSelectedAircraft(props);

            if (popupRef.current) popupRef.current.remove();

            const description = `
                             <div style="color: black; font-family: sans-serif;">
                                 <strong>${props?.callsign || 'Unknown'}</strong><br/>
                                 Country: ${props?.origin_country}<br/>
                                 Alt: ${props?.geo_altitude}m<br/>
                                 Speed: ${props?.velocity}m/s
                             </div>
                          `;

            if (map.current) {
              popupRef.current = new maplibregl.Popup()
                .setLngLat(coordinates)
                .setHTML(description)
                .addTo(map.current);
            }
          }
        });
      }

      map.current?.on('mouseenter', 'aircraft-symbol', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current?.on('mouseleave', 'aircraft-symbol', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    });
  }, []);

  // Data Fetching ... (rest is same)
  // Data Fetching and Trail Updating Logic
  useEffect(() => {
    const updateData = async () => {
      if (!map.current || !map.current.getSource('aircraft')) return;
      try {
        let data: OpenSkyState[] = [];
        if (useMock) {
          // Mock Data Logic
          if (!mockStateRef.current) {
            mockStateRef.current = getMockData();
          }
          // Move planes simulation
          mockStateRef.current = mockStateRef.current.map(p => {
            // Simple linear movement simulation for mock
            if (!p.velocity || !p.true_track) return p;
            const dist = p.velocity * 10 / 111000; // approx deg change in 10s
            const rad = (p.true_track - 90) * Math.PI / 180;
            return {
              ...p,
              longitude: (p.longitude || 0) + (Math.cos(rad) * dist),
              latitude: (p.latitude || 0) + (Math.sin(rad) * dist)
            };
          });
          data = mockStateRef.current;
        } else {
          if (isWorldMode) {
            // Fetch Europe Region
            data = await fetchAircraftInJapan({
              lamin: 30,
              lamax: 70,
              lomin: -15,
              lomax: 45
            });
          } else {
            // Fetch Japan
            data = await fetchAircraftInJapan();
          }
        }

        // Limit trail processing
        const activeIcaos = new Set(data.map(d => d.icao24));

        // Delete old trails
        for (const icao24 of trailsRef.current.keys()) {
          if (!activeIcaos.has(icao24)) {
            trailsRef.current.delete(icao24);
          }
        }

        // Update Trails
        data.forEach(d => {
          if (d.icao24 && d.longitude && d.latitude) {
            const currentPos: [number, number] = [d.longitude, d.latitude];
            if (!trailsRef.current.has(d.icao24)) {
              trailsRef.current.set(d.icao24, []);
            }
            const trail = trailsRef.current.get(d.icao24)!;

            const lastPos = trail[trail.length - 1];
            if (!lastPos || (Math.abs(lastPos[0] - currentPos[0]) > 0.0001 || Math.abs(lastPos[1] - currentPos[1]) > 0.0001)) {
              trail.push(currentPos);
              if (trail.length > 50) trail.shift();
            }
          }
        });

        // Convert Trails to GeoJSON
        const trailFeatures: any[] = [];
        trailsRef.current.forEach((coords, icao24) => {
          if (coords.length > 1) {
            trailFeatures.push({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: coords
              },
              properties: { icao24 }
            });
          }
        });

        const trailSource = map.current.getSource('trails') as maplibregl.GeoJSONSource;
        if (trailSource) {
          trailSource.setData({
            type: 'FeatureCollection',
            features: trailFeatures
          } as any);
        }

        // Update Aircraft Icons
        const iconFeatures: any[] = data.map(d => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [d.longitude || 0, d.latitude || 0]
          },
          properties: { ...d }
        }));

        const source = map.current.getSource('aircraft') as maplibregl.GeoJSONSource;
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features: iconFeatures
          } as any);
        }
      } catch (e) {
        console.error("Failed to fetch/update aircraft data", e);
      }
    };

    const interval = setInterval(updateData, 10000);
    return () => clearInterval(interval);
  }, [useMock, isWorldMode]);

  return (
    <div ref={mapContainer} style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, color: 'white', zIndex: 100, background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '4px', fontFamily: 'sans-serif', backdropFilter: 'blur(4px)' }}>
        <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>Flight Tracker</h3>
        <div style={{ marginBottom: '8px', fontSize: '14px' }}>
          <div style={{ marginBottom: '5px' }}>
            Zoom: <span style={{ fontWeight: 'bold' }}>{currentZoom}</span>
            {currentZoom < 15 && <span style={{ marginLeft: '8px', color: '#ffcc00', fontSize: '12px' }}>(Zoom in to 15+ for buildings)</span>}
          </div>
          <div style={{ marginBottom: '5px' }}>
            Source:
            <button
              onClick={() => {
                setUseMock(!useMock);
                mockStateRef.current = getMockData();
                trailsRef.current.clear();
              }}
              style={{ marginLeft: '8px', padding: '4px 12px', background: useMock ? '#ff9800' : '#4caf50', border: 'none', color: 'white', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {useMock ? 'MOCK DATA' : 'LIVE API'}
            </button>
          </div>
          {!useMock && (
            <div>
              Region:
              <button
                onClick={() => {
                  setIsWorldMode(!isWorldMode);
                  trailsRef.current.clear();
                }}
                style={{ marginLeft: '8px', padding: '4px 12px', background: isWorldMode ? '#9c27b0' : '#2196f3', border: 'none', color: 'white', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isWorldMode ? 'WORLD' : 'JAPAN'}
              </button>
            </div>
          )}
        </div>
        {selectedAircraft && (
          <div style={{ marginTop: '10px', borderTop: '1px solid #555', paddingTop: '8px', fontSize: '13px' }}>
            <div style={{ color: '#aaa', fontSize: '11px' }}>SELECTED</div>
            <b style={{ fontSize: '14px', color: '#fff' }}>{selectedAircraft.callsign}</b><br />
            Origin: {selectedAircraft.origin_country}<br />
            Alt: {selectedAircraft.geo_altitude}m<br />
            Speed: {selectedAircraft.velocity}m/s
          </div>
        )}
      </div>
    </div>
  );
};

export default MapContainer;
