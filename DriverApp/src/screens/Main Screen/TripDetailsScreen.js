import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // Added LinearGradient

const TripDetailsScreen = ({ route, navigation }) => {
  const { trip } = route.params || {};

  const DetailRow = ({ icon, label, value, color = "#1E293B" }) => (
    <View style={styles.detailRow}>
      <View style={styles.iconCircle}>
        <Feather name={icon} size={18} color="#00A859" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, { color }]}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.mainWrapper}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Updated Header with LinearGradient */}
        <LinearGradient
          colors={['#00A859', '#007A41']}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.navRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Trip Details</Text>
              <View style={{ width: 40 }} /> 
            </View>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.mapContainer}>
             <View style={styles.mapPlaceholder}>
              <Feather name="map" size={40} color="#94A3B8" />
              <Text style={styles.mapText}>GPS Route Preview</Text>
              <Text style={styles.mapSubText}>Requires react-native-maps & API Key</Text>
            </View>
          </View>

          <View style={styles.fareCard}>
            <Text style={styles.fareLabel}>Total Fare</Text>
            {/* Keeping "Rs." consistency with other screens */}
            <Text style={styles.fareAmount}>
                {trip?.status === "Cancelled" ? "Rs.0.00" : trip?.amount}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: trip?.status === "Cancelled" ? "#FEE2E2" : "#DCFCE7" }]}>
              <Text style={[styles.statusText, { color: trip?.status === "Cancelled" ? "#EF4444" : "#16A34A" }]}>
                {trip?.status}
              </Text>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <DetailRow icon="calendar" label="Date & Time" value={trip?.date || "N/A"} />
            
            <View style={styles.locationContainer}>
               <View style={styles.locationRow}>
                  <View style={styles.dotGreen} />
                  <View style={{ flex: 1 }}>
                     <Text style={styles.detailLabel}>Pickup Location</Text>
                     <Text style={styles.detailValue}>My Current Location</Text>
                  </View>
               </View>
               <View style={styles.locationLine} />
               <View style={styles.locationRow}>
                  <View style={styles.dotRed} />
                  <View style={{ flex: 1 }}>
                     <Text style={styles.detailLabel}>Destination</Text>
                     <Text style={styles.detailValue}>{trip?.destination || "N/A"}</Text>
                  </View>
               </View>
            </View>

            <DetailRow icon="navigation" label="Distance" value={trip?.distance || "0 km"} />
            <DetailRow icon="user" label="Passenger" value="John Doe" />
            
            <DetailRow 
              icon={trip?.id % 2 === 0 ? "credit-card" : "dollar-sign"} 
              label="Payment Method" 
              value={trip?.id % 2 === 0 ? "Card Payment" : "Cash"} 
            />
          </View>

          <TouchableOpacity style={styles.helpButton}>
            <Text style={styles.helpButtonText}>Report an issue with this trip</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea} />
    </View>
  );
};

export default TripDetailsScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#000' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  bottomSafeArea: { backgroundColor: '#000' },
  headerGradient: { 
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
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  mapContainer: {
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: { color: '#64748B', marginTop: 8, fontWeight: '700' },
  mapSubText: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
  fareCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  fareLabel: { color: '#64748B', fontSize: 14, marginBottom: 4 },
  fareAmount: { fontSize: 36, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '700' },
  detailsContainer: { 
    backgroundColor: '#FFF', 
    borderRadius: 24, 
    padding: 16, 
    elevation: 2,
    marginBottom: 20 
  },
  detailRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9' 
  },
  iconCircle: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: '#F0FDF4', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16 
  },
  detailLabel: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  locationContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  locationLine: { width: 2, height: 20, backgroundColor: '#E2E8F0', marginLeft: 6, marginVertical: 2 },
  dotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#00A859', marginLeft: 1 },
  dotRed: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', marginLeft: 1 },
  helpButton: { padding: 16, alignItems: 'center' },
  helpButtonText: { color: '#64748B', fontWeight: '600', fontSize: 14, textDecorationLine: 'underline' }
});