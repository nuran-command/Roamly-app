import { StyleSheet, TouchableOpacity, Text, View, Platform, Alert, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Link } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Lazy load notifications because they crash on Web/Expo Go standard
let Notifications: any = null;
if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
}

export default function CurrentStatusScreen() {
  const [status, setStatus] = useState("Scanning environment...");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [profile, setProfile] = useState("Solo Traveler"); 
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    (async () => {
      // 1. GPS Permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      
      // 2. Firebase Notifications Setup (Safe)
      if (Platform.OS !== 'web' && Device.isDevice) {
        registerForPushNotificationsAsync().then(token => {
            if (token) sendTokenToBackend(token);
        });
      }

      const cached = await AsyncStorage.getItem(`cached_status`);
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
        body: JSON.stringify({
          email: "test-user@roamly.com", // Placeholder
          token: token
        })
      });
    } catch (e) {
      console.log("Error sending FCM token:", e);
    }
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
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return token;
  }

  const checkStatus = async () => {
    setLoading(true);
    setStatus("Pinging Java Backend...");
    try {
      if (!location) {
        setStatus("Waiting for GPS...");
        setLoading(false);
        return;
      }
      
      const API_URL = 'http://192.168.0.5:8080';
      const res = await fetch(`${API_URL}/api/ai/safety-check`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: location.coords.latitude,
          lon: location.coords.longitude
        })
      });
      
      const data = await res.json();
      setStatus(data.alert || "Safe Zone. You're good to explore.");
      setIsOffline(false);

      await AsyncStorage.setItem('cached_status', JSON.stringify({
        alert: data.alert,
        timestamp: new Date().getTime()
      }));
      
      if (data.status === "RESTRICTED") {
          Alert.alert(
            "📍 ROAMLY RED ALERT",
            data.alert + "\n\nAI Insight: " + (data.ai_insight?.tip || "Please be careful."),
            [{ text: "I understand", style: "destructive" }]
          );
      }
      
    } catch (error) {
      setIsOffline(true);
      const cached = await AsyncStorage.getItem('cached_status');
      if (cached) {
          const parsed = JSON.parse(cached);
          setStatus(parsed.alert + " (Offline Mode)");
      } else {
          setStatus("Error connecting to backend");
      }
    } finally {
      setLoading(false);
    }
  };

  const profiles = [
    { label: "Solo Traveler", icon: "person" },
    { label: "Family", icon: "people" },
    { label: "Business", icon: "briefcase" }
  ];

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={64} color="#3B82F6" />
          <Text style={styles.title}>Roamly</Text>
          <Text style={styles.subtitle}>Your AI Travel Guardian</Text>
        </View>

        <View style={styles.profileSection}>
          <Text style={styles.sectionLabel}>I am traveling as:</Text>
          <View style={styles.profileRow}>
            {profiles.map((p: any) => (
              <TouchableOpacity 
                key={p.label} 
                onPress={() => setProfile(p.label)}
                style={[styles.profileBtn, profile === p.label && styles.profileBtnActive]}
              >
                <Ionicons name={p.icon} size={18} color={profile === p.label ? "#fff" : "#94a3b8"} />
                <Text style={[styles.profileBtnText, profile === p.label && styles.profileBtnTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={[styles.statusBox, isOffline && styles.offlineBox]}>
          <Text style={styles.statusLabel}>{isOffline ? "Current Area (Offline)" : "Live GPS Status"}</Text>
          <Text style={styles.statusValue}>{errorMsg ? errorMsg : status}</Text>
          {location && (
            <Text style={styles.coordText}>
              Lat: {location.coords.latitude.toFixed(4)}, Lon: {location.coords.longitude.toFixed(4)}
            </Text>
          )}
        </View>

        <TouchableOpacity 
          style={styles.scanButton} 
          onPress={checkStatus} 
          disabled={loading}
        >
          <Ionicons name="radio-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.scanButtonText}>{loading ? "Scanning..." : "Scan Surroundings"}</Text>
        </TouchableOpacity>

        <Link href="/chat" asChild>
          <TouchableOpacity style={styles.chatButton}>
            <Ionicons name="chatbubbles-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Ask AI Guardian</Text>
          </TouchableOpacity>
        </Link>
        
        <Link href="/scanner" asChild>
          <TouchableOpacity style={styles.scanMenuButton}>
            <Ionicons name="scan-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Menu Translation Scanner</Text>
          </TouchableOpacity>
        </Link>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A', 
    paddingTop: Platform.OS === 'android' ? 40 : 50,
  },
  container: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  profileSection: {
    width: '100%',
    marginBottom: 20,
  },
  sectionLabel: {
    color: '#94A3B8',
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    flex: 0.32,
    justifyContent: 'center',
  },
  profileBtnActive: {
    backgroundColor: '#3B82F6',
  },
  profileBtnText: {
    color: '#94A3B8',
    fontSize: 10,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  profileBtnTextActive: {
    color: '#fff',
  },
  statusBox: {
    backgroundColor: '#1E293B',
    width: '100%',
    padding: 25,
    borderRadius: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#334155',
  },
  offlineBox: {
    borderColor: '#F59E0B',
  },
  statusLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  statusValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  coordText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 15,
  },
  scanButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6', 
    paddingVertical: 18,
    borderRadius: 15,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatButton: {
    flexDirection: 'row',
    backgroundColor: '#8B5CF6', 
    paddingVertical: 16,
    borderRadius: 15,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  scanMenuButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981', 
    paddingVertical: 16,
    borderRadius: 15,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
