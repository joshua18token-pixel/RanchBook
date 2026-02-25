import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HerdListScreen from './src/screens/HerdListScreen';
import AddCowScreen from './src/screens/AddCowScreen';
import CowDetailScreen from './src/screens/CowDetailScreen';

const Stack = createNativeStackNavigator();

const headerStyle = {
  backgroundColor: '#2D5016',
};
const headerTintColor = '#fff';
const headerTitleStyle = {
  fontWeight: 'bold' as const,
  fontSize: 20,
};

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle,
          headerTintColor,
          headerTitleStyle,
        }}
      >
        <Stack.Screen
          name="HerdList"
          component={HerdListScreen}
          options={{ title: '🐄 RanchBook' }}
        />
        <Stack.Screen
          name="AddCow"
          component={AddCowScreen}
          options={{ title: 'Add Cow' }}
        />
        <Stack.Screen
          name="CowDetail"
          component={CowDetailScreen}
          options={{ title: 'Cow Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
