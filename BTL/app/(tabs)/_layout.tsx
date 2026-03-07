import React, { useReducer } from 'react';
import { Pressable, StyleSheet, View, Text, LayoutChangeEvent } from 'react-native';
import { Tabs } from 'expo-router';
import { BottomTabBarProps, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Animated, { useAnimatedStyle, withTiming, useDerivedValue } from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

type LayoutState = { x: number; index: number }[];

const AnimatedTabBar = ({
  state: { index: activeIndex, routes },
  navigation,
  descriptors,
}: BottomTabBarProps) => {
  const { bottom } = useSafeAreaInsets();

  const reducer = (state: LayoutState, action: { x: number; index: number }) => {
    const newLayouts = state.filter((l) => l.index !== action.index);
    return [...newLayouts, { x: action.x, index: action.index }];
  };

  const [layout, dispatch] = useReducer(reducer, []);

  const handleLayout = (event: LayoutChangeEvent, index: number) => {
    dispatch({ x: event.nativeEvent.layout.x, index });
  };

  const xOffset = useDerivedValue(() => {
    if (layout.length !== routes.length) return 0;
    const sortedLayout = [...layout].sort((a, b) => a.index - b.index);
    const foundLayout = sortedLayout.find(({ index }) => index === activeIndex);
    return foundLayout ? foundLayout.x - 25 : 0;
  }, [activeIndex, layout, routes.length]);

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: withTiming(xOffset.value, { duration: 250 }) }],
    };
  });

  return (
    <View style={[styles.tabBar, { paddingBottom: bottom }]}>
      <AnimatedSvg
        width={110}
        height={60}
        viewBox="0 0 110 60"
        style={[styles.activeBackground, animatedStyles]}
      >
        <Path
          fill="#9a0002"
          d="M20 0H0c11.046 0 20 8.953 20 20v5c0 19.33 15.67 35 35 35s35-15.67 35-35v-5c0-11.045 8.954-20 20-20H20z"
        />
      </AnimatedSvg>

      <View style={styles.tabBarContainer}>
        {routes.map((route, index) => {
          const active = index === activeIndex;
          const { options } = descriptors[route.key];

          return (
            <TabBarComponent
              key={route.key}
              active={active}
              options={options}
              onLayout={(e) => handleLayout(e, index)}
              onPress={() => navigation.navigate(route.name)}
            />
          );
        })}
      </View>
    </View>
  );
};

type TabBarComponentProps = {
  active?: boolean;
  options: BottomTabNavigationOptions;
  onLayout: (e: LayoutChangeEvent) => void;
  onPress: () => void;
};

const TabBarComponent = ({ active, options, onLayout, onPress }: TabBarComponentProps) => {
  const animatedComponentCircleStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withTiming(active ? 1.1 : 1, { duration: 250 }) }, // Keep scale at 1 for inactive tabs
        { translateY: withTiming(active ? -10 : 0, { duration: 250 }) },
      ],
    };
  });

  const animatedIconContainerStyles = useAnimatedStyle(() => {
    return {
      opacity: withTiming(1, { duration: 250 }), // Always visible
      transform: [{ translateY: withTiming(active ? -10 : 0, { duration: 250 }) }],
    };
  });

  const circleStaticStyles = {
    shadowColor: active ? '#000' : 'transparent',
    shadowOffset: active ? { width: 0, height: 2 } : { width: 0, height: 0 },
    shadowOpacity: active ? 0.3 : 0,
    shadowRadius: active ? 4 : 0,
    elevation: active ? 5 : 0,
  };

  const iconColor = active ? '#9a0002' : '#999';

  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      style={styles.component}
      accessibilityLabel={options.tabBarLabel?.toString() || options.title || 'Tab'}
      accessibilityState={{ selected: active }}
    >
      <Animated.View
        style={[
          styles.componentCircle,
          animatedComponentCircleStyles,
          circleStaticStyles,
          { backgroundColor: active ? '#fff' : '#f5f5f5' }, // Slightly gray for inactive
        ]}
      />
      <Animated.View style={[styles.iconContainer, animatedIconContainerStyles]}>
        {options.tabBarIcon ? (
          options.tabBarIcon({
            focused: !!active,
            color: iconColor,
            size: 28,
          })
        ) : (
          <Text style={{ color: iconColor, fontSize: 28 }}>?</Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="themban"
        options={{
          title: 'Themban',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'person-add' : 'person-add-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tinnhan"
        options={{
          title: 'Tinnhan',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="canhan"
        options={{
          title: 'Canhan',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="caidat"
        options={{
          title: 'Caidat',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  activeBackground: {
    position: 'absolute',
    top: -5,
  },
  tabBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  component: {
    height: 60,
    width: 60,
    marginTop: -5,
  },
  componentCircle: {
    flex: 1,
    borderRadius: 30,
    margin: 5,
  },
  iconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
