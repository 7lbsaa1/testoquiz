// admin.js
import { db, ref, onValue, update } from "./firebase-config.js";

const adminAnswersLookup = {
  q1: "فرناندو توريس",
  q2: "كولر",
  q3: "بايرن ميونخ",
  q4: "5",
  q5: "2003",
  q6: "لاعب كرة قدم (فرناندو توريس / ديفيد فيا) - خاض تجارب متعددة"
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

// تبديل الثيم بشكل آمن
const themeBtn = document.getElementById('themeToggleBtn');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
  });
}

function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> <span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// قراءة البيانات من Firebase
onValue(ref(db, 'users'), (snapshot) => {
  const tbody = document.getElementById('usersTableBody');
  if (!snapshot.exists()) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center;">لا يوجد مستخدمون حتى الآن في قاعدة البيانات.</td></tr>`;
    return;
  }

  allUsersCache = snapshot.val() || {};
  renderAdminDashboard();
}, (error) => {
  console.error("Firebase Read Error:", error);
  showToast("فشل جلب البيانات من Firebase. تأكد من قواعد الأمان (Rules).", "error");
});

function renderAdminDashboard() {
  const usersArray = Object.values(allUsersCache);
  const searchInput = document.getElementById('adminSearchInput');
  const searchKeyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

  // تحديث الإحصائيات مع الحماية من غياب العناصر
  const elTotal = document.getElementById('statTotalUsers');
  const elStarted = document.getElementById('statStarted');
  const elSubmitted = document.getElementById('statSubmitted');
  const elBlocked = document.getElementById('statBlocked');
  const elReviewed = document.getElementById('statReviewed');

  if (elTotal) elTotal.textContent = usersArray.length;
  if (elStarted) elStarted.textContent = usersArray.filter(u => u?.examStatus === 'in_progress' || u?.examStatus === 'submitted').length;
  if (elSubmitted) elSubmitted.textContent = usersArray.filter(u => u?.examStatus === 'submitted').length;
  if (elBlocked) elBlocked.textContent = usersArray.filter(u => u?.isBlocked).length;
  if (elReviewed) elReviewed.textContent = usersArray.filter(u => u?.resultPublished).length;

  // تصفية المستخدمين بأمان لتجنب أخطاء undefined
  const filtered = usersArray.filter(u => {
    const userName = (u?.name || '').toLowerCase();
    const userPhone = (u?.phone || '').toString();
    return userName.includes(searchKeyword) || userPhone.includes(searchKeyword);
  });

  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center;">لا توجد نتائج تطابق البحث.</td></tr>`;
    return;
  }

  filtered.forEach(user => {
    const tr = document.createElement('tr');

    const statusBadge = user?.examStatus === 'submitted' 
      ? '<span class="badge badge-success">تم التسليم</span>' 
      : '<span class="badge badge-warning">قيد الإجراء</span>';

    const publishBadge = user?.resultPublished 
      ? '<span class="badge badge-success">منشورة</span>' 
      : '<span class="badge badge-danger">غير منشورة</span>';

    const formattedDate = user?.startedAt 
      ? new Date(user.startedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) 
      : '-';

    const photoUrl = user?.photo || 'https://via.placeholder.com/40';
    const uId = user?.userId || '';

    tr.innerHTML = `
      <td><img src="${photoUrl}" class="table-avatar" alt="الصورة"></td>
      <td><strong>${user?.name || 'بدون اسم'}</strong></td>
      <td>${user?.phone || '-'}</td>
      <td>${formattedDate}</td>
      <td>${statusBadge}</td>
      <td><strong style="color: var(--primary);">${user?.score || 0} / 12</strong></td>
      <td>${publishBadge}</td>
      <td>
        <div class="action-btns">
          <button class="btn-primary btn-sm inspect-btn" data-id="${uId}"><i class="fa-solid fa-folder-open"></i> فتح الامتحان</button>
          <button class="${user?.isBlocked ? 'btn-secondary' : 'btn-primary'} btn-sm block-btn" data-id="${uId}" style="${user?.isBlocked ? '' : 'background: var(--danger);'}">
            ${user?.isBlocked ? 'إلغاء الحظر' : 'حظر'}
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.inspect-btn').forEach(btn => {
    btn.onclick = () => openGradingModal(btn.getAttribute('data-id'));
  });

  document.querySelectorAll('.block-btn').forEach(btn => {
    btn.onclick = () => toggleBlockUser(btn.getAttribute('data-id'));
  });
}

const searchInputEl = document.getElementById('adminSearchInput');
if (searchInputEl) {
  searchInputEl.addEventListener('input', renderAdminDashboard);
}

async function toggleBlockUser(userId) {
  if (!userId) return;
  const user = allUsersCache[userId];
  if (!user) return;

  const updatedBlockStatus = !user.isBlocked;
  await update(ref(db, `users/${userId}`), { isBlocked: updatedBlockStatus });
  showToast(`تم ${updatedBlockStatus ? 'حظر' : 'إلغاء حظر'} المستخدم بنجاح.`);
}

const gradingModal = document.getElementById('gradingModal');
const closeModalBtn = document.getElementById('closeGradingModalBtn');
if (closeModalBtn && gradingModal) {
  closeModalBtn.onclick = () => gradingModal.classList.remove('active');
}

function openGradingModal(userId) {
  activeInspectedUserId = userId;
  const user = allUsersCache[userId];
  if (!user || !gradingModal) return;

  const nameTitle = document.getElementById('modalUserNameTitle');
  const msgInput = document.getElementById('adminMessageInput');
  if (nameTitle) nameTitle.textContent = `مراجعة امتحان: ${user.name || ''} (${user.phone || ''})`;
  if (msgInput) msgInput.value = user.adminMessage || "";

  const container = document.getElementById('modalExamContent');
  if (!container) return;
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
        <p>الإجابة الصحيحة النموذجية: <span style="font-weight: 700; color: #34d399;">${adminAnswersLookup[q.id]}</span></p>
        <small>الدرجة: ${qScore} / 2</small>
      `;
    } else {
      const currentNote = user.notes && user.notes.q6 ? user.notes.q6 : "";
      div.innerHTML = `
        <strong style="color: var(--accent);">س${idx + 1} (مقالي): ${q.text}</strong>
        ${q.img ? `<br><img src="${q.img}" style="max-height: 120px; border-radius: 8px; margin: 0.5rem 0;">` : ''}
        <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 8px; margin: 0.5rem 0;">
          <strong>إجابة العميل:</strong>
          <p style="white-space: pre-wrap; color: var(--text-main); font-weight: 600;">${userAns}</p>
        </div>
        <div style="display: flex; gap: 1rem; align-items: center; margin-top: 0.75rem;">
          <label>درجة السؤال (0 إلى 2):</label>
          <input type="number" id="q6ScoreInput" class="form-control" style="width: 80px;" min="0" max="2" value="${qScore}">
        </div>
        <div style="margin-top: 0.5rem;">
          <label>ملاحظة المصحح:</label>
          <input type="text" id="q6NoteInput" class="form-control" placeholder="ملاحظة حول الإجابة..." value="${currentNote}">
        </div>
      `;
    }

    container.appendChild(div);
  });

  gradingModal.classList.add('active');
}

