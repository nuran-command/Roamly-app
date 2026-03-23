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
  const [status, setStatus] = useState("Scanning environment...");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [disasters, setDisasters] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);
  const [country, setCountry] = useState("Kazakhstan (Demo)");
  const [language, setLanguage] = useState("Russian");

  // CHANGE THIS TO YOUR COMPUTER'S IP (Same as Java)
  const BASE_IP = '192.168.0.5'; 

  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
        let { status: gpsStatus } = await Location.requestForegroundPermissionsAsync();
        if (gpsStatus !== 'granted') return;
        
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.LocationAccuracy.Balanced });
        if (loc && mounted.current) {
            setLocation(loc);
            detectCountry(loc.coords.latitude);
        }

        const cached = await Storage.getItem(`cached_status`);
        if (cached && mounted.current) {
            const parsed = JSON.parse(cached);
            setStatus(parsed.alert + " (Cached)");
        }
      } catch (e) {
        console.log("Startup fail - using fallback");
      }
    })();
    return () => { mounted.current = false; };
  }, []);

  const detectCountry = (lat: number) => {
    if (lat > 40 && lat < 55) {
        setCountry("Kazakhstan");
        setLanguage("Russian");
    } else if (lat > 20 && lat < 28) {
        setCountry("UAE");
        setLanguage("English");
    } else {
        setCountry("International");
    }
  };

  const checkStatus = async () => {
    setLoading(true);
    setStatus("Analysing surroundings...");
    try {
      const lat = location?.coords?.latitude || 51.1255;
      const lon = location?.coords?.longitude || 71.4705;

      // 1. Safety Scan (Java)
      const res = await fetch(`http://${BASE_IP}:8080/api/ai/safety-check`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, language }) 
      });
      const data = await res.json();
      
      // 2. Currency Scan
      fetchCurrency();

      setStatus(data.alerts || "Environment is safe.");
      setDisasters(data.emergency_disasters || []);
      setIsOffline(false);

      await Storage.setItem('cached_status', JSON.stringify({ alert: data.alerts, timestamp: new Date().getTime() }));
    } catch (error) {
      setIsOffline(true);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const fetchCurrency = async () => {
     try {
        const pair = country.includes("Kazakhstan") ? "KZT" : "AED";
        // FETCHING AS GET NOW
        const xres = await fetch(`http://${BASE_IP}:8000/currency-swap?base=USD&target=${pair}`);
        const xdata = await xres.json();
        const rate = xdata.rate?.[pair]?.rate_for_amount;
        if (rate && mounted.current) setExchangeRate(rate.toFixed(2));
      } catch (e) {
        console.log("Currency link failed");
      }
  };

  useEffect(() => {
    if (exchangeRate === null) fetchCurrency();
  }, [country]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.intelBar}>
          <View style={styles.row}>
            <Text style={{ fontSize: 18 }}>{country.includes("UAE") ? "🇦🇪" : "🇰🇿"}</Text>
            <Text style={styles.intelText}> {country}</Text>
          </View>
          <TouchableOpacity onPress={fetchCurrency}>
             <Text style={styles.intelText}>💰 1 USD ≈ {exchangeRate || "??.??"} {country.includes("UAE") ? "AED" : "KZT"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
           <Ionicons name="shield-checkmark" size={60} color="#3B82F6" />
          <Text style={styles.title}>Roamly</Text>
          <Text style={styles.subtitle}>Autonomous Travel Guardian</Text>
        </View>

        {disasters.length > 0 && (
          <View style={styles.disasterBox}>
            <Text style={styles.disasterTitle}>📢 Regional Safety Alert</Text>
            {disasters.map((d, i) => (
              <Text key={i} style={styles.disasterText}>• {d.name} ({d.severity})</Text>
            ))}
          </View>
        )}
        
        <View style={[styles.statusBox, isOffline && styles.offlineBox]}>
          <Text style={styles.statusLabel}>Live Intelligence</Text>
          <Text style={styles.statusValue}>{status}</Text>
          <View style={styles.languageBadge}>
             <Text style={styles.languageBadgeText}>Language Active: {language}</Text>
          </View>
        </View>

        <TouchableOpacity 
           style={styles.scanButton} 
           onPress={checkStatus} 
           disabled={loading}
           activeOpacity={0.8}
        >
          <Ionicons name="radio-outline" size={24} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.scanButtonText}>{loading ? "Pinging..." : "Scan Surroundings"}</Text>
        </TouchableOpacity>

        <View style={styles.gridContainer}>
           <TouchableOpacity 
             style={styles.gridBtn} 
             onPress={() => router.push('/chat')}
             activeOpacity={0.8}
           >
              <Ionicons name="chatbubbles-outline" size={32} color="#fff" />
              <Text style={styles.gridBtnText}>{language === "Russian" ? "Спросить ИИ" : "Ask AI"}</Text>
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.gridBtn, { backgroundColor: '#10B981' }]} 
             onPress={() => router.push('/scanner')}
             activeOpacity={0.8}
           >
              <Ionicons name="scan-outline" size={32} color="#fff" />
              <Text style={styles.gridBtnText}>{language === "Russian" ? "Картинки" : "Scanner"}</Text>
           </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  container: { padding: 20, alignItems: 'center', paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center' },
  intelBar: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#1E293B', marginBottom: 20 },
  intelText: { color: '#94A3B8', fontSize: 13, fontWeight: 'bold' },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 10 },
  subtitle: { fontSize: 14, color: '#64748B' },
  disasterBox: { backgroundColor: '#450a0a', width: '100%', padding: 15, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#991b1b' },
  disasterTitle: { color: '#fca5a5', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase', marginBottom: 8 },
  disasterText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  statusBox: { backgroundColor: '#1E293B', width: '100%', padding: 25, borderRadius: 25, marginBottom: 25, borderWidth: 1, borderColor: '#334155' },
  offlineBox: { borderColor: '#B45309' },
  statusLabel: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 },
  statusValue: { color: '#fff', fontSize: 18, fontWeight: '500', lineHeight: 26 },
  languageBadge: { backgroundColor: 'rgba(59, 130, 246, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 15, alignSelf: 'flex-start' },
  languageBadgeText: { color: '#3B82F6', fontSize: 11, fontWeight: 'bold' },
  scanButton: { flexDirection: 'row', backgroundColor: '#3B82F6', paddingVertical: 20, borderRadius: 18, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  scanButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  gridBtn: { backgroundColor: '#8B5CF6', flex: 0.48, height: 115, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  gridBtnText: { color: '#fff', fontWeight: 'bold', marginTop: 12, fontSize: 14 },
});
