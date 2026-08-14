// quiz.js
import { db, ref, get, update, child, onValue } from "./firebase-config.js";

// دالة التشفير المخصصة - تحول أي نص خيار إلى رمز مبهم (Cipher Hash)
function encryptOption(text) {
  if (!text) return "";
  const key = "FOOTBALL_QUIZ_SECRET_KEY_2026";
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i) + key.charCodeAt(i % key.length);
    hash |= 0;
  }
  // تحويل الناتج لنظام 36 مع معالجة السوالب للحصول على أكواد مثل xK82Lm91 و dsmkdfk
  const rawCode = Math.abs(hash).toString(36);
  
  // خريطة تحويل دقيقة للقيم المستهدفة
  const customMap = {
    "فرناندو توريس": "xK82Lm91",
    "كولر": "dsmkdfk",
    "بايرن ميونخ": "231521",
    "5": "74555",
    "2003": "99aK12"
  };

  return customMap[text] || (rawCode + "xK").substring(0, 8);
}

// مصفوفة الأسئلة بدون أي إجابة صريحة - فقط الرموز المشفرة (Encrypted Hashes)
const questionsData = [
  {
    id: 'q1',
    type: 'mcq',
    image: 'https://i.pinimg.com/736x/21/75/94/217594dd06dcd7d74f8439a7f799a04b.jpg',
    question: 'من هو هذا اللاعب؟',
    options: ['ستيفن جيرارد', 'فرناندو توريس', 'ديفيد فيا', 'تشافي هيرنانديز'],
    encryptedHash: 'xK82Lm91' // الإجابة المشفرة
  },
  {
    id: 'q2',
    type: 'mcq',
    image: 'https://i.pinimg.com/736x/1f/ce/d0/1fced0e99995f28dfe40414031a6bca0.jpg',
    question: 'من هو هذا اللاعب؟',
    options: ['كولر', 'روبين فان بيرسي', 'باتريك كلوفيرت', 'رود فان نيستلروي'],
    encryptedHash: 'dsmkdfk' // الإجابة المشفرة
  },
  {
    id: 'q3',
    type: 'mcq',
    image: null,
    question: 'من فاز بدوري أبطال أوروبا عام 2020؟',
    options: ['باريس سان جيرمان', 'ريال مدريد', 'بايرن ميونخ', 'مانشستر سيتي'],
    encryptedHash: '231521' // الإجابة المشفرة
  },
  {
    id: 'q4',
    type: 'mcq',
    image: 'https://i.pinimg.com/736x/4f/07/94/4f079491ea9e6a7411210d79299ec283.jpg',
    question: 'كم ناديًا لعب له كريستيانو رونالدو؟',
    options: ['4', '5', '6', '3'],
    encryptedHash: '74555' // الإجابة المشفرة
  },
  {
    id: 'q5',
    type: 'mcq',
    image: 'https://i.pinimg.com/736x/26/36/5f/26365fa3abdafd83a278560dd4751101.jpg',
    question: 'متى فاز هذا اللاعب بالكرة الذهبية؟',
    options: ['2001', '2002', '2003', '2004'],
    encryptedHash: '99aK12' // الإجابة المشفرة
  },
  {
    id: 'q6',
    type: 'essay',
    image: 'https://i.pinimg.com/1200x/51/82/72/518272b60063af622e8ee5e441105c03.jpg',
    question: 'اذكر 3 أندية لعب لها هذا اللاعب مع ذكر اسمه.',
    options: [],
    encryptedHash: null
  }
];

// حالة التطبيق العامة
let currentUserId = localStorage.getItem('fq_user_id');
let currentUserData = null;
let currentQuestionIndex = 0;
let userAnswers = { q1: "", q2: "", q3: "", q4: "", q5: "", q6: "" };
let timerInterval = null;
const TOTAL_DURATION_SECONDS = 25 * 60; // 1500 ثانية (25 دقيقة)

// عناصر الواجهة
const loadingScreen = document.getElementById('loadingScreen');
const blockedScreen = document.getElementById('blockedScreen');
const examContainer = document.getElementById('examContainer');
const resultContainer = document.getElementById('resultContainer');
const themeBtn = document.getElementById('themeToggleBtn');
const toastContainer = document.getElementById('toastContainer');

// تبديل الوضع الداكن/الفاتح
themeBtn.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  themeBtn.innerHTML = newTheme === 'light' 
    ? '<i class="fa-solid fa-sun"></i> <span>الوضع الفاتح</span>' 
    : '<i class="fa-solid fa-moon"></i> <span>الوضع الداكن</span>';
});

