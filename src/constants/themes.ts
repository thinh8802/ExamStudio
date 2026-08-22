// ============================================
// THEME PRESETS - ExamPrep Studio Design System
// Comprehensive Palette & Multi-Layer Gradients
// ============================================

export interface ThemePreset {
  id: string;
  name: string;
  category: 'vibrant' | 'calm' | 'warm' | 'dark-tech';
  description: string;
  previewGradient: string;
  primaryColor: string;
  accentColor: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'blue-ocean',
    name: 'Lam Đại Dương (Ocean Blue)',
    category: 'calm',
    description: 'Phong cách công nghệ thanh lịch, sắc nét và tăng cường khả năng tập trung.',
    previewGradient: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
    primaryColor: '#2563EB',
    accentColor: '#06B6D4',
  },
  {
    id: 'purple-nebula',
    name: 'Tím Tinh Vân (Purple Nebula)',
    category: 'vibrant',
    description: 'Sáng tạo, huyền ảo và mang lại cảm giác hiện đại giàu cảm hứng.',
    previewGradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
    primaryColor: '#8B5CF6',
    accentColor: '#EC4899',
  },
  {
    id: 'emerald-mint',
    name: 'Lục Bảo & Bạc Hà (Emerald Mint)',
    category: 'calm',
    description: 'Dịu mắt tuyệt đối, thư thái, tối ưu cho việc đọc và học tập nhiều giờ liên tục.',
    previewGradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    primaryColor: '#059669',
    accentColor: '#10B981',
  },
  {
    id: 'sunset-glow',
    name: 'Hoàng Hôn Rực Rỡ (Sunset Glow)',
    category: 'warm',
    description: 'Ấm áp, tràn đầy năng lượng tích cực và kích thích sự hăng say.',
    previewGradient: 'linear-gradient(135deg, #F97316 0%, #F59E0B 100%)',
    primaryColor: '#F97316',
    accentColor: '#F59E0B',
  },
  {
    id: 'cyan-glacier',
    name: 'Băng Bắc Cực (Arctic Cyan)',
    category: 'calm',
    description: 'Trong trẻo, tươi mới và tạo cảm giác không gian học tập khoáng đạt.',
    previewGradient: 'linear-gradient(135deg, #0891B2 0%, #3B82F6 100%)',
    primaryColor: '#0891B2',
    accentColor: '#3B82F6',
  },
  {
    id: 'rose-magenta',
    name: 'Hồng Nhung Quý Phái (Velvet Rose)',
    category: 'vibrant',
    description: 'Hiện đại, trẻ trung, tạo điểm nhấn ấn tượng cho các mục tiêu học tập.',
    previewGradient: 'linear-gradient(135deg, #E11D48 0%, #D946EF 100%)',
    primaryColor: '#E11D48',
    accentColor: '#D946EF',
  },
  {
    id: 'amber-gold',
    name: 'Hổ Phách Hoàng Gia (Royal Amber)',
    category: 'warm',
    description: 'Sang trọng, kích thích tư duy logic và ghi nhớ sâu các công thức.',
    previewGradient: 'linear-gradient(135deg, #D97706 0%, #EA580C 100%)',
    primaryColor: '#D97706',
    accentColor: '#EA580C',
  },
  {
    id: 'aurora-borealis',
    name: 'Cực Quang Huyền Diệu (Aurora)',
    category: 'vibrant',
    description: 'Bản phối chuyển màu 3 lớp độc đáo giữa Xanh Lục, Lam Ngọc và Tím.',
    previewGradient: 'linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)',
    primaryColor: '#059669',
    accentColor: '#8B5CF6',
  },
  {
    id: 'midnight-indigo',
    name: 'Lam Đêm Sâu (Midnight Indigo)',
    category: 'dark-tech',
    description: 'Trầm tĩnh, chiều sâu, tạo môi trường học tập yên tĩnh tuyệt đối.',
    previewGradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    primaryColor: '#4F46E5',
    accentColor: '#7C3AED',
  },
  {
    id: 'crimson-ruby',
    name: 'Hồng Ngọc Rực Lửa (Crimson Ruby)',
    category: 'vibrant',
    description: 'Mạnh mẽ, quyết đoán, truyền động lực bứt phá điểm số.',
    previewGradient: 'linear-gradient(135deg, #DC2626 0%, #EA580C 100%)',
    primaryColor: '#DC2626',
    accentColor: '#EA580C',
  },
];
