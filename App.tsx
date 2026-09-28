import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Platform, ToastAndroid, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Nav, Route } from './src/navigation/types';
import LandingScreen from './src/screens/LandingScreen';
import HomeScreen from './src/screens/HomeScreen';
import AdminScreen from './src/screens/AdminScreen';
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import UserPortalScreen from './src/screens/UserPortalScreen';
import { AuthUser } from './src/services/auth.service';
import { setAuthToken, setUnauthorizedHandler } from './src/config/api';
import { loadSession, saveSession, clearSession } from './src/services/session.service';

import { ThemeProvider } from './src/context/ThemeContext';
import { PermissionsProvider } from './src/context/PermissionsContext';

type AuthScreen = 'signup' | 'login';

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

function MainApp() {
  const [showLanding, setShowLanding] = useState(true);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [prefillEmail, setPrefillEmail] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [restoringSession, setRestoringSession] = useState(true);
  const [stack, setStack] = useState<Route[]>([{ name: 'tab', tab: 'home' }]);
  const lastBackPressRef = useRef(0);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  // Stay logged in across app restarts until the user explicitly logs out or
  // the token itself expires - runs alongside the landing screen's 5s timer
  // so it's ready by the time we decide which screen to show.
  useEffect(() => {
    loadSession()
      .then((session) => {
        if (session) {
          setUser(session.user);
          setToken(session.token);
        }
      })
      .finally(() => setRestoringSession(false));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      setUser(null);
      setToken(null);
      setAuthScreen('login');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const nav: Nav = {
    push: (route) => setStack((s) => [...s, route]),
    pop: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    replace: (route) => setStack((s) => [...s.slice(0, -1), route]),
    resetToTab: (tab) => setStack([{ name: 'tab', tab }]),
  };

  useEffect(() => {
    const onBackPress = () => {
      if (showLanding) {
        BackHandler.exitApp();
        return true;
      }
      if (user?.role === 'admin') {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPressRef.current = now;
        if (Platform.OS === 'android') {
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        }
        return true;
      }
      if (!user || !token) {
        if (authScreen === 'signup') {
          setAuthScreen('login');
          return true;
        }
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPressRef.current = now;
        if (Platform.OS === 'android') {
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        }
        return true;
      }
      if (stack.length > 1) {
        nav.pop();
        return true;
      }
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastBackPressRef.current = now;
      if (Platform.OS === 'android') {
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      }
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [showLanding, user, token, authScreen, stack]);

  if (showLanding) {
    return (
      <SafeAreaProvider>
        <LandingScreen onFinish={() => setShowLanding(false)} />
      </SafeAreaProvider>
    );
  }

  // Landing's 5s timer normally gives loadSession() plenty of time to finish,
  // but guard against a login-screen flash on the rare slow-storage case.
  if (restoringSession) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#000000' }} />
      </SafeAreaProvider>
    );
  }

  const onLogout = () => {
    clearSession();
    setUser(null);
    setToken(null);
    setAuthScreen('login');
  };

  if (!user || !token) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {authScreen === 'signup' && (
          <SignUpScreen
            onBack={() => setAuthScreen('login')}
            onGoToLogin={() => setAuthScreen('login')}
            onSignUpSuccess={(result) => {
              setPrefillEmail(result.user.email);
              Alert.alert('Account created', 'Please login with your new account.');
              setAuthScreen('login');
            }}
          />
        )}
        {authScreen === 'login' && (
          <SignInScreen
            onGoToSignUp={() => setAuthScreen('signup')}
            initialEmail={prefillEmail}
            onLoginSuccess={(result) => {
              saveSession(result.token, result.user);
              setUser(result.user);
              setToken(result.token);
              setStack([{ name: 'tab', tab: 'home' }]);
            }}
          />
        )}
      </SafeAreaProvider>
    );
  }

  if (user.role === 'admin' || user.role === 'staff') {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <PermissionsProvider role={user.role} permissions={user.permissions} isTrainer={user.isTrainer}>
          <AdminScreen user={user} token={token} onLogout={onLogout} />
        </PermissionsProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <UserPortalScreen user={user} token={token} onLogout={onLogout} />
    </SafeAreaProvider>
  );
}