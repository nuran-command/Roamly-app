import { StyleSheet, TouchableOpacity, Text, View, Platform, Alert, ScrollView, SafeAreaView } from 'react-native';
import { useState, useEffect } from 'react';
import { Link } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Storage from '../../utils/storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Push Notification Safe Import (Dynamic)
let Notifications: any = null;
const loadNotifications = async () => {
  if (Platform.OS !== 'web' && !Notifications) {
     try {
       Notifications = require('expo-notifications');
     } catch (e) {
       console.log("Notifications not available in Expo Go");
     }
  }
};

export default function CurrentStatusScreen() {
  const [status, setStatus] = useState("Scanning environment...");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [disasters, setDisasters] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // 1. Initial Load & Permissions
      loadNotifications();
      let { status: gpsStatus } = await Location.requestForegroundPermissionsAsync();
      if (gpsStatus !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      
      // 2. Register for Push if on real device
      if (Platform.OS !== 'web' && Device.isDevice && Notifications) {
         registerForPushNotificationsAsync().then(token => {
            if (token) sendTokenToBackend(token);
         });
      }

      // 3. Load Cached Status
      const cached = await Storage.getItem(`cached_status`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setStatus(parsed.alert + " (Cached)");
      } else {
        setStatus("Safe Zone. No active alerts.");
      }
    })();
  }, []);

  async function sendTokenToBackend(token: string) {
    try {
      await fetch('http://192.168.0.5:8080/api/user/fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: "explorer@roamly.com", token: token })
      });
    } catch (e) {}
  }

  async function registerForPushNotificationsAsync() {
    if (!Notifications || !Device.isDevice) return;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.expoConfig?.owner;
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  }

  const checkStatus = async () => {
    setLoading(true);
    setStatus("Analysing surroundings...");
    try {
      if (!location) return;
      
      const API_URL = 'http://192.168.0.5:8080';
      const PYTHON_URL = 'http://127.0.0.1:8000'; // Or your local IP

      // 1. Get Safety Status from Java
      const res = await fetch(`${API_URL}/api/ai/safety-check`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: location.coords.latitude, lon: location.coords.longitude })
      });
      const data = await res.json();
      
      // 2. Get Exchange Rate from Python (New!)
      try {
        const xres = await fetch(`${PYTHON_URL}/currency-swap?base=AED&target=KZT`, { method: 'POST' });
        const xdata = await xres.json();
        setExchangeRate(xdata.rate?.KZT?.rate_for_amount?.toFixed(2));
      } catch (e) {}

      setStatus(data.alert || "Safe Zone. No active alerts.");
      setDisasters(data.emergency_disasters || []);
      setIsOffline(false);

      await Storage.setItem('cached_status', JSON.stringify({ alert: data.alert, timestamp: new Date().getTime() }));
      
      if (data.status === "RESTRICTED") {
          Alert.alert("🚨 ROAMLY RED ALERT", data.alert);
      }
      
    } catch (error) {
      setIsOffline(true);
      const cached = await Storage.getItem('cached_status');
      if (cached) {
          const parsed = JSON.parse(cached);
          setStatus(parsed.alert + " (Offline)");
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
          <Text style={styles.intelText}>💰 1 AED ≈ {exchangeRate || "--.--"} KZT</Text>
          <Text style={styles.intelText}>⚡️ AI Shield: Active</Text>
        </View>

        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={64} color="#3B82F6" />
          <Text style={styles.title}>Roamly</Text>
          <Text style={styles.subtitle}>Unified Safety & Discovery</Text>
        </View>

        {/* Major Emergencies (GDACS) */}
        {disasters.length > 0 && (
          <View style={styles.disasterBox}>
            <Text style={styles.disasterTitle}>📢 Regional Emergency Alerts (GDACS)</Text>
            {disasters.map((d, i) => (
              <Text key={i} style={styles.disasterText}>• {d.name} ({d.severity})</Text>
            ))}
          </View>
        )}
        
        <View style={[styles.statusBox, isOffline && styles.offlineBox]}>
          <Text style={styles.statusLabel}>{isOffline ? "Current Area (Offline)" : "Live Context Status"}</Text>
          <Text style={styles.statusValue}>{status}</Text>
        </View>

        <TouchableOpacity style={styles.scanButton} onPress={checkStatus} disabled={loading}>
          <Ionicons name="radio-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.scanButtonText}>{loading ? "Pinging Sensors..." : "Rescan Environment"}</Text>
        </TouchableOpacity>

        <View style={styles.gridContainer}>
           <Link href="/chat" asChild>
            <TouchableOpacity style={styles.gridBtn}>
              <Ionicons name="chatbubbles-outline" size={32} color="#fff" />
              <Text style={styles.gridBtnText}>Ask Guru</Text>
            </TouchableOpacity>
           </Link>
           <Link href="/scanner" asChild>
            <TouchableOpacity style={[styles.gridBtn, { backgroundColor: '#10B981' }]}>
              <Ionicons name="scan-outline" size={32} color="#fff" />
              <Text style={styles.gridBtnText}>Gastro Scan</Text>
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
  intelBar: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#1E293B', marginBottom: 20 },
  intelText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 10 },
  subtitle: { fontSize: 14, color: '#94A3B8' },
  disasterBox: { backgroundColor: '#7F1D1D', width: '100%', padding: 15, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#B91C1C' },
  disasterTitle: { color: '#FCA5A5', fontWeight: 'bold', fontSize: 13, marginBottom: 8 },
  disasterText: { color: '#fff', fontSize: 12, marginBottom: 2 },
  statusBox: { backgroundColor: '#1E293B', width: '100%', padding: 25, borderRadius: 20, marginBottom: 25, borderWidth: 1, borderColor: '#334155' },
  offlineBox: { borderColor: '#F59E0B' },
  statusLabel: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10 },
  statusValue: { color: '#fff', fontSize: 18, fontWeight: '500' },
  scanButton: { flexDirection: 'row', backgroundColor: '#3B82F6', paddingVertical: 18, borderRadius: 15, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  scanButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  gridBtn: { backgroundColor: '#8B5CF6', flex: 0.48, height: 120, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  gridBtnText: { color: '#fff', fontWeight: 'bold', marginTop: 10 },
});
