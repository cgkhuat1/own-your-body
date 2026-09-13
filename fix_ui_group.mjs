import fs from 'fs';
const path = 'src/app/workout/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Restore the proper select query
content = content.replace(
  ".select('id, order_index, target_sets, target_reps, target_rpe, exercise_id, exercises(name, youtube_id)')",
  ".select('id, order_index, group_code, custom_name, target_sets, target_reps, target_rpe, exercise_id, exercises(name, youtube_id)')"
);

// Restore group_code assignment
content = content.replace(
  "group_code: String(ex.order_index),",
  "group_code: ex.group_code || String(ex.order_index),"
);

// Fix superset visual logic for "2A", "2B"
content = content.replace(
  "const isSuperset = ex.group_code.match(/[A-Z]/i);\n          \n          return (\n            <div key={ex.w_ex_id} className=\"relative\">\n              {/* Vẽ đường line nối Superset nếu bài tiếp theo cùng group */}\n              {isSuperset && exercises[exIndex + 1]?.group_code.charAt(0) === ex.group_code.charAt(0) && (\n                <div className=\"absolute left-[22px] top-12 bottom-[-40px] w-1 bg-brand-sand rounded-full z-0\"></div>\n              )}",
  `const isSuperset = String(ex.group_code).match(/[a-zA-Z]/i);
          const currentGroupNum = parseInt(ex.group_code);
          const nextGroupNum = exercises[exIndex + 1] ? parseInt(exercises[exIndex + 1].group_code) : null;
          const isLinkedToNext = isSuperset && currentGroupNum === nextGroupNum;
          
          return (
            <div key={ex.w_ex_id} className="relative">
              {/* Vẽ đường line nối Superset nếu bài tiếp theo cùng group */}
              {isLinkedToNext && (
                <div className="absolute left-[22px] top-12 bottom-[-40px] w-1 bg-brand-sand rounded-full z-0"></div>
              )}`
);

fs.writeFileSync(path, content);
console.log("Restored UI group logic");
