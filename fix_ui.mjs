import fs from 'fs';
const path = 'src/app/workout/page.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  ".select('id, order_index, group_code, custom_name, target_sets, target_reps, target_rpe, exercise_id, exercises(name, youtube_id)')",
  ".select('id, order_index, target_sets, target_reps, target_rpe, exercise_id, exercises(name, youtube_id)')"
);
content = content.replace(
  "const name = ex.custom_name || ex.exercises?.name || \"Bài tập\";",
  "const name = ex.exercises?.name || \"Bài tập\";"
);
content = content.replace(
  "group_code: ex.group_code || String(ex.order_index),",
  "group_code: String(ex.order_index),"
);
fs.writeFileSync(path, content);
console.log("Patched UI");
