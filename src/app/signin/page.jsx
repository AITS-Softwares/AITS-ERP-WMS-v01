"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  FiBriefcase,
  FiActivity,
  FiBox,
  FiChevronRight,
  FiEye,
  FiEyeOff,
  FiLoader,
  FiLock,
  FiMail,
  FiShield,
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
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0b1120 0%, #172554 52%, #0f172a 100%)" }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,#94a3b8_1px,transparent_1px),linear-gradient(to_bottom,#94a3b8_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="absolute -top-40 -right-40 h-80 w-80 animate-pulse rounded-full bg-blue-700 opacity-20 mix-blend-overlay blur-3xl filter" />
        <div className="animation-delay-2000 absolute -bottom-40 -left-40 h-80 w-80 animate-pulse rounded-full bg-slate-600 opacity-20 mix-blend-overlay blur-3xl filter" />
        <div className="animation-delay-4000 absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 transform animate-pulse rounded-full bg-slate-400 opacity-10 mix-blend-overlay blur-3xl filter" />
      </div>

      <ToastContainer position="top-center" theme="light" />

      <div className="z-10 w-full max-w-md px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col items-center text-center sm:mb-7">

          <p className="inline-flex rounded-full border border-slate-300/30 bg-slate-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-200">WMS Workspace</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-200/80">Sign in to manage warehouse operations.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] font-semibold text-slate-200"><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/20 bg-slate-950/30 px-3 py-1.5"><FiActivity className="text-slate-300" /> Live operations</span><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/20 bg-slate-950/30 px-3 py-1.5"><FiShield className="text-slate-300" /> Secure access</span></div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/30 bg-white/[0.97] shadow-2xl shadow-slate-950/30 backdrop-blur-sm">
            <div className="h-1.5 bg-gradient-to-r from-slate-800 via-blue-700 to-slate-800" />
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
                  style={mode === tab.id ? { backgroundColor: "#1e3a5f", color: "#ffffff" } : {}}
                >
                  {tab.icon} {tab.id}
                </button>
              ))}
            </div>

            <div className="p-6 sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-900">Sign in to WMS</h2><p className="mt-1 text-sm text-slate-500">Use your registered warehouse account details.</p></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><FiBox size={19} /></span></div>
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-slate-800 placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-800"
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-slate-800 placeholder:text-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-800"
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
                  <button type="button" className="text-xs font-medium text-blue-800 hover:text-blue-950">
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold text-white shadow-lg shadow-slate-950/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ backgroundColor: "#1e3a5f" }}
                >
                  {loading ? <FiLoader className="animate-spin" size={18} /> : <span>Sign In</span>}
                  {!loading && <FiChevronRight size={16} />}
                </button>
              </form>

            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs">
              <span className="font-semibold text-slate-400">WMS Portal</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-slate-400">ERPNext Connected</span>
              </div>
            </div>
        </div>

        <p className="mt-5 text-center text-[10px] uppercase tracking-wider text-slate-300/80 sm:mt-6">
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
