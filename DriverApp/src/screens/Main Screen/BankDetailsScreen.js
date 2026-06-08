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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';

const BankDetailsScreen = ({ navigation }) => {
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      const response = await api.get('/driver/profile');
      if (response.data.status === 'success') {
        const bankData = response.data.data.bank || {};
        setBankName(bankData.name && bankData.name !== 'Not set' ? bankData.name : '');
        setBranch(bankData.branch && bankData.branch !== 'Not set' ? bankData.branch : '');
        setAccountName(bankData.accountName && bankData.accountName !== 'Not set' ? bankData.accountName : '');
        setAccountNumber(bankData.accountNumber && bankData.accountNumber !== 'Not set' ? bankData.accountNumber : '');
      }
    } catch (error) {
      console.log('Error fetching bank details:', error);
      Alert.alert('Error', 'Failed to retrieve current bank settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!bankName || !accountName || !accountNumber) {
      Alert.alert('Required Fields', 'Please complete Bank Name, Account Name, and Account Number.');
      return;
    }

    setSaving(true);
    try {
      // Adapting payload layout based on your standard driver profile structural hierarchy
      const response = await api.post('/driver/profile/update-bank', {
        bank_name: bankName,
        branch: branch,
        account_name: accountName,
        account_number: accountNumber,
      });

      if (response.data.status === 'success') {
        Alert.alert('Success', 'Bank details updated securely.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.log('Error updating bank details:', error);
      Alert.alert('Submission Failed', 'Could not store your banking settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({ label, value, onChangeText, icon, keyboardType = 'default' }) => (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputContainer}>
        <Feather name={icon} size={18} color="#64748B" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholderTextColor="#94A3B8"
          autoCapitalize={keyboardType === 'default' ? 'words' : 'none'}
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
        {/* Header matching Green/Dark Gradient */}
        <LinearGradient colors={['#00A859', '#007A41']} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.navRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Bank Details</Text>
              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleSave}
                disabled={saving || loading}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
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
            {/* Visual Bank Element Branding Box */}
            <View style={styles.avatarSection}>
              <LinearGradient colors={['#00A859', '#007A41']} style={styles.avatarLarge}>
                <Feather name="credit-card" size={36} color="#FFF" />
              </LinearGradient>
              <Text style={styles.changePhotoText}>Payout Account Settings</Text>
            </View>

            {/* Form Fields Card */}
            <View style={styles.formCard}>
              <InputField 
                label="Bank Name" 
                value={bankName} 
                onChangeText={setBankName} 
                icon="home" 
              />
              <InputField 
                label="Branch" 
                value={branch} 
                onChangeText={setBranch} 
                icon="map-pin" 
              />
              <InputField 
                label="Account Holder Name" 
                value={accountName} 
                onChangeText={setAccountName} 
                icon="user" 
              />
              <InputField 
                label="Account Number" 
                value={accountNumber} 
                onChangeText={setAccountNumber} 
                icon="hash" 
                keyboardType="numeric"
              />
            </View>

            {/* Verification Helper Footer Box */}
            <View style={styles.infoBox}>
              <Feather name="shield" size={16} color="#00A859" />
              <Text style={styles.infoText}>
                Your financial data is encrypted and used exclusively for your automated electronic payouts and balance settlements.
              </Text>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

export default BankDetailsScreen;

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 25,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 5,
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  
  scrollContent: { padding: 24, paddingBottom: 60 },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#00A859',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  changePhotoText: {
    marginTop: 12,
    color: '#00A859',
    fontWeight: '600',
    fontSize: 14,
  },

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
    marginLeft: 4,
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
});