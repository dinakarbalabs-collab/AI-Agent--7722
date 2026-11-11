import { createAuthClient } from "better-auth/react";
import { managedAuthClient } from "@runablehq/managed-auth/client";

const config = {
  applicationId: import.meta.env.VITE_APPLICATION_ID,
  issuer: import.meta.env.VITE_RUNABLE_AUTH_ISSUER,
};

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
  plugins: [managedAuthClient(config)],
});

// Finish a returning managed sign-in (top-level redirect leg). Top-level await keeps every
// module that imports the auth client (and therefore the app) from evaluating until it settles.
await authClient.managedAuth.handleRedirect().catch(() => {});
