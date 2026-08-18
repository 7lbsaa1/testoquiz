import { db, ref, get, set, update, onValue } from "./firebase-config.js";

// ==========================================
// 1. إعدادات الامتحان (تحديد الامتحان الحالي)
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const activeQuizId = urlParams.get('quiz') || 'quiz1'; // الافتراضي هو الامتحان الأول إذا لم يكن هناك شيء في الرابط

const currentUserId = localStorage.getItem('fq_user_id');

// التحقق من تسجيل الدخول (إذا لم يكن مسجلاً، أعده لصفحة التسجيل)
if (!currentUserId) {
    window.location.href = "index.html"; 
}

// ==========================================
// 2. بنك الأسئلة (يمكنك تغييره حسب رقم الامتحان)
// ==========================================
let questionsData = [];

if (activeQuizId === 'quiz1') {
    questionsData = [
        { id: 'q1', text: 'من هو هذا اللاعب؟', type: 'mcq', correctAnswer: "فرناندو توريس", options: ["فرناندو توريس", "ديفيد فيا", "راؤول"] },
        { id: 'q2', text: 'من هو هذا اللاعب؟', type: 'mcq', correctAnswer: "كولر", options: ["كولر", "يان كولر", "بيتر تشيك"] },
        { id: 'q3', text: 'من فاز بدوري أبطال أوروبا عام 2020؟', type: 'mcq', correctAnswer: "بايرن ميونخ", options: ["بايرن ميونخ", "ريال مدريد", "باريس سان جيرمان"] },
        { id: 'q4', text: 'كم ناديًا لعب له كريستيانو رونالدو؟', type: 'mcq', correctAnswer: "5", options: ["4", "5", "6"] },
        { id: 'q5', text: 'متى فاز هذا اللاعب بالكرة الذهبية؟', type: 'mcq', correctAnswer: "2003", options: ["2001", "2003", "2004"] },
        { id: 'q6', text: 'اذكر 3 أندية لعب لها هذا اللاعب مع ذكر اسمه.', type: 'essay' } // سؤال مقالي (درجته بيد الأدمن)
    ];
} else if (activeQuizId === 'quiz2') {
    // يمكنك هنا وضع أسئلة الامتحان الثاني مستقبلاً
    questionsData = [
        { id: 'q1', text: 'من هو الهداف التاريخي لكأس العالم؟', type: 'mcq', correctAnswer: "ميروسلاف كلوزه", options: ["الظاهرة رونالدو", "ميروسلاف كلوزه", "بيليه"] },
        // أضف المزيد...
    ];
}

// ==========================================
// 3. متغيرات الحالة
// ==========================================
let userAnswers = {};
let isSubmitted = false;
let quizRefPath = `users/${currentUserId}/quizzes/${activeQuizId}`;

// ==========================================
// 4. التهيئة عند فتح الصفحة
// ==========================================
async function initQuiz() {
    const quizRef = ref(db, quizRefPath);
    const snapshot = await get(quizRef);

    if (snapshot.exists()) {
        const data = snapshot.val();
        
        // إذا كان قد سلم الامتحان بالفعل
        if (data.examStatus === 'submitted') {
            isSubmitted = true;
            userAnswers = data.answers || {};
            showResultsUI(data); // إظهار واجهة النتيجة بدلاً من الامتحان
            return;
        } else {
            // استرجاع الإجابات المحفوظة كمسودة (إن وجد)
            userAnswers = data.answers || {};
        }
    } else {
        // إنشاء سجل الامتحان للمرة الأولى إذا لم يكن موجوداً
        await update(ref(db, `users/${currentUserId}`), {
            lastActiveQuiz: activeQuizId,
            lastLogin: Date.now()
        });
    }

    renderQuestions(); // عرض الأسئلة
}

