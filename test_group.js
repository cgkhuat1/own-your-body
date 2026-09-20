const exercises = [
  { key: '1', group_code: null, name: 'A' },
  { key: '2', group_code: null, name: 'B' },
  { key: '3', group_code: '1', name: 'C' }
];

let units = [];
for (const ex of exercises) {
  const hasLetter = /[a-zA-Z]/.test(String(ex.group_code || ''));
  if (hasLetter) {
    const group = units.find(u => u.type === 'group' && u.groupCode === ex.group_code);
    if (group) group.exercises.push(ex);
    else units.push({ type: 'group', groupCode: ex.group_code, exercises: [ex] });
  } else {
    units.push({ type: 'single', exercises: [ex] });
  }
}
console.log(JSON.stringify(units, null, 2));
