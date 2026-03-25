import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationManager } from './notificationManager';

const BASE_IP = '192.168.0.5'; // Replace with your actual local IP
const BASE_URL = `http://${BASE_IP}:8000`;

export interface Rule {
  category: string;
  urgency: number;
  trigger_zone: string;
  rule: string;
  penalty: string;
  location: { latitude: number; longitude: number; name: string } | null;
}

export const SafetyManager = {
  /**
   * Syncs rules from the backend to local storage for offline use.
   */
  async syncRules(country: string = 'Kazakhstan') {
    try {
      const res = await fetch(`${BASE_URL}/sync-all-rules?country=${country}`);
      if (res.ok) {
        const data = await res.json();
        // Save the complete set of rules locally
        await AsyncStorage.setItem(`rules_${country}`, JSON.stringify(data.rules));
        console.log(`[Safety Sync] Saved ${data.rules.length} rules locally.`);
      }
    } catch (e) {
      console.log("Sync failed: Data may be outdated if offline.");
    }
  },

  /**
   * Helper to perform geofence check locally for offline mode.
   */
  async checkLocalRules(lat: number, lon: number, speed: number, country: string = 'Kazakhstan'): Promise<Rule[]> {
    const raw = await AsyncStorage.getItem(`rules_${country}`);
    if (!raw) return [];
    
    const allRules: Rule[] = JSON.parse(raw);
    const triggered: Rule[] = [];

    // Simulate same logic as backend: proximity (1.5km) or general rules
    for (const rule of allRules) {
       // Check speed dependency
       if (speed > 20 && rule.category.toLowerCase().includes("driving")) {
           triggered.push(rule);
       } else if (speed > 0.5 && speed < 7 && rule.category.toLowerCase().includes("pedestrian")) {
           triggered.push(rule);
       }

       // Check proximity if location present
       if (rule.location) {
         const dist = this.getDistance(lat, lon, rule.location.latitude, rule.location.longitude);
         if (dist < 1.5) triggered.push(rule);
       }
    }
    return triggered;
  },

  getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  /**
   * Derives activity context from the user's location name (simplified POI detection).
   */
  async detectActivityContext(latitude: number, longitude: number): Promise<string> {
    try {
      const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (reverse.length > 0) {
        const place = reverse[0];
        const name = (place.name || "").toLowerCase();
        const street = (place.street || "").toLowerCase();

        if (name.includes('mall') || name.includes('center') || name.includes('boutique') || street.includes('shopping')) {
          return "shopping";
        }
        if (name.includes('restaurant') || name.includes('cafe') || name.includes('dining')) {
          return "dining";
        }
        if (name.includes('park') || name.includes('square') || name.includes('garden')) {
          return "park";
        }
      }
    } catch (e) {
      console.log("Activity detection failed");
    }
    return "general";
  },

  /**
   * Processes the location object, calculates speed, and triggers backend check.
   */
  async handleLocationPulse(location: Location.LocationObject) {
    const { latitude, longitude, speed } = location.coords;
    const speedKmh = (speed || 0) * 3.6;
    const activity = await this.detectActivityContext(latitude, longitude);

    try {
      const response = await fetch(`${BASE_URL}/safety-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: latitude,
          lon: longitude,
          speed: speedKmh,
          activity: activity
        })
      });

      const data = await response.json();
      
      if (data.alerts && Array.isArray(data.alerts) && data.alerts.length > 0) {
        const criticalAlert = data.alerts.find((r: Rule) => r.urgency === 1);
        if (criticalAlert) {
           this.speakAlert(criticalAlert.rule);
           NotificationManager.sendSafetyAlert("CRITICAL LEGAL ALERT", criticalAlert.rule);
        }
        return data.alerts;
      }
    } catch (e) {
      const offlineRules = await this.checkLocalRules(latitude, longitude, speedKmh);
      if (offlineRules.length > 0) {
        const critical = offlineRules.find(r => r.urgency === 1);
        if (critical) {
           this.speakAlert(critical.rule);
           NotificationManager.sendSafetyAlert("OFFLINE SAFETY WARNING", critical.rule);
        }
        return offlineRules;
      }
    }
    return [];
  },

  speakAlert(text: string) {
    Speech.speak(text, { language: 'en', rate: 0.9 });
  }
};
