import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Platform, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

// Native Map Support
let MapView: any = View;
let Marker: any = View;
let Circle: any = View;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  try {
     const Maps = require('react-native-maps');
     MapView = Maps.default;
     Marker = Maps.Marker;
     Circle = Maps.Circle;
     PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch (e) {}
}

export default function MapScreen() {
  const [location, setLocation] = useState<any>(null);
  const [safeHavens, setSafeHavens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const BASE_IP = '192.168.0.5'; 

  const restrictedZones = [
    { id: 101, title: "Dubai Airport", lat: 25.2532, lon: 55.3657, radius: 1000 },
    { id: 102, title: "Hazrat Sultan Mosque", lat: 51.1255, lon: 71.4705, radius: 1000 },
    { id: 103, title: "Residential Palace", lat: 51.1261, lon: 71.4461, radius: 1000 },
  ];

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({}).catch(() => null);
      if (loc) {
          setLocation(loc);
          fetchSafeHavens(loc.coords.latitude, loc.coords.longitude);
      }
    })();
  }, []);

  const fetchSafeHavens = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const res = await fetch(`http://${BASE_IP}:8000/safe-havens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon })
      });
      const data = await res.json();
      const combined = [
          ...(data.hospitals || []).map((h:any) => ({ ...h, type: 'medical' })),
          ...(data.police || []).map((p:any) => ({ ...p, type: 'police' }))
      ];
      setSafeHavens(combined);
    } catch (e) {
      console.log("Safe Haven Fetch Fail");
    } finally {
      setLoading(false);
    }
  };

  // WEB MODE: Use an Iframe (OpenStreetMap)
  if (Platform.OS === 'web') {
      const lat = location?.coords?.latitude || 51.1255;
      const lon = location?.coords?.longitude || 71.4705;
      // OSM Embed URL
      const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01},${lat-0.01},${lon+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lon}`;
      
      return (
          <View style={styles.container}>
              <View style={styles.webHeader}>
                  <Text style={styles.webHeaderText}>🌍 Live Global Explorer (Web Mode)</Text>
              </View>
              <iframe 
                src={mapUrl} 
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Roamly Web Map"
              />
              <View style={styles.overlay}>
                   <Text style={styles.legendText}>📍 Current Location: {lat.toFixed(4)}, {lon.toFixed(4)}</Text>
              </View>
          </View>
      );
  }

  // NATIVE MODE: Use react-native-maps
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: location?.coords?.latitude || 51.1255,
          longitude: location?.coords?.longitude || 71.4705,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation={true}
      >
        {restrictedZones.map(zone => (
          <React.Fragment key={zone.id}>
            <Marker coordinate={{ latitude: zone.lat, longitude: zone.lon }} pinColor="red" title={zone.title} />
            <Circle center={{ latitude: zone.lat, longitude: zone.lon }} radius={zone.radius} fillColor="rgba(255, 0, 0, 0.2)" strokeColor="rgba(255, 0, 0, 0.5)" />
          </React.Fragment>
        ))}

        {safeHavens.map((haven, i) => (
           <Marker 
             key={i} 
             coordinate={{ latitude: haven.lat || 0, longitude: haven.lon || 0 }} 
             pinColor={haven.type === 'medical' ? 'blue' : 'green'}
             title={haven.name}
             description={haven.address}
           />
        ))}
      </MapView>

      <View style={styles.overlay}>
        <View style={styles.legendRow}><View style={[styles.dot, { backgroundColor: 'red' }]} /><Text style={styles.legendText}>Danger Zones</Text></View>
        <View style={styles.legendRow}><View style={[styles.dot, { backgroundColor: 'blue' }]} /><Text style={styles.legendText}>Medical Havens</Text></View>
        <View style={styles.legendRow}><View style={[styles.dot, { backgroundColor: 'green' }]} /><Text style={styles.legendText}>Police Contacts</Text></View>
      </View>
      
      <TouchableOpacity style={styles.refreshBtn} onPress={() => location && fetchSafeHavens(location.coords.latitude, location.coords.longitude)}>
          <Ionicons name="location" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  map: { width: '100%', height: '100%' },
  webHeader: { padding: 20, backgroundColor: '#1E293B', alignItems: 'center', borderBottomWidth: 1, borderColor: '#334155' },
  webHeaderText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  overlay: { position: 'absolute', bottom: 30, left: 20, backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendText: { color: '#CBD5E1', fontSize: 12, fontWeight: 'bold' },
  refreshBtn: { position: 'absolute', top: 50, right: 20, backgroundColor: '#3B82F6', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5 }
});
