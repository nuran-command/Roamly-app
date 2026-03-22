import { StyleSheet, TouchableOpacity, Text, View, Platform, Alert, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Link } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Storage from '../../utils/storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CurrentStatusScreen() {
  const [status, setStatus] = useState("Scanning environment...");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [disasters, setDisasters] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // 1. GPS Permissions
      let { status: gpsStatus } = await Location.requestForegroundPermissionsAsync();
      if (gpsStatus !== 'granted') return;
      
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      
      // 2. Load Cached Status
      const cached = await Storage.getItem(`cached_status`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setStatus(parsed.alert + " (Cached)");
      } else {
        setStatus("Safe Zone. No active alerts.");
      }
    })();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    setStatus("Analysing surroundings...");
    try {
      if (!location) {
        setStatus("GPS not ready");
        setLoading(false);
        return;
      };
      
      const API_URL = 'http://192.168.0.5:8080';
      const PYTHON_URL = 'http://127.0.0.1:8000'; 

      // 1. Get Safety Status from Java
      const res = await fetch(`${API_URL}/api/ai/safety-check`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: location.coords.latitude, lon: location.coords.longitude })
      });
      const data = await res.json();
      
      // 2. Get Exchange Rate from Python
      try {
        // Updated to use your chosen AED -> KZT pair
        const xres = await fetch(`${PYTHON_URL}/currency-swap?base=AED&target=KZT`, { method: 'POST' });
        const xdata = await xres.json();
        const rate = xdata.rate?.KZT?.rate_for_amount;
        if (rate) setExchangeRate(rate.toFixed(2));
      } catch (e) {
        console.log("Python Backend Offline for Currency");
      }

      setStatus(data.alerts || "Safe Zone. No active alerts.");
      setDisasters(data.emergency_disasters || []);
      setIsOffline(false);

      await Storage.setItem('cached_status', JSON.stringify({ alert: data.alerts, timestamp: new Date().getTime() }));
      
      if (data.status === "RESTRICTED") {
          Alert.alert("🚨 ROAMLY RED ALERT", data.alerts);
      }
      
    } catch (error) {
      setIsOffline(true);
      const cached = await Storage.getItem('cached_status');
      if (cached) {
          const parsed = JSON.parse(cached);
          setStatus(parsed.alert + " (Offline Mode)");
      } else {
          setStatus("Network Error: Check Backends");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Intelligence Bar */}
        <View style={styles.intelBar}>
          <Text style={styles.intelText}>💰 1 AED ≈ {exchangeRate || "??.??"} KZT</Text>
          <Text style={styles.intelText}>⚡️ Shield: Active</Text>
        </View>

        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={64} color="#3B82F6" />
          <Text style={styles.title}>Roamly</Text>
          <Text style={styles.subtitle}>Autonomous Travel Guardian</Text>
        </View>

        {/* Emergency Alerts */}
        {disasters.length > 0 && (
          <View style={styles.disasterBox}>
            <Text style={styles.disasterTitle}>📢 Regional Emergency Alerts (GDACS)</Text>
            {disasters.map((d, i) => (
              <Text key={i} style={styles.disasterText}>• {d.name || "Unknown Threat"}</Text>
            ))}
          </View>
        )}
        
        <View style={[styles.statusBox, isOffline && styles.offlineBox]}>
          <Text style={styles.statusLabel}>{isOffline ? "Status (Offline)" : "Local Intelligence"}</Text>
          <Text style={styles.statusValue}>{status}</Text>
        </View>

        <TouchableOpacity style={styles.scanButton} onPress={checkStatus} disabled={loading}>
          <Ionicons name="radio-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.scanButtonText}>{loading ? "Analysing..." : "Scan Surroundings"}</Text>
        </TouchableOpacity>

        {/* Action Grid */}
        <View style={styles.gridContainer}>
           <Link href="/chat" asChild>
            <TouchableOpacity style={styles.gridBtn} activeOpacity={0.7}>
              <View style={styles.centered}>
                <Ionicons name="chatbubbles-outline" size={32} color="#fff" />
                <Text style={styles.gridBtnText}>Ask AI</Text>
              </View>
            </TouchableOpacity>
           </Link>
           <Link href="/scanner" asChild>
            <TouchableOpacity style={[styles.gridBtn, { backgroundColor: '#10B981' }]} activeOpacity={0.7}>
              <View style={styles.centered}>
                <Ionicons name="scan-outline" size={32} color="#fff" />
                <Text style={styles.gridBtnText}>Scan Menu</Text>
              </View>
            </TouchableOpacity>
           </Link>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  container: { padding: 20, alignItems: 'center', paddingBottom: 40 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  intelBar: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#1E293B', marginBottom: 20 },
  intelText: { color: '#64748B', fontSize: 12, fontWeight: 'bold' },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 10 },
  subtitle: { fontSize: 14, color: '#94A3B8' },
  disasterBox: { backgroundColor: '#450a0a', width: '100%', padding: 15, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#991b1b' },
  disasterTitle: { color: '#fca5a5', fontWeight: 'bold', fontSize: 13, marginBottom: 5 },
  disasterText: { color: '#fff', fontSize: 12 },
  statusBox: { backgroundColor: '#1E293B', width: '100%', padding: 25, borderRadius: 20, marginBottom: 25, borderWidth: 1, borderColor: '#334155' },
  offlineBox: { borderColor: '#F59E0B' },
  statusLabel: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10 },
  statusValue: { color: '#fff', fontSize: 17, fontWeight: '500' },
  scanButton: { flexDirection: 'row', backgroundColor: '#3B82F6', paddingVertical: 18, borderRadius: 15, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  scanButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  gridBtn: { backgroundColor: '#8B5CF6', flex: 0.48, height: 110, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  gridBtnText: { color: '#fff', fontWeight: 'bold', marginTop: 8 },
});
