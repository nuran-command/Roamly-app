import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import * as Location from 'expo-location';

// Lazy load MapView because it crashes in Expo Go / Web
let MapView: any = View; // Fallback
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
  } catch (e) {
     console.log("Maps not supported in this environment");
  }
}

export default function MapScreen() {
  const [location, setLocation] = useState<any>(null);

  const zones = [
    { id: 1, title: "Dubai Airport", lat: 25.2532, lon: 55.3657, radius: 1000 },
    { id: 2, title: "Mosque Area", lat: 24.8088, lon: 55.1542, radius: 1000 },
    { id: 3, title: "Presidential Palace", lat: 51.1261, lon: 71.4461, radius: 1000 },
    { id: 4, title: "Hazrat Sultan Mosque", lat: 51.1255, lon: 71.4705, radius: 1000 },
  ];

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  if (Platform.OS === 'web' || MapView === View) {
      return (
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center', padding: 20 }}>
                  Interactive Map requires a Development Build.{"\n"}{"\n"}
                  Check the 'Home' tab for live GPS alerts!
              </Text>
          </View>
      )
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: location?.coords?.latitude || 25.2048,
          longitude: location?.coords?.longitude || 55.2708,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation={true}
      >
        {zones.map(zone => (
          <React.Fragment key={zone.id}>
            <Marker
              coordinate={{ latitude: zone.lat, longitude: zone.lon }}
              title={zone.title}
              description="Restricted Zone - High Alert"
              pinColor="red"
            />
            <Circle
              center={{ latitude: zone.lat, longitude: zone.lon }}
              radius={zone.radius}
              fillColor="rgba(255, 0, 0, 0.2)"
              strokeColor="rgba(255, 0, 0, 0.5)"
            />
          </React.Fragment>
        ))}
      </MapView>
      <View style={styles.overlay}>
        <Text style={styles.legend}>🔴 Restricted Zones (Legally Sensitive)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    padding: 15,
    borderRadius: 15,
  },
  legend: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  }
});
