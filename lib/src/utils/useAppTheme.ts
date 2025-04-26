// import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
// import { StyleProp, useColorScheme } from "react-native"
// import { DarkTheme, DefaultTheme, useTheme as useNavTheme } from "@react-navigation/native"
// import {
//   type Theme,
//   type ThemeContexts,
//   type ThemedStyle,
//   type ThemedStyleArray,
//   lightTheme,
//   darkTheme,
// } from "../theme"
// import * as SystemUI from "expo-system-ui"
// import { GestureHandlerRootView } from "react-native-gesture-handler"
// import { SheetProvider } from "react-native-actions-sheet";
// import React from "react"
// import '../components/sheets/sheets';

// type ThemeContextType = {
//   themeScheme: ThemeContexts
//   setThemeContextOverride: (newTheme: ThemeContexts) => void
// }

// // create a React context and provider for the current theme
// export const ThemeContext = createContext<ThemeContextType>({
//   themeScheme: undefined, // default to the system theme
//   setThemeContextOverride: (_newTheme: ThemeContexts) => {
//     console.error("Tried to call setThemeContextOverride before the ThemeProvider was initialized")
//   },
// })

// // const themeContextToTheme = (themeContext: ThemeContexts): Theme =>
// //   themeContext === "dark" ? darkTheme : lightTheme
// const themeContextToTheme = (themeContext: ThemeContexts): Theme => globalTheme.t

// const setImperativeTheming = (theme: Theme) => {
//   SystemUI.setBackgroundColorAsync(theme.colors.background)
// }

// export const useThemeProvider = (initialTheme: ThemeContexts = undefined) => {
//   const colorScheme = useColorScheme()
//   const [overrideTheme, setTheme] = useState<ThemeContexts>(initialTheme)

//   const setThemeContextOverride = useCallback((newTheme: ThemeContexts) => {
//     setTheme(newTheme)
//   }, [])

//   const themeScheme = overrideTheme || colorScheme || "light"
//   const navigationTheme: any = themeScheme === "dark" ? DarkTheme : DefaultTheme

//   useEffect(() => {
//     globalTheme.t = themeContextToTheme(themeScheme)
//     setImperativeTheming(themeContextToTheme(themeScheme))
//   }, [themeScheme])


//   const EnhancedThemeProvider: React.FC<any> = ({ children, overrideT }) => {
//     // If an override function is provided, use it to wrap the default function
//     // const stringFunction = overrideS ? overrideS(defaultS) : defaultS;
//     const th = overrideT ?? globalTheme.t;

//     // Update the global instance when the provider mounts or the function changes
//     useEffect(() => {
//       globalTheme.t = th;

//       // Clean up when unmounting
//       return () => {
//         globalTheme.t = lightTheme;
//       };
//     }, [th]);

//     // return (
//     //   <ThemeContext.Provider value={th}>
//     //     {children}
//     //   </ThemeContext.Provider>
//     // );
//     // don't use jsx:
//     return React.createElement(ThemeContext.Provider, { value: th }, children);
//   };

//   return {
//     themeScheme,
//     navigationTheme,
//     setThemeContextOverride,
//     ThemeProvider: EnhancedThemeProvider,
//   }
// }

// let globalTheme = {
//   t: lightTheme
// };

// interface UseAppThemeValue {
//   // The theme object from react-navigation
//   navTheme: typeof DefaultTheme
//   // A function to set the theme context override (for switching modes)
//   setThemeContextOverride: (newTheme: ThemeContexts) => void
//   // The current theme object
//   theme: Theme
//   // The current theme context "light" | "dark"
//   themeContext: ThemeContexts
//   // A function to apply the theme to a style object.
//   // See examples in the components directory or read the docs here:
//   // https://docs.infinite.red/ignite-cli/boilerplate/app/utils/
//   themed: <T>(styleOrStyleFn: ThemedStyle<T> | StyleProp<T> | ThemedStyleArray<T>) => T
// }

// /**
//  * Custom hook that provides the app theme and utility functions for theming.
//  *
//  * @returns {UseAppThemeReturn} An object containing various theming values and utilities.
//  * @throws {Error} If used outside of a ThemeProvider.
//  */
// export const useAppTheme = (): UseAppThemeValue => {
//   const navTheme = useNavTheme()
//   const context = useContext(ThemeContext)
//   if (!context) {
//     throw new Error("useTheme must be used within a ThemeProvider")
//   }

//   const { themeScheme: overrideTheme, setThemeContextOverride } = context

