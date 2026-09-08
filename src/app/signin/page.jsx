"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  FiArrowRight,
  FiBriefcase,
  FiChevronRight,
  FiEye,
  FiEyeOff,
  FiLoader,
  FiLock,
  FiMail,
  FiSmartphone,
  FiUser,
} from "react-icons/fi";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Link = ({ href, children, className }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("Company");
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      return toast.error("Credentials required");
    }

    setLoading(true);

    try {
      const urls = {
        Company: "/api/company/login",
        User: "/api/users/login",
        Customer: "/api/customers/login",
      };

      const res = await axios.post(urls[mode], form);
      const { token, company, user, customer } = res.data;
      const finalUser = company || user || customer;

      if (!token || !finalUser) throw new Error("Authentication failed");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(finalUser));
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;

      toast.success(`Access Granted: ${finalUser.name || "User"}`);

      router.push("/wms");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Verification Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#105B92" }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 animate-pulse rounded-full bg-blue-300 opacity-20 mix-blend-overlay blur-3xl filter" />
        <div className="animation-delay-2000 absolute -bottom-40 -left-40 h-80 w-80 animate-pulse rounded-full bg-cyan-300 opacity-20 mix-blend-overlay blur-3xl filter" />
        <div className="animation-delay-4000 absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 transform animate-pulse rounded-full bg-indigo-300 opacity-10 mix-blend-overlay blur-3xl filter" />
      </div>

      <ToastContainer position="top-center" theme="light" />

      <div className="z-10 w-full max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-col items-center sm:mb-8">
          <div className="relative mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-xl transition-all duration-300 hover:scale-105 sm:h-32 sm:w-32 md:h-36 md:w-36 lg:h-40 lg:w-40">
            {!imageLoaded && !logoError && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#105B92] border-t-transparent"></div>
              </div>
            )}

            {!logoError ? (
              <img
                src="/logo2_erpexpress.png"
                alt="ERP Express Logo"
                className={`h-full w-full object-contain transition-opacity duration-300 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#105B92] to-[#0a3b60]">
                <span className="text-2xl font-bold text-white sm:text-3xl">ERP</span>
              </div>
            )}
          </div>

          {logoError && (
            <div className="mt-2 text-center">
              <span className="text-xs text-blue-100">Logo not loaded, using text version</span>
            </div>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-2xl backdrop-blur-sm">
            <div className="flex gap-1 bg-gray-100/50 p-1">
              {[
                { id: "Company", icon: <FiBriefcase size={14} /> },
                { id: "User", icon: <FiUser size={14} /> },
                { id: "Customer", icon: <FiMail size={14} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setMode(tab.id);
                    setForm({ email: "", password: "" });
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                    mode === tab.id
                      ? "text-white shadow-sm"
                      : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                  }`}
                  style={mode === tab.id ? { backgroundColor: "#105B92" } : {}}
                >
                  {tab.icon} {tab.id}
                </button>
              ))}
            </div>

            <div className="p-6">
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Email Address</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <FiMail size={16} />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handle}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-gray-800 placeholder:text-gray-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#105B92]"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Password</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <FiLock size={16} />
                    </div>
                    <input
                      type={show ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handle}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-gray-800 placeholder:text-gray-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#105B92]"
                      placeholder="........"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <button type="button" className="text-xs font-medium" style={{ color: "#105B92" }}>
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ backgroundColor: "#105B92" }}
                >
                  {loading ? <FiLoader className="animate-spin" size={18} /> : <span>Sign In</span>}
                  {!loading && <FiChevronRight size={16} />}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-gray-500">
                New to the platform?{" "}
                <Link href="/signup" className="font-semibold" style={{ color: "#105B92" }}>
                  Create an account
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-6 py-3 text-xs">
              <span className="text-gray-400">AITS v3.0.4</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-gray-400">Servers Online</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/15 p-6 text-white shadow-2xl backdrop-blur-sm">
            <div className="flex h-full flex-col justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100">
                  <FiSmartphone size={14} />
                  Distributor App
                </div>
                <h2 className="mt-4 text-2xl font-semibold">Dedicated distributor login</h2>
                <p className="mt-3 text-sm leading-6 text-blue-100">
                  Keep distributors on their own OTP-first journey with separate screens for product ordering, stock requests, invoice tracking, dispatch, and complaints.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm font-semibold">Separate from admin and customer flows</p>
                  <p className="mt-1 text-xs text-blue-100">
                    This block is only a clean entry point. Login fields stay on the dedicated distributor page you approved.
                  </p>
                </div>

                <Link
                  href="/distributor/signin"
                  className="inline-flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#105B92] transition hover:bg-blue-50"
                >
                  <span>Go to distributor login</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#105B92] text-white">
                    <FiArrowRight size={16} />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-wider text-blue-100">
          Secure access only • Authorized users and mapped distributors
        </p>
      </div>

      <style jsx>{`
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </main>
  );
}
