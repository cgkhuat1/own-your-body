import re

# Fix program/page.tsx ReferenceError
with open('/Users/macbook/Documents/ck-coaching/src/app/program/page.tsx', 'r') as f:
    code = f.read()
    
# Replace user?.full_name with userName
code = code.replace("user?.full_name ? user.full_name.charAt(0).toUpperCase() : (typeof userName !== 'undefined' && userName ? userName.charAt(0).toUpperCase() : 'B')", "userName ? userName.charAt(0).toUpperCase() : 'B'")
code = code.replace("user?.full_name ? user.full_name.split(' ').pop() : (typeof userName !== 'undefined' && userName ? userName.split(' ').pop() : 'Bạn')", "userName ? userName.split(' ').pop() : 'Bạn'")

with open('/Users/macbook/Documents/ck-coaching/src/app/program/page.tsx', 'w') as f:
    f.write(code)

# Fix gamification badges in tracking page
with open('/Users/macbook/Documents/ck-coaching/src/app/page.tsx', 'r') as f:
    code = f.read()

# Replace bg-[#c4a962] text-[#1a2b22] with bg-brand-sand text-brand-mossDeep
code = code.replace("bg-[#c4a962] text-[#1a2b22]", "bg-brand-sand text-brand-mossDeep")

with open('/Users/macbook/Documents/ck-coaching/src/app/page.tsx', 'w') as f:
    f.write(code)

