import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile, setProfileUser, updateProfile } from "../redux/slices/profileSlice";
import { toast } from "react-toastify";
import api from "../api/api";
import { resolveMediaUrl } from "../utils/url";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const RESEND_SECONDS = 45;
const OTP_LENGTH = 6;
const getOtpErrorMessage = (error) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  "Failed to process OTP request";
const isOtpUnavailableError = (error) =>
  error?.response?.status === 503 ||
  /otp is not available|redis is not available/i.test(getOtpErrorMessage(error));

const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-white/[0.07]";
const inputLabelClassName = "mb-2 block text-sm font-medium text-slate-300";

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

  const timerLabel = useMemo(
    () => `${String(Math.floor(timer / 60)).padStart(2, "0")}:${String(timer % 60).padStart(2, "0")}`,
    [timer]
  );

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    const handleWindowFocus = () => {
      dispatch(fetchProfile());
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => window.removeEventListener("focus", handleWindowFocus);
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
        toast.info("OTP service is unavailable right now.");
      } else {
        toast.error(getOtpErrorMessage(error));
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleStartVerification = async () => {
    setShowOtpSection(true);
    await handleSendOtp();
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== OTP_LENGTH) {
      toast.error("Enter the 6-digit OTP to verify your email");
      return;
    }

    setOtpLoading(true);

    try {
      const response = await api.post("/api/verify-otp/", {
        email: form.email.trim(),
        otp: otp.trim(),
      });

      if (response.data?.user) {
        dispatch(setProfileUser(response.data.user));
      }

      setOtpUnavailable(false);
      toast.success(response.data?.message || "Email verified successfully");
      setShowOtpSection(false);
      setOtp("");
      setOtpSent(false);
      setTimer(0);

      try {
        await dispatch(fetchProfile()).unwrap();
      } catch {
        
      }
    } catch (error) {
      if (isOtpUnavailableError(error)) { 
        setOtpUnavailable(true);
        setShowOtpSection(false);
        setOtpSent(false);
        setOtp("");
        setTimer(0);
        toast.info("OTP service is unavailable right now.");
      } else {
        toast.error(getOtpErrorMessage(error));
      }
    } finally {
      setOtpLoading(false);
    }
  };

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

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className={inputLabelClassName}>Profile photo</label>
            <input
              id="profile-photo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="profile-photo-upload"
              className="inline-flex cursor-pointer items-center rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
            >
              {form.avatar_url ? "Update" : "Upload"}
            </label>
          </div>

          <div>
            <label className={inputLabelClassName}>Username</label>
            <input
              value={form.username}
              disabled
              className={`${inputClassName} cursor-not-allowed text-slate-400`}
            />
          </div>

          <div>
            <label className={inputLabelClassName}>Email</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className={inputClassName}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)] backdrop-blur-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-400">Email verification</p>
                <p className="text-base font-semibold text-white">{form.email || "No email added"}</p>

                <div
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                    user?.is_email_verified
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {user?.is_email_verified ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {user?.is_email_verified ? "Verified" : "Not verified"}
                </div>
              </div>

              {!user?.is_email_verified && !showOtpSection && (
                <button
                  type="button"
                  onClick={handleStartVerification}
                  disabled={otpLoading || otpUnavailable || !form.email.trim()}
                  className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                >
                  {otpLoading && !showOtpSection ? "Please wait..." : "Verify Email"}
                </button>
              )}
            </div>

            {!user?.is_email_verified && (
              <div
                className={`grid transition-all duration-300 ease-out ${
                  showOtpSection ? "mt-5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="space-y-4 border-t border-white/10 pt-5">
                    {otpUnavailable ? (
                      <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                        OTP service is unavailable right now.
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className={inputLabelClassName}>Verification code</label>
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            placeholder="Enter 6-digit code"
                            inputMode="numeric"
                            maxLength={OTP_LENGTH}
                            className={inputClassName}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={otpLoading}
                            className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                          >
                            {otpLoading ? "Verifying..." : "Verify"}
                          </button>

                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={otpLoading || timer > 0}
                            className="text-sm font-medium text-slate-400 transition hover:text-cyan-300 disabled:cursor-not-allowed disabled:text-slate-600"
                          >
                            {timer > 0 ? `Resend code in ${timerLabel}` : "Resend code"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={inputLabelClassName}>First name</label>
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              placeholder="First Name"
              className={inputClassName}
            />
          </div>

          <div>
            <label className={inputLabelClassName}>Last name</label>
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              placeholder="Last Name"
              className={inputClassName}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-cyan-400 px-4 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Save Changes
          </button>

        </form>

      </div>
    </div>
  );
};

export default UserProfile;
