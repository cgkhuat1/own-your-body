function renumberUnits(units) {
  let counter = 1;
  const allExercises = [];
  for (const unit of units) {
    if (unit.type === 'single') {
      const ex = { ...unit.exercises[0], group_code: String(counter) };
      allExercises.push(ex);
      counter++;
    } else {
      const numPrefix = parseInt(String(unit.groupCode || '99').replace(/\D/g, '')) || counter;
      let letterCharCode = 65; // 'A'
      for (const ex of unit.exercises) {
        const letter = String.fromCharCode(letterCharCode);
        allExercises.push({ ...ex, group_code: `${counter}${letter}` });
        letterCharCode++;
      }
      counter++;
    }
  }
  return { allExercises };
}
const units = [
  { type: 'single', exercises: [{ key: '1' }] },
  { type: 'single', exercises: [{ key: '2' }] }
];
console.log(renumberUnits(units));
