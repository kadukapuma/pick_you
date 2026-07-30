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
  DeviceEventEmitter,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import ThemedFeedbackModal from '../../components/ThemedFeedbackModal';
import { imageAssetToFormFile } from '../../utils/imageUpload';

const DRIVER_PROFILE_SNAPSHOT_KEY = 'driverProfileSnapshot';
const DRIVER_PROFILE_UPDATED_EVENT = 'driverProfileUpdated';
const SNAPSHOT_MAX_AGE_MS = 5 * 60 * 1000;

const avatarUriWithVersion = (uri, version) => {
  if (!uri || typeof uri !== 'string') return uri;
  if (uri.startsWith('file:') || uri.startsWith('content:')) return uri;

  return `${uri}${uri.includes('?') ? '&' : '?'}v=${version || 0}`;
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
        autoCorrect={false}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
      />
    </View>
  </View>
);

const EditProfileScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageVersion, setProfileImageVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
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

  const applyProfileData = (data) => {
    if (!data) return;

    setName(data.name || '');
    setEmail(data.email || '');
    setPhone(data.phone || '');
    setProfileImage(data.profile_picture || null);
    setProfileImageVersion(data.__snapshotAt || Date.now());
  };

  useEffect(() => {
    let mounted = true;

    const applyCachedProfile = async () => {
      try {
        const snapshotValue = await AsyncStorage.getItem(DRIVER_PROFILE_SNAPSHOT_KEY);
        if (!snapshotValue || !mounted) return null;

        const snapshot = JSON.parse(snapshotValue);
        const snapshotAge = Date.now() - Number(snapshot.__snapshotAt || 0);
        if (snapshotAge > SNAPSHOT_MAX_AGE_MS) {
          await AsyncStorage.removeItem(DRIVER_PROFILE_SNAPSHOT_KEY);
          return null;
        }

        applyProfileData(snapshot);
        setLoading(false);
        return snapshot;
      } catch (error) {
        console.log('Error loading cached profile for edit:', error);
        return null;
      }
    };

    const fetchProfile = async () => {
      try {
        const cachedProfile = await applyCachedProfile();
        const response = await api.get('/driver/profile', {
          params: { _: Date.now() },
        });

        if (!mounted) return;

        if (response.data.status === 'success') {
          if (cachedProfile?.__optimisticUntil && cachedProfile.__optimisticUntil > Date.now()) {
            applyProfileData(cachedProfile);
          } else {
            applyProfileData({
              ...response.data.data,
              __snapshotAt: Date.now(),
            });
          }
        }
      } catch (error) {
        console.log('Error fetching profile for edit:', error);
        showFeedback({
          type: 'error',
          title: 'Profile Unavailable',
          message: 'Failed to load your profile details.',
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchProfile();

    const subscription = DeviceEventEmitter.addListener(
      DRIVER_PROFILE_UPDATED_EVENT,
      applyProfileData,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const getNameParts = () => {
    const trimmedName = name.trim().replace(/\s+/g, ' ');
    const [firstName, ...rest] = trimmedName.split(' ');

    return {
      first_name: firstName || '',
      last_name: rest.join(' '),
    };
  };

  const cacheProfileSnapshot = async (snapshot) => {
    const nextSnapshot = {
      ...snapshot,
      __snapshotAt: Date.now(),
      __optimisticUntil: Date.now() + 15000,
    };

    try {
      await AsyncStorage.setItem(
        DRIVER_PROFILE_SNAPSHOT_KEY,
        JSON.stringify(nextSnapshot),
      );
    } catch (error) {
      console.log('Error caching profile snapshot:', error);
    }

    DeviceEventEmitter.emit(DRIVER_PROFILE_UPDATED_EVENT, nextSnapshot);
  };

  const handlePickProfileImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showFeedback({
          type: 'warning',
          title: 'Gallery Access Needed',
          message: 'Please allow gallery access to change your profile photo.',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const file = imageAssetToFormFile(asset, 'driver_profile');
      if (!file) return;

      setUploadingImage(true);

      const formData = new FormData();
      formData.append('profile_picture', file);

      const response = await api.post('/user/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl =
        response.data?.data?.profile_picture_path ||
        response.data?.data?.profile_picture ||
        asset.uri;

      setProfileImage(uploadedUrl);
      setProfileImageVersion(Date.now());
      await cacheProfileSnapshot({
        name,
        email: email.trim(),
        phone: phone.trim(),
        profile_picture: uploadedUrl,
      });
      showFeedback({
        type: 'success',
        title: 'Photo Updated',
        message: 'Your profile photo has been updated successfully.',
      });
    } catch (error) {
      console.log('Error updating profile photo:', error.response?.data || error);
      showFeedback({
        type: 'error',
        title: 'Upload Failed',
        message:
          error.response?.data?.message ||
          'Could not update your profile photo. Please try again.',
      });
    } finally {
      setUploadingImage(false);
    }
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
        applyProfileData({
          ...response.data.data,
          __snapshotAt: Date.now(),
        });
        await cacheProfileSnapshot(response.data.data);
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
                disabled={saving || loading || uploadingImage}
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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* Updated Profile Picture Section */}
          <View style={styles.avatarSection}>
            {profileImage ? (
              <View>
                <Image
                  source={{ uri: avatarUriWithVersion(profileImage, profileImageVersion) }}
                  style={styles.avatarLarge}
                />
                <TouchableOpacity
                  style={styles.editPhotoBadge}
                  onPress={handlePickProfileImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Feather name="camera" size={14} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <LinearGradient colors={['#00A859', '#007A41']} style={styles.avatarLarge}>
                <Text style={styles.avatarTextLarge}>{name ? name.charAt(0).toUpperCase() : ''}</Text>
                <TouchableOpacity
                  style={styles.editPhotoBadge}
                  onPress={handlePickProfileImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Feather name="camera" size={14} color="#FFF" />
                  )}
                </TouchableOpacity>
              </LinearGradient>
            )}
            <TouchableOpacity
              onPress={handlePickProfileImage}
              disabled={uploadingImage}
              activeOpacity={0.8}
            >
              <Text style={styles.changePhotoText}>
                {uploadingImage ? 'Uploading Photo...' : 'Change Profile Photo'}
              </Text>
            </TouchableOpacity>
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
