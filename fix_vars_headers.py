import re

def fix_vars(file_path, page_type):
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
        header_code = code[header_start:content_start]
        
        # If it's program, we must completely remove `user?.full_name`
        if page_type == 'program':
            header_code = header_code.replace("user?.full_name ? user.full_name.charAt(0).toUpperCase() : (typeof userName !== 'undefined' && userName ? userName.charAt(0).toUpperCase() : 'B')", "userName ? userName.charAt(0).toUpperCase() : 'B'")
            header_code = header_code.replace("user?.full_name ? user.full_name.split(' ').pop() : (typeof userName !== 'undefined' && userName ? userName.split(' ').pop() : 'Bạn')", "userName ? userName.split(' ').pop() : 'Bạn'")
        else:
            header_code = header_code.replace("user?.full_name ? user.full_name.charAt(0).toUpperCase() : (typeof userName !== 'undefined' && userName ? userName.charAt(0).toUpperCase() : 'B')", "user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'B'")
            header_code = header_code.replace("user?.full_name ? user.full_name.split(' ').pop() : (typeof userName !== 'undefined' && userName ? userName.split(' ').pop() : 'Bạn')", "user?.full_name ? user.full_name.split(' ').pop() : 'Bạn'")
        
        code = code[:header_start] + header_code + code[content_start:]
        with open(file_path, 'w') as f:
            f.write(code)
        print(f"Fixed vars in {file_path}")
    else:
        print(f"Failed to find boundaries in {file_path}")

fix_vars('/Users/macbook/Documents/ck-coaching/src/app/page.tsx', 'tracking')
fix_vars('/Users/macbook/Documents/ck-coaching/src/app/program/page.tsx', 'program')
fix_vars('/Users/macbook/Documents/ck-coaching/src/app/profile/page.tsx', 'profile')
