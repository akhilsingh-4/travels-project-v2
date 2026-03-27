import React from "react";
import OTPVerification from "../components/OTPVerification";

const EmailVerification = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(245,158,11,0.12),_transparent_28%),linear-gradient(135deg,_#020617_0%,_#07131f_52%,_#000000_100%)] px-4 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden lg:block">
            <div className="max-w-xl">
              <p className="mb-4 text-sm uppercase tracking-[0.35em] text-emerald-300/80">
                Secure Access Flow
              </p>
              <h2 className="text-5xl font-semibold leading-tight text-white">
                Verify email ownership before the next trip begins.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                This OTP flow is built for speed: request the code, confirm it, and continue with your account without friction.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[  
                  { step: "01", label: "Enter email" },
                  { step: "02", label: "Receive OTP" },
                  { step: "03", label: "Verify access" },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
                  >
                    <p className="text-xs tracking-[0.28em] text-amber-300">{item.step}</p>
                    <p className="mt-2 text-sm text-white">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <OTPVerification />
        </div> 
      </div>
    </div>
  );
};

export default EmailVerification;
