import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from './auth.service';

const TOKEN_KEY = 'a2pro_auth_token';
const USER_KEY = 'a2pro_auth_user';

export interface StoredSession {
  token: string;
  user: AuthUser;
}

// Keeps the logged-in user signed in across app restarts until they log out
// or the token itself expires (backend rejects it with a 401).
export const saveSession = async (token: string, user: AuthUser): Promise<void> => {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
};

export const loadSession = async (): Promise<StoredSession | null> => {
  const entries = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
  const token = entries[0]?.[1];
  const userRaw = entries[1]?.[1];
  if (!token || !userRaw) return null;
  try {
    return { token, user: JSON.parse(userRaw) as AuthUser };
  } catch {
    return null;
  }
};

export const clearSession = async (): Promise<void> => {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
};
