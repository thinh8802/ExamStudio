// ============================================
// EXAMPREP STUDIO - SUPABASE CONFIGURATION
// ============================================
// Thông tin kết nối Supabase Cloud (Free Tier)
// Dùng để xác thực bản quyền 1-Lần & chống chia sẻ mã.

export const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL || 'https://hnrxhdqqyisecbawcscp.supabase.co'
).trim();

export const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucnhoZHFxeWlzZWNiYXdjc2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNjkwOTgsImV4cCI6MjEwMjk0NTA5OH0.BbLW_C7oJAuzRRTnpf2w_lpgA2UpBOpxqggKI6ocbwg'
).trim();

/**
 * Kiểm tra xem cấu hình Supabase đã được điền hợp lệ chưa
 */
export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL.startsWith('https://') &&
    !SUPABASE_URL.includes('xyzcompany') &&
    SUPABASE_ANON_KEY.length > 30 &&
    !SUPABASE_ANON_KEY.includes('...')
  );
}
