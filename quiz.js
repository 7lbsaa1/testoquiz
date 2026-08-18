import { db, ref, get, set, update, onValue } from "./firebase-config.js";

// ==========================================
// 1. إعدادات الامتحان (تحديد الامتحان الحالي)
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const activeQuizId = urlParams.get('quiz') || 'quiz1'; // الافتراضي هو الامتحان الأول

const currentUserId = localStorage.getItem('fq_user_id');

// التحقق من تسجيل الدخول (إذا لم يكن مسجلاً، أعده لصفحة التسجيل)
if (!currentUserId) {
    window.location.href = "index.html"; 
}

// ==========================================
// 2. بنك الأسئلة
// ==========================================
let questionsData = [];

if (activeQuizId === 'quiz1') {
    questionsData = [
        { id: 'q1', text: 'من هو هذا اللاعب؟', img: 'https://i.pinimg.com/736x/21/75/94/217594dd06dcd7d74f8439a7f799a04b.jpg', type: 'mcq', correctAnswer: "فرناندو توريس", options: ["فرناندو توريس", "ديفيد فيا", "راؤول"] },
        { id: 'q2', text: 'من هو هذا اللاعب؟', img: 'https://i.pinimg.com/736x/1f/ce/d0/1fced0e99995f28dfe40414031a6bca0.jpg', type: 'mcq', correctAnswer: "كولر", options: ["كولر", "يان كولر", "بيتر تشيك"] },
        { id: 'q3', text: 'من فاز بدوري أبطال أوروبا عام 2020؟', img: null, type: 'mcq', correctAnswer: "بايرن ميونخ", options: ["بايرن ميونخ", "ريال مدريد", "باريس سان جيرمان"] },
        { id: 'q4', text: 'كم ناديًا لعب له كريستيانو رونالدو؟', img: 'https://i.pinimg.com/736x/4f/07/94/4f079491ea9e6a7411210d79299ec283.jpg', type: 'mcq', correctAnswer: "5", options: ["4", "5", "6"] },
        { id: 'q5', text: 'متى فاز هذا اللاعب بالكرة الذهبية؟', img: 'https://i.pinimg.com/736x/26/36/5f/26365fa3abdafd83a278560dd4751101.jpg', type: 'mcq', correctAnswer: "2003", options: ["2001", "2003", "2004"] },
        { id: 'q6', text: 'اذكر 3 أندية لعب لها هذا اللاعب مع ذكر اسمه.', img: 'https://i.pinimg.com/1200x/51/82/72/518272b60063af622e8ee5e441105c03.jpg', type: 'essay' }
    ];
} else if (activeQuizId === 'quiz2') {
    questionsData = [
        { id: 'q1', text: 'من هو الهداف التاريخي لكأس العالم؟', img: null, type: 'mcq', correctAnswer: "ميروسلاف كلوزه", options: ["الظاهرة رونالدو", "ميروسلاف كلوزه", "بيليه"] }
    ];
}

// ==========================================
// 3. متغيرات الحالة
// ==========================================
let userAnswers = {};
let isSubmitted = false;
let quizRefPath = `users/${currentUserId}/quizzes/${activeQuizId}`;

// ==========================================
// 4. إظهار المحتوى وإخفاء شاشة التحميل
// ==========================================
function hideLoadingShowContent() {
    const loadingEl = document.getElementById('loadingScreen');
    const contentEl = document.getElementById('quizContent');
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
}

// ==========================================
// 5. التهيئة عند فتح الصفحة
// ==========================================
async function initQuiz() {
    try {
        const quizRef = ref(db, quizRefPath);
        const snapshot = await get(quizRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // إذا كان قد سلم الامتحان بالفعل
            if (data.examStatus === 'submitted') {
                isSubmitted = true;
                userAnswers = data.answers || {};
                hideLoadingShowContent();
                showResultsUI(data);
                return;
            } else {
                userAnswers = data.answers || {};
            }
        } else {
            await update(ref(db, `users/${currentUserId}`), {
                lastActiveQuiz: activeQuizId,
                lastLogin: Date.now()
            });
        }

        hideLoadingShowContent();
        renderQuestions();
    } catch (err) {
        console.error("خطأ في جلب بيانات الامتحان:", err);
        hideLoadingShowContent();
    }
}