//   const themeContext: ThemeContexts = useMemo(
//     () => overrideTheme || (navTheme.dark ? "dark" : "light"),
//     [overrideTheme, navTheme],
//   )

//   const themeVariant: Theme = useMemo(() => themeContextToTheme(themeContext), [themeContext])

//   const themed = useCallback(
//     <T>(styleOrStyleFn: ThemedStyle<T> | StyleProp<T> | ThemedStyleArray<T>) => {
//       const flatStyles = [styleOrStyleFn].flat(3)
//       const stylesArray = flatStyles.map((f) => {
//         if (typeof f === "function") {
//           return (f as ThemedStyle<T>)(themeVariant)
//         } else {
//           return f
//         }
//       })

//       // Flatten the array of styles into a single object
//       return Object.assign({}, ...stylesArray) as T
//     },
//     [themeVariant],
//   )

//   return {
//     navTheme,
//     setThemeContextOverride,
//     // theme: themeVariant,
//     theme: globalTheme.t,
//     themeContext,
//     themed,
//   }
// }




// import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
// import { StyleProp, useColorScheme } from "react-native"
// import { DarkTheme, DefaultTheme, useTheme as useNavTheme } from "@react-navigation/native"
// import {
//   type Theme,
//   type ThemeContexts,
//   type ThemedStyle,
//   type ThemedStyleArray,
//   lightTheme as defaultLightTheme,
//   darkTheme as defaultDarkTheme,
// } from "../theme"
// import * as SystemUI from "expo-system-ui"
// import { GestureHandlerRootView } from "react-native-gesture-handler"
// import { SheetProvider } from "react-native-actions-sheet";
// import React from "react"
// import '../components/sheets/sheets';

// type ThemeContextType = {
//   lightTheme: Theme
//   darkTheme: Theme
//   themeScheme: ThemeContexts
//   setThemeContextOverride: (newTheme: ThemeContexts) => void
// }

// // create a React context and provider for the current theme
// export const ThemeContext = createContext<ThemeContextType>({
//   themeScheme: undefined, // default to the system theme
//   lightTheme: defaultLightTheme,
//   darkTheme: defaultDarkTheme,
//   setThemeContextOverride: (_newTheme: ThemeContexts) => {
//     console.error("Tried to call setThemeContextOverride before the ThemeProvider was initialized")
//   },
// })

// // const themeContextToTheme = (themeContext: ThemeContexts): Theme =>
// //   themeContext === "dark" ? darkTheme : lightTheme
// // const themeContextToTheme = (themeContext: ThemeContexts): Theme => globalTheme.t

// const setImperativeTheming = (theme: Theme) => {
//   SystemUI.setBackgroundColorAsync(theme.colors.background)
// }

// export const useThemeProvider = (initialTheme: ThemeContexts = undefined, light: Theme = defaultLightTheme, dark: Theme = defaultDarkTheme) => {
//   const colorScheme = useColorScheme()
//   const [overrideTheme, setTheme] = useState<ThemeContexts>(initialTheme)
//   const [lightTheme, setLightTheme] = useState<Theme>(light ?? defaultLightTheme)
//   const [darkTheme, setDarkTheme] = useState<Theme>(dark ?? defaultDarkTheme)

//   const setThemeContextOverride = useCallback((newTheme: ThemeContexts) => {
//     setTheme(newTheme)
//   }, [])

//   const themeScheme = overrideTheme || colorScheme || "light"
//   const navigationTheme: any = themeScheme === "dark" ? DarkTheme : DefaultTheme

//   const themeContextToTheme = (themeContext: ThemeContexts): Theme =>
//   themeContext === "dark" ? darkTheme : lightTheme

//   useEffect(() => {
//     globalTheme.t = themeContextToTheme(themeScheme)
//     setImperativeTheming(themeContextToTheme(themeScheme))
//   }, [themeScheme])


//   const EnhancedThemeProvider: React.FC<any> = ({ children, lightTheme, darkTheme, initialTheme }) => {
//     // If an override function is provided, use it to wrap the default function
//     // const stringFunction = overrideS ? overrideS(defaultS) : defaultS;
//     // const th = overrideT ?? globalTheme.t;


//     const th = initialTheme ?? lightTheme;

//     // Update the global instance when the provider mounts or the function changes
//     useEffect(() => {
//       globalTheme.t = th;

//       // Clean up when unmounting
//       return () => {
//         globalTheme.t = lightTheme;
//       };
//     }, [th]);

//     // return (
//     //   <ThemeContext.Provider value={th}>
//     //     {children}
//     //   </ThemeContext.Provider>
//     // );
//     // don't use jsx:
//     return React.createElement(ThemeContext.Provider, { value: th }, children);
//   };

