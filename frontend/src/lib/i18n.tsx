import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lang } from './types'

type Plural = { zero?: string; one: string; two?: string; few?: string; many?: string; other: string }

const ar = {
  appName: 'صدى',
  loading: 'جارٍ التحميل…',
  save: 'حفظ',
  saving: 'جارٍ الحفظ…',
  saved: 'تم الحفظ',
  cancel: 'إلغاء',
  delete: 'حذف',
  close: 'إغلاق',
  back: 'رجوع',
  copy: 'نسخ',
  copied: 'تم النسخ',
  retry: 'إعادة المحاولة',
  signOut: 'تسجيل الخروج',
  mySurveys: 'استبياناتي',
  switchLanguage: 'English',
  wakeBanner: 'الخادم يستيقظ بعد فترة خمول، قد يستغرق ذلك حتى دقيقة. شكرًا لصبرك.',

  // errors (codes from the API)
  'error.generic': 'حدث خطأ غير متوقع. حاول مرة أخرى.',
  'error.NETWORK': 'تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.',
  'error.EMAIL_TAKEN': 'يوجد حساب بهذا البريد. سجّل الدخول بدلًا من ذلك.',
  'error.INVALID_CREDENTIALS': 'البريد أو كلمة المرور غير صحيحة.',
  'error.RATE_LIMITED': 'محاولات كثيرة. انتظر دقيقة ثم حاول مجددًا.',
  'error.GOOGLE_INVALID': 'تعذّر التحقق من حساب Google.',
  'error.GOOGLE_DISABLED': 'الدخول عبر Google غير مفعّل.',
  'error.NO_QUESTIONS': 'أضف سؤالًا واحدًا على الأقل قبل النشر.',
  'error.AI_DISABLED': 'ميزات الذكاء الاصطناعي غير مفعّلة على هذا الخادم.',
  'error.AI_LIMIT': 'وصلت للحد اليومي لطلبات الذكاء الاصطناعي. جرّب غدًا.',
  'error.AI_BUSY': 'خدمة الذكاء الاصطناعي مشغولة الآن. حاول بعد قليل.',
  'error.AI_FAILED': 'لم يكتمل طلب الذكاء الاصطناعي. حاول مرة أخرى.',
  'error.PROMPT_TOO_SHORT': 'اكتب وصفًا أوضح للاستبيان (جملة أو جملتين).',
  'error.NO_RESPONSES': 'اجمع بعض الردود أولًا.',
  'error.SURVEY_LIMIT': 'وصلت للحد الأقصى لعدد الاستبيانات.',
  'error.NOT_FOUND': 'العنصر غير موجود.',
  'error.VALIDATION': 'بعض الحقول تحتاج تصحيح.',

  // landing
  'landing.title': 'اسأل جمهورك، واسمع صداه بوضوح.',
  'landing.body': 'أنشئ استبيانًا في دقائق، شاركه برابط أو رمز QR، وتابع الإجابات برسوم واضحة لحظة وصولها.',
  'landing.start': 'أنشئ حسابًا مجانيًا',
  'landing.login': 'تسجيل الدخول',
  'landing.dashboard': 'اذهب إلى استبياناتي',
  'landing.demoQuestion': 'متى تفضّل قهوتك؟',
  'landing.demoOptions': 'الصباح الباكر|بعد الظهر|مع المغرب',
  'landing.demoHint': 'جرّب: اختر إجابة وشاهد النتيجة تتحدث',
  'landing.demoThanks': 'وصل صوتك. هكذا تبدو النتائج لصاحب الاستبيان.',
  'landing.f1.title': '9 أنواع من الأسئلة',
  'landing.f1.body': 'اختيار من متعدد، تقييم بالنجوم، مقياس، نص، رقم، تاريخ، وقائمة منسدلة.',
  'landing.f2.title': 'رابط ورمز QR',
  'landing.f2.body': 'شارك الاستبيان في واتساب أو اطبع الرمز وضعه على الطاولة.',
  'landing.f3.title': 'نتائج تُقرأ بنظرة',
  'landing.f3.body': 'نسب وتوزيعات ومؤشر NPS وإجابات نصية، مع تصدير CSV يفتح في Excel.',
  'landing.f4.title': 'مساعد ذكي',
  'landing.f4.body': 'صف فكرتك ليقترح عليك الأسئلة، ثم لخّص النتائج بنقاط عملية.',
  'landing.stepsTitle': 'ثلاث خطوات',
  'landing.s1': 'أنشئ الاستبيان واختر أنواع الأسئلة.',
  'landing.s2': 'انشره وشارك الرابط مع جمهورك.',
  'landing.s3': 'تابع الردود وصدّرها أو اطلب ملخصًا ذكيًا.',
  'landing.footer': 'صدى: استبيانات بسيطة بالعربية والإنجليزية.',

  // auth
  'auth.loginTitle': 'أهلًا بعودتك',
  'auth.loginBody': 'سجّل الدخول لمتابعة استبياناتك.',
  'auth.registerTitle': 'أنشئ حسابك',
  'auth.registerBody': 'مجاني، ويكفيك بريد وكلمة مرور.',
  'auth.name': 'الاسم',
  'auth.email': 'البريد الإلكتروني',
  'auth.password': 'كلمة المرور',
  'auth.passwordHint': '8 أحرف على الأقل',
  'auth.loginBtn': 'دخول',
  'auth.registerBtn': 'إنشاء الحساب',
  'auth.noAccount': 'ليس لديك حساب؟',
  'auth.haveAccount': 'لديك حساب؟',
  'auth.or': 'أو',

  // dashboard
  'dash.new': 'استبيان جديد',
  'dash.emptyTitle': 'لا توجد استبيانات بعد',
  'dash.emptyBody': 'ابدأ بأول استبيان. يمكنك كتابته بنفسك أو وصف فكرتك للمساعد الذكي.',
  'dash.updated': 'آخر تعديل {time}',
  'dash.edit': 'تعديل',
  'dash.results': 'النتائج',
  'dash.share': 'مشاركة',
  'dash.duplicate': 'نسخ الاستبيان',
  'dash.duplicated': 'تم إنشاء نسخة',
  'dash.deleteTitle': 'حذف «{title}»؟',
  'dash.deleteBody': 'سيُحذف الاستبيان وكل ردوده نهائيًا.',
  'dash.deleted': 'تم الحذف',
  'dash.more': 'خيارات أخرى',
  'status.DRAFT': 'مسودة',
  'status.PUBLISHED': 'منشور',
  'status.CLOSED': 'مغلق',
  'new.title': 'استبيان جديد',
  'new.blank': 'ابدأ من الصفر',
  'new.blankBody': 'صفحة فارغة وسؤال أول جاهز للتعديل.',
  'new.ai': 'بمساعدة الذكاء الاصطناعي',
  'new.aiBody': 'صف ما تريد معرفته وسنقترح الأسئلة.',
  'new.aiPrompt': 'مثال: استبيان لقياس رضا عملاء مقهى عن جودة القهوة والخدمة والأسعار',
  'new.aiLanguage': 'لغة الاستبيان',
  'new.aiCount': 'عدد الأسئلة',
  'new.generate': 'اقترح الأسئلة',
  'new.generating': 'يكتب المساعد الأسئلة…',
  'new.aiUsage': 'استخدمت {used} من {limit} طلبًا اليوم',
  'new.untitled': 'استبيان بدون عنوان',
  'new.firstQuestion': 'سؤالك الأول',

  // editor
  'editor.questions': 'الأسئلة',
  'editor.settings': 'الإعدادات',
  'editor.preview': 'معاينة',
  'editor.surveyTitle': 'عنوان الاستبيان',
  'editor.surveyDescription': 'وصف قصير يظهر للمشاركين (اختياري)',
  'editor.addQuestion': 'إضافة سؤال',
  'editor.chooseType': 'اختر نوع السؤال',
  'editor.questionTitle': 'نص السؤال',
  'editor.questionDescription': 'توضيح إضافي (اختياري)',
  'editor.addDescription': 'إضافة توضيح',
  'editor.required': 'إجباري',
  'editor.option': 'الخيار {n}',
  'editor.addOption': 'إضافة خيار',
  'editor.removeOption': 'حذف الخيار',
  'editor.ratingMax': 'عدد النجوم',
  'editor.scaleFrom': 'من',
  'editor.scaleTo': 'إلى',
  'editor.minLabel': 'وصف البداية',
  'editor.maxLabel': 'وصف النهاية',
  'editor.minLabelPh': 'مثال: غير محتمل',
  'editor.maxLabelPh': 'مثال: محتمل جدًا',
  'editor.numberMin': 'أقل قيمة',
  'editor.numberMax': 'أعلى قيمة',
  'editor.optional': 'اختياري',
  'editor.moveUp': 'تحريك لأعلى',
  'editor.moveDown': 'تحريك لأسفل',
  'editor.duplicateQ': 'تكرار السؤال',
  'editor.deleteQ': 'حذف السؤال',
  'editor.noQuestions': 'لا توجد أسئلة بعد. أضف أول سؤال من الزر بالأسفل.',
  'editor.respondentLanguage': 'لغة صفحة المشاركين',
  'editor.respondentLanguageHint': 'تحدد اتجاه الصفحة ونصوص الأزرار التي يراها المشاركون.',
  'editor.themeColor': 'لون الاستبيان',
  'editor.thankYou': 'رسالة الشكر',
  'editor.thankYouPh': 'شكرًا لوقتك! إجاباتك تساعدنا على التحسين.',
  'editor.closesAt': 'إغلاق تلقائي',
  'editor.closesAtHint': 'يتوقف استقبال الردود تلقائيًا في هذا الوقت. اتركه فارغًا لإبقائه مفتوحًا.',
  'editor.oneResponse': 'رد واحد لكل جهاز',
  'editor.oneResponseHint': 'يمنع إعادة الإرسال من نفس المتصفح. حماية بسيطة وليست مضمونة.',
  'editor.publish': 'نشر',
  'editor.published': 'تم النشر',
  'editor.closeSurvey': 'إيقاف الردود',
  'editor.closed': 'تم إيقاف الردود',
  'editor.reopen': 'إعادة الفتح',
  'editor.unsaved': 'تغييرات غير محفوظة',
  'editor.allSaved': 'كل التغييرات محفوظة',
  'editor.liveWarning': 'هذا الاستبيان منشور، وأي تعديل تحفظه يظهر للمشاركين فورًا.',
  'editor.leaveConfirm': 'لديك تغييرات غير محفوظة. هل تريد المغادرة بدونها؟',
  'editor.leave': 'مغادرة',
  'editor.stay': 'البقاء',
  'editor.previewNote': 'هذه معاينة، والإرسال معطّل.',
  'editor.fixErrors': 'راجع الأسئلة المظللة قبل الحفظ.',
  'editor.titleRequired': 'اكتب نص السؤال',
  'editor.optionsRequired': 'أضف خيارًا واحدًا على الأقل',

  'type.SHORT_TEXT': 'إجابة قصيرة',
  'type.LONG_TEXT': 'فقرة',
  'type.SINGLE_CHOICE': 'اختيار واحد',
  'type.MULTIPLE_CHOICE': 'اختيارات متعددة',
  'type.DROPDOWN': 'قائمة منسدلة',
  'type.RATING': 'تقييم بالنجوم',
  'type.SCALE': 'مقياس خطي',
  'type.NUMBER': 'رقم',
  'type.DATE': 'تاريخ',

  // share
  'share.title': 'مشاركة الاستبيان',
  'share.link': 'رابط الاستبيان',
  'share.open': 'فتح الصفحة',
  'share.qr': 'رمز QR',
  'share.downloadQr': 'تنزيل الرمز',
  'share.whatsapp': 'إرسال عبر واتساب',
  'share.draftNote': 'الاستبيان مسودة، ولن يتمكن أحد من فتح الرابط حتى تنشره.',
  'share.closedNote': 'الردود متوقفة حاليًا، ومن يفتح الرابط سيرى أن الاستبيان مغلق.',

  // results
  'results.summary': 'الملخص',
  'results.individual': 'الردود',
  'results.total': 'إجمالي الردود',
  'results.last': 'آخر رد',
  'results.first': 'أول رد',
  'results.timeline': 'الردود اليومية',
  'results.emptyTitle': 'لم تصل ردود بعد',
  'results.emptyBody': 'شارك رابط الاستبيان، وستظهر النتائج هنا فور وصول أول رد.',
  'results.emptyDraft': 'انشر الاستبيان أولًا ثم شارك الرابط لتبدأ الردود بالوصول.',
  'results.export': 'تصدير CSV',
  'results.answered': 'أجاب {answered} من {total}',
  'results.average': 'المتوسط',
  'results.min': 'الأقل',
  'results.max': 'الأعلى',
  'results.nps': 'مؤشر صافي الترويج (NPS)',
  'results.npsHint': 'نسبة من اختاروا 9–10 ناقص نسبة من اختاروا 0–6.',
  'results.latestAnswers': 'أحدث الإجابات',
  'results.showMore': 'عرض المزيد',
  'results.showLess': 'عرض أقل',
  'results.noAnswers': 'لا توجد إجابات لهذا السؤال.',
  'results.insights': 'ملخص ذكي',
  'results.insightsBody': 'اطلب من المساعد قراءة النتائج وتلخيص أهم ما فيها.',
  'results.generateInsights': 'لخّص النتائج',
  'results.regenerate': 'تحديث الملخص',
  'results.analyzing': 'يحلل المساعد الردود…',
  'results.highlights': 'أبرز النتائج',
  'results.recommendations': 'خطوات مقترحة',
  'results.basedOn': 'مبني على {n} من الردود. راجع الأرقام قبل اتخاذ القرار.',
  'results.response': 'الرد رقم {n}',
  'results.deleteResponse': 'حذف الرد',
  'results.deleteResponseBody': 'سيُحذف هذا الرد نهائيًا من النتائج.',
  'results.deleteAll': 'حذف كل الردود',
  'results.deleteAllBody': 'سيُحذف {n} من الردود نهائيًا. لا يمكن التراجع.',
  'results.noAnswer': 'بدون إجابة',
  'results.prev': 'السابق',
  'results.next': 'التالي',
  'results.pageOf': 'صفحة {page} من {pages}',
  'results.editSurvey': 'تعديل الأسئلة',

  // public form (also used by preview)
  'form.required': 'إجباري',
  'form.submit': 'إرسال',
  'form.submitting': 'جارٍ الإرسال…',
  'form.thanksTitle': 'وصل صوتك',
  'form.thanksDefault': 'شكرًا لمشاركتك. تم استلام إجاباتك.',
  'form.already': 'سبق أن أرسلت ردك على هذا الاستبيان من هذا الجهاز. شكرًا لك.',
  'form.closedTitle': 'الاستبيان مغلق',
  'form.closedBody': 'توقف هذا الاستبيان عن استقبال الردود.',
  'form.notFoundTitle': 'الاستبيان غير متاح',
  'form.notFoundBody': 'تأكد من الرابط، أو تواصل مع من أرسله لك.',
  'form.choose': 'اختر…',
  'form.yourAnswer': 'إجابتك',
  'form.madeWith': 'أُنشئ باستخدام صدى',
  'form.makeYours': 'أنشئ استبيانك',
  'form.fixErrors': 'بعض الإجابات تحتاج مراجعة.',
  'form.selectAll': 'يمكنك اختيار أكثر من إجابة',
  'form.stars': '{n} من {max}',
  'form.progress': 'أجبت عن {done} من {total}',
  'answer.REQUIRED': 'هذا السؤال إجباري',
  'answer.UNKNOWN_OPTION': 'اختر من الخيارات المتاحة',
  'answer.OUT_OF_RANGE': 'القيمة خارج النطاق المسموح',
  'answer.TOO_LONG': 'الإجابة أطول من المسموح',
  'answer.EXPECTED_NUMBER': 'أدخل رقمًا صحيحًا',
  'answer.INVALID_DATE': 'أدخل تاريخًا صحيحًا',
  'answer.EXPECTED_TEXT': 'إجابة غير صالحة',
  'answer.EXPECTED_LIST': 'إجابة غير صالحة',
  'error.SURVEY_CLOSED': 'توقف هذا الاستبيان عن استقبال الردود.',
  'error.SURVEY_FULL': 'وصل هذا الاستبيان للحد الأقصى من الردود.',
  'error.EMPTY_RESPONSE': 'أجب عن سؤال واحد على الأقل.',
  'error.INVALID_ANSWERS': 'بعض الإجابات تحتاج مراجعة.',

  'notFound.title': 'الصفحة غير موجودة',
  'notFound.body': 'ربما تغيّر الرابط أو حُذفت الصفحة.',
  'notFound.home': 'العودة للرئيسية',
}

