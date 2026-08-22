// ============================================
// APP.TSX - Main Router
// ============================================
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { QuestionBankPage } from '@/pages/QuestionBankPage';
import { QuestionFormPage } from '@/pages/QuestionFormPage';
import { QuizSetupPage } from '@/pages/QuizSetupPage';
import { QuizSessionPage } from '@/pages/QuizSessionPage';
import { QuizResultPage } from '@/pages/QuizResultPage';
import { SubjectManagementPage } from '@/pages/SubjectManagementPage';
import { ImportPage } from '@/pages/ImportPage';
import {
  HistoryPage, QuizReviewPage, SettingsPage, BackupPage,
  StatisticsPage, BookmarksPage, ExportPage,
} from '@/pages/OtherPages';
import { ExamListPage } from '@/pages/exam/ExamListPage';
import { ExamBuilderPage } from '@/pages/exam/ExamBuilderPage';
import { AutoExamPage } from '@/pages/exam/AutoExamPage';
import { useAppStore } from '@/stores/app-store';
import { useSubjectStore } from '@/stores/subject-store';
import { useQuestionStore } from '@/stores/question-store';
import { useExamStore } from '@/stores/exam-store';
import { migrationService } from '@/services/migration-service';

// Flashcard
import { FlashcardHomePage } from '@/pages/flashcard/FlashcardHomePage';
import { FlashcardDeckPage } from '@/pages/flashcard/FlashcardDeckPage';
import { FlashcardSessionPage } from '@/pages/flashcard/FlashcardSessionPage';
import { FlashcardEditorPage } from '@/pages/flashcard/FlashcardEditorPage';
import { FlashcardQuickCreatePage } from '@/pages/flashcard/FlashcardQuickCreatePage';

import { authService } from '@/services/auth-service';
import { AuthLockPage } from '@/pages/AuthLockPage';
import { LicenseActivationPage } from '@/pages/LicenseActivationPage';
import { useLicenseStore } from '@/stores/license-store';
import { UserGuidePage } from '@/pages/UserGuidePage';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ExamPrep Studio ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-white">
          <div className="max-w-lg w-full p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold">Đã xảy ra sự cố giao diện</h2>
            <div className="text-xs text-slate-400 leading-relaxed font-mono bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-left overflow-auto max-h-48 space-y-2">
              <p className="text-rose-400 font-semibold">{this.state.error?.message || 'Lỗi không xác định'}</p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[10px] text-slate-500 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.href = '#/';
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm transition-all cursor-pointer"
              >
                Về Trang Chủ
              </button>
              <button
                onClick={() => window.location.reload()}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-medium text-sm text-slate-300 border border-slate-700 transition-all cursor-pointer"
              >
                Tải lại
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  const { initialize, isInitialized } = useAppStore();
  const { loadAll } = useSubjectStore();
  const { loadQuestions } = useQuestionStore();
  const { checkUnfinishedAttempt } = useExamStore();
  const { isLicensed, isLoading: isLicenseLoading, checkLicense } = useLicenseStore();
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(authService.isAuthenticated());

  React.useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          checkLicense(),
          migrationService.runMigrationIfNeeded(),
        ]);
        await Promise.all([
          initialize(),
          loadAll(),
          loadQuestions(),
          checkUnfinishedAttempt(),
        ]);
      } catch (err) {
        console.error('App init error:', err);
      }
    };
    init();

    // Global F11 Fullscreen toggle listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isInitialized || isLicenseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 animate-bounce-in">
            E
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))] animate-pulse-slow">Đang khởi tạo ExamPrep Studio...</p>
        </div>
      </div>
    );
  }

  // 1. First Gate: Offline Cryptographic License Check
  if (!isLicensed) {
    return <LicenseActivationPage onActivated={() => checkLicense()} />;
  }

  // 2. Second Gate: Optional Master Password / PIN Lock
  if (!isAuthenticated) {
    return <AuthLockPage onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <ErrorBoundary>
      <Routes>
      {/* Quiz Session - Full screen, no layout */}
      <Route path="/quiz/session" element={<QuizSessionPage />} />

      {/* App Shell Layout */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />

        {/* Question Bank */}
        <Route path="/questions" element={<QuestionBankPage />} />
        <Route path="/questions/new" element={<QuestionFormPage />} />
        <Route path="/questions/:id/edit" element={<QuestionFormPage />} />

        {/* Subjects */}
        <Route path="/subjects" element={<SubjectManagementPage />} />

        {/* Exams */}
        <Route path="/exams" element={<ExamListPage />} />
        <Route path="/exams/new" element={<ExamBuilderPage />} />
        <Route path="/exams/auto" element={<AutoExamPage />} />

        {/* Quiz */}
        <Route path="/quiz/setup" element={<QuizSetupPage />} />
        <Route path="/quiz/result/:attemptId" element={<QuizResultPage />} />
        <Route path="/quiz/review/:attemptId" element={<QuizReviewPage />} />

        {/* Other */}
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/guide" element={<UserGuidePage />} />
        
        {/* Flashcards */}
        <Route path="/flashcards" element={<FlashcardHomePage />} />
        <Route path="/flashcards/deck/:id" element={<FlashcardDeckPage />} />
        <Route path="/flashcards/session/:deckId?" element={<FlashcardSessionPage />} />
        <Route path="/flashcards/new" element={<FlashcardEditorPage />} />
        <Route path="/flashcards/quick-create" element={<FlashcardQuickCreatePage />} />
      </Route>
    </Routes>
    </ErrorBoundary>
  );
};

export default App;