// حفظ التصحيح
const saveBtn = document.getElementById('saveGradingBtn');
if (saveBtn) {
  saveBtn.onclick = async () => {
    if (!activeInspectedUserId) return;

    const user = allUsersCache[activeInspectedUserId];
    const scoreInput = document.getElementById('q6ScoreInput');
    const noteInput = document.getElementById('q6NoteInput');
    const msgInput = document.getElementById('adminMessageInput');

    const q6Score = scoreInput ? parseInt(scoreInput.value) || 0 : 0;
    const q6Note = noteInput ? noteInput.value.trim() : '';
    const adminMsg = msgInput ? msgInput.value.trim() : '';

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
    showToast('تم حفظ التصحيح بنجاح.');
    if (gradingModal) gradingModal.classList.remove('active');
  };
}

// إظهار/إخفاء النتيجة
const publishBtn = document.getElementById('togglePublishResultBtn');
if (publishBtn) {
  publishBtn.onclick = async () => {
    if (!activeInspectedUserId) return;

    const user = allUsersCache[activeInspectedUserId];
    const newPublishStatus = !user.resultPublished;

    await update(ref(db, `users/${activeInspectedUserId}`), { resultPublished: newPublishStatus });
    showToast(`تم ${newPublishStatus ? 'إظهار' : 'إخفاء'} النتيجة بنجاح.`);
    if (gradingModal) gradingModal.classList.remove('active');
  };
}
