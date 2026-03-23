import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// In-memory fallback if both storage engines fail
const memoryCache: Record<string, string> = {};

const Storage = {
    getItem: async (key: string) => {
        // 1. Web Fallback
        if (Platform.OS === 'web') {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                return memoryCache[key] || null;
            }
        }
        
        // 2. Native Storage (With robust crash protection)
        try {
            const val = await AsyncStorage.getItem(key);
            return val;
        } catch (e) {
            console.log("AsyncStorage failed, using memory fallback");
            return memoryCache[key] || null;
        }
    },
    setItem: async (key: string, value: string) => {
        // 1. Web Fallback
        if (Platform.OS === 'web') {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                memoryCache[key] = value;
            }
            return;
        }
        
        // 2. Native Storage
        try {
            await AsyncStorage.setItem(key, value);
        } catch (e) {
            memoryCache[key] = value;
        }
    }
};

export default Storage;
