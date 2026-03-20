import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';

export default function ScannerScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<any>(null);
  const router = useRouter();

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.text}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  async function takePicture() {
    if (!cameraRef.current || loading) return;
    
    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5,
      });

      // Send to Java Backend
      const API_URL = 'http://192.168.0.5:8080';
      const res = await fetch(`${API_URL}/api/ai/scan-menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: photo.base64,
          language: 'English'
        })
      });

      const data = await res.json();
      Alert.alert("Roamly Vision Scan", data.tip || "Could not analyze menu.");
      
    } catch (e: any) {
      Alert.alert("Scanner Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Menu Scanner', headerStyle: { backgroundColor: '#1E293B' }, headerTintColor: '#fff' }} />
      <View style={styles.container}>
        <CameraView 
          style={styles.camera} 
          facing={facing} 
          ref={cameraRef}
        />
          
        <View style={styles.overlay}>
           <View style={styles.scanBox} />
           <Text style={styles.scanInstruction}>Point at a Menu or Sign to translate</Text>
           {loading && (
             <View style={styles.loadingOverlay}>
               <ActivityIndicator size="large" color="#4ADE80" />
               <Text style={styles.loadingText}>Gemini AI is analyzing...</Text>
             </View>
           )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.back()}>
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.shutterButton} onPress={takePicture} disabled={loading}>
            <View style={[styles.shutterInside, loading && { backgroundColor: '#94a3b8' }]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={toggleCameraFacing}>
            <Ionicons name="camera-reverse" size={30} color="white" />
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#fff',
    fontSize: 18,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1,
  },
  scanBox: {
    width: 250,
    height: 350,
    borderWidth: 2,
    borderColor: '#4ADE80',
    borderRadius: 20,
    backgroundColor: 'transparent'
  },
  scanInstruction: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    marginTop: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#4ADE80',
    marginTop: 10,
    fontWeight: '600',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 2,
  },
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 30,
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInside: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 15,
    marginHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center'
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});
