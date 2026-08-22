// ============================================
// USER PROFILE STORE - ExamPrep Studio
// ============================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'student' | 'teacher' | 'self_learner';

export interface UserProfile {
  fullName: string; // Họ và tên chính chủ trích xuất từ License Key (Khóa bảo mật)
  nickname: string; // Biệt danh / Tên gọi thân mật trong app
  email: string;
  role: UserRole;
  avatarColor: string; // Preset gradient color
  studyGoal?: string;
  hasCompletedOnboarding: boolean;
  updatedAt: string;
}

interface UserProfileState {
  profile: UserProfile;
  setProfile: (profile: Partial<UserProfile>) => void;
  initFromLicense: (fullName: string, email?: string) => void;
  setNickname: (nickname: string) => void;
  setRole: (role: UserRole) => void;
  setAvatarColor: (color: string) => void;
  completeOnboarding: (nickname: string, role: UserRole, avatarColor: string, studyGoal?: string) => void;
  getDisplayName: () => string;
}

const DEFAULT_PROFILE: UserProfile = {
  fullName: 'Người học ExamPrep',
  nickname: 'Học viên',
  email: '',
  role: 'student',
  avatarColor: 'from-blue-500 to-indigo-600',
  studyGoal: 'Ôn luyện thi & Nâng cao kiến thức',
  hasCompletedOnboarding: false,
  updatedAt: new Date().toISOString(),
};

export const AVATAR_GRADIENTS = [
  { id: 'blue-indigo', label: 'Xanh Lam', value: 'from-blue-500 to-indigo-600', text: 'text-white' },
  { id: 'emerald-teal', label: 'Ngọc Lục Bảo', value: 'from-emerald-500 to-teal-600', text: 'text-white' },
  { id: 'purple-pink', label: 'Tím Hồng', value: 'from-purple-500 to-pink-600', text: 'text-white' },
  { id: 'amber-orange', label: 'Cam Hổ Phách', value: 'from-amber-500 to-orange-600', text: 'text-white' },
  { id: 'rose-red', label: 'Đỏ Hoa Hồng', value: 'from-rose-500 to-red-600', text: 'text-white' },
  { id: 'cyan-blue', label: 'Cyan Biển Sâu', value: 'from-cyan-500 to-blue-600', text: 'text-white' },
];

export const ROLE_LABELS: Record<UserRole, { label: string; icon: string; desc: string }> = {
  student: { label: 'Học sinh / Sinh viên', icon: '🎓', desc: 'Tối ưu ôn thi trắc nghiệm, luyện đề & Flashcard' },
  teacher: { label: 'Giáo viên / Giảng viên', icon: '👨‍🏫', desc: 'Tối ưu soạn ngân hàng câu hỏi & quản lý đề thi' },
  self_learner: { label: 'Người tự học / Đi làm', icon: '💼', desc: 'Tự do nâng cao kiến thức & theo dõi tiến độ' },
};

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,

      setProfile: (updates) =>
        set((state) => ({
          profile: {
            ...state.profile,
            ...updates,
            updatedAt: new Date().toISOString(),
          },
        })),

      initFromLicense: (fullName, email = '') => {
        const trimmedName = fullName?.trim() || 'Người học ExamPrep';
        set((state) => {
          // Nếu người dùng chưa từng đặt biệt danh thì lấy từ cuối cùng của tên làm biệt danh mặc định
          const parts = trimmedName.split(' ');
          const defaultNickname = parts[parts.length - 1] || trimmedName;

          return {
            profile: {
              ...state.profile,
              fullName: trimmedName,
              nickname: state.profile.nickname && state.profile.nickname !== 'Học viên' 
                ? state.profile.nickname 
                : defaultNickname,
              email: email || state.profile.email,
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },

      setNickname: (nickname) =>
        set((state) => ({
          profile: {
            ...state.profile,
            nickname: nickname.trim() || state.profile.fullName,
            updatedAt: new Date().toISOString(),
          },
        })),

      setRole: (role) =>
        set((state) => ({
          profile: {
            ...state.profile,
            role,
            updatedAt: new Date().toISOString(),
          },
        })),

      setAvatarColor: (avatarColor) =>
        set((state) => ({
          profile: {
            ...state.profile,
            avatarColor,
            updatedAt: new Date().toISOString(),
          },
        })),

      completeOnboarding: (nickname, role, avatarColor, studyGoal) =>
        set((state) => ({
          profile: {
            ...state.profile,
            nickname: nickname.trim() || state.profile.fullName,
            role,
            avatarColor,
            studyGoal: studyGoal || state.profile.studyGoal,
            hasCompletedOnboarding: true,
            updatedAt: new Date().toISOString(),
          },
        })),

      getDisplayName: () => {
        const p = get().profile;
        return p.nickname || p.fullName || 'Người học';
      },
    }),
    {
      name: 'examprep_user_profile_storage',
    }
  )
);
