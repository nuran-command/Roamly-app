import { StyleSheet, TouchableOpacity, Text, View, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Storage from '../../utils/storage';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const [profile, setProfile] = useState("Solo Tourist");
    const [language, setLanguage] = useState("English");
    const [autoTranslate, setAutoTranslate] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const savedProfile = await Storage.getItem('user_profile');
                const savedLang = await Storage.getItem('user_lang');
                if (savedProfile) setProfile(savedProfile);
                if (savedLang) setLanguage(savedLang);
            } catch (e) {}
        })();
    }, []);

    const saveSettings = async (type: string, value: string) => {
        try {
            if (type === 'profile') {
                setProfile(value);
                await Storage.setItem('user_profile', value);
            } else {
                setLanguage(value);
                await Storage.setItem('user_lang', value);
            }
        } catch (e) {}
    };

    const profiles = ["Solo Tourist", "Business", "Student", "Family"];
    const languages = ["English", "Russian", "Kazakh", "Arabic"];

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Settings</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Traveler Profile</Text>
                    <Text style={styles.sectionDesc}>Tailors the AI's safety and cultural advice level.</Text>
                    <View style={styles.grid}>
                        {profiles.map(p => (
                            <TouchableOpacity 
                                key={p} 
                                style={[styles.btn, profile === p && styles.btnActive]}
                                onPress={() => saveSettings('profile', p)}
                            >
                                <Text style={[styles.btnText, profile === p && styles.btnTextActive]}>{p}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Primary Language</Text>
                    <View style={styles.grid}>
                        {languages.map(l => (
                            <TouchableOpacity 
                                key={l} 
                                style={[styles.btn, language === l && styles.btnActive]}
                                onPress={() => saveSettings('language', l)}
                            >
                                <Text style={[styles.btnText, language === l && styles.btnTextActive]}>{l}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.footer}>
                     <Text style={styles.footerText}>Roamly v1.0.0 (Protected Storage)</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0F172A' },
    container: { padding: 25 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 30 },
    section: { marginBottom: 35 },
    sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    sectionDesc: { color: '#94A3B8', fontSize: 13, marginBottom: 15, lineHeight: 18 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    btn: { backgroundColor: '#1E293B', width: '48%', paddingVertical: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    btnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    btnText: { color: '#94A3B8', fontWeight: 'bold' },
    btnTextActive: { color: '#fff' },
    footer: { marginTop: 50, alignItems: 'center' },
    footerText: { color: '#475569', fontSize: 12 }
});