//   return {
//     themeScheme,
//     navigationTheme,
//     setThemeContextOverride,
//     ThemeProvider: EnhancedThemeProvider,
//   }
// }

// let globalTheme = {
//   t: defaultLightTheme,
//   lightTheme: defaultLightTheme,
//   darkTheme: defaultDarkTheme,
// };

// interface UseAppThemeValue {
//   // The theme object from react-navigation
//   navTheme: typeof DefaultTheme
//   // A function to set the theme context override (for switching modes)
//   setThemeContextOverride: (newTheme: ThemeContexts) => void
//   // The current theme object
//   theme: Theme
//   // The current theme context "light" | "dark"
//   themeContext: ThemeContexts
//   // A function to apply the theme to a style object.
//   // See examples in the components directory or read the docs here:
//   // https://docs.infinite.red/ignite-cli/boilerplate/app/utils/
//   themed: <T>(styleOrStyleFn: ThemedStyle<T> | StyleProp<T> | ThemedStyleArray<T>) => T
// }

// /**
//  * Custom hook that provides the app theme and utility functions for theming.
//  *
//  * @returns {UseAppThemeReturn} An object containing various theming values and utilities.
//  * @throws {Error} If used outside of a ThemeProvider.
//  */
// export const useAppTheme = (): UseAppThemeValue => {
//   const navTheme = useNavTheme()
//   const context = useContext(ThemeContext)

//   let themeContext: ThemeContexts;
//   let theme: Theme;
//   let setThemeContextOverride: (newTheme: ThemeContexts) => void = () => {}
//   if (!context) {
//     // throw new Error("useTheme must be used within a ThemeProvider")
//     // themeContext = globalTheme.t;
//     theme = globalTheme.t;
//   } else {
//     theme = context.darkTheme;
//     setThemeContextOverride = context.setThemeContextOverride;
//   }



//   // const { themeScheme: overrideTheme, setThemeContextOverride } = context

//   // const themeContext: ThemeContexts = useMemo(
//   //   () => overrideTheme || (navTheme.dark ? "dark" : "light"),
//   //   [overrideTheme, navTheme],
//   // )

//   // const themeContextToTheme = (themeContext: ThemeContexts): Theme =>
//   // themeContext === "dark" ? darkTheme : lightTheme

//   // const themeContextToTheme = (themeContext: ThemeContexts): Theme =>
//   //   globalTheme.t

//   // const themeVariant: Theme = useMemo(() => themeContextToTheme(themeContext), [themeContext])

//   const themed = useCallback(
//     <T>(styleOrStyleFn: ThemedStyle<T> | StyleProp<T> | ThemedStyleArray<T>) => {
//       const flatStyles = [styleOrStyleFn].flat(3)
//       const stylesArray = flatStyles.map((f) => {
//         if (typeof f === "function") {
//           return (f as ThemedStyle<T>)(theme)
//         } else {
//           return f
//         }
//       })

//       // Flatten the array of styles into a single object
//       return Object.assign({}, ...stylesArray) as T
//     },
//     [theme],
//   )

//   return {
//     navTheme,
//     setThemeContextOverride,
//     // theme: themeVariant,
//     theme: theme,
//     themeContext,
//     themed,
//   }
// }




import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { StyleProp, useColorScheme } from "react-native"
import { DarkTheme, DefaultTheme, useTheme as useNavTheme } from "@react-navigation/native"
import {
  type Theme,
  type ThemeContexts,
  type ThemedStyle,
  type ThemedStyleArray,
  lightTheme as defaultLightTheme,
  darkTheme as defaultDarkTheme,
} from "../theme"
import * as SystemUI from "expo-system-ui"
import React from "react"
import '../components/sheets/sheets';

type ThemeContextType = {
  lightTheme: Theme
  darkTheme: Theme
  themeScheme: ThemeContexts
  setThemeContextOverride: (newTheme: ThemeContexts) => void
}

// Create a React context and provider for the current theme
export const ThemeContext = createContext<ThemeContextType>({
  themeScheme: undefined, // default to the system theme
  lightTheme: defaultLightTheme,
  darkTheme: defaultDarkTheme,
  setThemeContextOverride: (_newTheme: ThemeContexts) => {
    console.error("Tried to call setThemeContextOverride before the ThemeProvider was initialized")
  },
});

// Global theme state - used as a fallback
let globalTheme = {
  t: defaultLightTheme,
};

const setImperativeTheming = (theme: Theme) => {
  SystemUI.setBackgroundColorAsync(theme.colors.background)
}

