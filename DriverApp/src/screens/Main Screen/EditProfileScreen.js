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
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import ThemedFeedbackModal from '../../components/ThemedFeedbackModal';

const EditProfileScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onPrimary: null,
  });

  const showFeedback = ({ type = 'success', title, message, onPrimary }) => {
    setFeedback({ visible: true, type, title, message, onPrimary });
  };

  const closeFeedback = () => {
    setFeedback((prev) => ({ ...prev, visible: false, onPrimary: null }));
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/driver/profile');
        if (response.data.status === 'success') {
          const data = response.data.data;
          setName(data.name || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
          if (data.profile_picture) setProfileImage(data.profile_picture);
        }
      } catch (error) {
        console.log('Error fetching profile for edit:', error);
        showFeedback({
          type: 'error',
          title: 'Profile Unavailable',
          message: 'Failed to load your profile details.',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const getNameParts = () => {
    const trimmedName = name.trim().replace(/\s+/g, ' ');
    const [firstName, ...rest] = trimmedName.split(' ');

    return {
      first_name: firstName || '',
      last_name: rest.join(' '),
    };
  };

  const handleSave = async () => {
    const { first_name, last_name } = getNameParts();

    if (!first_name) {
      showFeedback({
        type: 'warning',
        title: 'Name Required',
        message: 'Please enter your full name before saving.',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await api.put('/driver/profile', {
        first_name,
        last_name,
        email: email.trim(),
        phone: phone.trim(),
      });

      if (response.data.status === 'success') {
        showFeedback({
          type: 'success',
          title: 'Profile Updated',
          message: 'Your personal information has been saved successfully.',
          onPrimary: () => navigation.goBack(),
        });
      }
    } catch (error) {
      console.log('Error updating profile:', error.response?.data || error);
      const errors = error.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat()[0] : null;
      showFeedback({
        type: 'error',
        title: 'Update Failed',
        message:
          firstError ||
          error.response?.data?.message ||
          'Could not update your profile. Please try again.',
      });
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
        {/* Updated Header with Green/Dark Gradient */}
        <LinearGradient colors={['#00A859', '#007A41']} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.navRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Personal Info</Text>
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
          {/* Updated Profile Picture Section */}
          <View style={styles.avatarSection}>
            {profileImage ? (
              <View>
                <Image source={{ uri: profileImage }} style={styles.avatarLarge} />
                <TouchableOpacity style={styles.editPhotoBadge}>
                  <Feather name="camera" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <LinearGradient colors={['#00A859', '#007A41']} style={styles.avatarLarge}>
                <Text style={styles.avatarTextLarge}>{name ? name.charAt(0).toUpperCase() : ''}</Text>
                <TouchableOpacity style={styles.editPhotoBadge}>
                  <Feather name="camera" size={14} color="#FFF" />
                </TouchableOpacity>
              </LinearGradient>
            )}
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formCard}>
            <InputField 
              label="Full Name" 
              value={name} 
              onChangeText={setName} 
              icon="user" 
            />
            <InputField 
              label="Email Address" 
              value={email} 
              onChangeText={setEmail} 
              icon="mail" 
              keyboardType="email-address"
            />
            <InputField 
              label="Phone Number" 
              value={phone} 
              onChangeText={setPhone} 
              icon="phone" 
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.infoBox}>
            <Feather name="info" size={16} color="#00A859" />
            <Text style={styles.infoText}>
              Verified accounts ensure higher trust and priority in trip assignments.
            </Text>
          </View>
        </ScrollView>
        )}
      </KeyboardAvoidingView>

      <ThemedFeedbackModal
        visible={feedback.visible}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={closeFeedback}
        onPrimary={() => {
          const action = feedback.onPrimary;
          closeFeedback();
          action?.();
        }}
      />
    </View>
  );
};

export default EditProfileScreen;

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
    position: 'relative',
    elevation: 4,
    shadowColor: '#00A859',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  avatarTextLarge: { color: '#FFF', fontSize: 36, fontWeight: '800' },
  editPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00A859',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
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
