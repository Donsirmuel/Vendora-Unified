import React from "react";
import { Sparkles } from "lucide-react";
import "./splash-screen.css";

interface SplashScreenProps {
  message?: string;
  subMessage?: string;
}

const SplashScreen: React.FC<SplashScreenProps> = ({
  message = "Loading Vendora…",
  subMessage = "Setting up your account"
}) => {
  return (
    <div className="splash" role="alert" aria-live="assertive">
      <div className="splash__backdrop" aria-hidden />
      <div className="splash__card">
        <div className="splash__badge">
          <Sparkles className="h-4 w-4" aria-hidden />
          Vendora
        </div>
        <div className="splash__logo" aria-hidden>
          <img src="/brand/logo-light.svg" alt="" className="dark:hidden" />
          <img src="/brand/logo-dark.svg" alt="" className="hidden dark:block" />
        </div>
        <h1>{message}</h1>
        <p>{subMessage}</p>
        <div className="splash__progress" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
