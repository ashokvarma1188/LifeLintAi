import { useEffect, useRef } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/** Renders Google's own "Sign in with Google" button. Renders nothing if not configured. */
function GoogleSignInButton({ onCredential, disabled }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!CLIENT_ID || disabled) return;

    let cancelled = false;

    const init = () => {
      if (cancelled || !window.google?.accounts?.id || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => onCredential(response.credential),
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
      });
    };

    // The GIS script loads async — poll briefly until window.google is ready.
    if (window.google?.accounts?.id) {
      init();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          init();
        }
      }, 200);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  if (!CLIENT_ID) return null;

  return <div ref={buttonRef} style={{ display: "flex", justifyContent: "center" }} />;
}

export default GoogleSignInButton;
