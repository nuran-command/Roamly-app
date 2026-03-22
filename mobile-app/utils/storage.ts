import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const Storage = {
    getItem: async (key: string) => {
        if (Platform.OS === 'web') {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                return null;
            }
        }
        return await AsyncStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
        if (Platform.OS === 'web') {
            try {
                localStorage.setItem(key, value);
            } catch (e) {}
            return;
        }
        await AsyncStorage.setItem(key, value);
    }
};

export default Storage;