export type MessageKey = keyof typeof ar

const en: Record<MessageKey, string> = {
  appName: 'Sada',
  loading: 'Loading…',
  save: 'Save',
  saving: 'Saving…',
  saved: 'Saved',
  cancel: 'Cancel',
  delete: 'Delete',
  close: 'Close',
  back: 'Back',
  copy: 'Copy',
  copied: 'Copied',
  retry: 'Try again',
  signOut: 'Sign out',
  mySurveys: 'My surveys',
  switchLanguage: 'العربية',
  wakeBanner: 'The server is waking up after being idle. This can take up to a minute.',

  'error.generic': 'Something went wrong. Please try again.',
  'error.NETWORK': "Can't reach the server. Check your connection and try again.",
  'error.EMAIL_TAKEN': 'An account with this email already exists. Sign in instead.',
  'error.INVALID_CREDENTIALS': 'Wrong email or password.',
  'error.RATE_LIMITED': 'Too many attempts. Wait a minute and try again.',
  'error.GOOGLE_INVALID': "Couldn't verify your Google account.",
  'error.GOOGLE_DISABLED': 'Google sign-in is not enabled.',
  'error.NO_QUESTIONS': 'Add at least one question before publishing.',
  'error.AI_DISABLED': 'AI features are not enabled on this server.',
  'error.AI_LIMIT': "You've reached today's AI limit. Try again tomorrow.",
  'error.AI_BUSY': 'The AI service is busy. Try again shortly.',
  'error.AI_FAILED': "The AI request didn't complete. Try again.",
  'error.PROMPT_TOO_SHORT': 'Describe the survey in a sentence or two.',
  'error.NO_RESPONSES': 'Collect some responses first.',
  'error.SURVEY_LIMIT': "You've reached the maximum number of surveys.",
  'error.NOT_FOUND': 'Not found.',
  'error.VALIDATION': 'Some fields need fixing.',

  'landing.title': 'Ask your audience. Hear the echo clearly.',
  'landing.body': 'Build a survey in minutes, share it with a link or QR code, and watch answers turn into clear charts as they arrive.',
  'landing.start': 'Create a free account',
  'landing.login': 'Sign in',
  'landing.dashboard': 'Go to my surveys',
  'landing.demoQuestion': 'When do you like your coffee?',
  'landing.demoOptions': 'Early morning|Afternoon|At sunset',
  'landing.demoHint': 'Try it: pick an answer and watch the results update',
  'landing.demoThanks': "Your answer landed. This is what the survey owner sees.",
  'landing.f1.title': '9 question types',
  'landing.f1.body': 'Single and multiple choice, star ratings, scales, text, numbers, dates and dropdowns.',
  'landing.f2.title': 'Link and QR code',
  'landing.f2.body': 'Share in WhatsApp, or print the code and put it on the table.',
  'landing.f3.title': 'Results at a glance',
  'landing.f3.body': 'Percentages, distributions, NPS and written answers — plus CSV export for Excel.',
  'landing.f4.title': 'AI assistant',
  'landing.f4.body': 'Describe your idea to get draft questions, then summarise results into action points.',
  'landing.stepsTitle': 'Three steps',
  'landing.s1': 'Create the survey and pick question types.',
  'landing.s2': 'Publish it and share the link.',
  'landing.s3': 'Follow responses, export them, or ask for an AI summary.',
  'landing.footer': 'Sada: simple surveys in Arabic and English.',

  'auth.loginTitle': 'Welcome back',
  'auth.loginBody': 'Sign in to continue with your surveys.',
  'auth.registerTitle': 'Create your account',
  'auth.registerBody': 'Free. All you need is an email and a password.',
  'auth.name': 'Name',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.passwordHint': 'At least 8 characters',
  'auth.loginBtn': 'Sign in',
  'auth.registerBtn': 'Create account',
  'auth.noAccount': "Don't have an account?",
  'auth.haveAccount': 'Already have an account?',
  'auth.or': 'or',

  'dash.new': 'New survey',
  'dash.emptyTitle': 'No surveys yet',
  'dash.emptyBody': 'Start your first survey. Write it yourself or describe your idea to the AI assistant.',
  'dash.updated': 'Edited {time}',
  'dash.edit': 'Edit',
  'dash.results': 'Results',
  'dash.share': 'Share',
  'dash.duplicate': 'Duplicate',
  'dash.duplicated': 'Copy created',
  'dash.deleteTitle': 'Delete “{title}”?',
  'dash.deleteBody': 'The survey and all of its responses will be deleted permanently.',
  'dash.deleted': 'Deleted',
  'dash.more': 'More options',
  'status.DRAFT': 'Draft',
  'status.PUBLISHED': 'Live',
  'status.CLOSED': 'Closed',
  'new.title': 'New survey',
  'new.blank': 'Start from scratch',
  'new.blankBody': 'A blank survey with a first question ready to edit.',
  'new.ai': 'With the AI assistant',
  'new.aiBody': 'Describe what you want to learn and get suggested questions.',
  'new.aiPrompt': 'e.g. A survey measuring how satisfied café customers are with coffee quality, service and prices',
  'new.aiLanguage': 'Survey language',
  'new.aiCount': 'Number of questions',
  'new.generate': 'Suggest questions',
  'new.generating': 'Writing your questions…',
  'new.aiUsage': '{used} of {limit} AI requests used today',
  'new.untitled': 'Untitled survey',
  'new.firstQuestion': 'Your first question',

  'editor.questions': 'Questions',
  'editor.settings': 'Settings',
  'editor.preview': 'Preview',
  'editor.surveyTitle': 'Survey title',
  'editor.surveyDescription': 'Short description shown to respondents (optional)',
  'editor.addQuestion': 'Add question',
  'editor.chooseType': 'Choose a question type',
  'editor.questionTitle': 'Question',
  'editor.questionDescription': 'Extra explanation (optional)',
  'editor.addDescription': 'Add explanation',
  'editor.required': 'Required',
  'editor.option': 'Option {n}',
  'editor.addOption': 'Add option',
  'editor.removeOption': 'Remove option',
  'editor.ratingMax': 'Number of stars',
  'editor.scaleFrom': 'From',
  'editor.scaleTo': 'To',
  'editor.minLabel': 'Start label',
  'editor.maxLabel': 'End label',
  'editor.minLabelPh': 'e.g. Not likely',
  'editor.maxLabelPh': 'e.g. Very likely',
  'editor.numberMin': 'Minimum',
  'editor.numberMax': 'Maximum',
  'editor.optional': 'Optional',
  'editor.moveUp': 'Move up',
  'editor.moveDown': 'Move down',
  'editor.duplicateQ': 'Duplicate question',
  'editor.deleteQ': 'Delete question',
  'editor.noQuestions': 'No questions yet. Add the first one with the button below.',
  'editor.respondentLanguage': 'Respondent page language',
  'editor.respondentLanguageHint': 'Sets the page direction and the button text respondents see.',
  'editor.themeColor': 'Survey colour',
  'editor.thankYou': 'Thank-you message',
  'editor.thankYouPh': 'Thanks for your time! Your answers help us improve.',
  'editor.closesAt': 'Close automatically',
  'editor.closesAtHint': 'Stops accepting responses at this time. Leave empty to keep it open.',
  'editor.oneResponse': 'One response per device',
  'editor.oneResponseHint': 'Blocks resubmitting from the same browser. Light protection, not a guarantee.',
  'editor.publish': 'Publish',
  'editor.published': 'Published',
  'editor.closeSurvey': 'Stop responses',
  'editor.closed': 'Responses stopped',
  'editor.reopen': 'Reopen',
  'editor.unsaved': 'Unsaved changes',
  'editor.allSaved': 'All changes saved',
  'editor.liveWarning': 'This survey is live. Changes you save are visible to respondents right away.',
  'editor.leaveConfirm': 'You have unsaved changes. Leave without saving?',
  'editor.leave': 'Leave',
  'editor.stay': 'Stay',
  'editor.previewNote': 'This is a preview. Submitting is turned off.',
  'editor.fixErrors': 'Fix the highlighted questions before saving.',
  'editor.titleRequired': 'Write the question',
  'editor.optionsRequired': 'Add at least one option',

  'type.SHORT_TEXT': 'Short answer',
  'type.LONG_TEXT': 'Paragraph',
  'type.SINGLE_CHOICE': 'Single choice',
  'type.MULTIPLE_CHOICE': 'Multiple choice',
  'type.DROPDOWN': 'Dropdown',
  'type.RATING': 'Star rating',
  'type.SCALE': 'Linear scale',
  'type.NUMBER': 'Number',
  'type.DATE': 'Date',

  'share.title': 'Share survey',
  'share.link': 'Survey link',
  'share.open': 'Open page',
  'share.qr': 'QR code',
  'share.downloadQr': 'Download QR code',
  'share.whatsapp': 'Send on WhatsApp',
  'share.draftNote': "This survey is a draft. Nobody can open the link until you publish it.",
  'share.closedNote': 'Responses are stopped. People opening the link will see that the survey is closed.',

  'results.summary': 'Summary',
  'results.individual': 'Responses',
  'results.total': 'Total responses',
  'results.last': 'Latest response',
  'results.first': 'First response',
  'results.timeline': 'Responses per day',
  'results.emptyTitle': 'No responses yet',
  'results.emptyBody': 'Share the survey link — results show up here as soon as the first response arrives.',
  'results.emptyDraft': 'Publish the survey, then share the link to start collecting responses.',
  'results.export': 'Export CSV',
  'results.answered': '{answered} of {total} answered',
  'results.average': 'Average',
  'results.min': 'Lowest',
  'results.max': 'Highest',
  'results.nps': 'Net Promoter Score (NPS)',
  'results.npsHint': 'Share of 9–10 answers minus share of 0–6 answers.',
  'results.latestAnswers': 'Latest answers',
  'results.showMore': 'Show more',
  'results.showLess': 'Show less',
  'results.noAnswers': 'No answers for this question.',
  'results.insights': 'AI summary',
  'results.insightsBody': 'Ask the assistant to read the results and summarise what matters.',
  'results.generateInsights': 'Summarise results',
  'results.regenerate': 'Refresh summary',
  'results.analyzing': 'Analysing responses…',
  'results.highlights': 'Key findings',
  'results.recommendations': 'Suggested next steps',
  'results.basedOn': 'Based on {n} responses. Check the numbers before making decisions.',
  'results.response': 'Response #{n}',
  'results.deleteResponse': 'Delete response',
  'results.deleteResponseBody': 'This response will be removed from the results permanently.',
  'results.deleteAll': 'Delete all responses',
  'results.deleteAllBody': '{n} responses will be deleted permanently. This cannot be undone.',
  'results.noAnswer': 'No answer',
  'results.prev': 'Previous',
  'results.next': 'Next',
  'results.pageOf': 'Page {page} of {pages}',
  'results.editSurvey': 'Edit questions',

  'form.required': 'Required',
  'form.submit': 'Submit',
  'form.submitting': 'Submitting…',
  'form.thanksTitle': 'Your answers are in',
  'form.thanksDefault': 'Thanks for taking part. We received your answers.',
  'form.already': "You've already responded to this survey from this device. Thank you.",
  'form.closedTitle': 'This survey is closed',
  'form.closedBody': 'It is no longer accepting responses.',
  'form.notFoundTitle': 'Survey not available',
  'form.notFoundBody': 'Check the link, or contact the person who sent it.',
  'form.choose': 'Choose…',
  'form.yourAnswer': 'Your answer',
  'form.madeWith': 'Made with Sada',
  'form.makeYours': 'Create your own survey',
  'form.fixErrors': 'Some answers need attention.',
  'form.selectAll': 'Select all that apply',
  'form.stars': '{n} of {max}',
  'form.progress': '{done} of {total} answered',
  'answer.REQUIRED': 'This question is required',
  'answer.UNKNOWN_OPTION': 'Pick one of the available options',
  'answer.OUT_OF_RANGE': 'The value is outside the allowed range',
  'answer.TOO_LONG': 'This answer is too long',
  'answer.EXPECTED_NUMBER': 'Enter a valid number',
  'answer.INVALID_DATE': 'Enter a valid date',
  'answer.EXPECTED_TEXT': 'Invalid answer',
  'answer.EXPECTED_LIST': 'Invalid answer',
  'error.SURVEY_CLOSED': 'This survey is no longer accepting responses.',
  'error.SURVEY_FULL': 'This survey has reached its response limit.',
  'error.EMPTY_RESPONSE': 'Answer at least one question.',
  'error.INVALID_ANSWERS': 'Some answers need attention.',

  'notFound.title': 'Page not found',
  'notFound.body': 'The link may have changed or the page was removed.',
  'notFound.home': 'Back to home',
}

