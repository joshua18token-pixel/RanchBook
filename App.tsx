import React, { useState, useEffect, createContext, useContext } from 'react';
import { Platform, TouchableOpacity, Text, Image } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Context for app-level actions that survive navigation
export const AppContext = createContext<{ switchToRanchSelect: () => void }>({ switchToRanchSelect: () => {} });


import { supabase } from './src/services/supabase';
import LoginScreen from './src/screens/LoginScreen';
import RanchSetupScreen from './src/screens/RanchSetupScreen';
import HerdListScreen from './src/screens/HerdListScreen';
import AddCowScreen from './src/screens/AddCowScreen';
import CowDetailScreen from './src/screens/CowDetailScreen';
import TeamScreen from './src/screens/TeamScreen';

const Stack = createNativeStackNavigator();

const headerStyle = { backgroundColor: '#1A1A1A' };
const headerTintColor = '#C5A55A';
const headerTitleStyle = { fontWeight: 'bold' as const, fontSize: 20, color: '#C5A55A' };

type AppState = 'loading' | 'login' | 'ranch_select' | 'app';

// Parse invite params from URL (web only)
function getInviteParams(): { email?: string; ranchId?: string } | null {
  if (typeof window === 'undefined' || !window.location?.search) return null;
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email');
  const ranchId = params.get('ranch');
  if (email || ranchId) return { email: email || undefined, ranchId: ranchId || undefined };
  return null;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [ranchId, setRanchId] = useState<string | null>(null);
  const [navKey, setNavKey] = useState(0);
  const [ranchName, setRanchName] = useState<string>('');
  const [myRole, setMyRole] = useState<string>('read');
  const [inviteParams, setInviteParams] = useState<{ email?: string; ranchId?: string } | null>(null);

  useEffect(() => {
    const invite = getInviteParams();
    if (invite) setInviteParams(invite);

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // If logged in and there's an invite, auto-accept then go to ranch select
        if (invite?.ranchId) {
          import('./src/services/auth').then(({ acceptInvite }) => {
            acceptInvite(invite.ranchId!).catch(() => {});
            // Clear URL params
            if (typeof window !== 'undefined') window.history.replaceState({}, '', '/');
            setAppState('ranch_select');
          });
        } else {
          setAppState('ranch_select');
        }
      } else {
        setAppState('login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setAppState('login');
        setRanchId(null);
      } else if (event === 'SIGNED_IN') {
        // Only navigate to ranch_select if we're on the login screen
        // Token refreshes also fire SIGNED_IN — don't disrupt the user
        setAppState(prev => {
          if (prev === 'login' || prev === 'loading') {
            const inv = getInviteParams() || inviteParams;
            if (inv?.ranchId) {
              import('./src/services/auth').then(({ acceptInvite }) => {
                acceptInvite(inv.ranchId!).catch(() => {});
                if (typeof window !== 'undefined') window.history.replaceState({}, '', '/');
              });
            }
            return 'ranch_select';
          }
          return prev;
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (appState === 'loading') return null;

  if (appState === 'login') {
    return <LoginScreen onLogin={() => setAppState('ranch_select')} inviteEmail={inviteParams?.email} />;
  }

  if (appState === 'ranch_select') {
    return (
      <RanchSetupScreen
        onRanchSelected={(id, role, name) => {
          // Clear URL params so stale ranch data doesn't persist
          if (typeof window !== 'undefined' && window.history?.replaceState) {
            window.history.replaceState({}, '', '/');
          }
          setNavKey(k => k + 1); // Force navigation stack reset
          setRanchId(id);
          setMyRole(role);
          setRanchName(name || 'Ranch');
          setAppState('app');
        }}
        onLogout={() => setAppState('login')}
      />
    );
  }

  const linking: LinkingOptions<any> = {
    prefixes: ['https://ranchbook.io', 'http://localhost:8081'],
    config: {
      screens: {
        HerdList: '',
        AddCow: 'add',
        CowDetail: 'cow/:cowId',
        Team: 'team',
      },
    },
  };

  return (
    <AppContext.Provider value={{ switchToRanchSelect: () => {
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, '', '/');
      }
      setAppState('ranch_select');
    } }}>
    <NavigationContainer key={`nav-${ranchId}-${navKey}`} linking={linking} documentTitle={{ formatter: (options) => options?.title ? `${options.title} | RanchBook` : 'RanchBook' }}>
      <Stack.Navigator
        screenOptions={{
          headerStyle,
          headerTintColor,
          headerTitleStyle,
          ...(Platform.OS === 'web' ? { headerRight: () => (
            <Image source={require('./assets/ranchbook-text.png')} style={{ width: 120, height: 20, resizeMode: 'contain', marginRight: 12, opacity: 0.8 }} />
          ) } : {}),
        }}
      >
        <Stack.Screen
          name="HerdList"
          component={HerdListScreen}
          options={{ title: ranchName || 'RanchBook' }}
          initialParams={{ ranchId, myRole, ranchName }}
        />
        <Stack.Screen
          name="AddCow"
          component={AddCowScreen}
          options={({ navigation }) => ({
            title: `${ranchName}: Add Cow`,
            ...(Platform.OS === 'web' ? { headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                <Text style={{ color: '#C5A55A', fontSize: 18 }}>← Back</Text>
              </TouchableOpacity>
            )} : {}),
          })}
          initialParams={{ ranchId }}
        />
        <Stack.Screen
          name="CowDetail"
          component={CowDetailScreen}
          options={({ navigation }) => ({
            title: `${ranchName}: Cow Details`,
            ...(Platform.OS === 'web' ? { headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                <Text style={{ color: '#C5A55A', fontSize: 18 }}>← Back</Text>
              </TouchableOpacity>
            )} : {}),
          })}
          initialParams={{ ranchId, myRole }}
        />
        <Stack.Screen
          name="Team"
          component={TeamScreen}
          options={({ navigation }) => ({
            title: `${ranchName}: Team`,
            ...(Platform.OS === 'web' ? { headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                <Text style={{ color: '#C5A55A', fontSize: 18 }}>← Back</Text>
              </TouchableOpacity>
            )} : {}),
          })}
          initialParams={{ ranchId, myRole }}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </AppContext.Provider>
  );
}
