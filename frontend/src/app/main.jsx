import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import App from './App.jsx';
import { clerkProviderProps, isClerkEnabled } from './config/clerk';
import '../styles.css';
import { setApiTokenProvider } from '../shared/api/client';

const app = <App clerkEnabled={isClerkEnabled} />;

function AuthenticatedApp() {
  const { getToken } = useAuth();
  setApiTokenProvider(getToken);
  return app;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isClerkEnabled ? (
      <ClerkProvider {...clerkProviderProps}>
        <AuthenticatedApp />
      </ClerkProvider>
    ) : (
      app
    )}
  </React.StrictMode>
);
