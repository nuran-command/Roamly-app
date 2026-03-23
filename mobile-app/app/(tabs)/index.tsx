import { StyleSheet, TouchableOpacity, Text, View, Platform, Alert, ScrollView } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Storage from '../../utils/storage';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CurrentStatusScreen() {
  const router = useRouter();
  const mounted = useRef(true);
  const [status, setStatus] = useState("Shielding Active...");
  const [vibe, setVibe] = useState("Normal Baseline");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);
  const [country, setCountry] = useState("Kazakhstan (Demo)");
  const [language, setLanguage] = useState("Russian");

  // REPLACED WITH YOUR NETWORK IP (192.168.0.5)
  const BASE_IP = '192.168.0.5'; 

  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
        let { status: gpsStatus } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));
        if (gpsStatus !== 'granted') return;
        
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.LocationAccuracy.Balanced }).catch(() => null);
        if (loc && mounted.current) {
            setLocation(loc);
            if (loc.coords.latitude > 40) { setCountry("Kazakhstan"); setLanguage("Russian"); }
        }
      } catch (e) {}
    })();
    return () => { mounted.current = false; };
  }, []);

  const fetchCurrency = async () => {
     try {
        const pair = country.includes("Kazakhstan") ? "KZT" : "AED";
        // Ensure this points to Python (8000)
        const xres = await fetch(`http://${BASE_IP}:8000/currency-swap?base=USD&target=${pair}`);
        const xdata = await xres.json();
        const rate = xdata.rate?.[pair]?.rate_for_amount;
        if (rate && mounted.current) setExchangeRate(rate.toFixed(2));
      } catch (e) {
        console.log("Currency link failed on", BASE_IP);
      }
  };

  const checkStatus = async () => {
    setLoading(true);
    setStatus("Analysing surroundings...");
    try {
      if (!location) { setStatus("GPS Offline. Using Mock."); }
      const lat = location?.coords?.latitude || 51.1255;
      const lon = location?.coords?.longitude || 71.4705;

      // Ensure this points to Python (8000)
      const res = await fetch(`http://${BASE_IP}:8000/safety-check`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon }) 
      });
      const data = await res.json();
      
      setVibe(data.vibe || "Stable Baseline");
      fetchCurrency();

      setStatus(data.alerts && typeof data.alerts !== 'string' ? "Zone Rules Active." : data.alerts);
    } catch (error) {
      console.log("Python Backend Offline on", BASE_IP);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (exchangeRate === null) fetchCurrency();
  }, [country]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.intelBar}>
          <Text style={styles.intelText}>📍 {country}</Text>
          <Text style={styles.intelText}>💰 1 USD ≈ {exchangeRate || "--.--"} {country.includes("Kazakhstan") ? "KZT" : "AED"}</Text>
        </View>

        <View style={styles.header}>
           <Ionicons name="shield-checkmark" size={60} color="#3B82F6" />
          <Text style={styles.title}>Roamly</Text>
          <Text style={styles.vibeMeter}>🔥 Status: {vibe}</Text>
        </View>

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Guardian Context</Text>
          <Text style={styles.statusValue}>{status}</Text>
        </View>

        <TouchableOpacity style={styles.scanButton} onPress={checkStatus} disabled={loading}>
          <Ionicons name="radio-outline" size={24} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.scanButtonText}>{loading ? "Pinging Grid..." : "Scan Surroundings"}</Text>
        </TouchableOpacity>

        {/* Action Grid */}
        <View style={styles.gridContainer}>
           <TouchableOpacity 
             style={styles.gridBtn} 
             onPress={() => router.push('/chat')}
           >
              <Ionicons name="chatbubbles-outline" size={32} color="#fff" />
              <Text style={styles.gridBtnText}>Ask AI</Text>
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.gridBtn, { backgroundColor: '#B91C1C' }]} 
             onPress={() => router.push('/map')}
           >
              <Ionicons name="medical" size={32} color="#fff" />
              <Text style={styles.gridBtnText}>Safe Havens</Text>
           </TouchableOpacity>
        </View>

        <TouchableOpacity 
            style={styles.sosButton} 
            onPress={() => Alert.alert("🆘 EMGENCY ALERT", "Sending location to local SOS...", [{ text: "Call Police", onPress: () => {} }, { text: "Cancel" }])}
        >
            <Ionicons name="flashlight" size={24} color="#F87171" style={{ marginRight: 10 }} />
            <Text style={styles.sosText}>Activate High-Alert SOS</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  container: { padding: 20, alignItems: 'center', paddingBottom: 40 },
  intelBar: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#1E293B', marginBottom: 20 },
  intelText: { color: '#94A3B8', fontSize: 13, fontWeight: 'bold' },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 10 },
  vibeMeter: { color: '#3B82F6', fontSize: 14, fontWeight: 'bold', marginTop: 5, textTransform: 'uppercase' },
  statusBox: { backgroundColor: '#1E293B', width: '100%', padding: 25, borderRadius: 25, marginBottom: 25, borderWidth: 1, borderColor: '#334155' },
  statusLabel: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15 },
  statusValue: { color: '#fff', fontSize: 18, fontWeight: '500', lineHeight: 26 },
  scanButton: { flexDirection: 'row', backgroundColor: '#3B82F6', paddingVertical: 20, borderRadius: 18, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  scanButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  gridBtn: { backgroundColor: '#8B5CF6', flex: 0.48, height: 115, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  gridBtnText: { color: '#fff', fontWeight: 'bold', marginTop: 12, fontSize: 14 },
  sosButton: { flexDirection: 'row', marginTop: 30, backgroundColor: 'rgba(239, 68, 68, 0.1)', width: '100%', padding: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EF4444' },
  sosText: { color: '#F87171', fontWeight: 'bold', fontSize: 16 }
});
