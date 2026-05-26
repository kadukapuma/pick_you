import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';

const VehicleDetailsScreen = ({ navigation }) => {
  const [vehicleModel, setVehicleModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [color, setColor] = useState('');
  const [vehicleImages, setVehicleImages] = useState({ front: null, side: null, back: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/driver/profile');
        if (response.data.status === 'success') {
          const vehicle = response.data.data.vehicle;
          if (vehicle) {
            setVehicleModel(`${vehicle.brand || ''} ${vehicle.model || ''}`.trim());
            setPlateNumber(vehicle.plateNumber !== 'Not set' ? vehicle.plateNumber : '');
            setColor(vehicle.color || '');
            if (vehicle.images) setVehicleImages(vehicle.images);
          }
        }
      } catch (error) {
        console.log('Error fetching vehicle for edit:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const InputField = ({ label, value, onChangeText, icon, placeholder }) => (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name={icon} size={20} color="#64748B" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
        />
      </View>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header updated with brand green gradient */}
        <LinearGradient colors={['#00A859', '#007A41']} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.navRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Vehicle Details</Text>
              <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>Update</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#00A859" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Vehicle Display Section */}
          <View style={styles.vehicleCard}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="car-hatchback" size={40} color="#00A859" />
            </View>
            <Text style={styles.vehicleTitle}>{vehicleModel || 'No Vehicle Set'}</Text>
            <Text style={styles.vehicleSubTitle}>{plateNumber || 'Enter plate number'}</Text>
          </View>

          {/* Details Form */}
          <View style={styles.formCard}>
            <InputField 
              label="Vehicle Model" 
              value={vehicleModel} 
              onChangeText={setVehicleModel} 
              icon="car-info" 
              placeholder="e.g. Toyota Prius"
            />
            <InputField 
              label="License Plate" 
              value={plateNumber} 
              onChangeText={setPlateNumber} 
              icon="numeric" 
              placeholder="e.g. WP ABC-1234"
            />
            <InputField 
              label="Vehicle Color" 
              value={color} 
              onChangeText={setColor} 
              icon="palette-outline" 
              placeholder="e.g. White"
            />
          </View>

          {/* Photo Section */}
          <Text style={styles.sectionTitle}>Vehicle Photos</Text>
          <View style={styles.photoGrid}>
            <TouchableOpacity style={styles.photoBox}>
              {vehicleImages.front ? (
                <Image source={{ uri: vehicleImages.front }} style={{ width: '100%', height: '100%', borderRadius: 14 }} />
              ) : (
                <>
                  <Feather name="camera" size={24} color="#00A859" />
                  <Text style={styles.photoLabel}>Front View</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBox}>
              {vehicleImages.side ? (
                <Image source={{ uri: vehicleImages.side }} style={{ width: '100%', height: '100%', borderRadius: 14 }} />
              ) : (
                <>
                  <Feather name="camera" size={24} color="#00A859" />
                  <Text style={styles.photoLabel}>Side View</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBox}>
              {vehicleImages.back ? (
                <Image source={{ uri: vehicleImages.back }} style={{ width: '100%', height: '100%', borderRadius: 14 }} />
              ) : (
                <>
                  <Feather name="camera" size={24} color="#00A859" />
                  <Text style={styles.photoLabel}>Back View</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.warningBox}>
            <Feather name="alert-circle" size={18} color="#B45309" />
            <Text style={styles.warningText}>
              Ensure your vehicle details match your registration documents to avoid account suspension.
            </Text>
          </View>
        </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

export default VehicleDetailsScreen;

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 25,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  vehicleCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  vehicleSubTitle: { fontSize: 14, color: '#64748B', marginTop: 4 },

  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  inputWrapper: { marginBottom: 20 },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 56,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 24, marginBottom: 12 },
  photoGrid: { flexDirection: 'row', gap: 12 },
  photoBox: {
    flex: 1,
    height: 100,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#00A85933', // Subtle brand color for the border
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoLabel: { fontSize: 12, color: '#00A859', marginTop: 8, fontWeight: '600' },

  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 16,
    marginTop: 30,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  warningText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
});