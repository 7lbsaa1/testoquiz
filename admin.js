// admin.js
import { db, ref, onValue, update, remove } from "./firebase-config.js";

const adminAnswersLookup = {
  q1: "فرناندو توريس",
  q2: "كولر",
  q3: "بايرن ميونخ",
  q4: "5",
  q5: "2003",
  q6: "لاعب كرة قدم - خاض تجارب متعددة"
};

const questionsList = [
  { id: 'q1', text: 'من هو هذا اللاعب؟', img: 'https://i.pinimg.com/736x/21/75/94/217594dd06dcd7d74f8439a7f799a04b.jpg', type: 'mcq' },
  { id: 'q2', text: 'من هو هذا اللاعب؟', img: 'https://i.pinimg.com/736x/1f/ce/d0/1fced0e99995f28dfe40414031a6bca0.jpg', type: 'mcq' },
  { id: 'q3', text: 'من فاز بدوري أبطال أوروبا عام 2020؟', img: null, type: 'mcq' },
  { id: 'q4', text: 'كم ناديًا لعب له كريستيانو رونالدو؟', img: 'https://i.pinimg.com/736x/4f/07/94/4f079491ea9e6a7411210d79299ec283.jpg', type: 'mcq' },
  { id: 'q5', text: 'متى فاز هذا اللاعب بالكرة الذهبية؟', img: 'https://i.pinimg.com/736x/26/36/5f/26365fa3abdafd83a278560dd4751101.jpg', type: 'mcq' },
  { id: 'q6', text: 'اذكر 3 أندية لعب لها هذا اللاعب مع ذكر اسمه.', img: 'https://i.pinimg.com/1200x/51/82/72/518272b60063af622e8ee5e441105c03.jpg', type: 'essay' }
];

let allUsersCache = {};
let activeInspectedUserId = null;
let activeInspectedQuizId = null;

function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> <span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// قراءة بيانات المستخدمين من Firebase
onValue(ref(db, 'users'), (snapshot) => {
  const tbody = document.getElementById('usersTableBody');
  if (!snapshot.exists()) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">لا يوجد مستخدمون حالياً.</td></tr>`;
    return;
  }
  allUsersCache = snapshot.val() || {};
  renderAdminDashboard();
});

