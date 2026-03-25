import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Rule } from '../utils/safetyManager';

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
  const [loading, setLoading] = useState(false);
  const [cultureHeatmap, setCultureHeatmap] = useState<Rule[]>([]);
  const [safeHavens, setSafeHavens] = useState<any[]>([]);

  const BASE_IP = '192.168.0.5'; 

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({}).catch(() => null);
      if (loc) {
          setLocation(loc);
          loadHeatmapData();
          fetchSafeHavens(loc.coords.latitude, loc.coords.longitude);
      }
    })();
  }, []);

  const loadHeatmapData = async () => {
     try {
       // Load all rules stored locally from sync
       const kzRaw = await AsyncStorage.getItem('rules_Kazakhstan');
       const uaeRaw = await AsyncStorage.getItem('rules_UAE');
       const kzRules: Rule[] = kzRaw ? JSON.parse(kzRaw) : [];
       const uaeRules: Rule[] = uaeRaw ? JSON.parse(uaeRaw) : [];
       
       // Filter only rules with coordinates (Geofenced rules)
       const localized = [...kzRules, ...uaeRules].filter(r => r.location !== null);
       setCultureHeatmap(localized);
       console.log(`[Heatmap] Loaded ${localized.length} restrictive points.`);
     } catch (e) {
       console.log("Failed to load heatmap data");
     }
  };

  const fetchSafeHavens = async (lat: number, lon: number) => {
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
    } catch (e) {}
  };

  // WEB MODE: Use an Iframe (OpenStreetMap)
  if (Platform.OS === 'web') {
      const lat = location?.coords?.latitude || 25.2532;
      const lon = location?.coords?.longitude || 55.3657;
      const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01},${lat-0.01},${lon+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lon}`;
      return (
          <View style={styles.container}>
              <View style={styles.webHeader}><Text style={styles.webHeaderText}>🌍 Global Guardian Heatmap (Web)</Text></View>
              <iframe src={mapUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Roamly Map" />
          </View>
      );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: location?.coords?.latitude || 25.0719,
          longitude: location?.coords?.longitude || 55.1319,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }}
        showsUserLocation={true}
      >
        {/* Cultural Density Heatmap (Geofenced Rules) */}
        {cultureHeatmap.map((rule, index) => (
          <React.Fragment key={`rule-${index}`}>
            <Circle 
               center={{ latitude: rule.location!.latitude, longitude: rule.location!.longitude }} 
               radius={2000} // Significant area of influence
               fillColor={rule.urgency === 1 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.3)'} 
               strokeColor={rule.urgency === 1 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(245, 158, 11, 0.5)'} 
            />
            <Marker 
               coordinate={{ latitude: rule.location!.latitude, longitude: rule.location!.longitude }} 
               title={rule.category}
               description={rule.rule}
               pinColor={rule.urgency === 1 ? 'red' : 'orange'}
            />
          </React.Fragment>
        ))}

        {/* Safe Havens (Blue/Green Markers) */}
        {safeHavens.map((haven, i) => (
           <Marker 
             key={`haven-${i}`} 
             coordinate={{ latitude: haven.lat || 0, longitude: haven.lon || 0 }} 
             pinColor={haven.type === 'medical' ? 'blue' : 'green'}
             title={haven.name}
             description={haven.address}
           />
        ))}
      </MapView>

      <View style={styles.overlay}>
        <View style={styles.legendRow}><View style={[styles.dot, { backgroundColor: '#EF4444' }]} /><Text style={styles.legendText}>Restricted (Legal Risk)</Text></View>
        <View style={styles.legendRow}><View style={[styles.dot, { backgroundColor: '#F59E0B' }]} /><Text style={styles.legendText}>Sensitive (Cultural)</Text></View>
        <View style={styles.legendRow}><View style={[styles.dot, { backgroundColor: 'blue' }]} /><Text style={styles.legendText}>Medical Havens</Text></View>
      </View>
      
      <TouchableOpacity style={styles.refreshBtn} onPress={() => loadHeatmapData()}>
          <Ionicons name="refresh" size={24} color="#fff" />
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
