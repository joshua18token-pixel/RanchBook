import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
  const [myRole, setMyRole] = useState<string>('read');

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAppState('ranch_select');
      } else {
        setAppState('login');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAppState('login');
        setRanchId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (appState === 'loading') {
    return null; // Could add a splash screen
  }

  if (appState === 'login') {
    return (
      <LoginScreen
        onLogin={() => setAppState('ranch_select')}
      />
    );
  }

  if (appState === 'ranch_select') {
    return (
      <RanchSetupScreen
        onRanchSelected={(id, role) => {
          setRanchId(id);
          setMyRole(role);
          setAppState('app');
        }}
        onLogout={() => setAppState('login')}
      />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerStyle, headerTintColor, headerTitleStyle }}
      >
        <Stack.Screen
          name="HerdList"
          component={HerdListScreen}
          options={{ title: '🐄 RanchBook' }}
          initialParams={{ ranchId, myRole }}
        />
        <Stack.Screen
          name="AddCow"
          component={AddCowScreen}
          options={{ title: 'Add Cow' }}
          initialParams={{ ranchId }}
        />
        <Stack.Screen
          name="CowDetail"
          component={CowDetailScreen}
          options={{ title: 'Cow Details' }}
          initialParams={{ ranchId, myRole }}
        />
        <Stack.Screen
          name="Team"
          component={TeamScreen}
          options={{ title: 'Team' }}
          initialParams={{ ranchId, myRole }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