const dictionaries: Record<Lang, Record<MessageKey, string>> = { ar, en }

const plurals: Record<string, Record<Lang, Plural>> = {
  responses: {
    ar: { zero: 'لا ردود', one: 'رد واحد', two: 'ردّان', few: '{n} ردود', many: '{n} ردًا', other: '{n} رد' },
    en: { one: '1 response', other: '{n} responses' },
  },
  questions: {
    ar: { zero: 'بلا أسئلة', one: 'سؤال واحد', two: 'سؤالان', few: '{n} أسئلة', many: '{n} سؤالًا', other: '{n} سؤال' },
    en: { one: '1 question', other: '{n} questions' },
  },
  surveys: {
    ar: { zero: 'لا استبيانات', one: 'استبيان واحد', two: 'استبيانان', few: '{n} استبيانات', many: '{n} استبيانًا', other: '{n} استبيان' },
    en: { one: '1 survey', other: '{n} surveys' },
  },
}

export type Vars = Record<string, string | number>

function interpolate(text: string, vars?: Vars) {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`))
}

export function translate(lang: Lang, key: MessageKey, vars?: Vars) {
  return interpolate(dictionaries[lang][key] ?? dictionaries.ar[key] ?? key, vars)
}

export function pluralize(lang: Lang, key: keyof typeof plurals, n: number) {
  const forms = plurals[key][lang]
  const category = new Intl.PluralRules(lang).select(n) as keyof Plural
  const template = forms[category] ?? forms.other
  return interpolate(template, { n: formatNumber(lang, n) })
}

export function formatNumber(lang: Lang, n: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en', { maximumFractionDigits }).format(n)
}

export function errorMessage(lang: Lang, error: unknown) {
  const code = (error as { code?: string })?.code
  const key = `error.${code}` as MessageKey
  if (code && key in dictionaries[lang]) return translate(lang, key)
  return translate(lang, 'error.generic')
}

export function locale(lang: Lang) {
  return lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB'
}

export function formatDate(lang: Lang, iso: string | null | undefined, withTime = true) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(locale(lang), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(iso))
}

export function relativeTime(lang: Lang, iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(locale(lang), { numeric: 'auto' })
  const abs = Math.abs(diff)
  if (abs < 60) return rtf.format(Math.round(diff), 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day')
  return formatDate(lang, iso, false)
}

// ---------------------------------------------------------------- context

interface I18n {
  lang: Lang
  dir: 'rtl' | 'ltr'
  setLang: (lang: Lang) => void
  t: (key: MessageKey, vars?: Vars) => string
  plural: (key: keyof typeof plurals, n: number) => string
  num: (n: number, digits?: number) => string
  err: (error: unknown) => string
}

const I18nContext = createContext<I18n | null>(null)
const LANG_KEY = 'sada:lang'

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY)
    if (stored === 'ar' || stored === 'en') return stored
  } catch {
    /* ignore */
  }
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'ar'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.title = translate(lang, 'appName')
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo<I18n>(
    () => ({
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      plural: (key, n) => pluralize(lang, key, n),
      num: (n, digits) => formatNumber(lang, n, digits),
      err: (error) => errorMessage(lang, error),
    }),
    [lang, setLang],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
