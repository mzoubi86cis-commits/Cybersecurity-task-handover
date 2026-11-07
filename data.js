/* =========================================================
   data.js — طبقة بيانات تجريبية عبر localStorage
   عند الربط بخادم حقيقي، استبدل كل دالة بـ fetch() إلى API
   ========================================================= */

const DB = {
  // ---------- مفاتيح التخزين ----------
  K: {
    students: 'cyber_students',
    submissions: 'cyber_submissions',
    notes: 'cyber_notes',
    evals: 'cyber_evals',
    acks: 'cyber_acks',
    session: 'cyber_session',
    settings: 'cyber_settings'
  },

  // ---------- التهيئة الأولى ----------
  init() {
    if (!localStorage.getItem(this.K.settings)) {
      // الإعدادات: تواريخ الواجب والتمديد
      localStorage.setItem(this.K.settings, JSON.stringify({
        title: 'واجب وحدة الأمن السيبراني',
        startDate: '2026-11-08',
        originalDeadline: '2026-11-12',
        extendedDeadline: '2026-11-15',
        gradeRevealDate: '2026-11-18',
        isExtended: false,
        teacherName: 'م. منذر الزعبي',
        school: 'مدرسة الطرة الثانوية للبنين',
        level: 'المستوى الثالث - السنة الثانية',
        major: 'تكنولوجيا المعلومات',
        year: '2026/2027'
      }));
    }
    if (!localStorage.getItem(this.K.students)) {
      // طلاب تجريبيون (تُستورد لاحقاً من Excel)
      const demo = [
        { id:1, num:'2026001', nameAr:'أحمد محمد العلي',   nameEn:'Ahmad Mohammad Al-Ali',   username:'ahmad.ali',  password:'Ahmad@2026' },
        { id:2, num:'2026002', nameAr:'يوسف سامي الزعبي', nameEn:'Yousef Sami Al-Zoubi',   username:'yousef.z',   password:'Yousef@2026' },
        { id:3, num:'2026003', nameAr:'عمر خالد الطراونة', nameEn:'Omar Khaled Al-Tarawneh', username:'omar.t',     password:'Omar@2026' }
      ];
      localStorage.setItem(this.K.students, JSON.stringify(demo));
    }
    // جداول فارغة إن لم توجد
    [this.K.submissions, this.K.notes, this.K.evals, this.K.acks].forEach(k => {
      if (!localStorage.getItem(k)) localStorage.setItem(k, '[]');
    });
  },

  // ---------- أدوات مساعدة ----------
  _get(k) { return JSON.parse(localStorage.getItem(k) || '[]'); },
  _set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },

  settings() { return JSON.parse(localStorage.getItem(this.K.settings)); },
  saveSettings(s) { localStorage.setItem(this.K.settings, JSON.stringify(s)); },

  // ---------- الطلاب ----------
  students() { return this._get(this.K.students); },
  saveStudents(list) { this._set(this.K.students, list); },
  findStudent(id) { return this.students().find(s => s.id === id); },
  findByCredentials(u, p) {
    return this.students().find(s => s.username === u && s.password === p);
  },
  updateStudent(id, patch) {
    const list = this.students().map(s => s.id === id ? { ...s, ...patch } : s);
    this.saveStudents(list);
  },
  nextStudentId() {
    const list = this.students();
    return list.length ? Math.max(...list.map(s => s.id)) + 1 : 1;
  },

  // ---------- التسليمات ----------
  submissions() { return this._get(this.K.submissions); },
    // ---------- التسليمات ----------
  submissions() { return this._get(this.K.submissions); },
  submissionOf(studentId) {
    // جلب كل تسليمات هذا الطالب وترتيبها حسب الوقت (الأحدث أولاً)
    const list = this.submissions()
      .filter(s => Number(s.studentId) === Number(studentId))
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    // إرجاع أحدث تسليم إن وجد
    return list.length ? list[0] : null; 
  },
  addSubmission(sub) {
    const list = this.submissions().filter(s => s.studentId !== sub.studentId);
    sub.id = Date.now();
    sub.submittedAt = new Date().toISOString();
    list.push(sub);
    this._set(this.K.submissions, list);
    return sub;
  },

  // ---------- الملاحظات ----------
  notes() { return this._get(this.K.notes); },
  notesOf(studentId) { return this.notes().filter(n => n.studentId === studentId); },
  addNote(studentId, text) {
    const list = this.notes();
    list.push({ id: Date.now(), studentId, text, createdAt: new Date().toISOString() });
    this._set(this.K.notes, list);
  },
  deleteNote(noteId) {
    this._set(this.K.notes, this.notes().filter(n => n.id !== noteId));
  },

  // ---------- التقييمات ----------
  evals() { return this._get(this.K.evals); },
  evalOf(studentId) { return this.evals().find(e => e.studentId === studentId) || null; },
  setEval(studentId, code) {
    const list = this.evals().filter(e => e.studentId !== studentId);
    list.push({ studentId, code, gradedAt: new Date().toISOString() });
    this._set(this.K.evals, list);
  },

  // ---------- إقرار الاطلاع ----------
  acks() { return this._get(this.K.acks); },
  hasAck(studentId) { return this.acks().some(a => a.studentId === studentId); },
  addAck(studentId) {
    const list = this.acks();
    if (!list.some(a => a.studentId === studentId)) {
      list.push({ studentId, acknowledgedAt: new Date().toISOString() });
      this._set(this.K.acks, list);
    }
  },

  // ---------- الجلسة ----------
  setSession(role, id, name) {
    localStorage.setItem(this.K.session, JSON.stringify({ role, id, name, at: Date.now() }));
  },
  session() { return JSON.parse(localStorage.getItem(this.K.session) || 'null'); },
  logout() { localStorage.removeItem(this.K.session); },

  // ---------- منطق التواريخ ----------
  // يحسب آخر موعد مسموح للتسليم
  effectiveDeadline() {
    const s = this.settings();
    return s.isExtended ? s.extendedDeadline : s.originalDeadline;
  },
  // هل التسليم مفتوح الآن؟
  isSubmissionOpen() {
    const now = new Date();
    const s = this.settings();
    const start = new Date(s.startDate + 'T00:00:00');
    const deadline = new Date(this.effectiveDeadline() + 'T23:59:59');
    return now >= start && now <= deadline;
  },
  // هل حان وقت كشف التقييم؟
  isGradeVisible() {
    const now = new Date();
    const reveal = new Date(this.settings().gradeRevealDate + 'T00:00:00');
    return now >= reveal;
  },
  // حالة التسليم لكل طالب (للمعلم)
  statusOf(studentId) {
    const sub = this.submissionOf(studentId);
    if (!sub) return { label: 'لم يسلّم', cls: 'badge-red' };
    const s = this.settings();
    const submitted = new Date(sub.submittedAt);
    const original = new Date(s.originalDeadline + 'T23:59:59');
    if (submitted <= original) return { label: 'سلّم في الوقت', cls: 'badge-green' };
    return { label: 'سلّم بعد الموعد', cls: 'badge-amber' };
  }
};

// تهيئة فورية عند تحميل الملف
DB.init();