// ==========================================
// 6. عرض الأسئلة في الواجهة
// ==========================================
function renderQuestions() {
    const container = document.getElementById('questionContainer');
    if (!container) return;
    
    container.innerHTML = '';

    const titleEl = document.getElementById('quizTitle');
    if (titleEl) {
        titleEl.textContent = activeQuizId === 'quiz1' ? 'الامتحان الأول' : activeQuizId === 'quiz2' ? 'الامتحان الثاني' : activeQuizId;
    }

    questionsData.forEach((q, index) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'question-card';
        qDiv.style.marginBottom = '2rem';

        let htmlContent = `<h3 style="margin-bottom: 1rem; font-size: 1.1rem;">س${index + 1}: ${q.text}</h3>`;

        if (q.img) {
            htmlContent += `<img src="${q.img}" class="q-img" alt="صورة السؤال">`;
        }

        if (q.type === 'mcq') {
            htmlContent += `<div class="options-container">`;
            q.options.forEach(opt => {
                const isSelected = userAnswers[q.id] === opt ? 'selected' : '';
                htmlContent += `
                    <button type="button" class="option-btn ${isSelected}" onclick="selectOption('${q.id}', '${opt}', this)">
                        ${opt}
                    </button>
                `;
            });
            htmlContent += `</div>`;
        } else if (q.type === 'essay') {
            const savedText = userAnswers[q.id] || '';
            htmlContent += `
                <textarea class="textarea-control" 
                oninput="saveAnswer('${q.id}', this.value)" placeholder="اكتب إجابتك هنا...">${savedText}</textarea>
            `;
        }

        qDiv.innerHTML = htmlContent;
        container.appendChild(qDiv);
    });

    // إخفاء زر "السؤال التالي" واستبداله بزر التسليم
    const oldNextBtn = document.getElementById('nextQuestionBtn');
    if (oldNextBtn) {
        oldNextBtn.style.display = 'none';
    }

    // إضافة زر التسليم الأساسي
    let submitBtn = document.getElementById('submitQuizBtn');
    if (!submitBtn) {
        submitBtn = document.createElement('button');
        submitBtn.id = 'submitQuizBtn';
        submitBtn.className = 'btn-submit';
        submitBtn.innerHTML = `<span>تسليم الامتحان النهائي</span> <i class="fa-solid fa-paper-plane"></i>`;
        submitBtn.onclick = submitQuiz;
        container.appendChild(submitBtn);
    }
}

// ==========================================
// 7. اختيار وتحديد الخيارات المقترحة
// ==========================================
window.selectOption = function(questionId, value, btnElement) {
    if (isSubmitted) return;
    
    // إلغاء تحديد التحديدات القديمة لهذا السؤال
    const parent = btnElement.closest('.options-container');
    if (parent) {
        parent.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
    }
    
    // تحديد الزر الحالي
    btnElement.classList.add('selected');
    
    // حفظ الإجابة
    window.saveAnswer(questionId, value);
};

// ==========================================
// 8. حفظ الإجابات أولاً بأول (حتى لا تضيع)
// ==========================================
window.saveAnswer = async function(questionId, value) {
    if (isSubmitted) return;
    userAnswers[questionId] = value;
    
    try {
        await update(ref(db, quizRefPath), {
            answers: userAnswers,
            lastUpdated: Date.now()
        });
    } catch (e) {
        console.error("خطأ أثناء حفظ الإجابة:", e);
    }
};

// ==========================================
// 9. تسليم الامتحان النهائي (Submit)
// ==========================================
async function submitQuiz() {
    const confirmSubmit = confirm('هل أنت متأكد من رغبتك في تسليم الامتحان؟ لا يمكنك التعديل بعد التسليم.');
    if (!confirmSubmit) return;

    isSubmitted = true;
    let calculatedScore = 0;
    let gradingMap = {};

    questionsData.forEach(q => {
        if (q.type === 'mcq') {
            if (userAnswers[q.id] === q.correctAnswer) {
                calculatedScore += 2;
                gradingMap[q.id] = 2;
            } else {
                gradingMap[q.id] = 0;
            }
        } else {
            gradingMap[q.id] = 0; 
        }
    });

    const updates = {
        answers: userAnswers,
        grading: gradingMap,
        score: calculatedScore,
        submittedAt: Date.now(),
        examStatus: 'submitted'
    };

    try {
        await update(ref(db, quizRefPath), updates);
        alert('تم تسليم الامتحان بنجاح!');
        location.reload();
    } catch (error) {
        console.error("خطأ في تسليم الامتحان: ", error);
        alert('حدث خطأ أثناء التسليم، يرجى المحاولة مرة أخرى.');
        isSubmitted = false;
    }
}

// ==========================================
// 10. واجهة إظهار النتيجة (إذا كان قد امتحن مسبقاً)
// ==========================================
function showResultsUI(data) {
    const container = document.getElementById('quizContent');
    if (!container) return;

    let adminMessageHTML = data.adminMessage 
        ? `<div style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin-bottom: 20px; color: #fff; text-align: right;">
             <strong>رسالة من الأدمن:</strong> ${data.adminMessage}
           </div>` 
        : '';

    let finalScore = data.score || 0;
    if (data.grading && data.grading.q6) {
        finalScore += parseInt(data.grading.q6);
    }

    container.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem;">
            <i class="fa-solid fa-circle-check" style="font-size: 4rem; color: #10b981; margin-bottom: 1rem;"></i>
            <h2 style="margin-bottom: 1rem; color: #fff;">لقد قمت بتسليم هذا الامتحان بالفعل</h2>
            ${adminMessageHTML}
            <h3 style="color: #3b82f6; font-size: 1.5rem; margin-bottom: 1rem;">درجتك الحالية: ${finalScore} / 12</h3>
            <p style="color: #94a3b8; font-size: 0.9rem;">
                (ملاحظة: درجات الأسئلة المقالية تتطلب مراجعة الأدمن ليتم إضافتها لمجموعك الكلي)
            </p>
        </div>
    `;
}

// ==========================================
// بدء تشغيل السكربت
// ==========================================
initQuiz();
