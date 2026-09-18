with open('/Users/macbook/Documents/ck-coaching/src/app/page.tsx', 'r') as f:
    code = f.read()

old_logic = """  // How many days left in the week (including today)?
  const today = dayjs();
  let daysLeft = 7;
  if (currentWeekStart.isSame(today, 'isoWeek')) {
    daysLeft = 7 - (today.isoWeekday() - 1); // 7 - (Day of week - 1)
  } else if (currentWeekStart.isBefore(today)) {
    daysLeft = 0; // Past week
  }
  
  const avgStepsNeeded = daysLeft > 0 ? Math.round(remainingSteps / daysLeft) : 0;"""

new_logic = """  // Calculate remaining days based on how many days have steps entered
  const daysWithSteps = dailyMetrics.filter((m: any) => m.steps && m.steps > 0).length;
  const daysLeft = Math.max(0, 7 - daysWithSteps);
  const avgStepsNeeded = daysLeft > 0 ? Math.round(remainingSteps / daysLeft) : 0;"""

code = code.replace(old_logic, new_logic)

# Also update the text in the UI
old_text = """Tuần này còn {daysLeft} ngày. Để đạt target, mỗi ngày bạn chỉ cần đi trung bình"""
new_text = """Còn lại {daysLeft} ngày chưa nhập số liệu. Để đạt target tuần, mỗi ngày bạn cần đi trung bình"""
code = code.replace(old_text, new_text)

with open('/Users/macbook/Documents/ck-coaching/src/app/page.tsx', 'w') as f:
    f.write(code)

