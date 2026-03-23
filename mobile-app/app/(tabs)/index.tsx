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
  const [isOffline, setIsOffline] = useState(false);
  const [disasters, setDisasters] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);
  const [country, setCountry] = useState("Kazakhstan (Demo)");
  const [language, setLanguage] = useState("Russian");

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
        const xres = await fetch(`http://${BASE_IP}:8000/currency-swap?base=USD&target=${pair}`);
        const xdata = await xres.json();
        const rate = xdata.rate?.[pair]?.rate_for_amount;
        if (rate && mounted.current) setExchangeRate(rate.toFixed(2));
      } catch (e) {}
  };

  const getHospitals = async () => {
      if (!location) return;
      try {
          const res = await fetch(`http://${BASE_IP}:8000/safe-havens`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lat: location.coords.latitude, lon: location.coords.longitude })
          });
          const data = await res.json();
          const first_hosp = data.hospitals?.[0]?.name || "Nearest Hospital";
          Alert.alert("🚨 SAFE HAVENS FOUND", `Nearest Medical: ${first_hosp}.\n\nNavigation starting...`, [
              { text: "View on Map", onPress: () => router.push('/map') },
              { text: "Dismiss" }
          ]);
      } catch (e) {}
  };

  const checkStatus = async () => {
    setLoading(true);
    setStatus("Analysing surroundings...");
    try {
      const lat = location?.coords?.latitude || 51.1255;
      const lon = location?.coords?.longitude || 71.4705;

      const res = await fetch(`http://${BASE_IP}:8000/safety-check`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon }) 
      });
      const data = await res.json();
      
      setVibe(data.vibe || "Stable Baseline");
      fetchCurrency();

      setStatus(data.alerts && typeof data.alerts !== 'string' ? "Zone Rules Active." : data.alerts);
      setDisasters(data.emergency_disasters || []);
      setIsOffline(false);
    } catch (error) {
      setIsOffline(true);
      setStatus("Intelligence Service Offline.");
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
          <Text style={styles.intelText}>💰 1 USD ≈ {exchangeRate || "??.??"} {country.includes("Kazakhstan") ? "KZT" : "AED"}</Text>
        </View>

        <View style={styles.header}>
           <Ionicons name="shield-checkmark" size={60} color="#3B82F6" />
          <Text style={styles.title}>Roamly</Text>
          <Text style={styles.vibeMeter}>Vibe: {vibe}</Text>
        </View>

        {disasters.length > 0 && (
          <View style={styles.disasterBox}>
            <Text style={styles.disasterTitle}>📢 Regional Alert</Text>
            {disasters.map((d, i) => (
              <Text key={i} style={styles.disasterText}>• {d.name}</Text>
            ))}
          </View>
        )}
        
        <View style={[styles.statusBox, isOffline && styles.offlineBox]}>
          <Text style={styles.statusLabel}>Guardian Insights</Text>
          <Text style={styles.statusValue}>{status}</Text>
        </View>

        <TouchableOpacity style={styles.scanButton} onPress={checkStatus} disabled={loading}>
          <Ionicons name="radio-outline" size={24} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.scanButtonText}>{loading ? "Analysing..." : "Scan Surroundings"}</Text>
        </TouchableOpacity>

        <View style={styles.gridContainer}>
           <TouchableOpacity 
             style={styles.gridBtn} 
             onPress={() => router.push('/chat')}
             activeOpacity={0.8}
           >
              <Ionicons name="chatbubbles-outline" size={32} color="#fff" />
              <Text style={styles.gridBtnText}>Ask Guru</Text>
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.gridBtn, { backgroundColor: '#B91C1C' }]} 
             onPress={getHospitals}
             activeOpacity={0.8}
           >
              <Ionicons name="medical" size={32} color="#fff" />
              <Text style={styles.gridBtnText}>Safe Havens</Text>
           </TouchableOpacity>
        </View>

        <TouchableOpacity 
            style={styles.secondaryBtn} 
            onPress={() => router.push('/scanner')}
        >
            <Ionicons name="camera-outline" size={24} color="#94A3B8" />
            <Text style={styles.secondaryBtnText}>AI Gastro Health Guard</Text>
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
  disasterBox: { backgroundColor: '#450a0a', width: '100%', padding: 15, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#991b1b' },
  disasterTitle: { color: '#fca5a5', fontWeight: 'bold', fontSize: 12, marginBottom: 8 },
  disasterText: { color: '#fff', fontSize: 13 },
  statusBox: { backgroundColor: '#1E293B', width: '100%', padding: 25, borderRadius: 25, marginBottom: 25, borderWidth: 1, borderColor: '#334155' },
  offlineBox: { borderColor: '#B45309' },
  statusLabel: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15 },
  statusValue: { color: '#fff', fontSize: 18, fontWeight: '500', lineHeight: 26 },
  scanButton: { flexDirection: 'row', backgroundColor: '#3B82F6', paddingVertical: 20, borderRadius: 18, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  scanButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  gridBtn: { backgroundColor: '#8B5CF6', flex: 0.48, height: 115, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  gridBtnText: { color: '#fff', fontWeight: 'bold', marginTop: 12, fontSize: 14 },
  secondaryBtn: { flexDirection: 'row', marginTop: 30, backgroundColor: '#1E293B', width: '100%', padding: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderStyle: 'dotted', borderWidth: 1, borderColor: '#334155' },
  secondaryBtnText: { color: '#94A3B8', fontWeight: '600', marginLeft: 10 }
});
