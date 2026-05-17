import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'downloaddash:language';
const RTL_LANGUAGES = new Set(['ar', 'he']);

export const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'id', name: 'Indonesian', nativeName: 'Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
];

const en = {
  'nav.home': 'Home',
  'nav.youtube': 'YouTube',
  'nav.publicYoutube': 'Public YouTube Media',
  'nav.guides': 'Guides',
  'nav.howItWorks': 'How It Works',
  'nav.blog': 'Blog',
  'nav.trust': 'Trust',
  'nav.trustCenter': 'Trust Center',
  'nav.dashboard': 'Dashboard',
  'nav.troubleshooting': 'Troubleshooting',
  'nav.resources': 'Resources',
  'nav.links': 'Links',
  'nav.androidApp': 'Android App',
  'nav.supportedPlatforms': 'Supported Platforms',
  'nav.responsibleUse': 'Responsible Use',
  'nav.helpCenter': 'Help Center',
  'nav.systemStatus': 'System Status',
  'nav.platformGuides': 'Platform Guides',
  'nav.updates': 'Updates',
  'nav.safetyCenter': 'Safety Center',
  'nav.dmca': 'DMCA',
  'nav.faq': 'FAQ',
  'nav.privacyPolicy': 'Privacy Policy',
  'nav.terms': 'Terms of Service',
  'nav.disclaimer': 'Disclaimer',
  'nav.contact': 'Contact',
  'nav.account': 'Account',
  'nav.login': 'Login',
  'nav.loginSignup': 'Login / Sign Up',
  'language.change': 'Change language',
  'language.selected': 'Selected language',
  'footer.description': 'A simple media utility for public links, personal use, and content you have permission to save.',
  'footer.rights': '© 2026 DownloadDash. All rights reserved.',
  'downloader.title': '{{platformName}} Downloader',
  'downloader.subtitle': 'Save supported public media links for personal, permitted use',
  'downloader.howItWorks': 'How It Works',
  'downloader.stepPaste': '1. Paste URL',
  'downloader.stepPasteDesc': 'Copy a public {{platformName}} link you are allowed to save',
  'downloader.stepProcess': '2. Process',
  'downloader.stepProcessDesc': 'We fetch the content securely',
  'downloader.stepDownload': '3. Download',
  'downloader.stepDownloadDesc': 'Choose an available format for lawful personal use',
  'downloader.trustLine': 'Public links only • No login required • 100% Secure',
  'downloader.placeholder': 'Paste your link here...',
  'downloader.process': 'Process',
  'downloader.processing': 'Processing…',
  'downloader.processingContent': 'Processing your {{platformName}} content...',
  'downloader.complete': '{{progress}}% complete',
  'downloader.downloading': 'Downloading...',
  'downloader.contentFound': 'Content found. Choose your download:',
  'downloader.preview': 'Preview Content',
  'downloader.content': '{{platformName}} Content',
  'downloader.ready': 'Ready',
  'downloader.hdDownload': 'HD Download',
  'downloader.bestQuality': 'Best quality • No watermark',
  'downloader.highestQuality': 'Highest quality',
  'downloader.sdDownload': 'SD Download',
  'downloader.standardQuality': 'Standard quality • No watermark',
  'downloader.balancedSize': 'Balanced size',
  'downloader.audioDownload': 'Audio / MP3',
  'downloader.audioOnlyDesc': 'Extract sound only',
  'downloader.audioOnly': 'Audio only',
  'downloader.photoDownload': 'Download Photo (HD)',
  'downloader.fullResolutionImage': 'Full resolution image',
  'downloader.fullResolution': 'Full resolution',
  'downloader.saveCollection': 'Save to Collection',
  'downloader.saveCollectionDesc': 'Save to your dashboard',
  'downloader.saved': 'Saved to your collection.',
  'downloader.platform': 'Platform',
  'downloader.type': 'Type',
  'downloader.duration': 'Duration',
  'downloader.fastDownloads': 'Fast Downloads',
  'downloader.fastDownloadsDesc': 'Fast processing',
  'downloader.formatOptions': 'Format Options',
  'downloader.formatOptionsDesc': 'HD, SD, audio, or image when available',
  'downloader.responsibleUse': 'Responsible Use',
  'downloader.responsibleUseDesc': 'Public links only; respect copyright',
  'downloader.faq': 'Frequently Asked Questions',
  'downloader.freeQuestion': 'Is it free to use?',
  'downloader.freeAnswer': 'Yes. DownloadDash focuses on public-link utilities and clear explanations, and ads remain limited while the site completes policy review.',
  'downloader.formatsQuestion': 'What formats are supported?',
  'downloader.formatsAnswer': 'We support HD/SD video downloads, audio extraction (MP3), and high-quality images.',
  'downloader.safeQuestion': 'Is it safe and secure?',
  'downloader.safeAnswer': 'We only process public links and provide clear privacy, terms, and contact information.',
  'downloader.copyrightQuestion': 'Can I download copyrighted content?',
  'downloader.copyrightAnswer': 'Only download content you own, have permission to use, or are legally allowed to save.',
  'errors.validUrl': 'Please enter a valid URL',
  'errors.invalidUrl': 'Invalid URL format',
  'errors.platformUrl': 'Please enter a valid {{platform}} URL',
  'errors.processFailed': 'Failed to process link',
  'errors.fetchFailed': 'Failed to fetch content. Please check the URL and try again.',
  'errors.downloadFailed': 'Download failed: {{message}}. Please try again.',
  'alerts.downloadStarted': 'Download started: {{filename}}',
  'alerts.mobileDownloadStarted': 'Download started on mobile: {{filename}}\nIf it opens instead of downloading, use your browser download option.',
};

