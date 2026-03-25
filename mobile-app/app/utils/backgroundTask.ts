import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { SafetyManager } from './safetyManager';

export const LOCATION_TASK_NAME = 'background-location-task';

// Define the task for background location scanning
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error(`[Background Task] Error: ${error.message}`);
    return;
  }
  
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const location = locations[0] as Location.LocationObject;
      console.log(`[Background Task] New Location: ${location.coords.latitude}, ${location.coords.longitude}`);
      
      // Perform safety pulse in the background
      await SafetyManager.handleLocationPulse(location);
    }
  }
});

export const BackgroundTaskManager = {
  /**
   * Register and start the background location task
   */
  async startBackgroundPulse() {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') return;
      
      // Check if background permissions are granted
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
          console.warn("[Background Task] Permission denied. Background scanning will not work.");
          return;
      }

      // Check if task exists and is already running
      const isStopped = !await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isStopped) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
           accuracy: Location.LocationAccuracy.Balanced,
           timeInterval: 300000, // every 5 minutes (300,000 ms)
           distanceInterval: 100, // or every 100 meters
           foregroundService: {
              notificationTitle: "🛡️ Roamly: Active Guardian",
              notificationBody: "Monitoring cultural rules in your area.",
              notificationColor: "#3B82F6",
           },
           pausesLocationUpdatesAutomatically: true,
        });
        console.log("[Background Task] Initialized 5-minute safety pulse.");
      }
    } catch (e) {
      console.error("[Background Task] Start failed", e);
    }
  },

  /**
   * Stop the background location task
   */
  async stopBackgroundPulse() {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log("[Background Task] Safety guardian suspended.");
    }
  }
};
