import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Login } from "./Login";
import "./index.css";

function Root() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    // Plain fetch, not api.*: a 401 here means "show sign-in", not "reload".
    fetch("/api/session")
      .then((r) => setSignedIn(r.ok))
      .catch(() => setSignedIn(true)); // offline/network error: let the app show its own error
  }, []);
  if (signedIn === null) return null;
  return signedIn ? <App /> : <Login onDone={() => setSignedIn(true)} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
