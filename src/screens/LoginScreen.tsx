import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { signIn, signUp, signInWithGoogle, signInWithApple } from '../services/auth';

export default function LoginScreen({ onLogin, inviteEmail }: { onLogin: () => void; inviteEmail?: string }) {
  const [email, setEmail] = useState(inviteEmail || '');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isInvite, setIsInvite] = useState(!!inviteEmail);
  const [checkedExisting, setCheckedExisting] = useState(false);

  // Check if invited email already has an account
  React.useEffect(() => {
    if (!inviteEmail) return;
    import('../services/supabase').then(({ supabase }) => {
      // Try signing in with a wrong password to see if user exists
      // Better approach: check ranch_members for a user_id
      supabase.from('ranch_members').select('user_id').eq('email', inviteEmail.toLowerCase()).not('user_id', 'is', null).limit(1).then(({ data }) => {
        if (data && data.length > 0) {
          // User exists — show sign in
          setIsSignUp(false);
          setStatusMessage({ text: `Welcome back! Sign in to accept your ranch invite.`, type: 'success' });
        } else {
          // New user — show sign up
          setIsSignUp(true);
          setStatusMessage({ text: `You've been invited to a ranch! Create an account to get started.`, type: 'success' });
        }
        setCheckedExisting(true);
      });
    });
  }, [inviteEmail]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    if (Platform.OS !== 'web') {
      Alert.alert(type === 'success' ? 'Success' : 'Error', text);
    }
  };

  const handleSubmit = async () => {
    setStatusMessage(null);
    
    if (!email.trim() || !password.trim()) {
      showMessage('Enter your email and password.', 'error');
      return;
    }
    if (password.length < 6) {
      showMessage('Password must be at least 6 characters.', 'error');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const result = await signUp(email.trim().toLowerCase(), password);
        // If session is returned, user is auto-confirmed (no email verification needed)
        if (result.session) {
          showMessage('✅ Account created!', 'success');
          onLogin();
          return;
        }
        // Otherwise they need to verify email
        showMessage('✅ Account created! Check your email for a confirmation link, then come back and sign in.', 'success');
        setIsSignUp(false);
      } else {
        await signIn(email.trim().toLowerCase(), password);
        showMessage('✅ Signed in!', 'success');
        onLogin();
      }
    } catch (e: any) {
      let msg = e.message || 'Something went wrong';
      if (msg.includes('Invalid login credentials')) msg = 'Wrong email or password. Please try again.';
      else if (msg.includes('Email not confirmed')) msg = 'Check your email and click the confirmation link first.';
      else if (msg.includes('User already registered')) msg = 'An account with this email already exists. Try signing in instead.';
      else if (msg.includes('rate_limit') || msg.includes('after')) msg = 'Too many attempts. Please wait a minute and try again.';
      else if (msg.includes('Unable to validate email')) msg = 'Please enter a valid email address.';
      else if (msg.includes('sending confirmation')) msg = 'Could not send confirmation email. Please try again in a minute.';
      showMessage(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Dark hero area */}
        <View style={styles.heroArea}>
          <Image
            source={require('../../assets/logo-ranchbook.jpg')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>RanchBook</Text>
          <Text style={styles.subtitle}>
            {isInvite
              ? (isSignUp ? 'Create an account to join your ranch' : 'Sign in to accept your invite')
              : (isSignUp ? 'Create your account' : 'Sign in to your ranch')}
          </Text>
        </View>

        {/* Form card */}
        <View style={styles.formCard}>
          {/* Status message */}
          {statusMessage && (
            <View style={[styles.statusBanner, statusMessage.type === 'success' ? styles.statusSuccess : styles.statusError]}>
              <Text style={styles.statusText}>{statusMessage.text}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={(v) => { setEmail(v); setStatusMessage(null); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            placeholderTextColor="#999"
            value={password}
            onChangeText={(v) => { setPassword(v); setStatusMessage(null); }}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? 'PLEASE WAIT...' : isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* OAuth buttons */}
          <TouchableOpacity
            style={[styles.oauthButton, styles.googleButton]}
            onPress={async () => {
              try {
                await signInWithGoogle();
              } catch (e: any) {
                showMessage(e.message || 'Google sign-in failed', 'error');
              }
            }}
            activeOpacity={0.8}
          >
            <View style={styles.oauthContent}>
              <Image source={require('../../assets/icons/google-logo.png')} style={styles.oauthIcon} />
              <Text style={styles.oauthButtonText}>Sign in with Google</Text>
            </View>
          </TouchableOpacity>

          {/* Apple Sign-In — uncomment when Apple provider is enabled in Supabase
          <TouchableOpacity
            style={[styles.oauthButton, styles.appleButton]}
            onPress={async () => {
              try {
                await signInWithApple();
              } catch (e: any) {
                showMessage(e.message || 'Apple sign-in failed', 'error');
              }
            }}
            activeOpacity={0.8}
          >
            <View style={styles.oauthContent}>
              <Image source={require('../../assets/icons/apple-logo.png')} style={[styles.oauthIcon, { tintColor: '#fff' }]} />
              <Text style={[styles.oauthButtonText, styles.appleButtonText]}>Sign in with Apple</Text>
            </View>
          </TouchableOpacity>
          */}

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => { setIsSignUp(!isSignUp); setStatusMessage(null); }}
            activeOpacity={0.7}
          >
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? Sign in' : "New here? Create an account"}
            </Text>
          </TouchableOpacity>

          {isSignUp && (
            <View style={styles.signupInfo}>
              <Text style={styles.signupInfoText}>
                📧 After creating your account, you'll receive a confirmation email. Click the link to verify, then sign in.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F5F5F0' },
  content: { flexGrow: 1 },
  heroArea: {
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
  },
  title: { fontSize: 36, fontWeight: 'bold', color: '#C5A55A', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#999', textAlign: 'center', marginTop: 8 },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: -16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 32,
  },
  statusBanner: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  statusSuccess: { backgroundColor: '#E8F5E9', borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  statusError: { backgroundColor: '#FFEBEE', borderLeftWidth: 4, borderLeftColor: '#D32F2F' },
  statusText: { fontSize: 15, color: '#333', lineHeight: 22 },
  input: {
    padding: 16,
    fontSize: 18,
    backgroundColor: '#F5F5F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#C5A55A',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  switchButton: { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#C5A55A', fontSize: 16, fontWeight: '600' },
  signupInfo: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
  },
  signupInfoText: { fontSize: 14, color: '#6B6B6B', lineHeight: 20 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { marginHorizontal: 12, color: '#999', fontSize: 14 },
  oauthButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderColor: '#E0E0E0',
  },
  appleButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  oauthContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  oauthIcon: { width: 22, height: 22, marginRight: 10, resizeMode: 'contain' },
  oauthButtonText: { fontSize: 17, fontWeight: '600', color: '#1A1A1A' },
  appleButtonText: { color: '#fff' },
});
