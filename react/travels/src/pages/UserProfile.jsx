import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile, updateProfile } from "../redux/slices/profileSlice";
import { toast } from "react-toastify";
import api from "../api/api";
import { resolveMediaUrl } from "../utils/url";

const RESEND_SECONDS = 45;
const getOtpErrorMessage = (error) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  "Failed to process OTP request";
const isOtpUnavailableError = (error) =>
  error?.response?.status === 503 ||
  /otp is not available|redis is not available/i.test(getOtpErrorMessage(error));

const UserProfile = () => {

  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.profile);

  const [form, setForm] = useState({                  
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    avatar: null,
    avatar_url: "",
  });  
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [otpUnavailable, setOtpUnavailable] = useState(false);

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username,
        email: user.email || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        avatar: null,
        avatar_url: resolveMediaUrl(user.avatar),
      });

      if (user.is_email_verified) {
        setShowOtpSection(false);
        setOtp("");
        setOtpSent(false);
        setTimer(0);
        setOtpUnavailable(false);
      }
    }
  }, [user]);

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setForm((prev) => ({
      ...prev,
      avatar: file,
      avatar_url: URL.createObjectURL(file),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("email", form.email);
    formData.append("first_name", form.first_name);
    formData.append("last_name", form.last_name);

    if (form.avatar) {
      formData.append("avatar", form.avatar);
    }

    const result = await dispatch(updateProfile(formData));

    if (updateProfile.fulfilled.match(result)) {
      toast.success("Profile updated successfully");
    } else {
      toast.error("Failed to update profile");
    }
  };

  const handleSendOtp = async () => {
    if (!form.email.trim()) {
      toast.error("Add your email before requesting OTP");
      return;
    }

    setOtpLoading(true);

    try {
      const response = await api.post("/api/request-otp/", {
        email: form.email.trim(),
      });

      setOtpUnavailable(false);
      setShowOtpSection(true);
      setOtpSent(true);
      setTimer(RESEND_SECONDS);
      toast.success(response.data?.message || "OTP sent to email");
    } catch (error) {
      if (isOtpUnavailableError(error)) {
        setOtpUnavailable(true);
        setShowOtpSection(false);
        setOtpSent(false);
        setOtp("");
        setTimer(0);
        toast.info("Email verification by OTP is only available in local development.");
      } else {
        toast.error(getOtpErrorMessage(error));
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast.error("Enter the OTP to verify your email");
      return;
    }

    setOtpLoading(true);

    try {
      const response = await api.post("/api/verify-otp/", {
        email: form.email.trim(),
        otp: otp.trim(),
      });

      setOtpUnavailable(false);
      toast.success(response.data?.message || "Email verified successfully");
      setShowOtpSection(false);
      setOtp("");
      setOtpSent(false);
      setTimer(0);
      dispatch(fetchProfile());
    } catch (error) {
      if (isOtpUnavailableError(error)) {
        setOtpUnavailable(true);
        setShowOtpSection(false);
        setOtpSent(false);
        setOtp("");
        setTimer(0);
        toast.info("Email verification by OTP is only available in local development.");
      } else {
        toast.error(getOtpErrorMessage(error));
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const timerLabel = `${String(Math.floor(timer / 60)).padStart(2, "0")}:${String(
    timer % 60
  ).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white py-16 px-4">
      <div className="max-w-lg mx-auto">

        <div className="text-center mb-12">
          <div className="relative w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 overflow-hidden">

            {form.avatar_url ? (
              <img
                src={form.avatar_url}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl flex items-center justify-center h-full">
                👤
              </span>
            )}

          </div>

          <h1 className="text-3xl font-bold text-cyan-300">
            Profile
          </h1>
        </div>

        {loading && (
          <div className="text-center py-4">
            Loading profile...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />

          <input
            value={form.username}
            disabled
            className="w-full p-3 rounded bg-gray-800"
          />

          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full p-3 rounded bg-gray-800"
          />

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-400">Email verification</p>
                <p
                  className={`text-sm font-medium ${
                    user?.is_email_verified ? "text-emerald-300" : "text-amber-300"
                  }`}
                >
                  {user?.is_email_verified ? "Verified" : "Not Verified"}
                </p>
              </div>

              {!user?.is_email_verified && (
                <button
                  type="button"
                  onClick={() => setShowOtpSection((current) => !current)}
                  disabled={otpUnavailable}
                  className="rounded-lg border border-cyan-400/30 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-500/10"
                >
                  {otpUnavailable
                    ? "OTP Unavailable"
                    : showOtpSection
                      ? "Hide Verification"
                      : "Verify Email"}
                </button>
              )}
            </div>

            {!user?.is_email_verified && otpUnavailable && (
              <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                OTP-based email verification is available only in local development. Production continues without Redis and without this step.
              </div>
            )}

            {!user?.is_email_verified && showOtpSection && !otpUnavailable && (
              <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading}
                    className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-black transition disabled:opacity-60"
                  >
                    {otpLoading && !otpSent ? "Sending..." : otpSent ? "Send Again" : "Send OTP"}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading || timer > 0 || !otpSent}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-200 transition disabled:opacity-50"
                  >
                    {timer > 0 ? `Resend in ${timerLabel}` : "Resend OTP"}
                  </button>
                </div>

                {otpSent && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter OTP"
                      maxLength={6}
                      className="w-full rounded bg-gray-800 p-3 tracking-[0.3em]"
                    />

                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpLoading}
                      className="w-full rounded bg-emerald-500 p-3 font-medium text-black transition disabled:opacity-60"
                    >
                      {otpLoading ? "Verifying..." : "Verify OTP"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <input
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            placeholder="First Name"
            className="w-full p-3 rounded bg-gray-800"
          />

          <input
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            placeholder="Last Name"
            className="w-full p-3 rounded bg-gray-800"
          />

          <button
            type="submit"
            className="w-full p-3 bg-cyan-500 rounded"
          >
            Save Changes
          </button>

        </form>

      </div>
    </div>
  );
};

export default UserProfile;
