import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Polygon, Circle } from 'react-native-svg';
import { loginUser, AuthResult } from '../services/auth.service';
import { isValidEmail } from '../utils/validation';
import { PALETTE } from '../theme/darkPalette';

interface Props {
  onLoginSuccess: (result: AuthResult) => void;
  onGoToSignUp: () => void;
  initialEmail?: string;
}

export default function SignInScreen({
  onLoginSuccess,
  onGoToSignUp,
  initialEmail = '',
}: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    let hasError = false;
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address');
      hasError = true;
    }
    if (!password) {
      setPasswordError('Enter your password');
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    try {
      const result = await loginUser(email.trim(), password);
      onLoginSuccess(result);
    } catch (err: any) {
      Alert.alert('Login Failed', err?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <CornerDecor corner="tl" />
      <CornerDecor corner="tr" />
      <CornerDecor corner="bl" />
      <CornerDecor corner="br" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <View style={styles.logoGlow} />
              <Image
                source={require('../../assets/A2ProLogo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName}>
              A2 <Text style={styles.brandNameAccent}>PRO FITNESS</Text>
            </Text>
            <Text style={styles.tagline}>TRAIN   •   TRANSFORM   •   BE BETTER</Text>
          </View>

          <View style={styles.headlineWrap}>
            <Text style={styles.headlineWhite}>WELCOME</Text>
            <Text style={styles.headlineRed}>BACK</Text>
            <View style={styles.underlineRow}>
              <View style={styles.dash} />
              <Text style={styles.subtitle}>Sign in to continue your journey</Text>
              <View style={styles.dash} />
            </View>
          </View>

          <View style={styles.form}>
            <View
              style={[
                styles.inputWrap,
                emailFocused && styles.inputWrapFocused,
                !!emailError && styles.inputWrapError,
              ]}
            >
              <Ionicons name="mail-outline" size={18} color={PALETTE.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={PALETTE.textFaint}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (emailError) setEmailError('');
                }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}

            <View
              style={[
                styles.inputWrap,
                passwordFocused && styles.inputWrapFocused,
                !!passwordError && styles.inputWrapError,
              ]}
            >
              <Ionicons name="lock-closed-outline" size={18} color={PALETTE.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={PALETTE.textFaint}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (passwordError) setPasswordError('');
                }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={PALETTE.textMuted}
                />
              </TouchableOpacity>
            </View>
            {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

            <TouchableOpacity activeOpacity={0.85} onPress={handleLogin} disabled={loading}>
              <LinearGradient
                colors={[PALETTE.redSoft, PALETTE.red, PALETTE.redDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cta}
              >
                {loading ? (
                  <ActivityIndicator color={PALETTE.white} />
                ) : (
                  <Text style={styles.ctaText}>SIGN IN</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onGoToSignUp} style={styles.footerLink} hitSlop={8}>
            <Text style={styles.footerText}>
              Don't have an account? <Text style={styles.footerAccent}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const CORNER_SIZE = 160;

const DOTS = (() => {
  const dots: { x: number; y: number; o: number }[] = [];
  const sq = Math.SQRT2;
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      const x = 15 + col * 17;
      const y = 8 + row * 17;
      const dist = (x - y + 100) / sq;
      if (dist > 3 && dist < 70) {
        const alpha = Math.max(0.08, Math.min(0.82, (210 - dist * 2.6) / 255));
        dots.push({ x, y, o: alpha });
      }
    }
  }
  return dots;
})();

function CornerDecor({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const flipX = corner === 'br' || corner === 'tr';
  const flipY = corner === 'tl' || corner === 'tr';
  const showStripe = corner !== 'tr';
  const showDots = corner !== 'tl';

  const positionStyle =
    corner === 'tl'
      ? { top: 0, left: 0 }
      : corner === 'tr'
      ? { top: 0, right: 0 }
      : corner === 'bl'
      ? { bottom: 0, left: 0 }
      : { bottom: 0, right: 0 };

  return (
    <View
      pointerEvents="none"
      style={[
        styles.cornerBox,
        positionStyle,
        { transform: [{ scaleX: flipX ? -1 : 1 }, { scaleY: flipY ? -1 : 1 }] },
      ]}
    >
      <Svg width={CORNER_SIZE} height={CORNER_SIZE} viewBox={`0 0 ${CORNER_SIZE} ${CORNER_SIZE}`}>
        {showStripe && (
          <>
            <Polygon points="0,160 0,75 85,160" fill="#16171C" />
            <Line x1={-40} y1={60} x2={200} y2={300} stroke="#3A3D46" strokeWidth={22} />
            <Line x1={-40} y1={85} x2={175} y2={300} stroke="rgba(255,44,80,0.35)" strokeWidth={18} />
            <Line x1={-40} y1={85} x2={175} y2={300} stroke="#FF2C50" strokeWidth={8} />
          </>
        )}
        {showDots &&
          DOTS.map((d, i) => (
            <Circle key={i} cx={d.x} cy={d.y} r={3.2} fill="#FF1739" opacity={d.o} />
          ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  cornerBox: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FF1739',
    opacity: 0.16,
  },
  logo: {
    width: 104,
    height: 104,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: PALETTE.white,
    letterSpacing: 2,
  },
  brandNameAccent: {
    color: PALETTE.red,
  },
  tagline: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE.textMuted,
    letterSpacing: 2,
  },

  headlineWrap: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headlineWhite: {
    fontSize: 30,
    fontWeight: '800',
    color: PALETTE.white,
    letterSpacing: 1,
  },
  headlineRed: {
    fontSize: 38,
    fontWeight: '900',
    color: PALETTE.red,
    letterSpacing: 1,
    marginTop: -4,
    textShadowColor: 'rgba(255,23,57,0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  underlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
  },
  dash: {
    width: 22,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  subtitle: {
    fontSize: 13,
    color: PALETTE.textMuted,
    letterSpacing: 0.3,
  },

  form: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    padding: 20,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 6,
  },
  inputWrapFocused: {
    borderColor: PALETTE.red,
    backgroundColor: 'rgba(255,23,57,0.06)',
  },
  inputWrapError: {
    borderColor: PALETTE.error,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: PALETTE.white,
    fontSize: 15,
  },
  errorText: {
    color: PALETTE.error,
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
  },

  cta: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: PALETTE.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    color: PALETTE.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },

  footerLink: {
    marginTop: 26,
    alignItems: 'center',
  },
  footerText: {
    color: PALETTE.textMuted,
    fontSize: 13,
  },
  footerAccent: {
    color: PALETTE.red,
    fontWeight: '700',
  },
});