function renderAdminDashboard() {
  const usersArray = Object.values(allUsersCache);
  const searchInput = document.getElementById('adminSearchInput');
  const searchKeyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const statUsersEl = document.getElementById('statTotalUsers');
  if (statUsersEl) statUsersEl.textContent = usersArray.length;

  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = usersArray.filter(u => {
    const userName = (u?.name || '').toLowerCase();
    const userPhone = (u?.phone || '').toString();
    return userName.includes(searchKeyword) || userPhone.includes(searchKeyword);
  });

  filtered.forEach(user => {
    const tr = document.createElement('tr');

    const rawPhone = (user?.phone || '').toString().trim();
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) cleanPhone = '20' + cleanPhone.substring(1);

    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent("اهلا نتيجتك ظهرت في الموقع الان")}` : '#';
    const photoUrl = user?.photo || 'https://via.placeholder.com/40';
    const uId = user?.userId || '';

    // إعداد قائمة الامتحانات التي اختبرها العميل (دعم الهيكلتين القديمة والجديدة)
    let quizzes = user?.quizzes ? { ...user.quizzes } : {};

    // فحص ما إذا كانت إجابات الامتحان الأول محفوظة مباشرة على جذر المستخدم
    if (!quizzes.quiz1 && (user?.answers || user?.examStatus || user?.score !== undefined)) {
      quizzes.quiz1 = {
        answers: user.answers || {},
        score: user.score || 0,
        examStatus: user.examStatus || '',
        grading: user.grading || {},
        adminMessage: user.adminMessage || ''
      };
    }

    let quizPills = '';
    const quizKeys = Object.keys(quizzes);

    if (quizKeys.length === 0) {
      quizPills = '<span style="color: var(--text-muted); font-size: 0.85rem;">لم يؤدِ أي امتحان بعد</span>';
    } else {
      quizKeys.forEach(qKey => {
        const qData = quizzes[qKey];
        const title = (qKey === 'quiz1' || qKey === 'exam1') ? 'الامتحان الأول' : (qKey === 'quiz2' || qKey === 'exam2') ? 'الامتحان الثاني' : qKey;
        quizPills += `
          <button class="quiz-pill inspect-quiz-btn" data-uid="${uId}" data-qid="${qKey}">
            <i class="fa-solid fa-file-pen"></i> ${title}: <strong>${qData.score || 0}/12</strong>
          </button>
        `;
      });
    }

    tr.innerHTML = `
      <td><img src="${photoUrl}" class="table-avatar" alt="الصورة"></td>
      <td><strong>${user?.name || 'بدون اسم'}</strong></td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>${rawPhone || '-'}</span>
          ${cleanPhone ? `<a href="${waLink}" target="_blank" style="color: #25D366; text-decoration: none;"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
        </div>
      </td>
      <td>${quizPills}</td>
      <td>
        <button class="btn-danger delete-user-btn" data-id="${uId}">
          <i class="fa-solid fa-trash-can"></i> حذف المستخدم كاملاً
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // تفعيل أزرار العرض والحذف
  document.querySelectorAll('.inspect-quiz-btn').forEach(btn => {
    btn.onclick = () => openGradingModal(btn.getAttribute('data-uid'), btn.getAttribute('data-qid'));
  });

  document.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.onclick = () => deleteUserCompletely(btn.getAttribute('data-id'));
  });
}

// دالة حذف المستخدم كاملاً
async function deleteUserCompletely(userId) {
  if (!userId) return;
  const confirmDelete = confirm("هل أنت تأكد من حذف هذا المستخدم كاملاً من الموقع؟ سيمكنه الدخول كأنه شخص جديد تماماً!");
  if (confirmDelete) {
    await remove(ref(db, `users/${userId}`));
    showToast("تم حذف المستخدم بنجاح!");
  }
}

// عرض وتصحيح امتحان معين للمستخدم
function openGradingModal(userId, quizId) {
  activeInspectedUserId = userId;
  activeInspectedQuizId = quizId;

  const user = allUsersCache[userId];
  if (!user) return;

  // جلب البيانات سواء كانت من كائن quizzes أو من جذر حساب المستخدم مباشرة
  let quizData = (user.quizzes && user.quizzes[quizId]) ? user.quizzes[quizId] : null;

  if (!quizData && quizId === 'quiz1') {
    quizData = {
      answers: user.answers || {},
      score: user.score || 0,
      grading: user.grading || {},
      adminMessage: user.adminMessage || ''
    };
  }

  if (!quizData) return;

  const gradingModal = document.getElementById('gradingModal');
  const nameTitle = document.getElementById('modalUserNameTitle');
  const msgInput = document.getElementById('adminMessageInput');

  if (nameTitle) nameTitle.textContent = `عرض: ${user.name} - (${quizId === 'quiz1' ? 'الامتحان الأول' : 'الامتحان الثاني'})`;
  if (msgInput) msgInput.value = quizData.adminMessage || "";

  const container = document.getElementById('modalExamContent');
  if (container) {
    container.innerHTML = '';

    questionsList.forEach((q, idx) => {
      const userAns = quizData.answers ? quizData.answers[q.id] : 'لا يوجد إجابة';
      const qScore = quizData.grading ? (quizData.grading[q.id] || 0) : 0;

      const div = document.createElement('div');
      div.className = 'glass-card';
      div.style.padding = '1rem';
      div.style.marginBottom = '1rem';

      if (q.type === 'mcq') {
        div.innerHTML = `
          <strong>س${idx + 1}: ${q.text}</strong>
          <p>إجابة العميل: <strong>${userAns}</strong></p>
          <p>الإجابة الصحيحة: <span style="color: #34d399;">${adminAnswersLookup[q.id]}</span></p>
          <small>الدرجة: ${qScore} / 2</small>
        `;
      } else {
        div.innerHTML = `
          <strong>س${idx + 1} (مقالي): ${q.text}</strong>
          <p>إجابة العميل: <strong>${userAns}</strong></p>
          <label>درجة السؤال (0 إلى 2):</label>
          <input type="number" id="q6ScoreInput" class="form-control" style="width: 80px;" min="0" max="2" value="${qScore}">
        `;
      }
      container.appendChild(div);
    });
  }

  if (gradingModal) gradingModal.classList.add('active');
}

const closeBtn = document.getElementById('closeGradingModalBtn');
if (closeBtn) {
  closeBtn.onclick = () => {
    const gradingModal = document.getElementById('gradingModal');
    if (gradingModal) gradingModal.classList.remove('active');
  };
}

// حفظ تصحيح الامتحان المحدد
const saveBtn = document.getElementById('saveGradingBtn');
if (saveBtn) {
  saveBtn.onclick = async () => {
    if (!activeInspectedUserId || !activeInspectedQuizId) return;

    const scoreInput = document.getElementById('q6ScoreInput');
    const msgInput = document.getElementById('adminMessageInput');
    const q6Score = scoreInput ? parseInt(scoreInput.value) || 0 : 0;
    const adminMsg = msgInput ? msgInput.value.trim() : '';

    const user = allUsersCache[activeInspectedUserId];
    const isLegacyQuiz1 = (!user?.quizzes || !user?.quizzes.quiz1) && activeInspectedQuizId === 'quiz1';

    if (isLegacyQuiz1) {
      // حفظ التعديلات في الجذر الرئيسي إذا كان الامتحان محفوظاً بالهيكلة القديمة
      await update(ref(db, `users/${activeInspectedUserId}/grading`), { q6: q6Score });
      await update(ref(db, `users/${activeInspectedUserId}`), { adminMessage: adminMsg });
    } else {
      // حفظ التعديلات داخل المسار الجديد quizzes/quizId
      const quizRef = `users/${activeInspectedUserId}/quizzes/${activeInspectedQuizId}`;
      await update(ref(db, `${quizRef}/grading`), { q6: q6Score });
      await update(ref(db, quizRef), { adminMessage: adminMsg });
    }

    showToast('تم حفظ التعديلات للامتحان.');
    const gradingModal = document.getElementById('gradingModal');
    if (gradingModal) gradingModal.classList.remove('active');
  };
}
