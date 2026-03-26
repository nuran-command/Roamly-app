import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Platform, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Rule } from '../utils/safetyManager';
import { mapStyle } from '../utils/mapStyles';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [filter, setFilter] = useState<'all' | 'risk' | 'haven'>('all');

  const BASE_IP = '192.168.0.5'; 
  const cardY = useSharedValue(SCREEN_HEIGHT);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }],
  }));

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
       const kzRaw = await AsyncStorage.getItem('rules_Kazakhstan');
       const uaeRaw = await AsyncStorage.getItem('rules_UAE');
       const kzRules: Rule[] = kzRaw ? JSON.parse(kzRaw) : [];
       const uaeRules: Rule[] = uaeRaw ? JSON.parse(uaeRaw) : [];
       const localized = [...kzRules, ...uaeRules].filter(r => r.location !== null);
       setCultureHeatmap(localized);
     } catch (e) {}
  };

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
    } finally {
      setLoading(false);
    }
  };

  const onMarkerPress = (rule: Rule) => {
      setSelectedRule(rule);
      cardY.value = withSpring(SCREEN_HEIGHT - 350, { damping: 15 });
  };

  const closeCard = () => {
      cardY.value = withSpring(SCREEN_HEIGHT);
      setSelectedRule(null);
  };

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
        customMapStyle={mapStyle}
        initialRegion={{
          latitude: location?.coords?.latitude || 25.0719,
          longitude: location?.coords?.longitude || 55.1319,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation={true}
        onPress={closeCard}
      >
        {(filter === 'all' || filter === 'risk') && cultureHeatmap.map((rule, index) => (
          <React.Fragment key={`rule-${index}`}>
            <Circle 
               center={{ latitude: rule.location!.latitude, longitude: rule.location!.longitude }} 
               radius={1500}
               fillColor={rule.urgency === 1 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.3)'} 
               strokeColor={rule.urgency === 1 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(245, 158, 11, 0.5)'} 
            />
            <Marker 
               coordinate={{ latitude: rule.location!.latitude, longitude: rule.location!.longitude }} 
               onPress={() => onMarkerPress(rule)}
            >
                <View style={[styles.customMarker, { borderColor: rule.urgency === 1 ? '#EF4444' : '#F59E0B' }]}>
                    <Ionicons name="shield" size={16} color={rule.urgency === 1 ? '#EF4444' : '#F59E0B'} />
                </View>
            </Marker>
          </React.Fragment>
        ))}

        {(filter === 'all' || filter === 'haven') && safeHavens.map((haven, i) => (
           <Marker 
             key={`haven-${i}`} 
             coordinate={{ latitude: haven.lat || 0, longitude: haven.lon || 0 }} 
             pinColor={haven.type === 'medical' ? 'blue' : 'green'}
             title={haven.name}
           />
        ))}
      </MapView>

      <View style={styles.filterHub}>
         <TouchableOpacity onPress={() => setFilter('all')} style={[styles.filterBtn, filter === 'all' && styles.activeFilter]}><Text style={styles.filterText}>All</Text></TouchableOpacity>
         <TouchableOpacity onPress={() => setFilter('risk')} style={[styles.filterBtn, filter === 'risk' && styles.activeFilter]}><Text style={styles.filterText}>Risks</Text></TouchableOpacity>
         <TouchableOpacity onPress={() => setFilter('haven')} style={[styles.filterBtn, filter === 'haven' && styles.activeFilter]}><Text style={styles.filterText}>Havens</Text></TouchableOpacity>
      </View>

      <Animated.View style={[styles.detailCard, animatedCardStyle]}>
          {selectedRule && (
              <View>
                  <View style={styles.cardHeader}>
                      <Text style={styles.categoryTitle}>{selectedRule.category}</Text>
                      <View style={[styles.badge, { backgroundColor: selectedRule.urgency === 1 ? '#EF4444' : '#F59E0B' }]}>
                          <Text style={styles.badgeText}>{selectedRule.urgency === 1 ? 'URGENT' : 'ADVISORY'}</Text>
                      </View>
                  </View>
                  <Text style={styles.ruleText}>{selectedRule.rule}</Text>
                  <View style={styles.penaltyBox}>
                      <Text style={styles.penaltyLabel}>PENALTY / CONSEQUENCE</Text>
                      <Text style={styles.penaltyText}>{selectedRule.penalty}</Text>
                  </View>
              </View>
          )}
      </Animated.View>
      
      <TouchableOpacity style={styles.refreshBtn} onPress={() => { loadHeatmapData(); fetchSafeHavens(location?.coords?.latitude, location?.coords?.longitude); }}>
          <Ionicons name="sync" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  map: { width: '100%', height: '100%' },
  filterHub: { position: 'absolute', top: 60, alignSelf: 'center', flexDirection: 'row', backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 5, borderRadius: 25, borderWidth: 1, borderColor: '#1E293B' },
  filterBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  activeFilter: { backgroundColor: '#3B82F6' },
  filterText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  webHeader: { padding: 20, backgroundColor: '#1E293B', alignItems: 'center' },
  webHeaderText: { color: '#fff', fontWeight: 'bold' },
  detailCard: { position: 'absolute', bottom: 0, width: '90%', alignSelf: 'center', backgroundColor: '#1E293B', padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderLeftWidth: 1, borderRightWidth: 1, borderTopWidth: 1, borderColor: '#334155', elevation: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  categoryTitle: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  ruleText: { color: '#fff', fontSize: 16, fontWeight: '500', lineHeight: 24, marginBottom: 20 },
  penaltyBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 15, borderRadius: 15, borderLeftWidth: 4, borderColor: '#EF4444' },
  penaltyLabel: { color: '#94A3B8', fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
  penaltyText: { color: '#CBD5E1', fontSize: 13, lineHeight: 18 },
  customMarker: { backgroundColor: '#1E293B', padding: 5, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  refreshBtn: { position: 'absolute', top: 120, right: 20, backgroundColor: '#3B82F6', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5 }
});
