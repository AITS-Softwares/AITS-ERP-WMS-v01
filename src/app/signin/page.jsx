"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  FiBriefcase,
  FiBox,
  FiChevronRight,
  FiEye,
  FiEyeOff,
  FiLoader,
  FiLock,
  FiMail,
  FiUser,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("Company");
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const openLogin = (nextMode) => {
    setMode(nextMode);
    setForm({ email: "", password: "" });
    setShowLogin(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error("Credentials required");
    setLoading(true);

    try {
      const urls = { Company: "/api/company/login", User: "/api/users/login" };
      const res = await axios.post(urls[mode], form);
      const { token, company, user } = res.data;
      const finalUser = company || user;
      if (!token || !finalUser) throw new Error("Authentication failed");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(finalUser));
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      toast.success(`Access Granted: ${finalUser.name || "User"}`, {
        autoClose: 3000,
        position: "bottom-right",
      });
      window.setTimeout(() => router.push("/wms"), 1200);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Verification Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#eef7ff] font-sans md:h-[100dvh] md:min-h-0">
      {/* Decorative blue waves and dotted corners fill the mobile letterbox area. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-br from-[#f7fbff] via-[#eef7ff] to-[#e8f5ff] md:hidden">
        <div className="absolute -left-[22vw] -top-[19vw] h-[46vw] w-[145vw] rotate-[-9deg] rounded-[50%] bg-gradient-to-r from-[#36a8f2] via-[#c5eaff] to-transparent opacity-80" />
        <div className="absolute -bottom-[20vw] -right-[24vw] h-[48vw] w-[150vw] rotate-[-9deg] rounded-[50%] bg-gradient-to-l from-[#168de2] via-[#a9ddff] to-transparent opacity-80" />
        <div className="absolute right-4 top-4 h-20 w-20 opacity-60 [background-image:radial-gradient(#318bd0_1.5px,transparent_1.6px)] [background-size:12px_12px]" />
        <div className="absolute bottom-4 left-4 h-20 w-20 opacity-55 [background-image:radial-gradient(#318bd0_1.5px,transparent_1.6px)] [background-size:12px_12px]" />
      </div>

      {/* Matching side panels fill the desktop gutters around the complete artwork. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block">
        <div
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: "max(0px, calc(50vw - 86.82dvh))" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#79c8f5] via-[#8dd2fa] to-[#79c8f5]" />
          <div className="absolute inset-x-0 bottom-0 h-[39%] bg-[#e6f5ff]" style={{ clipPath: "polygon(0 22%, 100% 0, 100% 100%, 0 100%)" }} />
          <div className="absolute bottom-3 left-3 h-[34%] w-[88%] opacity-65 [background-image:radial-gradient(#2786c9_1.5px,transparent_1.6px)] [background-size:18px_18px]" />
        </div>
        <div
          className="absolute inset-y-0 right-0 overflow-hidden"
          style={{ width: "max(0px, calc(50vw - 86.82dvh))" }}
        >
          <div className="absolute inset-0 bg-[#e8f6ff]" />
          <div className="absolute inset-x-0 top-[43%] h-[49%] bg-[#78c7f4]" style={{ clipPath: "polygon(0 0, 100% 12%, 100% 100%, 0 86%)" }} />
          <div className="absolute inset-x-0 bottom-0 h-[30%] bg-[#eaf7ff]" style={{ clipPath: "polygon(0 30%, 100% 0, 100% 100%, 0 100%)" }} />
          <div className="absolute right-3 top-3 h-[34%] w-[88%] opacity-65 [background-image:radial-gradient(#2786c9_1.5px,transparent_1.6px)] [background-size:18px_18px]" />
        </div>
      </div>

      {/* Keep the complete artwork centered at its original aspect ratio on desktop. */}
      <div className="absolute inset-0 hidden md:block">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: "min(100vw, 173.64dvh)", height: "min(100dvh, 57.59vw)" }}
        >
          <Image
            src="/images/wms-login-reference-v5.png"
            alt="WMS warehouse management system"
            fill
            priority
            sizes="100vw"
            className="object-contain"
          />
          <div aria-hidden="true" className="wms-truck-curve pointer-events-none absolute left-[-15%] top-[10%] h-[9.5%] w-[12%]">
            <Image src="/images/wms-side-truck.png" alt="" fill sizes="12vw" className="object-fill" />
            <div className="wms-wheel-spin absolute left-[11.5%] top-[66.7%] h-[32.4%] w-[14.8%]">
              <Image src="/images/wms-truck-wheel-rear.png" alt="" fill sizes="2vw" className="object-contain" />
            </div>
            <div className="wms-wheel-spin absolute left-[75.7%] top-[66.7%] h-[32.4%] w-[14.8%]">
              <Image src="/images/wms-truck-wheel-front.png" alt="" fill sizes="2vw" className="object-contain" />
            </div>
          </div>
          <button
            type="button"
            aria-label="User Login"
            onClick={() => openLogin("User")}
            className="absolute left-[57.5%] top-[38.6%] h-[29.5%] w-[16.7%] rounded-[2vw] bg-transparent transition hover:bg-cyan-300/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500"
          />
          <button
            type="button"
            aria-label="Company User"
            onClick={() => openLogin("Company")}
            className="absolute left-[75.8%] top-[38.6%] h-[29.5%] w-[17.1%] rounded-[2vw] bg-transparent transition hover:bg-cyan-300/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500"
          />
        </div>
      </div>

      {/* Fit the complete artwork on mobile instead of cropping it to the right side. */}
      <div className="absolute inset-0 overflow-hidden md:hidden">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: "min(100vw, 173.64dvh)", height: "min(100dvh, 57.59vw)" }}
        >
          <Image
            src="/images/wms-login-reference-v5.png"
            alt="WMS warehouse management system"
            fill
            priority
            sizes="100vw"
            className="object-contain"
          />
          <div aria-hidden="true" className="wms-truck-curve pointer-events-none absolute left-[-15%] top-[10%] h-[9.5%] w-[12%]">
            <Image src="/images/wms-side-truck.png" alt="" fill sizes="12vw" className="object-fill" />
            <div className="wms-wheel-spin absolute left-[11.5%] top-[66.7%] h-[32.4%] w-[14.8%]">
              <Image src="/images/wms-truck-wheel-rear.png" alt="" fill sizes="2vw" className="object-contain" />
            </div>
            <div className="wms-wheel-spin absolute left-[75.7%] top-[66.7%] h-[32.4%] w-[14.8%]">
              <Image src="/images/wms-truck-wheel-front.png" alt="" fill sizes="2vw" className="object-contain" />
            </div>
          </div>
          <button
            type="button"
            aria-label="User Login"
            onClick={() => openLogin("User")}
            className="absolute left-[57.5%] top-[38.6%] h-[29.5%] w-[16.7%] rounded-[4vw] bg-transparent focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500"
          />
          <button
            type="button"
            aria-label="Company User"
            onClick={() => openLogin("Company")}
            className="absolute left-[75.8%] top-[38.6%] h-[29.5%] w-[17.1%] rounded-[4vw] bg-transparent focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500"
          />
        </div>
      </div>

      {mounted && showLogin ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto p-4 md:block md:p-0"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setShowLogin(false); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="login-title" className="pointer-events-auto my-auto max-h-[calc(100dvh-2rem)] w-full max-w-[365px] overflow-y-auto rounded-[20px] border border-white/80 bg-white shadow-[0_30px_100px_-25px_rgba(2,14,35,0.35)] md:absolute md:right-[18vw] md:top-[60%] md:my-0 md:-translate-y-1/2 md:shadow-[0_24px_70px_-30px_rgba(2,14,35,0.3)]">
            <div className="h-1.5 bg-gradient-to-r from-cyan-400 via-blue-600 to-slate-900" />
            <div className="grid grid-cols-2 gap-1 bg-slate-100/80 p-1.5" role="tablist" aria-label="Login type">
              {[
                { id: "Company", icon: <FiBriefcase size={15} /> },
                { id: "User", icon: <FiUser size={15} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === tab.id}
                  onClick={() => {
                    setMode(tab.id);
                    setForm({ email: "", password: "" });
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${mode === tab.id ? "bg-[#1e3a5f] text-white shadow-sm" : "text-slate-500 hover:bg-white/70 hover:text-slate-800"}`}
                >
                  {tab.icon} {tab.id}
                </button>
              ))}
            </div>

            <div className="p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h2 id="login-title" className="text-lg font-bold tracking-tight text-slate-900">Sign in to WMS</h2>
                  <p className="mt-1 text-xs text-slate-500">Use your registered warehouse account details.</p>
                </div>
                <button type="button" onClick={() => setShowLogin(false)} aria-label="Close login" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                  <FiX size={19} />
                </button>
              </div>

              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label htmlFor="signin-email" className="mb-1 block text-xs font-semibold text-slate-700">Email Address</label>
                  <div className="relative">
                    <FiMail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input id="signin-email" type="email" name="email" autoComplete="username" required value={form.email} onChange={handle} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100" placeholder="name@company.com" />
                  </div>
                </div>
                <div>
                  <label htmlFor="signin-password" className="mb-1 block text-xs font-semibold text-slate-700">Password</label>
                  <div className="relative">
                    <FiLock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input id="signin-password" type={show ? "text" : "password"} name="password" autoComplete="current-password" required value={form.password} onChange={handle} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100" placeholder="........" />
                    <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                      {show ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end pt-0.5">
                  <button type="button" className="text-xs font-semibold text-blue-800 transition hover:text-blue-950">Forgot password?</button>
                </div>
                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-[#173250] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70">
                  {loading ? <FiLoader className="animate-spin" size={17} /> : <><span>Sign In</span><FiChevronRight size={17} /></>}
                </button>
              </form>
            </div>
            <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-xs">
              <span className="font-semibold text-slate-500">WMS Portal</span>
              <span className="inline-flex items-center gap-2 text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500" /> ERPNext Connected</span>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}
