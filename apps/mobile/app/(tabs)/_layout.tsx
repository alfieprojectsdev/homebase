import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ emoji }: { label: string; emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#DC2626',
        tabBarStyle: { paddingBottom: 8, height: 60 },
      }}
    >
      <Tabs.Screen
        name="bills"
        options={{
          title: 'Bills',
          tabBarIcon: ({ focused }) => <TabIcon label="Bills" emoji={focused ? '💰' : '💳'} />,
          headerTitle: 'Bills',
        }}
      />
      <Tabs.Screen
        name="chores"
        options={{
          title: 'Chores',
          tabBarIcon: ({ focused }) => <TabIcon label="Chores" emoji={focused ? '✅' : '📋'} />,
          headerTitle: 'Chores',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Settings" emoji={focused ? '⚙️' : '🔧'} />
          ),
          headerTitle: 'Settings',
        }}
      />
    </Tabs>
  );
}
