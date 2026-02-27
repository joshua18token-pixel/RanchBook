import React, { useState, useEffect, createContext, useContext } from 'react';
import { Platform, TouchableOpacity, Text } from 'react-native';
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

const headerStyle = { backgroundColor: '#2D5016' };
const headerTintColor = '#fff';
const headerTitleStyle = { fontWeight: 'bold' as const, fontSize: 20 };

type AppState = 'loading' | 'login' | 'ranch_select' | 'app';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [ranchId, setRanchId] = useState<string | null>(null);
  const [navKey, setNavKey] = useState(0);
  const [ranchName, setRanchName] = useState<string>('');
  const [myRole, setMyRole] = useState<string>('read');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAppState('ranch_select');
      } else {
        setAppState('login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setAppState('login');
        setRanchId(null);
      } else if (event === 'SIGNED_IN') {
        setAppState('ranch_select');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (appState === 'loading') return null;

  if (appState === 'login') {
    return <LoginScreen onLogin={() => setAppState('ranch_select')} />;
  }

  if (appState === 'ranch_select') {
    return (
      <RanchSetupScreen
        onRanchSelected={(id, role, name) => {
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
    <AppContext.Provider value={{ switchToRanchSelect: () => setAppState('ranch_select') }}>
    <NavigationContainer key={`nav-${ranchId}-${navKey}`} documentTitle={{ formatter: (options) => options?.title ? `${options.title} | RanchBook` : 'RanchBook' }}>
      <Stack.Navigator
        screenOptions={{ headerStyle, headerTintColor, headerTitleStyle }}
      >
        <Stack.Screen
          name="HerdList"
          component={HerdListScreen}
          options={{ title: '🐂 RanchBook' }}
          initialParams={{ ranchId, myRole, ranchName }}
        />
        <Stack.Screen
          name="AddCow"
          component={AddCowScreen}
          options={({ navigation }) => ({
            title: 'Add Cow',
            ...(Platform.OS === 'web' ? { headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                <Text style={{ color: '#FFF8E7', fontSize: 18 }}>← Back</Text>
              </TouchableOpacity>
            )} : {}),
          })}
          initialParams={{ ranchId }}
        />
        <Stack.Screen
          name="CowDetail"
          component={CowDetailScreen}
          options={({ navigation }) => ({
            title: 'Cow Details',
            ...(Platform.OS === 'web' ? { headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                <Text style={{ color: '#FFF8E7', fontSize: 18 }}>← Back</Text>
              </TouchableOpacity>
            )} : {}),
          })}
          initialParams={{ ranchId, myRole }}
        />
        <Stack.Screen
          name="Team"
          component={TeamScreen}
          options={({ navigation }) => ({
            title: 'Team',
            ...(Platform.OS === 'web' ? { headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                <Text style={{ color: '#FFF8E7', fontSize: 18 }}>← Back</Text>
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
