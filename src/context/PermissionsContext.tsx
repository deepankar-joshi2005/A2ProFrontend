import React, { createContext, useContext } from 'react';
import { Alert } from 'react-native';
import { getPermissionValue } from '../constants/permissions';

interface PermissionsContextType {
  role: 'user' | 'admin' | 'staff';
  isTrainer: boolean;
  can: (dotKey: string) => boolean;
  // Runs `action` if the current user has `dotKey`, otherwise shows an
  // Access Denied alert and does nothing. Buttons stay visible either way -
  // this only gates whether pressing them actually does something.
  guard: (dotKey: string, action: () => void) => void;
}

const denyAlert = () =>
  Alert.alert('Access Denied', "You don't have permission to do this. Contact your gym owner.");

const PermissionsContext = createContext<PermissionsContextType>({
  role: 'admin',
  isTrainer: false,
  can: () => true,
  guard: (_dotKey, action) => action(),
});

export const PermissionsProvider: React.FC<{
  role: 'user' | 'admin' | 'staff';
  permissions?: any;
  isTrainer?: boolean;
  children: React.ReactNode;
}> = ({ role, permissions, isTrainer, children }) => {
  const can = (dotKey: string) => {
    if (role === 'admin') return true;
    if (role === 'staff') return getPermissionValue(permissions, dotKey);
    return false;
  };

  const guard = (dotKey: string, action: () => void) => {
    if (can(dotKey)) {
      action();
    } else {
      denyAlert();
    }
  };

  return (
    <PermissionsContext.Provider value={{ role, isTrainer: !!isTrainer, can, guard }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);