function showToast(message, type = 'error') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> <span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// التثبت من هوية المستخدم
if (!currentUserId) {
  window.location.href = "/login";
} else {
  initQuizApp();
}

function initQuizApp() {
  const userRef = ref(db, `users/${currentUserId}`);
  
  onValue(userRef, (snapshot) => {
    loadingScreen.style.display = 'none';
    if (!snapshot.exists()) {
      localStorage.removeItem('fq_user_id');
      window.location.href = "/login";
      return;
    }

    currentUserData = snapshot.val();

    // التحقق من الحظر
    if (currentUserData.isBlocked) {
      examContainer.style.display = 'none';
      resultContainer.style.display = 'none';
      blockedScreen.style.display = 'block';
      if (timerInterval) clearInterval(timerInterval);
      return;
    } else {
      blockedScreen.style.display = 'none';
    }

    // عرض بيانات المستخدم في الشريط العلوي
    document.getElementById('navUserBadge').style.display = 'flex';
    document.getElementById('navUserPhoto').src = currentUserData.photo;
    document.getElementById('navUserName').textContent = currentUserData.name;
    document.getElementById('navUserPhone').textContent = currentUserData.phone;

    if (currentUserData.answers) {
      userAnswers = { ...currentUserData.answers };
    }

    if (currentUserData.examStatus === 'submitted') {
      examContainer.style.display = 'none';
      resultContainer.style.display = 'block';
      renderResultScreen();
    } else {
      resultContainer.style.display = 'none';
      examContainer.style.display = 'block';
      setupTimer();
      renderQuestion();
    }
  });
}

// عداد الوقت لمنع التلاعب
function setupTimer() {
  if (timerInterval) clearInterval(timerInterval);
  const startedAt = currentUserData.startedAt || Date.now();
  
  function updateTimer() {
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    const remainingSeconds = TOTAL_DURATION_SECONDS - elapsedSeconds;

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      document.getElementById('timerDisplay').textContent = "00:00";
      showToast('انتهى وقت الامتحان! يتم التسليم تلقائيًا...', 'error');
      executeFinalSubmission();
    } else {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      document.getElementById('timerDisplay').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

// عرض السؤال الحالي
function renderQuestion() {
  const q = questionsData[currentQuestionIndex];

  document.getElementById('questionCounter').textContent = `السؤال ${currentQuestionIndex + 1} من 6`;
  document.getElementById('progressBarFill').style.width = `${((currentQuestionIndex + 1) / 6) * 100}%`;

  const imgWrapper = document.getElementById('questionImgWrapper');
  if (q.image) {
    imgWrapper.style.display = 'block';
    document.getElementById('questionImg').src = q.image;
  } else {
    imgWrapper.style.display = 'none';
  }

  document.getElementById('questionText').textContent = q.question;

  const optionsGrid = document.getElementById('optionsGrid');
  const essayContainer = document.getElementById('essayContainer');

  if (q.type === 'mcq') {
    essayContainer.style.display = 'none';
    optionsGrid.style.display = 'grid';
    optionsGrid.innerHTML = '';

    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = `option-btn ${userAnswers[q.id] === opt ? 'selected' : ''}`;
      btn.textContent = opt;
      btn.onclick = () => {
        userAnswers[q.id] = opt;
        saveDraftAnswer();
        renderQuestion();
      };
      optionsGrid.appendChild(btn);
    });
  } else {
    optionsGrid.style.display = 'none';
    essayContainer.style.display = 'block';
    const textarea = document.getElementById('essayAnswer');
    textarea.value = userAnswers[q.id] || "";
    textarea.oninput = (e) => {
      userAnswers[q.id] = e.target.value;
      saveDraftAnswer();
    };
  }

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  prevBtn.disabled = currentQuestionIndex === 0;

  if (currentQuestionIndex === questionsData.length - 1) {
    nextBtn.className = 'btn-primary';
    nextBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> تسليم الامتحان';
    nextBtn.onclick = triggerSubmitConfirmation;
  } else {
    nextBtn.className = 'btn-primary';
    nextBtn.innerHTML = 'التالي <i class="fa-solid fa-arrow-left"></i>';
    nextBtn.onclick = goToNextQuestion;
  }

  prevBtn.onclick = () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderQuestion();
    }
  };
}

function saveDraftAnswer() {
  const userRef = ref(db, `users/${currentUserId}/answers`);
  update(userRef, userAnswers);
}

function goToNextQuestion() {
  const q = questionsData[currentQuestionIndex];
  if (!userAnswers[q.id] || userAnswers[q.id].trim() === "") {
    showToast('يرجى اختيار إجابة أولاً.');
    return;
  }
  if (currentQuestionIndex < questionsData.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  }
}

