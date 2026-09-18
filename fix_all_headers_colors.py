import re

def generate_header(page_type):
    # Base header for all pages
    header = """      {/* Header */}
      <div className="bg-brand-mossDeep px-5 pb-6 pt-[max(env(safe-area-inset-top),20px)] rounded-b-[2rem] shadow-lg relative overflow-hidden">
        <div className="flex justify-between items-center mb-5 relative z-10">
          <div className="inline-flex items-center px-3 py-1.5 border border-brand-sand/40 rounded-lg bg-white/5">
            <span className="text-brand-sand text-[10px] font-black uppercase tracking-[0.2em]">CK Coaching</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-[52px] h-[52px] bg-brand-paper rounded-full border-[3px] border-brand-paper/20 flex items-center justify-center shadow-md shrink-0">
            <span className="text-brand-mossDeep text-2xl font-black">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : (typeof userName !== 'undefined' && userName ? userName.charAt(0).toUpperCase() : 'B')}
            </span>
          </div>
          <div>
            <h1 className="text-[28px] font-black text-white tracking-tight">Chào {user?.full_name ? user.full_name.split(' ').pop() : (typeof userName !== 'undefined' && userName ? userName.split(' ').pop() : 'Bạn')}!</h1>
            <p className="text-brand-sand text-[10px] font-black uppercase tracking-widest mt-0.5 opacity-90">
              """
              
    if page_type == 'tracking':
        header += """Nhật Ký Tracking
            </p>
          </div>
        </div>
        
        {/* Gamification Level Badges */}
        <div className="flex gap-2 mt-6 relative z-10">
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all ${level >= 1 ? 'bg-brand-sand text-brand-mossDeep' : 'bg-white/5 text-white/40 border border-white/10'}`}>
            {level >= 1 ? <CheckCircle2 size={13} /> : <Lock size={11} />} Cân nặng
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all ${level >= 2 ? 'bg-brand-sand text-brand-mossDeep' : 'bg-white/5 text-white/40 border border-white/10'}`}>
            {level >= 2 ? <CheckCircle2 size={13} /> : <Lock size={11} />} Steps
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all ${level >= 3 ? 'bg-brand-sand text-brand-mossDeep' : 'bg-white/5 text-white/40 border border-white/10'}`}>
            {level >= 3 ? <CheckCircle2 size={13} /> : <Lock size={11} />} Dinh dưỡng
          </div>
        </div>
      </div>"""
    elif page_type == 'program':
        header += """Chương Trình Tập Luyện
            </p>
          </div>
        </div>

        {/* Consistency Widget */}
        <div className="bg-brand-moss rounded-xl p-4 border border-brand-sand/20 relative overflow-hidden mt-6">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Flame size={80} className="text-brand-sand" />
          </div>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <div className="flex items-center space-x-2 text-brand-sand mb-1">
                <Flame size={16} />
                <span className="font-bold text-xs uppercase tracking-wider">Chuỗi tập luyện</span>
              </div>
              <p className="text-white text-sm">Tuân thủ: <span className="font-bold">{compliance}%</span> <span className="text-white/60 text-xs">(Tuần này)</span></p>
            </div>
            <div className="w-10 h-10 bg-brand-sand rounded-full flex items-center justify-center shadow-inner">
              <span className="text-brand-mossDeep font-black text-lg">{completedThisWeek}</span>
            </div>
          </div>
        </div>
      </div>"""
    elif page_type == 'profile':
        header += """Hồ Sơ Thể Chất
            </p>
          </div>
        </div>
      </div>"""
      
    return header

def replace_header(file_path, page_type):
    with open(file_path, 'r') as f:
        code = f.read()

    header_start = code.find("{/* Header */}")
    
    if page_type == 'tracking':
        content_start = code.find('<div className="p-5 space-y-6">', header_start)
    elif page_type == 'profile':
        content_start = code.find('<div className="p-5 space-y-6">', header_start)
    elif page_type == 'program':
        content_start = code.find('<div className="p-5">', header_start)
        
    if header_start != -1 and content_start != -1:
        new_header = generate_header(page_type)
        code = code[:header_start] + new_header + "\n\n      " + code[content_start:]
        with open(file_path, 'w') as f:
            f.write(code)
        print(f"Patched header in {file_path}")
    else:
        print(f"Failed to patch {file_path}")

replace_header('/Users/macbook/Documents/ck-coaching/src/app/page.tsx', 'tracking')
replace_header('/Users/macbook/Documents/ck-coaching/src/app/program/page.tsx', 'program')
replace_header('/Users/macbook/Documents/ck-coaching/src/app/profile/page.tsx', 'profile')

