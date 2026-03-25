import { StyleSheet, TouchableOpacity, Text, View, Platform, Alert, ScrollView } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SafetyManager, Rule } from '../../utils/safetyManager';

export default function CurrentStatusScreen() {
  const router = useRouter();
  const mounted = useRef(true);
  const [status, setStatus] = useState("Shielding Active...");
  const [vibe, setVibe] = useState("Normal Baseline");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);
  const [country, setCountry] = useState("Kazakhstan");
  const [language, setLanguage] = useState("Russian");
  const [alerts, setAlerts] = useState<Rule[]>([]);

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
            // Dynamic Country Detection
            const reverse = await Location.reverseGeocodeAsync({ 
                latitude: loc.coords.latitude, 
                longitude: loc.coords.longitude 
            });
            if (reverse.length > 0 && reverse[0].country) {
                const detectedCountry = reverse[0].country;
                if (detectedCountry === "Kazakhstan" || detectedCountry === "United Arab Emirates") {
                   setCountry(detectedCountry);
                   SafetyManager.syncRules(detectedCountry);
                }
            }
        }
      } catch (e) {}
    })();
    return () => { mounted.current = false; };
  }, []);

  const fetchCurrency = async () => {
     try {
        const pair = country === "Kazakhstan" ? "KZT" : "AED";
        const xres = await fetch(`http://${BASE_IP}:8000/currency-swap?base=USD&target=${pair}`);
        const xdata = await xres.json();
        const rate = xdata.rate?.[pair]?.rate_for_amount;
        if (rate && mounted.current) setExchangeRate(rate.toFixed(2));
      } catch (e) {
        console.log("Currency link failed");
      }
  };

  const checkStatus = async () => {
    setLoading(true);
    setStatus("Analysing surroundings...");
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.LocationAccuracy.High });
      if (mounted.current) setLocation(loc);

      // METHOD B: Use SafetyManager for Speed + Activity + Alerts
      const newAlerts = await SafetyManager.handleLocationPulse(loc);
      setAlerts(newAlerts);

      // Also get Vibe Score from backend
      const vibeRes = await fetch(`http://${BASE_IP}:8000/safety-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: loc.coords.latitude, lon: loc.coords.longitude })
      });
      const vibeData = await vibeRes.json();
      if (mounted.current) setVibe(vibeData.vibe || "Stable Baseline");

      if (newAlerts && newAlerts.length > 0) {
          setStatus(`${newAlerts.length} regional rules active in this area.`);
      } else {
          setStatus("No specific local restrictions detected. Proactive guarding on.");
      }
      
      fetchCurrency();
    } catch (error) {
      console.log("Safety Check Error", error);
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
