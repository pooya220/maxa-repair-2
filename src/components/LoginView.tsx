/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Lock, User, AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
// @ts-ignore
import loginIllustration from "../assets/images/login_illustration_1783844417014.jpg";
import MaxaLogo from "./MaxaLogo";
import { SystemSettings } from "../types";

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return null;
      })
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("لطفا نام کاربری و رمز عبور را وارد نمایید.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (response.ok && data.success) {
          onLoginSuccess(data.user);
        } else {
          setError(data.error || "خطایی در ورود به سیستم رخ داده است.");
        }
      } else {
        setError("خطای ارتباط با سرور. پاسخ نامعتبر دریافت شد.");
      }
    } catch (err) {
      setError("امکان برقراری ارتباط با سرور وجود ندارد.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans select-none" id="login-container">
      {/* Left Column (Illustration) */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-white p-12 select-none" id="login-illustration-side">
        <div className="max-w-[420px] w-full aspect-square flex items-center justify-center">
          <img
            src={loginIllustration}
            alt="MAXA Collaboration Illustration"
            className="max-h-[380px] object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Divider Line */}
      <div className="hidden md:block w-[1px] bg-slate-300 h-[65vh] my-auto rounded-full"></div>

      {/* Right Column (Form) */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-6 sm:p-12 text-left" id="login-form-side">
        <div className="w-full max-w-[390px] flex flex-col bg-transparent p-7 sm:p-9" id="login-form-container">
          {/* Logo */}
          <div className="flex justify-center mb-10 select-none" id="login-logo-container">
            <div
              className="logo-panel -translate-y-2 flex h-[120px] w-full max-w-[290px] items-center justify-center overflow-hidden bg-transparent px-4 py-2"
              style={{ background: "radial-gradient(ellipse at center, rgba(148,163,184,0.28) 0%, rgba(148,163,184,0.16) 42%, rgba(148,163,184,0) 78%)" }}
            >
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <MaxaLogo size="lg" showSubtext={true} isDarkTheme={false} className="rounded-lg" />
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" dir="ltr">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-rose-50 text-rose-700 p-3.5 rounded-xl border border-rose-200 flex items-start gap-2.5 text-xs"
                id="login-error-alert"
                dir="rtl"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <div className="space-y-1.5" id="username-field-container">
              <div className="relative">
                <label htmlFor="login-username-input" className="absolute -top-2 left-3 z-10 bg-white px-2 text-[11px] font-bold text-slate-600">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl bg-white text-slate-800 px-3.5 pt-3.5 pb-2.5 border border-slate-300 focus:border-[#2d8cf0] focus:ring-2 focus:ring-[#2d8cf0]/20 outline-none transition-all text-left dir-ltr font-medium text-sm"
                  id="login-username-input"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5" id="password-field-container">
              <div className="relative">
                <label htmlFor="login-password-input" className="absolute -top-2 left-3 z-10 bg-white px-2 text-[11px] font-bold text-slate-600">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-white text-slate-800 px-3.5 pt-3.5 pb-2.5 border border-slate-300 placeholder-slate-400 focus:border-[#2d8cf0] focus:ring-2 focus:ring-[#2d8cf0]/20 outline-none transition-all text-left dir-ltr font-medium text-sm"
                  id="login-password-input"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 bg-[#e05a2b] hover:bg-[#d04a1c] active:bg-[#c03d10] text-white font-bold shadow-md shadow-orange-200/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:pointer-events-none text-base border border-[#c3451a]"
              id="login-submit-button"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>

          {/* Powered by Footer */}
          <div className="mt-8 pt-4 border-t border-slate-100 text-center" id="login-powered-by">
            <span className="text-xs font-semibold text-slate-400 tracking-wider font-mono uppercase">
              POWERED BY AZ & PM
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
