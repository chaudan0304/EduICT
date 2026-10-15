export function scoreQuestion(question, mode, students, marks = {}, counts = {}) {
  let correct = 0, wrong = 0;
  if (mode === 'STUDENT') {
    for (const student of students) {
      if (marks[student.id] === 'CORRECT') correct++;
      else if (marks[student.id] === 'WRONG') wrong++;
    }
  } else {
    for (const [index, value] of Object.entries(counts)) {
      const count = Math.max(0, Math.floor(Number(value) || 0));
      if (Number(index) === (question.correct_index ?? 0)) correct += count;
      else wrong += count;
    }
  }
  const total = correct + wrong;
  return { quiz_question_id: question.id, distribution: counts, total_responses: total,
    correct_count: correct, wrong_count: wrong, accuracy_rate: total ? Math.round(correct / total * 100) : 0 };
}
