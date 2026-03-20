import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../api/api";

const RESEND_SECONDS = 45;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  fallback;

const isOtpUnavailableError = (error) =>
  error?.response?.status === 503 ||
  /otp is not available|redis is not available/i.test(getErrorMessage(error, ""));

const OTPVerification = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [timer, setTimer] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [otpUnavailable, setOtpUnavailable] = useState(false);

  useEffect(() => {
    if (timer <= 0) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setTimer((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timer]);

  const timerLabel = useMemo(() => {
    const minutes = String(Math.floor(timer / 60)).padStart(2, "0");
    const seconds = String(timer % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timer]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    if (type === "success") {
      toast.success(text);
    } else if (type === "error") {
      toast.error(text);
    }
  };

  const validateEmail = () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      showMessage("error", "Please enter your email address.");
      return null;
    }

    if (!emailPattern.test(normalizedEmail)) {
      showMessage("error", "Enter a valid email address before requesting an OTP.");
      return null;
    }

    return normalizedEmail;
  };

  const handleSendOtp = async (isResend = false) => {
    const normalizedEmail = validateEmail();
    if (!normalizedEmail) {
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await api.post("/api/request-otp/", {
        email: normalizedEmail,
      });

      setEmail(normalizedEmail);
      setOtpSent(true);
      setOtp("");
      setTimer(RESEND_SECONDS);

      showMessage(
        "success",
        response.data?.message ||
          (isResend ? "A new OTP was sent to your email." : "OTP sent to your email.")
      );
    } catch (error) {
      if (isOtpUnavailableError(error)) {
        setOtpUnavailable(true);
        setOtpSent(false);
        setTimer(0);
        showMessage(
          "error",
          "Email verification by OTP is only available in local development right now."
        );
        return;
      }

      showMessage(
        "error",
        getErrorMessage(
          error,
          isResend ? "Unable to resend OTP right now. Please try again." : "Unable to send OTP right now."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    const normalizedEmail = validateEmail();
    if (!normalizedEmail) {
      return;
    }

    if (!otp.trim()) {
      showMessage("error", "Please enter the OTP sent to your email.");
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await api.post("/api/verify-otp/", {
        email: normalizedEmail,
        otp: otp.trim(),
      });

      showMessage(
        "success",
        response.data?.message || "Email verified successfully."
      );
    } catch (error) {
      if (isOtpUnavailableError(error)) {
        setOtpUnavailable(true);
        setOtpSent(false);
        setTimer(0);
        showMessage(
          "error",
          "Email verification by OTP is only available in local development right now."
        );
        return;
      }

      showMessage(
        "error",
        getErrorMessage(error, "OTP verification failed. Please check the code and try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_0_36px_rgba(34,211,238,0.18)] backdrop-blur-2xl">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300" />

      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-emerald-400 to-amber-300 text-lg font-bold text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.35)]">
          OTP
        </div>
        <h1 className="text-3xl font-semibold text-white">Email Verification</h1>
        <p className="mt-2 text-sm text-gray-400">
          Request a one-time password, enter the code from your inbox, and verify your email in one smooth step.
        </p>
      </div>

      <form onSubmit={handleVerifyOtp} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm text-gray-300">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder-gray-500 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20"
            autoComplete="email"
          />
          <p className="mt-2 text-xs text-gray-500">
            We&apos;ll send a 6-digit OTP to this address.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleSendOtp(false)}
          disabled={loading || otpUnavailable}
          className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-4 py-3 font-semibold text-slate-950 transition hover:shadow-[0_0_24px_rgba(16,185,129,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {otpUnavailable
            ? "OTP Unavailable Here"
            : loading && !otpSent
              ? "Sending OTP..."
              : otpSent
                ? "Send New OTP"
                : "Send OTP"}
        </button>

        {otpSent && !otpUnavailable && (
          <div className="space-y-4 rounded-3xl border border-emerald-400/20 bg-emerald-500/5 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Enter OTP
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  Use the code that was sent to <span className="text-gray-200">{email}</span>.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-gray-300">
                {timer > 0 ? `Resend in ${timerLabel}` : "Ready to resend"}
              </div>
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 6-digit OTP"
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 tracking-[0.35em] text-white placeholder:tracking-normal placeholder:text-gray-500 outline-none transition focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/20"
              autoComplete="one-time-code"
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-2xl border border-emerald-300/40 bg-emerald-400/90 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={() => handleSendOtp(true)}
                disabled={loading || timer > 0}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {timer > 0 ? `Resend in ${timerLabel}` : "Resend OTP"}
              </button>
            </div>
          </div>
        )}

        {message.text && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : "border-red-400/30 bg-red-500/10 text-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {otpUnavailable && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            OTP verification is intentionally disabled outside local development, so the app stays safe without requiring Redis in production.
          </div>
        )}
      </form>

      <div className="mt-8 text-center text-sm text-gray-400">
        Already finished here?{" "}
        <Link to="/login" className="text-cyan-300 hover:underline">
          Return to login
        </Link>
      </div>
    </div>
  );
};

export default OTPVerification;
