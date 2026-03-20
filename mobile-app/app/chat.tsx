import React, { useState } from 'react';
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

export default function ChatScreen() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{role: string, text: string}>>([
    { role: 'ai', text: 'Hello! I am your Roamly AI Guardian. Need any cultural advice or legal tips?' }
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!query.trim()) return;

    // Add user message to UI
    const userMessage = { role: 'user', text: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      // Connects to your local Java Spring Boot server
      // Fixed: Using your Mac's physical IP address so your phone can reach it!
      const API_URL = 'http://192.168.0.5:8080';

      const response = await fetch(`${API_URL}/api/ai/cultural-tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage.text,
          language: 'English',
          profile: 'General Traveler',
          sessionId: 'test-session-123'
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      
      // Add AI response to UI
      setMessages(prev => [...prev, { role: 'ai', text: data.tip || "I'm offline right now." }]);

    } catch (error: any) {
      console.error('Chat Error:', error);
      setMessages(prev => [...prev, { role: 'ai', text: `Error connecting to Roamly Brain: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'AI Guardian', headerStyle: { backgroundColor: '#1E293B' }, headerTintColor: '#fff' }} />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <ScrollView style={styles.chatArea} contentContainerStyle={{ padding: 15 }}>
          {messages.map((msg, idx) => (
            <View key={idx} style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              <Text style={[styles.messageText, msg.role === 'user' ? styles.userText : styles.aiText]}>
                {msg.text}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.loadingText}>The Guardian is thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Ask about local laws..."
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={loading}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark aesthetic
  },
  container: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 5,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: '#334155'
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#e2e8f0',
  },
  loadingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  loadingText: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    color: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#475569'
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
