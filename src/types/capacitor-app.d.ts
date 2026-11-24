declare module '@capacitor/app' {
  export interface PluginListenerHandle { remove(): Promise<void>; }
  export interface BackButtonListenerEvent { canGoBack: boolean; }
  export const App: {
    addListener(eventName: 'backButton', listenerFunc: (event: BackButtonListenerEvent) => void): Promise<PluginListenerHandle>;
  };
}