export const useThemeProvider = (initialTheme: ThemeContexts = undefined, light: Theme = defaultLightTheme, dark: Theme = defaultDarkTheme) => {
  const colorScheme = useColorScheme()
  const [overrideTheme, setTheme] = useState<ThemeContexts>(initialTheme)
  const [lightTheme] = useState<Theme>(light ?? defaultLightTheme)
  const [darkTheme] = useState<Theme>(dark ?? defaultDarkTheme)

  const setThemeContextOverride = useCallback((newTheme: ThemeContexts) => {
    setTheme(newTheme)
  }, [])

  const themeScheme = overrideTheme || colorScheme || "light"
  const navigationTheme: any = themeScheme === "dark" ? DarkTheme : DefaultTheme

  const themeContextToTheme = useCallback((themeContext: ThemeContexts): Theme =>
    themeContext === "dark" ? darkTheme : lightTheme, [darkTheme, lightTheme])

  // Update global theme state when theme changes
  useEffect(() => {
    const currentTheme = themeContextToTheme(themeScheme)
    globalTheme.t = currentTheme
    setImperativeTheming(currentTheme)
  }, [themeScheme, themeContextToTheme])

  const ThemeProvider: React.FC<{
    children: React.ReactNode,
    overrideLightTheme?: Theme,
    overrideDarkTheme?: Theme,
    overrideInitialTheme?: ThemeContexts
  }> = ({
    children,
    overrideLightTheme,
    overrideDarkTheme,
    overrideInitialTheme
  }) => {
    // Use the provided themes or fall back to the ones from useThemeProvider
    const actualLightTheme = overrideLightTheme ?? lightTheme
    const actualDarkTheme = overrideDarkTheme ?? darkTheme
    const actualThemeScheme = overrideInitialTheme ?? themeScheme

    // Calculate current theme based on the scheme
    const currentTheme = actualThemeScheme === "dark"
      ? actualDarkTheme
      : actualLightTheme

    // Update global theme when provider mounts or theme changes
    useEffect(() => {
      globalTheme.t = currentTheme

      return () => {
        globalTheme.t = defaultLightTheme
      }
    }, [currentTheme, actualLightTheme, actualDarkTheme])

    // Create context value with all necessary properties
    const contextValue: ThemeContextType = {
      lightTheme: actualLightTheme,
      darkTheme: actualDarkTheme,
      themeScheme: actualThemeScheme,
      setThemeContextOverride,
    }

    return React.createElement(
      ThemeContext.Provider,
      { value: contextValue },
      children
    )
  }

  return {
    themeScheme,
    navigationTheme,
    setThemeContextOverride,
    ThemeProvider,
  }
}

interface UseAppThemeValue {
  // The theme object from react-navigation
  navTheme: typeof DefaultTheme
  // A function to set the theme context override (for switching modes)
  setThemeContextOverride: (newTheme: ThemeContexts) => void
  // The current theme object
  theme: Theme
  // The current theme context "light" | "dark"
  themeContext: ThemeContexts
  // A function to apply the theme to a style object.
  themed: <T>(styleOrStyleFn: ThemedStyle<T> | StyleProp<T> | ThemedStyleArray<T>) => T
}

/**
 * Custom hook that provides the app theme and utility functions for theming.
 *
 * @returns {UseAppThemeValue} An object containing various theming values and utilities.
 */
export const useAppTheme = (): UseAppThemeValue => {
  const navTheme = useNavTheme()
  const context = useContext(ThemeContext)

  // Default values if not wrapped in a provider
  const defaultThemeContext: ThemeContexts = navTheme.dark ? "dark" : "light"

  // Either use context values or fallback to defaults
  const themeContext = context?.themeScheme ?? defaultThemeContext
  const theme = globalTheme.t;

  const setThemeContextOverride = context?.setThemeContextOverride ??
    (() => console.warn("Theme context override not available - no ThemeProvider found"))

  const themed = useCallback(
    <T>(styleOrStyleFn: ThemedStyle<T> | StyleProp<T> | ThemedStyleArray<T>) => {
      const flatStyles = [styleOrStyleFn].flat(3)
      const stylesArray = flatStyles.map((f) => {
        if (typeof f === "function") {
          return (f as ThemedStyle<T>)(theme)
        } else {
          return f
        }
      })

      // Flatten the array of styles into a single object
      return Object.assign({}, ...stylesArray) as T
    },
    [theme]
  )

  return {
    navTheme,
    setThemeContextOverride,
    theme,
    themeContext,
    themed,
  }
}