const dictionaries = {
  en,
  es: {
    'nav.home': 'Inicio', 'nav.youtube': 'YouTube', 'nav.publicYoutube': 'Medios públicos de YouTube', 'nav.guides': 'Guías', 'nav.howItWorks': 'Cómo funciona', 'nav.blog': 'Blog', 'nav.trust': 'Confianza', 'nav.trustCenter': 'Centro de confianza', 'nav.dashboard': 'Panel', 'nav.troubleshooting': 'Solución de problemas', 'nav.resources': 'Recursos', 'nav.links': 'Enlaces', 'nav.androidApp': 'Aplicación Android', 'nav.supportedPlatforms': 'Plataformas compatibles', 'nav.responsibleUse': 'Uso responsable', 'nav.helpCenter': 'Centro de ayuda', 'nav.systemStatus': 'Estado del sistema', 'nav.platformGuides': 'Guías de plataformas', 'nav.updates': 'Actualizaciones', 'nav.safetyCenter': 'Centro de seguridad', 'nav.privacyPolicy': 'Política de privacidad', 'nav.terms': 'Términos de servicio', 'nav.disclaimer': 'Aviso legal', 'nav.contact': 'Contacto', 'nav.account': 'Cuenta', 'nav.login': 'Iniciar sesión', 'nav.loginSignup': 'Iniciar sesión / Registrarse', 'language.change': 'Cambiar idioma', 'footer.description': 'Una utilidad sencilla para enlaces públicos, uso personal y contenido que tienes permiso para guardar.', 'footer.rights': '© 2026 DownloadDash. Todos los derechos reservados.', 'downloader.title': 'Descargador de {{platformName}}', 'downloader.subtitle': 'Guarda enlaces de medios públicos compatibles para uso personal permitido', 'downloader.howItWorks': 'Cómo funciona', 'downloader.stepPaste': '1. Pega la URL', 'downloader.stepPasteDesc': 'Copia un enlace público de {{platformName}} que puedas guardar', 'downloader.stepProcess': '2. Procesar', 'downloader.stepProcessDesc': 'Obtenemos el contenido de forma segura', 'downloader.stepDownload': '3. Descargar', 'downloader.stepDownloadDesc': 'Elige un formato disponible para uso personal legal', 'downloader.trustLine': 'Solo enlaces públicos • Sin inicio de sesión • 100% seguro', 'downloader.placeholder': 'Pega tu enlace aquí...', 'downloader.process': 'Procesar', 'downloader.processing': 'Procesando…', 'downloader.processingContent': 'Procesando tu contenido de {{platformName}}...', 'downloader.downloading': 'Descargando...', 'downloader.contentFound': 'Contenido encontrado. Elige tu descarga:', 'downloader.preview': 'Vista previa', 'downloader.ready': 'Listo', 'downloader.hdDownload': 'Descarga HD', 'downloader.sdDownload': 'Descarga SD', 'downloader.audioDownload': 'Audio / MP3', 'downloader.photoDownload': 'Descargar foto (HD)', 'downloader.saveCollection': 'Guardar en colección', 'downloader.faq': 'Preguntas frecuentes', 'errors.validUrl': 'Introduce una URL válida', 'errors.invalidUrl': 'Formato de URL no válido', 'errors.platformUrl': 'Introduce una URL válida de {{platform}}', 'errors.processFailed': 'No se pudo procesar el enlace', 'errors.fetchFailed': 'No se pudo obtener el contenido. Revisa la URL e inténtalo de nuevo.', 'alerts.downloadStarted': 'Descarga iniciada: {{filename}}',
  },
  fr: { 'nav.home': 'Accueil', 'nav.guides': 'Guides', 'nav.howItWorks': 'Fonctionnement', 'nav.blog': 'Blog', 'nav.trust': 'Confiance', 'nav.dashboard': 'Tableau de bord', 'nav.resources': 'Ressources', 'nav.links': 'Liens', 'nav.login': 'Connexion', 'nav.loginSignup': 'Connexion / Inscription', 'nav.account': 'Compte', 'language.change': 'Changer de langue', 'footer.description': 'Un outil simple pour les liens publics, un usage personnel et les contenus que vous avez le droit d’enregistrer.', 'downloader.title': 'Téléchargeur {{platformName}}', 'downloader.subtitle': 'Enregistrez des liens publics compatibles pour un usage personnel autorisé', 'downloader.howItWorks': 'Fonctionnement', 'downloader.stepPaste': '1. Collez l’URL', 'downloader.stepProcess': '2. Traiter', 'downloader.stepDownload': '3. Télécharger', 'downloader.process': 'Traiter', 'downloader.processing': 'Traitement…', 'downloader.downloading': 'Téléchargement...', 'downloader.contentFound': 'Contenu trouvé. Choisissez votre téléchargement :', 'downloader.preview': 'Aperçu', 'downloader.ready': 'Prêt', 'errors.validUrl': 'Veuillez saisir une URL valide', 'errors.invalidUrl': 'Format d’URL non valide', 'errors.platformUrl': 'Veuillez saisir une URL {{platform}} valide' },
  de: { 'nav.home': 'Startseite', 'nav.guides': 'Anleitungen', 'nav.howItWorks': 'So funktioniert es', 'nav.blog': 'Blog', 'nav.trust': 'Vertrauen', 'nav.dashboard': 'Dashboard', 'nav.resources': 'Ressourcen', 'nav.links': 'Links', 'nav.login': 'Anmelden', 'nav.account': 'Konto', 'language.change': 'Sprache ändern', 'footer.description': 'Ein einfaches Medienwerkzeug für öffentliche Links, private Nutzung und Inhalte, die du speichern darfst.', 'downloader.title': '{{platformName}} Downloader', 'downloader.subtitle': 'Speichere unterstützte öffentliche Medienlinks für erlaubte private Nutzung', 'downloader.howItWorks': 'So funktioniert es', 'downloader.stepPaste': '1. URL einfügen', 'downloader.stepProcess': '2. Verarbeiten', 'downloader.stepDownload': '3. Herunterladen', 'downloader.process': 'Verarbeiten', 'downloader.processing': 'Wird verarbeitet…', 'downloader.downloading': 'Wird heruntergeladen...', 'downloader.contentFound': 'Inhalt gefunden. Wähle deinen Download:', 'downloader.preview': 'Vorschau', 'downloader.ready': 'Bereit', 'errors.validUrl': 'Bitte gib eine gültige URL ein', 'errors.invalidUrl': 'Ungültiges URL-Format', 'errors.platformUrl': 'Bitte gib eine gültige {{platform}}-URL ein' },
  it: { 'nav.home': 'Home', 'nav.guides': 'Guide', 'nav.howItWorks': 'Come funziona', 'nav.blog': 'Blog', 'nav.trust': 'Fiducia', 'nav.dashboard': 'Dashboard', 'nav.resources': 'Risorse', 'nav.links': 'Link', 'nav.login': 'Accedi', 'nav.account': 'Account', 'language.change': 'Cambia lingua', 'downloader.title': 'Downloader {{platformName}}', 'downloader.subtitle': 'Salva link multimediali pubblici supportati per uso personale consentito', 'downloader.howItWorks': 'Come funziona', 'downloader.process': 'Elabora', 'downloader.processing': 'Elaborazione…', 'downloader.downloading': 'Download in corso...', 'downloader.contentFound': 'Contenuto trovato. Scegli il download:', 'downloader.preview': 'Anteprima', 'downloader.ready': 'Pronto', 'errors.validUrl': 'Inserisci un URL valido' },
  pt: { 'nav.home': 'Início', 'nav.guides': 'Guias', 'nav.howItWorks': 'Como funciona', 'nav.blog': 'Blog', 'nav.trust': 'Confiança', 'nav.dashboard': 'Painel', 'nav.resources': 'Recursos', 'nav.links': 'Links', 'nav.login': 'Entrar', 'nav.account': 'Conta', 'language.change': 'Alterar idioma', 'downloader.title': 'Baixador de {{platformName}}', 'downloader.subtitle': 'Salve links públicos compatíveis para uso pessoal permitido', 'downloader.howItWorks': 'Como funciona', 'downloader.process': 'Processar', 'downloader.processing': 'Processando…', 'downloader.downloading': 'Baixando...', 'downloader.contentFound': 'Conteúdo encontrado. Escolha seu download:', 'downloader.preview': 'Pré-visualizar', 'downloader.ready': 'Pronto', 'errors.validUrl': 'Digite uma URL válida' },
  ar: { 'nav.home': 'الرئيسية', 'nav.guides': 'الأدلة', 'nav.howItWorks': 'كيف يعمل', 'nav.blog': 'المدونة', 'nav.trust': 'الثقة', 'nav.dashboard': 'لوحة التحكم', 'nav.resources': 'الموارد', 'nav.links': 'الروابط', 'nav.login': 'تسجيل الدخول', 'nav.account': 'الحساب', 'language.change': 'تغيير اللغة', 'downloader.title': 'منزّل {{platformName}}', 'downloader.subtitle': 'احفظ روابط الوسائط العامة المدعومة للاستخدام الشخصي المسموح', 'downloader.howItWorks': 'كيف يعمل', 'downloader.process': 'معالجة', 'downloader.processing': 'جار المعالجة…', 'downloader.downloading': 'جار التنزيل...', 'downloader.contentFound': 'تم العثور على المحتوى. اختر التنزيل:', 'downloader.preview': 'معاينة', 'downloader.ready': 'جاهز', 'errors.validUrl': 'يرجى إدخال رابط صالح' },
  hi: { 'nav.home': 'होम', 'nav.guides': 'गाइड', 'nav.howItWorks': 'यह कैसे काम करता है', 'nav.blog': 'ब्लॉग', 'nav.trust': 'भरोसा', 'nav.dashboard': 'डैशबोर्ड', 'nav.resources': 'संसाधन', 'nav.links': 'लिंक', 'nav.login': 'लॉग इन', 'nav.account': 'खाता', 'language.change': 'भाषा बदलें', 'downloader.title': '{{platformName}} डाउनलोडर', 'downloader.subtitle': 'अनुमत निजी उपयोग के लिए समर्थित सार्वजनिक मीडिया लिंक सहेजें', 'downloader.howItWorks': 'यह कैसे काम करता है', 'downloader.process': 'प्रोसेस करें', 'downloader.processing': 'प्रोसेस हो रहा है…', 'downloader.downloading': 'डाउनलोड हो रहा है...', 'downloader.contentFound': 'कंटेंट मिल गया। डाउनलोड चुनें:', 'downloader.preview': 'प्रीव्यू', 'downloader.ready': 'तैयार', 'errors.validUrl': 'कृपया मान्य URL दर्ज करें' },
  zh: { 'nav.home': '首页', 'nav.guides': '指南', 'nav.howItWorks': '工作方式', 'nav.blog': '博客', 'nav.trust': '信任', 'nav.dashboard': '仪表板', 'nav.resources': '资源', 'nav.links': '链接', 'nav.login': '登录', 'nav.account': '账户', 'language.change': '更改语言', 'downloader.title': '{{platformName}} 下载器', 'downloader.subtitle': '保存支持的公开视频链接，用于允许的个人用途', 'downloader.howItWorks': '工作方式', 'downloader.process': '处理', 'downloader.processing': '处理中…', 'downloader.downloading': '正在下载...', 'downloader.contentFound': '已找到内容。请选择下载：', 'downloader.preview': '预览内容', 'downloader.ready': '就绪', 'errors.validUrl': '请输入有效的网址' },
  ja: { 'nav.home': 'ホーム', 'nav.guides': 'ガイド', 'nav.howItWorks': '仕組み', 'nav.blog': 'ブログ', 'nav.trust': '信頼', 'nav.dashboard': 'ダッシュボード', 'nav.resources': 'リソース', 'nav.links': 'リンク', 'nav.login': 'ログイン', 'nav.account': 'アカウント', 'language.change': '言語を変更', 'downloader.title': '{{platformName}} ダウンローダー', 'downloader.subtitle': '許可された個人利用のために対応する公開メディアリンクを保存', 'downloader.howItWorks': '仕組み', 'downloader.process': '処理', 'downloader.processing': '処理中…', 'downloader.downloading': 'ダウンロード中...', 'downloader.contentFound': 'コンテンツが見つかりました。ダウンロードを選択してください:', 'downloader.preview': 'プレビュー', 'downloader.ready': '準備完了', 'errors.validUrl': '有効なURLを入力してください' },
  ko: { 'nav.home': '홈', 'nav.guides': '가이드', 'nav.howItWorks': '작동 방식', 'nav.blog': '블로그', 'nav.trust': '신뢰', 'nav.dashboard': '대시보드', 'nav.resources': '리소스', 'nav.links': '링크', 'nav.login': '로그인', 'nav.account': '계정', 'language.change': '언어 변경', 'downloader.title': '{{platformName}} 다운로더', 'downloader.subtitle': '허용된 개인 사용을 위해 지원되는 공개 미디어 링크 저장', 'downloader.howItWorks': '작동 방식', 'downloader.process': '처리', 'downloader.processing': '처리 중…', 'downloader.downloading': '다운로드 중...', 'downloader.contentFound': '콘텐츠를 찾았습니다. 다운로드를 선택하세요:', 'downloader.preview': '미리보기', 'downloader.ready': '준비됨', 'errors.validUrl': '올바른 URL을 입력하세요' },
};

