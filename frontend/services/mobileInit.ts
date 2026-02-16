// Mobile-specific initialization for Capacitor
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { App as CapApp } from '@capacitor/app';

/**
 * Initialize mobile-specific features when running as a native app.
 * This is safe to call even on web — it checks the platform first.
 */
export async function initMobileApp() {
  if (!Capacitor.isNativePlatform()) {
    return; // Skip on web
  }

  // --- Status Bar ---
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0f172a' });
  } catch (e) {
    console.warn('StatusBar plugin error:', e);
  }

  // --- Splash Screen ---
  try {
    await SplashScreen.hide();
  } catch (e) {
    console.warn('SplashScreen plugin error:', e);
  }

  // --- Keyboard ---
  try {
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.body.style.paddingBottom = `${info.keyboardHeight}px`;
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.style.paddingBottom = '0px';
    });
  } catch (e) {
    console.warn('Keyboard plugin error:', e);
  }

  // --- Hardware Back Button (Android) ---
  try {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
  } catch (e) {
    console.warn('App plugin error:', e);
  }
}

/**
 * Check if the app is running as a native mobile app
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the current platform: 'android', 'ios', or 'web'
 */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}
