import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, MailCheck, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import api from "../api/api";

const RESEND_SECONDS = 45;
const OTP_LENGTH = 6;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  fallback;

const isOtpUnavailableError = (error) =>
  error?.response?.status === 503 ||
  /otp is not available|redis is not available/i.test(getErrorMessage(error, ""));

const formatEmailPreview = (value) => {
  const [name, domain] = value.split("@");

  if (!name || !domain) {
    return value;
  }

  if (name.length <= 2) {
    return `${name[0] || ""}*@${domain}`;
  }

  return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 2))}@${domain}`;
};

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

  const otpSlots = useMemo(
    () => Array.from({ length: OTP_LENGTH }, (_, index) => otp[index] || ""),
    [otp]
  );

  const emailPreview = useMemo(() => formatEmailPreview(email), [email]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    if (type === "success") {
      toast.success(text);
      return;
    }

    if (type === "error") {
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
      showMessage("error", "Enter a valid email address before requesting a verification code.");
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
    setOtpUnavailable(false);

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
          (isResend
            ? "A fresh verification code was sent to your inbox."
            : "Verification code sent to your email.")
      );
    } catch (error) {
      if (isOtpUnavailableError(error)) {
        setOtpUnavailable(true);
        setOtpSent(false);
        setTimer(0);
        showMessage("error", "Verification service is unavailable right now.");
        return;
      }

      showMessage(
        "error",
        getErrorMessage(
          error,
          isResend
            ? "Unable to resend the verification code right now. Please try again."
            : "Unable to send the verification code right now."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    const normalizedEmail = validateEmail();
    if (!normalizedEmail) {
      return;
    }

    if (otp.trim().length !== OTP_LENGTH) {
      showMessage("error", "Enter the 6-digit verification code from your email.");
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });
    setOtpUnavailable(false);

    try {
      const response = await api.post("/api/verify-otp/", {
        email: normalizedEmail,
        otp: otp.trim(),
      });

      showMessage("success", response.data?.message || "Email verified successfully.");
    } catch (error) {
      if (isOtpUnavailableError(error)) {
        setOtpUnavailable(true);
        setOtpSent(false);
        setTimer(0);
        showMessage("error", "Verification service is unavailable right now.");
        return;
      }

      showMessage(
        "error",
        getErrorMessage(error, "Verification failed. Please review the code and try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-[#111827]/95 text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="p-6 sm:p-7">
        <div className="mb-7 flex items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300">
              <MailCheck size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-white">Verify your email</h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                Enter your email, request a verification code, and confirm it to secure your
                account.
              </p>
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            Secure
          </div>
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="verification-email" className="text-sm font-medium text-slate-300">
              Email address
            </label>
            <input
              id="verification-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            />
            <p className="text-xs leading-5 text-slate-500">
              We will send a 6-digit verification code to this address.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Request verification code</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {otpSent
                    ? `Code sent to ${emailPreview || "your inbox"}.`
                    : "Request a one-time code to begin verification."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSendOtp(false)}
                disabled={loading || otpUnavailable}
                className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
              >
                {otpUnavailable
                  ? "Service unavailable"
                  : loading && !otpSent
                    ? "Sending code..."
                    : otpSent
                      ? "Send new code"
                      : "Send code"}
              </button>
            </div>
          </div>

          {otpSent && !otpUnavailable && (
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Enter verification code</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Use the latest code sent to <span className="font-medium text-slate-200">{email}</span>.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
                  <Clock3 size={14} />
                  {timer > 0 ? `Resend available in ${timerLabel}` : "You can request a new code"}
                </div>
              </div>

              <div className="space-y-3">
                <label htmlFor="verification-otp" className="text-sm font-medium text-slate-700">
                  Verification code
                </label>

                <div className="grid grid-cols-6 gap-2">
                  {otpSlots.map((digit, index) => (
                    <div
                      key={`otp-slot-${index}`}
                      className="flex h-12 items-center justify-center rounded-xl border border-white/10 bg-[#0b1220] text-lg font-semibold text-white"
                    >
                      {digit || ""}
                    </div>
                  ))}
                </div>

                <input
                  id="verification-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={OTP_LENGTH}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                  autoComplete="one-time-code"
                  placeholder="Enter the 6-digit code"
                  className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-4 py-3.5 text-center text-base tracking-[0.45em] text-white outline-none transition placeholder:text-left placeholder:tracking-normal placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                >
                  {loading ? "Verifying..." : "Verify email"}
                </button>

                <button
                  type="button"
                  onClick={() => handleSendOtp(true)}
                  disabled={loading || timer > 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-500"
                >
                  <RefreshCw size={16} />
                  {timer > 0 ? `Resend in ${timerLabel}` : "Resend code"}
                </button>
              </div>
            </div>
          )}

          {message.text && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                message.type === "success"
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                  : "border-red-400/20 bg-red-500/10 text-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {otpUnavailable && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-200">
              Verification service is temporarily unavailable. Please try again in a little while.
            </div>
          )}
        </form>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Need to continue later? You can come back anytime.</p>
          <Link to="/login" className="font-medium text-cyan-300 transition hover:text-cyan-200">
            Return to login
          </Link>
        </div>
      </div>
    </section>
  );
};

export default OTPVerification;