Object.assign(dictionaries, {
  ru: { 'nav.home': 'Главная', 'nav.guides': 'Руководства', 'nav.howItWorks': 'Как это работает', 'nav.blog': 'Блог', 'nav.trust': 'Доверие', 'nav.dashboard': 'Панель', 'nav.resources': 'Ресурсы', 'nav.links': 'Ссылки', 'nav.login': 'Войти', 'nav.account': 'Аккаунт', 'language.change': 'Изменить язык', 'downloader.title': 'Загрузчик {{platformName}}', 'downloader.subtitle': 'Сохраняйте поддерживаемые публичные медиа для разрешенного личного использования', 'downloader.howItWorks': 'Как это работает', 'downloader.process': 'Обработать', 'downloader.processing': 'Обработка…', 'downloader.downloading': 'Загрузка...', 'downloader.contentFound': 'Контент найден. Выберите загрузку:', 'downloader.preview': 'Предпросмотр', 'downloader.ready': 'Готово', 'errors.validUrl': 'Введите корректный URL' },
  bn: { 'nav.home': 'হোম', 'nav.guides': 'গাইড', 'nav.howItWorks': 'কীভাবে কাজ করে', 'nav.blog': 'ব্লগ', 'nav.trust': 'বিশ্বাস', 'nav.dashboard': 'ড্যাশবোর্ড', 'nav.resources': 'রিসোর্স', 'nav.links': 'লিংক', 'nav.login': 'লগ ইন', 'nav.account': 'অ্যাকাউন্ট', 'language.change': 'ভাষা বদলান', 'downloader.title': '{{platformName}} ডাউনলোডার', 'downloader.subtitle': 'অনুমোদিত ব্যক্তিগত ব্যবহারের জন্য সমর্থিত পাবলিক মিডিয়া লিংক সংরক্ষণ করুন', 'downloader.howItWorks': 'কীভাবে কাজ করে', 'downloader.process': 'প্রসেস করুন', 'downloader.processing': 'প্রসেস হচ্ছে…', 'downloader.downloading': 'ডাউনলোড হচ্ছে...', 'downloader.contentFound': 'কনটেন্ট পাওয়া গেছে। ডাউনলোড বেছে নিন:', 'downloader.preview': 'প্রিভিউ', 'downloader.ready': 'প্রস্তুত', 'errors.validUrl': 'একটি বৈধ URL দিন' },
  tr: { 'nav.home': 'Ana sayfa', 'nav.guides': 'Rehberler', 'nav.howItWorks': 'Nasıl çalışır', 'nav.blog': 'Blog', 'nav.trust': 'Güven', 'nav.dashboard': 'Panel', 'nav.resources': 'Kaynaklar', 'nav.links': 'Bağlantılar', 'nav.login': 'Giriş yap', 'nav.account': 'Hesap', 'language.change': 'Dili değiştir', 'downloader.title': '{{platformName}} İndirici', 'downloader.subtitle': 'İzinli kişisel kullanım için desteklenen herkese açık medya bağlantılarını kaydedin', 'downloader.howItWorks': 'Nasıl çalışır', 'downloader.process': 'İşle', 'downloader.processing': 'İşleniyor…', 'downloader.downloading': 'İndiriliyor...', 'downloader.contentFound': 'İçerik bulundu. İndirmeyi seçin:', 'downloader.preview': 'Önizleme', 'downloader.ready': 'Hazır', 'errors.validUrl': 'Geçerli bir URL girin' },
  vi: { 'nav.home': 'Trang chủ', 'nav.guides': 'Hướng dẫn', 'nav.howItWorks': 'Cách hoạt động', 'nav.blog': 'Blog', 'nav.trust': 'Tin cậy', 'nav.dashboard': 'Bảng điều khiển', 'nav.resources': 'Tài nguyên', 'nav.links': 'Liên kết', 'nav.login': 'Đăng nhập', 'nav.account': 'Tài khoản', 'language.change': 'Đổi ngôn ngữ', 'downloader.title': 'Trình tải {{platformName}}', 'downloader.subtitle': 'Lưu liên kết phương tiện công khai được hỗ trợ cho mục đích cá nhân được phép', 'downloader.howItWorks': 'Cách hoạt động', 'downloader.process': 'Xử lý', 'downloader.processing': 'Đang xử lý…', 'downloader.downloading': 'Đang tải xuống...', 'downloader.contentFound': 'Đã tìm thấy nội dung. Chọn bản tải xuống:', 'downloader.preview': 'Xem trước', 'downloader.ready': 'Sẵn sàng', 'errors.validUrl': 'Vui lòng nhập URL hợp lệ' },
  th: { 'nav.home': 'หน้าแรก', 'nav.guides': 'คู่มือ', 'nav.howItWorks': 'วิธีทำงาน', 'nav.blog': 'บล็อก', 'nav.trust': 'ความน่าเชื่อถือ', 'nav.dashboard': 'แดชบอร์ด', 'nav.resources': 'ทรัพยากร', 'nav.links': 'ลิงก์', 'nav.login': 'เข้าสู่ระบบ', 'nav.account': 'บัญชี', 'language.change': 'เปลี่ยนภาษา', 'downloader.title': 'ตัวดาวน์โหลด {{platformName}}', 'downloader.subtitle': 'บันทึกลิงก์สื่อสาธารณะที่รองรับเพื่อการใช้งานส่วนตัวที่ได้รับอนุญาต', 'downloader.howItWorks': 'วิธีทำงาน', 'downloader.process': 'ประมวลผล', 'downloader.processing': 'กำลังประมวลผล…', 'downloader.downloading': 'กำลังดาวน์โหลด...', 'downloader.contentFound': 'พบเนื้อหาแล้ว เลือกการดาวน์โหลด:', 'downloader.preview': 'ดูตัวอย่าง', 'downloader.ready': 'พร้อม', 'errors.validUrl': 'กรุณาใส่ URL ที่ถูกต้อง' },
  pl: { 'nav.home': 'Strona główna', 'nav.guides': 'Poradniki', 'nav.howItWorks': 'Jak to działa', 'nav.blog': 'Blog', 'nav.trust': 'Zaufanie', 'nav.dashboard': 'Panel', 'nav.resources': 'Zasoby', 'nav.links': 'Linki', 'nav.login': 'Zaloguj', 'nav.account': 'Konto', 'language.change': 'Zmień język', 'downloader.title': 'Downloader {{platformName}}', 'downloader.subtitle': 'Zapisuj obsługiwane publiczne linki multimedialne do dozwolonego użytku osobistego', 'downloader.howItWorks': 'Jak to działa', 'downloader.process': 'Przetwórz', 'downloader.processing': 'Przetwarzanie…', 'downloader.downloading': 'Pobieranie...', 'downloader.contentFound': 'Znaleziono treść. Wybierz pobieranie:', 'downloader.preview': 'Podgląd', 'downloader.ready': 'Gotowe', 'errors.validUrl': 'Wpisz poprawny URL' },
  nl: { 'nav.home': 'Home', 'nav.guides': 'Gidsen', 'nav.howItWorks': 'Hoe het werkt', 'nav.blog': 'Blog', 'nav.trust': 'Vertrouwen', 'nav.dashboard': 'Dashboard', 'nav.resources': 'Bronnen', 'nav.links': 'Links', 'nav.login': 'Inloggen', 'nav.account': 'Account', 'language.change': 'Taal wijzigen', 'downloader.title': '{{platformName}} downloader', 'downloader.subtitle': 'Bewaar ondersteunde openbare medialinks voor toegestaan persoonlijk gebruik', 'downloader.howItWorks': 'Hoe het werkt', 'downloader.process': 'Verwerken', 'downloader.processing': 'Verwerken…', 'downloader.downloading': 'Downloaden...', 'downloader.contentFound': 'Content gevonden. Kies je download:', 'downloader.preview': 'Voorbeeld', 'downloader.ready': 'Klaar', 'errors.validUrl': 'Voer een geldige URL in' },
  sv: { 'nav.home': 'Hem', 'nav.guides': 'Guider', 'nav.howItWorks': 'Så fungerar det', 'nav.blog': 'Blogg', 'nav.trust': 'Förtroende', 'nav.dashboard': 'Panel', 'nav.resources': 'Resurser', 'nav.links': 'Länkar', 'nav.login': 'Logga in', 'nav.account': 'Konto', 'language.change': 'Byt språk', 'downloader.title': '{{platformName}}-nedladdare', 'downloader.subtitle': 'Spara stödda offentliga medielänkar för tillåten personlig användning', 'downloader.howItWorks': 'Så fungerar det', 'downloader.process': 'Bearbeta', 'downloader.processing': 'Bearbetar…', 'downloader.downloading': 'Laddar ner...', 'downloader.contentFound': 'Innehåll hittades. Välj nedladdning:', 'downloader.preview': 'Förhandsvisa', 'downloader.ready': 'Klar', 'errors.validUrl': 'Ange en giltig URL' },
  id: { 'nav.home': 'Beranda', 'nav.guides': 'Panduan', 'nav.howItWorks': 'Cara kerja', 'nav.blog': 'Blog', 'nav.trust': 'Kepercayaan', 'nav.dashboard': 'Dasbor', 'nav.resources': 'Sumber daya', 'nav.links': 'Tautan', 'nav.login': 'Masuk', 'nav.account': 'Akun', 'language.change': 'Ubah bahasa', 'downloader.title': 'Pengunduh {{platformName}}', 'downloader.subtitle': 'Simpan tautan media publik yang didukung untuk penggunaan pribadi yang diizinkan', 'downloader.howItWorks': 'Cara kerja', 'downloader.process': 'Proses', 'downloader.processing': 'Memproses…', 'downloader.downloading': 'Mengunduh...', 'downloader.contentFound': 'Konten ditemukan. Pilih unduhan:', 'downloader.preview': 'Pratinjau', 'downloader.ready': 'Siap', 'errors.validUrl': 'Masukkan URL yang valid' },
  ms: { 'nav.home': 'Utama', 'nav.guides': 'Panduan', 'nav.howItWorks': 'Cara berfungsi', 'nav.blog': 'Blog', 'nav.trust': 'Kepercayaan', 'nav.dashboard': 'Papan pemuka', 'nav.resources': 'Sumber', 'nav.links': 'Pautan', 'nav.login': 'Log masuk', 'nav.account': 'Akaun', 'language.change': 'Tukar bahasa', 'downloader.title': 'Pemuat turun {{platformName}}', 'downloader.subtitle': 'Simpan pautan media awam yang disokong untuk penggunaan peribadi yang dibenarkan', 'downloader.howItWorks': 'Cara berfungsi', 'downloader.process': 'Proses', 'downloader.processing': 'Memproses…', 'downloader.downloading': 'Memuat turun...', 'downloader.contentFound': 'Kandungan ditemui. Pilih muat turun:', 'downloader.preview': 'Pratonton', 'downloader.ready': 'Sedia', 'errors.validUrl': 'Masukkan URL yang sah' },
  fil: { 'nav.home': 'Home', 'nav.guides': 'Mga gabay', 'nav.howItWorks': 'Paano gumagana', 'nav.blog': 'Blog', 'nav.trust': 'Tiwala', 'nav.dashboard': 'Dashboard', 'nav.resources': 'Resources', 'nav.links': 'Mga link', 'nav.login': 'Mag-log in', 'nav.account': 'Account', 'language.change': 'Palitan ang wika', 'downloader.title': '{{platformName}} Downloader', 'downloader.subtitle': 'Mag-save ng suportadong pampublikong media link para sa pinapayagang personal na gamit', 'downloader.howItWorks': 'Paano gumagana', 'downloader.process': 'I-process', 'downloader.processing': 'Pinoproseso…', 'downloader.downloading': 'Nagda-download...', 'downloader.contentFound': 'Nahanap ang content. Piliin ang download:', 'downloader.preview': 'Preview', 'downloader.ready': 'Handa', 'errors.validUrl': 'Maglagay ng valid na URL' },
  uk: { 'nav.home': 'Головна', 'nav.guides': 'Посібники', 'nav.howItWorks': 'Як це працює', 'nav.blog': 'Блог', 'nav.trust': 'Довіра', 'nav.dashboard': 'Панель', 'nav.resources': 'Ресурси', 'nav.links': 'Посилання', 'nav.login': 'Увійти', 'nav.account': 'Акаунт', 'language.change': 'Змінити мову', 'downloader.title': 'Завантажувач {{platformName}}', 'downloader.subtitle': 'Зберігайте підтримувані публічні медіапосилання для дозволеного особистого використання', 'downloader.howItWorks': 'Як це працює', 'downloader.process': 'Обробити', 'downloader.processing': 'Обробка…', 'downloader.downloading': 'Завантаження...', 'downloader.contentFound': 'Контент знайдено. Виберіть завантаження:', 'downloader.preview': 'Перегляд', 'downloader.ready': 'Готово', 'errors.validUrl': 'Введіть коректний URL' },
  he: { 'nav.home': 'בית', 'nav.guides': 'מדריכים', 'nav.howItWorks': 'איך זה עובד', 'nav.blog': 'בלוג', 'nav.trust': 'אמון', 'nav.dashboard': 'לוח בקרה', 'nav.resources': 'משאבים', 'nav.links': 'קישורים', 'nav.login': 'התחברות', 'nav.account': 'חשבון', 'language.change': 'שנה שפה', 'downloader.title': 'מוריד {{platformName}}', 'downloader.subtitle': 'שמור קישורי מדיה ציבוריים נתמכים לשימוש אישי מותר', 'downloader.howItWorks': 'איך זה עובד', 'downloader.process': 'עבד', 'downloader.processing': 'מעבד…', 'downloader.downloading': 'מוריד...', 'downloader.contentFound': 'נמצא תוכן. בחר הורדה:', 'downloader.preview': 'תצוגה מקדימה', 'downloader.ready': 'מוכן', 'errors.validUrl': 'הזן כתובת URL תקינה' },
  sw: { 'nav.home': 'Nyumbani', 'nav.guides': 'Miongozo', 'nav.howItWorks': 'Inavyofanya kazi', 'nav.blog': 'Blogu', 'nav.trust': 'Uaminifu', 'nav.dashboard': 'Dashibodi', 'nav.resources': 'Rasilimali', 'nav.links': 'Viungo', 'nav.login': 'Ingia', 'nav.account': 'Akaunti', 'language.change': 'Badilisha lugha', 'downloader.title': 'Kipakua {{platformName}}', 'downloader.subtitle': 'Hifadhi viungo vya media vya umma vinavyotumika kwa matumizi binafsi yaliyoruhusiwa', 'downloader.howItWorks': 'Inavyofanya kazi', 'downloader.process': 'Chakata', 'downloader.processing': 'Inachakata…', 'downloader.downloading': 'Inapakua...', 'downloader.contentFound': 'Maudhui yamepatikana. Chagua upakuaji:', 'downloader.preview': 'Hakiki', 'downloader.ready': 'Tayari', 'errors.validUrl': 'Weka URL halali' },
});

const I18nContext = createContext(null);

const getInitialLanguage = () => {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (languages.some((language) => language.code === saved)) return saved;
  const browserLanguage = window.navigator.language?.split('-')[0];
  return languages.some((language) => language.code === browserLanguage) ? browserLanguage : 'en';
};

const interpolate = (value, params = {}) =>
  value.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? '');

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    languages,
    isRtl: RTL_LANGUAGES.has(language),
    t(key, params) {
      const value = dictionaries[language]?.[key] ?? dictionaries.en[key] ?? key;
      return interpolate(value, params);
    },
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return context;
}
