"use client";

import { useState, useEffect } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Kiểm tra nếu đã đăng nhập thì tự động đá vào trong
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (userData?.role === 'pt' || userData?.role === 'coach') window.location.href = "/coach";
        else window.location.href = "/";
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("Email hoặc mật khẩu không đúng!");
      setLoading(false);
      return;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (userData?.role === 'pt' || userData?.role === 'coach') {
      window.location.href = "/coach";
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-brand-mossDeep flex flex-col justify-center px-6 relative shadow-2xl overflow-hidden">
      <div className="absolute top-[-10%] right-[-20%] w-64 h-64 bg-brand-moss rounded-full mix-blend-screen filter blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] left-[-20%] w-64 h-64 bg-brand-sand rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>

      <div className="relative z-10 w-full">
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center px-5 py-2 border-2 border-brand-sand rounded-lg shadow-lg bg-brand-mossDeep">
            <span className="text-brand-sand text-[18px] font-black uppercase tracking-[0.2em] drop-shadow-sm">
              CK Coaching
            </span>
          </div>
        </div>

        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Chào mừng trở lại!</h1>
          <p className="text-brand-sage text-sm">Đăng nhập để xem giáo án tập luyện của bạn</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-brand-moss/50" />
            </div>
            <input
              type="email"
              required
              placeholder="Email của bạn"
              className="w-full pl-11 pr-4 py-3.5 bg-brand-paper border-0 rounded-xl text-brand-moss font-bold focus:ring-2 focus:ring-brand-sand outline-none transition-all shadow-inner placeholder:font-normal placeholder:text-brand-moss/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-brand-moss/50" />
            </div>
            <input
              type="password"
              required
              placeholder="Mật khẩu"
              className="w-full pl-11 pr-4 py-3.5 bg-brand-paper border-0 rounded-xl text-brand-moss font-bold focus:ring-2 focus:ring-brand-sand outline-none transition-all shadow-inner placeholder:font-normal placeholder:text-brand-moss/40"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center pt-1 pb-4">
            {errorMsg ? (
              <span className="text-red-400 text-xs font-bold bg-red-400/10 px-2 py-1 rounded">{errorMsg}</span>
            ) : (
              <span></span>
            )}
            <a href="#" className="text-xs font-semibold text-brand-sand hover:text-white transition-colors">
              Quên mật khẩu?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-sand text-brand-mossDeep font-bold text-lg py-3.5 rounded-xl hover:bg-[#ebd8b7] transition-all shadow-[0_4px_14px_0_rgba(220,208,180,0.39)] flex items-center justify-center group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Đang xử lý..." : "Đăng Nhập"}
            {!loading && <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>
      </div>
    </div>
  );
}