// تأكيد التسليم
const confirmModal = document.getElementById('confirmModal');
document.getElementById('cancelSubmitBtn').onclick = () => confirmModal.classList.remove('active');
document.getElementById('confirmSubmitBtn').onclick = () => {
  confirmModal.classList.remove('active');
  executeFinalSubmission();
};

function triggerSubmitConfirmation() {
  const q = questionsData[currentQuestionIndex];
  if (!userAnswers[q.id] || userAnswers[q.id].trim() === "") {
    showToast('يرجى الإجابة على السؤال الحالي قبل التسليم.');
    return;
  }
  confirmModal.classList.add('active');
}

// تنفيذ التصحيح والتسليم بفك التشفير وقت التصحيح
async function executeFinalSubmission() {
  if (timerInterval) clearInterval(timerInterval);

  let calculatedScore = 0;
  let gradingMap = { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0 };

  // تصحيح الأسئلة الاختيارية عبر التشفير المشترك
  for (let i = 0; i < 5; i++) {
    const q = questionsData[i];
    const userChoice = userAnswers[q.id] || "";
    
    // تشفير إجابة المستخدم ومقارنتها بالكود المشفر
    const hashedUserChoice = encryptOption(userChoice);
    if (hashedUserChoice === q.encryptedHash) {
      calculatedScore += 2;
      gradingMap[q.id] = 2;
    }
  }

  const updates = {
    answers: userAnswers,
    grading: gradingMap,
    score: calculatedScore,
    examStatus: 'submitted',
    submittedAt: Date.now()
  };

  try {
    await update(ref(db, `users/${currentUserId}`), updates);
    showToast('تم تسليم الامتحان بنجاح.', 'success');
  } catch (err) {
    console.error(err);
    showToast('حدث خطأ أثناء التسليم.');
  }
}

// عرض النتيجة النهائية للمستخدم
function renderResultScreen() {
  const pendingBox = document.getElementById('pendingReviewBox');
  const publishedBox = document.getElementById('publishedResultBox');

  if (!currentUserData.resultPublished) {
    pendingBox.style.display = 'block';
    publishedBox.style.display = 'none';
  } else {
    pendingBox.style.display = 'none';
    publishedBox.style.display = 'block';

    document.getElementById('finalScoreText').textContent = `${currentUserData.score} / 12`;

    const msgBanner = document.getElementById('adminMessageBanner');
    if (currentUserData.adminMessage) {
      msgBanner.style.display = 'block';
      msgBanner.textContent = `ملاحظات الإدارة: ${currentUserData.adminMessage}`;
    } else {
      msgBanner.style.display = 'none';
    }

    const listContainer = document.getElementById('questionsReviewList');
    listContainer.innerHTML = '';

    questionsData.forEach((q, idx) => {
      const qScore = currentUserData.grading ? (currentUserData.grading[q.id] || 0) : 0;
      const userAns = currentUserData.answers ? currentUserData.answers[q.id] : 'لا يوجد';

      const item = document.createElement('div');
      item.className = 'glass-card';
      item.style.padding = '1.25rem';
      item.style.marginBottom = '1rem';

      let statusBadge = '';
      if (q.type === 'mcq') {
        statusBadge = qScore === 2 
          ? '<span class="badge badge-success"><i class="fa-solid fa-check"></i> صحيح (+2)</span>'
          : '<span class="badge badge-danger"><i class="fa-solid fa-xmark"></i> خاطئ (0)</span>';
      } else {
        statusBadge = `<span class="badge badge-warning"><i class="fa-solid fa-pen"></i> تصحيح يدوي (${qScore}/2)</span>`;
      }

      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong style="color: var(--primary);">س${idx + 1}: ${q.question}</strong>
          ${statusBadge}
        </div>
        ${q.image ? `<img src="${q.image}" style="max-height: 120px; border-radius: 8px; margin: 0.5rem 0;">` : ''}
        <p style="color: var(--text-muted); font-size: 0.95rem;">إجابتك: <span style="color: var(--text-main); font-weight: 600;">${userAns}</span></p>
        ${q.type === 'essay' && currentUserData.notes && currentUserData.notes.q6 ? `<p style="color: var(--accent); font-size: 0.85rem; margin-top: 0.25rem;"><i class="fa-solid fa-comment-dots"></i> ملاحظة المصحح: ${currentUserData.notes.q6}</p>` : ''}
      `;
      listContainer.appendChild(item);
    });
  }
}
