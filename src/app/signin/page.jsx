"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  FiBriefcase,
  FiChevronRight,
  FiEye,
  FiEyeOff,
  FiLoader,
  FiLock,
  FiMail,
  FiUser,
} from "react-icons/fi";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
      const { token, company, user } = res.data;
      const finalUser = company || user;

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
      style={{ background: "linear-gradient(135deg, #020617 0%, #0f172a 52%, #083344 100%)" }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 animate-pulse rounded-full bg-cyan-400 opacity-20 mix-blend-overlay blur-3xl filter" />
        <div className="animation-delay-2000 absolute -bottom-40 -left-40 h-80 w-80 animate-pulse rounded-full bg-cyan-600 opacity-20 mix-blend-overlay blur-3xl filter" />
        <div className="animation-delay-4000 absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 transform animate-pulse rounded-full bg-slate-400 opacity-10 mix-blend-overlay blur-3xl filter" />
      </div>

      <ToastContainer position="top-center" theme="light" />

      <div className="z-10 w-full max-w-md px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col items-center text-center sm:mb-7">
          <div className="relative mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-white/30 transition-all duration-300 hover:scale-105 sm:h-28 sm:w-28">
            {!imageLoaded && !logoError && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></div>
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
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 to-cyan-800">
                <span className="text-2xl font-bold text-white sm:text-3xl">ERP</span>
              </div>
            )}
          </div>

          <p className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">WMS Workspace</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Welcome back</h1>
          <p className="mt-2 text-sm text-cyan-50/80">Sign in to manage warehouse operations.</p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/30 bg-white/[0.97] shadow-2xl shadow-slate-950/30 backdrop-blur-sm">
            <div className="flex gap-1 bg-slate-100/80 p-1.5">
              {[
                { id: "Company", icon: <FiBriefcase size={14} /> },
                { id: "User", icon: <FiUser size={14} /> },
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
                      ? "text-slate-950 shadow-md"
                      : "text-slate-500 hover:bg-white hover:text-slate-700"
                  }`}
                  style={mode === tab.id ? { backgroundColor: "#22d3ee" } : {}}
                >
                  {tab.icon} {tab.id}
                </button>
              ))}
            </div>

            <div className="p-6 sm:p-7">
              <div className="mb-6"><h2 className="text-xl font-bold text-slate-900">Sign in</h2><p className="mt-1 text-sm text-slate-500">Use your registered account details.</p></div>
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-slate-800 placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-600"
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-slate-800 placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-600"
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
                  <button type="button" className="text-xs font-medium text-cyan-700 hover:text-cyan-900">
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ backgroundColor: "#22d3ee", color: "#020617" }}
                >
                  {loading ? <FiLoader className="animate-spin" size={18} /> : <span>Sign In</span>}
                  {!loading && <FiChevronRight size={16} />}
                </button>
              </form>

            </div>

            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-6 py-3 text-xs">
              <span className="text-gray-400">WMS Portal</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-gray-400">Servers Online</span>
              </div>
            </div>
        </div>

        <p className="mt-5 text-center text-[10px] uppercase tracking-wider text-cyan-100/80 sm:mt-6">
          Secure access only • Authorized users
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
