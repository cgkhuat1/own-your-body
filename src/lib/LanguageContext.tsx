"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from './translations';
import { supabase } from './supabase';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['vi'], fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'vi',
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('vi');

  useEffect(() => {
    // 1. Kiểm tra cache local trước để hiển thị tức thời
    const saved = (localStorage.getItem('oyb_language') || localStorage.getItem('ck_language')) as Language;
    if (saved === 'vi' || saved === 'en') {
      setLanguageState(saved);
    }

    // 2. Đồng bộ từ user_metadata của Supabase Auth (dùng getUser để lấy dữ liệu mới nhất từ server)
    const syncUserLanguage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userLang = user?.user_metadata?.language as Language;
        if (userLang === 'vi' || userLang === 'en') {
          setLanguageState((prev) => {
            if (prev !== userLang) {
              localStorage.setItem('oyb_language', userLang);
              localStorage.setItem('ck_language', userLang);
              return userLang;
            }
            return prev;
          });
        }
      } catch (e) {
        console.error("Lỗi đồng bộ ngôn ngữ:", e);
      }
    };

    syncUserLanguage();

    const handleFocus = () => syncUserLanguage();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncUserLanguage();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('oyb_language', lang);
    localStorage.setItem('ck_language', lang);

    // Cập nhật ngầm vào user_metadata để đồng bộ trên mọi thiết bị
    supabase.auth.updateUser({
      data: { language: lang }
    }).catch(e => console.error("Lỗi lưu ngôn ngữ vào Auth:", e));
  };

  const t = (key: keyof typeof translations['vi'], fallback?: string): string => {
    const langDict = translations[language] || translations['vi'];
    return (langDict as any)[key] || fallback || (translations['vi'] as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