// ==========================================
// 5. عرض الأسئلة في الواجهة
// ==========================================
function renderQuestions() {
    const container = document.getElementById('quizContainer'); // تأكد أن لديك div بهذا الـ id في الـ HTML
    if (!container) return;
    
    container.innerHTML = ''; // تفريغ الحاوية

    questionsData.forEach((q, index) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'question-card glass-card';
        qDiv.style.padding = '1.5rem';
        qDiv.style.marginBottom = '1.5rem';
        qDiv.style.borderRadius = '12px';

        let htmlContent = `<h3 style="margin-bottom: 1rem;">س${index + 1}: ${q.text}</h3>`;

        if (q.type === 'mcq') {
            htmlContent += `<div class="options-group" style="display: flex; flex-direction: column; gap: 10px;">`;
            q.options.forEach(opt => {
                const isChecked = userAnswers[q.id] === opt ? 'checked' : '';
                htmlContent += `
                    <label style="padding: 10px; background: rgba(0,0,0,0.1); border-radius: 8px; cursor: pointer;">
                        <input type="radio" name="${q.id}" value="${opt}" ${isChecked} onchange="saveAnswer('${q.id}', '${opt}')">
                        ${opt}
                    </label>
                `;
            });
            htmlContent += `</div>`;
        } else if (q.type === 'essay') {
            const savedText = userAnswers[q.id] || '';
            htmlContent += `
                <textarea rows="4" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ccc; background: rgba(255,255,255,0.05); color: #fff;" 
                oninput="saveAnswer('${q.id}', this.value)" placeholder="اكتب إجابتك هنا...">${savedText}</textarea>
            `;
        }

        qDiv.innerHTML = htmlContent;
        container.appendChild(qDiv);
    });

    // إضافة زر التسليم
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'تسليم الامتحان';
    submitBtn.className = 'btn-primary';
    submitBtn.style.cssText = 'width: 100%; padding: 12px; font-size: 1.1rem; border-radius: 8px; background: #3b82f6; color: white; border: none; cursor: pointer; margin-top: 1rem;';
    submitBtn.onclick = submitQuiz;
    container.appendChild(submitBtn);
}

// ==========================================
// 6. حفظ الإجابات أولاً بأول (حتى لا تضيع)
// ==========================================
window.saveAnswer = async function(questionId, value) {
    if (isSubmitted) return;
    userAnswers[questionId] = value;
    
    // حفظ في قاعدة البيانات بشكل لحظي كمسودة
    await update(ref(db, quizRefPath), {
        answers: userAnswers,
        lastUpdated: Date.now()
    });
};

// ==========================================
// 7. تسليم الامتحان النهائي (Submit)
// ==========================================
async function submitQuiz() {
    // تأكيد التسليم
    const confirmSubmit = confirm('هل أنت متأكد من رغبتك في تسليم الامتحان؟ لا يمكنك التعديل بعد التسليم.');
    if (!confirmSubmit) return;

    // تعطيل الواجهة
    isSubmitted = true;
    let calculatedScore = 0;
    let gradingMap = {};

    // تصحيح تلقائي لأسئلة الاختيار من متعدد
    questionsData.forEach(q => {
        if (q.type === 'mcq') {
            if (userAnswers[q.id] === q.correctAnswer) {
                calculatedScore += 2; // الدرجة لكل سؤال
                gradingMap[q.id] = 2;
            } else {
                gradingMap[q.id] = 0;
            }
        } else {
            // السؤال المقالي يتم تصحيحه بواسطة الأدمن، لذا درجته المبدئية 0
            gradingMap[q.id] = 0; 
        }
    });

    // رفع النتيجة النهائية إلى Firebase
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
        location.reload(); // إعادة تحميل الصفحة لعرض واجهة النتيجة
    } catch (error) {
        console.error("خطأ في تسليم الامتحان: ", error);
        alert('حدث خطأ أثناء التسليم، يرجى المحاولة مرة أخرى.');
        isSubmitted = false;
    }
}

// ==========================================
// 8. واجهة إظهار النتيجة (إذا كان قد امتحن مسبقاً)
// ==========================================
function showResultsUI(data) {
    const container = document.getElementById('quizContainer');
    if (!container) return;

    let adminMessageHTML = data.adminMessage 
        ? `<div style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin-bottom: 20px; color: #fff;">
             <strong>رسالة من الأدمن:</strong> ${data.adminMessage}
           </div>` 
        : '';

    // جمع الدرجات (الاختياري التلقائي + المقالي إن قام الأدمن بتصحيحه)
    let finalScore = data.score || 0;
    if (data.grading && data.grading.q6) {
        finalScore += parseInt(data.grading.q6); // إضافة درجة السؤال المقالي
    }

    container.innerHTML = `
        <div style="text-align: center; padding: 2rem; background: rgba(30, 41, 59, 0.8); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
            <i class="fa-solid fa-circle-check" style="font-size: 4rem; color: #10b981; margin-bottom: 1rem;"></i>
            <h2 style="margin-bottom: 1rem; color: #fff;">لقد قمت بتسليم هذا الامتحان بالفعل</h2>
            ${adminMessageHTML}
            <h3 style="color: #3b82f6;">درجتك الحالية: ${finalScore} / 12</h3>
            <p style="color: #94a3b8; margin-top: 10px; font-size: 0.9rem;">
                (ملاحظة: درجات الأسئلة المقالية قد تتطلب مراجعة الأدمن ليتم إضافتها لمجموعك)
            </p>
        </div>
    `;
}

// ==========================================
// بدء تشغيل السكربت
// ==========================================
initQuiz();
