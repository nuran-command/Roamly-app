import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Stack } from 'expo-router';
import Storage from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{role: string, text: string}>>([
    { role: 'ai', text: 'Hello! I am your Roamly AI Guardian. Need any cultural advice or legal tips?' }
  ]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState("Solo Tourist");
  const [userLang, setUserLang] = useState("English");

  useEffect(() => {
    (async () => {
       const p = await Storage.getItem('user_profile');
       const l = await Storage.getItem('user_lang');
       if (p) setUserProfile(p);
       if (l) setUserLang(l);
    })();
  }, []);

  const sendMessage = async () => {
    if (!query.trim()) return;

    const userMessage = { role: 'user', text: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const BASE_IP = '192.168.0.5'; 
      const API_URL = `http://${BASE_IP}:8080`;

      const response = await fetch(`${API_URL}/api/ai/cultural-tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage.text,
          language: userLang,
          profile: userProfile,
          sessionId: 'test-session-123'
        }),
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.tip || "I'm offline right now." }]);

    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'ai', text: `Connection Error to Brain: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ 
          title: 'AI Guardian', 
          headerStyle: { backgroundColor: '#0F172A' }, 
          headerTintColor: '#fff',
          headerRight: () => (
             <View style={styles.headerBadge}>
                 <Text style={styles.headerBadgeText}>{userProfile}</Text>
             </View>
          )
      }} />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView style={styles.chatArea} contentContainerStyle={{ padding: 15 }}>
          {messages.map((msg, idx) => (
            <View key={idx} style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
               {msg.role === 'ai' && <Ionicons name="shield-checkmark" size={14} color="#3B82F6" style={{ marginBottom: 5 }} />}
              <Text style={[styles.messageText, msg.role === 'user' ? styles.userText : styles.aiText]}>
                {msg.text}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.loadingText}>Guardian is checking laws in {userLang}...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder={`Ask in ${userLang}...`}
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={loading}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  container: { flex: 1 },
  chatArea: { flex: 1 },
  headerBadge: { backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginRight: 15 },
  headerBadgeText: { color: '#3B82F6', fontSize: 11, fontWeight: 'bold' },
  messageBubble: { maxWidth: '85%', padding: 15, borderRadius: 20, marginBottom: 15 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#3B82F6', borderBottomRightRadius: 5 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#1E293B', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: '#334155' },
  messageText: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  userText: { color: '#fff' },
  aiText: { color: '#CBD5E1' },
  loadingBubble: { alignSelf: 'flex-start', backgroundColor: '#1E293B', padding: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  loadingText: { color: '#94a3b8', fontSize: 13 },
  inputArea: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 20, backgroundColor: '#0F172A', alignItems: 'center', borderTopWidth: 1, borderColor: '#1E293B' },
  input: { flex: 1, backgroundColor: '#1E293B', color: '#fff', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, fontSize: 16, marginRight: 10, borderWidth: 1, borderColor: '#334155' },
  sendButton: { backgroundColor: '#3B82F6', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
});
