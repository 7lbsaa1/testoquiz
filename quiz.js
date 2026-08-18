// quiz.js - الجزء الخاص بحفظ وإجابة الامتحان
import { db, ref, onValue, update } from "./firebase-config.js";

// تحديث مسار الإجابة حسب رقم الامتحان الحركي (مثلاً quiz1 أو quiz2)
const urlParams = new URLSearchParams(window.location.search);
const activeQuizId = urlParams.get('quiz') || 'quiz1'; // الافتراضي quiz1

let currentUserId = localStorage.getItem('fq_user_id');

// عند تسليم الامتحان النهائي:
async function executeFinalSubmission() {
  let calculatedScore = 0;
  let gradingMap = { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0 };

  // حساب درجات الأسئلة الاختيارية
  for (let i = 0; i < 5; i++) {
    const q = questionsData[i];
    if (encryptOption(userAnswers[q.id]) === q.encryptedHash) {
      calculatedScore += 2;
      gradingMap[q.id] = 2;
    }
  }

  // الحفظ داخل مسار الامتحان الخاص
  const quizPath = `users/${currentUserId}/quizzes/${activeQuizId}`;
  
  const updates = {};
  updates[`${quizPath}/answers`] = userAnswers;
  updates[`${quizPath}/grading`] = gradingMap;
  updates[`${quizPath}/score`] = calculatedScore;
  updates[`${quizPath}/submittedAt`] = Date.now();
  updates[`${quizPath}/examStatus`] = 'submitted';

  await update(ref(db), updates);
  showToast('تم تسليم الامتحان بنجاح!', 'success');
}
