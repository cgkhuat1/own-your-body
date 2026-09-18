import re

def generate_header(page_type):
    # Base header for all pages
    header = """      {/* Header */}
      <div className="bg-[#2C3B2E] px-5 pb-6 pt-[max(env(safe-area-inset-top),20px)] rounded-b-[2rem] shadow-lg relative overflow-hidden">
        <div className="flex justify-between items-center mb-5">
          <div className="inline-flex items-center px-3 py-1.5 border border-[#c4a962]/40 rounded-lg">
            <span className="text-[#c4a962] text-[10px] font-black uppercase tracking-[0.2em]">CK Coaching</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-[52px] h-[52px] bg-[#F4F1E1] rounded-full border-[3px] border-[#F4F1E1]/40 flex items-center justify-center shadow-inner">
            <span className="text-[#2C3B2E] text-2xl font-black">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'B'}
            </span>
          </div>
          <div>
            <h1 className="text-[28px] font-black text-white tracking-tight">Chào {user?.full_name ? user.full_name.split(' ').pop() : 'Bạn'}!</h1>
            <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mt-1">
              """
              
    if page_type == 'tracking':
        header += """Nhật Ký Tracking
            </p>
          </div>
        </div>
        
        {/* Gamification Level Badges */}
        <div className="flex gap-2 mt-6 relative z-10">
          <div className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all ${level >= 1 ? 'bg-[#c4a962] text-[#2C3B2E]' : 'bg-white/5 text-white/40 border border-white/10'}`}>
            {level >= 1 ? <CheckCircle2 size={14} /> : <Lock size={12} />} Cân nặng
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all ${level >= 2 ? 'bg-[#c4a962] text-[#2C3B2E]' : 'bg-white/5 text-white/40 border border-white/10'}`}>
            {level >= 2 ? <CheckCircle2 size={14} /> : <Lock size={12} />} Steps
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all ${level >= 3 ? 'bg-[#c4a962] text-[#2C3B2E]' : 'bg-white/5 text-white/40 border border-white/10'}`}>
            {level >= 3 ? <CheckCircle2 size={14} /> : <Lock size={12} />} Dinh dưỡng
          </div>
        </div>
      </div>"""
    elif page_type == 'program':
        header += """Chương Trình Tập Luyện
            </p>
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
    
    # Locate the start of the content section
    content_start = code.find('<div className="p-5 space-y-6">', header_start)
    if content_start == -1:
        content_start = code.find('<div className="p-4 space-y-6">', header_start)
        
    # Program page might have a different structure after header
    if page_type == 'program' and content_start == -1:
        content_start = code.find('{loading ? (', header_start)
        if content_start == -1:
            content_start = code.find('{/* Chương trình tập */}', header_start)
    
    if header_start != -1 and content_start != -1:
        new_header = generate_header(page_type)
        code = code[:header_start] + new_header + "\n\n      " + code[content_start:]
        
        with open(file_path, 'w') as f:
            f.write(code)
        print(f"Patched header in {file_path}")
    else:
        print(f"Could not find header boundaries in {file_path}")
        # let's try a regex fallback
        end_marker = re.compile(r"<\/div>\s*<\/div>\s*(?:<div className=\"p-5 space-y-6\">|\{loading \? \()")
        match = end_marker.search(code[header_start:])
        if match:
            real_end = header_start + match.start() + len(match.group()) - len(match.group().split('<')[-1]) -1
            # ... actually this is risky, let's print debug if it fails

replace_header('src/app/page.tsx', 'tracking')
replace_header('src/app/program/page.tsx', 'program')
replace_header('src/app/profile/page.tsx', 'profile')

