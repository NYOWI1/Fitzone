import React from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.jsx";
import { clerkProviderProps, isClerkEnabled } from "./config/clerk";
import "../styles.css";

const app = <App clerkEnabled={isClerkEnabled} />;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isClerkEnabled ? (
      <ClerkProvider {...clerkProviderProps}>{app}</ClerkProvider>
    ) : (
      app
    )}
  </React.StrictMode>,
);
