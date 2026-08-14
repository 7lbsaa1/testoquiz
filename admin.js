// admin.js
import { db, ref, onValue, update } from "./firebase-config.js";

// Answer Key Reference for Grading Modal
const correctAnswersMap = {
  q1: "فرناندو توريس",
  q2: "كولر",
  q3: "بايرن ميونخ",
  q4: "5",
  q5: "2003",
  q6: "لاعب كرة قدم (فرناندو توريس / ديفيد فيا / إنييستا) - خاض تجارب متعددة"
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

// Theme Switcher
document.getElementById('themeToggleBtn').addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
});

function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> <span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Live Database Listener for Admin Dashboard
onValue(ref(db, 'users'), (snapshot) => {
  if (!snapshot.exists()) {
    document.getElementById('usersTableBody').innerHTML = `<tr><td colspan="8" style="text-align: center;">لا يوجد مستخدمون حتى الآن.</td></tr>`;
    return;
  }

  allUsersCache = snapshot.val();
  renderAdminDashboard();
});

function renderAdminDashboard() {
  const usersArray = Object.values(allUsersCache);
  const searchKeyword = document.getElementById('adminSearchInput').value.toLowerCase().trim();

  // Update Counters
  document.getElementById('statTotalUsers').textContent = usersArray.length;
  document.getElementById('statStarted').textContent = usersArray.filter(u => u.examStatus === 'in_progress' || u.examStatus === 'submitted').length;
  document.getElementById('statSubmitted').textContent = usersArray.filter(u => u.examStatus === 'submitted').length;
  document.getElementById('statBlocked').textContent = usersArray.filter(u => u.isBlocked).length;
  document.getElementById('statReviewed').textContent = usersArray.filter(u => u.resultPublished).length;

  // Filter Table
  const filtered = usersArray.filter(u => 
    u.name.toLowerCase().includes(searchKeyword) || 
    u.phone.includes(searchKeyword)
  );

  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = '';

  filtered.forEach(user => {
    const tr = document.createElement('tr');

    const statusBadge = user.examStatus === 'submitted' 
      ? '<span class="badge badge-success">تم التسليم</span>' 
      : '<span class="badge badge-warning">قيد الإجراء</span>';

    const publishBadge = user.resultPublished 
      ? '<span class="badge badge-success">منشورة</span>' 
      : '<span class="badge badge-danger">غير منشورة</span>';

    const formattedDate = user.startedAt ? new Date(user.startedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-';

    tr.innerHTML = `
      <td><img src="${user.photo}" class="table-avatar" alt="الصورة"></td>
      <td><strong>${user.name}</strong></td>
      <td>${user.phone}</td>
      <td>${formattedDate}</td>
      <td>${statusBadge}</td>
      <td><strong style="color: var(--primary);">${user.score || 0} / 12</strong></td>
      <td>${publishBadge}</td>
      <td>
        <div class="action-btns">
          <button class="btn-primary btn-sm inspect-btn" data-id="${user.userId}"><i class="fa-solid fa-folder-open"></i> فتح الامتحان</button>
          <button class="${user.isBlocked ? 'btn-secondary' : 'btn-primary'} btn-sm block-btn" data-id="${user.userId}" style="${user.isBlocked ? '' : 'background: var(--danger);'}">
            ${user.isBlocked ? 'إلغاء الحظر' : 'حظر'}
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach Event Handlers
  document.querySelectorAll('.inspect-btn').forEach(btn => {
    btn.onclick = () => openGradingModal(btn.getAttribute('data-id'));
  });

  document.querySelectorAll('.block-btn').forEach(btn => {
    btn.onclick = () => toggleBlockUser(btn.getAttribute('data-id'));
  });
}

document.getElementById('adminSearchInput').addEventListener('input', renderAdminDashboard);

// Block/Unblock Logic
async function toggleBlockUser(userId) {
  const user = allUsersCache[userId];
  if (!user) return;

  const updatedBlockStatus = !user.isBlocked;
  await update(ref(db, `users/${userId}`), { isBlocked: updatedBlockStatus });
  showToast(`تم ${updatedBlockStatus ? 'حظر' : 'إلغاء حظر'} المستخدم بنجاح.`);
}

// Grading Modal Window
const gradingModal = document.getElementById('gradingModal');
document.getElementById('closeGradingModalBtn').onclick = () => gradingModal.classList.remove('active');

function openGradingModal(userId) {
  activeInspectedUserId = userId;
  const user = allUsersCache[userId];
  if (!user) return;

  document.getElementById('modalUserNameTitle').textContent = `مراجعة امتحان: ${user.name} (${user.phone})`;
  document.getElementById('adminMessageInput').value = user.adminMessage || "";

  const container = document.getElementById('modalExamContent');
  container.innerHTML = '';

  questionsList.forEach((q, idx) => {
    const userAns = user.answers ? user.answers[q.id] : 'لا يوجد إجابة';
    const qScore = user.grading ? (user.grading[q.id] || 0) : 0;

    const div = document.createElement('div');
    div.className = 'glass-card';
    div.style.padding = '1rem';
    div.style.marginBottom = '1rem';

    if (q.type === 'mcq') {
      const isCorrect = qScore === 2;
      div.innerHTML = `
        <strong>س${idx + 1}: ${q.text}</strong>
        ${q.img ? `<br><img src="${q.img}" style="max-height: 100px; border-radius: 8px; margin: 0.5rem 0;">` : ''}
        <p>إجابة العميل: <span style="font-weight: 700; color: ${isCorrect ? '#34d399' : '#f87171'};">${userAns}</span></p>
        <p>الإجابة الصحيحة: <span style="font-weight: 700; color: #34d399;">${correctAnswersMap[q.id]}</span></p>
        <small>الدرجة المستحقة: ${qScore} / 2</small>
      `;
    } else {
      // Manual Essay Question Q6
      const currentNote = user.notes && user.notes.q6 ? user.notes.q6 : "";
      div.innerHTML = `
        <strong style="color: var(--accent);">س${idx + 1} (مقالي): ${q.text}</strong>
        ${q.img ? `<br><img src="${q.img}" style="max-height: 120px; border-radius: 8px; margin: 0.5rem 0;">` : ''}
        <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 8px; margin: 0.5rem 0;">
          <strong>إجابة العميل النصية:</strong>
          <p style="white-space: pre-wrap; color: var(--text-main); font-weight: 600;">${userAns}</p>
        </div>
        <div style="display: flex; gap: 1rem; align-items: center; margin-top: 0.75rem;">
          <label>درجة السؤال (0 إلى 2):</label>
          <input type="number" id="q6ScoreInput" class="form-control" style="width: 80px;" min="0" max="2" value="${qScore}">
        </div>
        <div style="margin-top: 0.5rem;">
          <label>ملاحظة المصحح على الإجابة:</label>
          <input type="text" id="q6NoteInput" class="form-control" placeholder="ملاحظة حول الإجابة..." value="${currentNote}">
        </div>
      `;
    }

    container.appendChild(div);
  });

  gradingModal.classList.add('active');
}

// Save Manual Grading Action
document.getElementById('saveGradingBtn').onclick = async () => {
  if (!activeInspectedUserId) return;

  const user = allUsersCache[activeInspectedUserId];
  const q6Score = parseInt(document.getElementById('q6ScoreInput').value) || 0;
  const q6Note = document.getElementById('q6NoteInput').value.trim();
  const adminMsg = document.getElementById('adminMessageInput').value.trim();

  // Recalculate total score
  let currentGrading = user.grading || { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0 };
  currentGrading.q6 = q6Score;

  let totalScore = 0;
  Object.values(currentGrading).forEach(s => totalScore += Number(s));

  const updates = {
    "grading/q6": q6Score,
    "notes/q6": q6Note,
    "score": totalScore,
    "adminMessage": adminMsg
  };

  await update(ref(db, `users/${activeInspectedUserId}`), updates);
  showToast('تم حفظ التصحيح والنتيجة بنجاح.');
  gradingModal.classList.remove('active');
};

// Toggle Result Publication State
document.getElementById('togglePublishResultBtn').onclick = async () => {
  if (!activeInspectedUserId) return;

  const user = allUsersCache[activeInspectedUserId];
  const newPublishStatus = !user.resultPublished;

  await update(ref(db, `users/${activeInspectedUserId}`), { resultPublished: newPublishStatus });
  showToast(`تم ${newPublishStatus ? 'إظهار ونشر' : 'إخفاء'} النتيجة للعميل.`);
  gradingModal.classList.remove('active');
};
