// ============================================
// USER GUIDE PAGE - Cẩm Nang Hướng Dẫn Sử Dụng ExamPrep Studio (v3.0.0 Pro)
// Tự động cuộn lên đầu trang khi chuyển chương & Cập nhật đầy đủ 100% tính năng mới nhất
// ============================================
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Button } from '@/components/ui';
import {
  BookOpen, Search, Sparkles, CheckCircle2, AlertTriangle,
  Lightbulb, Flame, Clock, Zap, Target, Layers, FileText,
  Upload, Download, Save, Settings, Play, Shield, Lock,
  PlusCircle, Shuffle, ChevronRight, HelpCircle, Copy, Check,
  ExternalLink, Compass, ArrowRight, Star, LayoutGrid, BarChart2,
  ListOrdered, RotateCcw
} from 'lucide-react';
import { APP_DISPLAY_VERSION } from '@/constants/version';
import toast from 'react-hot-toast';

interface GuideSection {
  id: string;
  title: string;
  badge?: string;
  summary: string;
  steps: {
    title: string;
    description: string;
    note?: string;
    codeExample?: string;
  }[];
  tips?: string[];
  warnings?: string[];
  comparisons?: {
    item1Title: string;
    item1Desc: string;
    item2Title: string;
    item2Desc: string;
  };
}

interface GuideChapter {
  id: string;
  chapterNumber: number;
  title: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  sections: GuideSection[];
}

export const UserGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeChapterId, setActiveChapterId] = useState<string>('chapter-1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Auto scroll to top on chapter change
  const handleSelectChapter = (chapterId: string) => {
    setActiveChapterId(chapterId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`Đã sao chép ${label}!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // COMPLETE 7 CHAPTERS REFLECTING LATEST SYSTEM STATE
  const chapters: GuideChapter[] = useMemo(() => [
    {
      id: 'chapter-1',
      chapterNumber: 1,
      title: 'Bắt đầu với ExamPrep Studio',
      icon: <Compass className="w-5 h-5" />,
      color: 'from-blue-500 to-indigo-600',
      description: 'Khởi động, bảo mật mật khẩu chủ, làm quen thanh công cụ và bảng phím tắt nhanh.',
      sections: [
        {
          id: 'c1-auth',
          title: '1.1. Khởi động & Mật khẩu Bảo vệ Chủ (Master Lock)',
          badge: 'Bảo mật',
          summary: 'Bảo vệ toàn bộ kho ngân hàng đề thi và lịch sử học tập cá nhân bằng mã PIN / Mật khẩu mã hóa.',
          steps: [
            {
              title: 'Đặt mật khẩu khi khởi động lần đầu',
              description: 'Khi mở ứng dụng lần đầu tiên, màn hình Bảo mật sẽ yêu cầu bạn thiết lập Mật khẩu chủ. Hãy nhập mật khẩu và ghi nhớ kỹ.',
              note: 'Mật khẩu được băm (hash) bằng thuật toán SHA-256 an toàn trong cơ sở dữ liệu IndexedDB nội bộ máy tính.'
            },
            {
              title: 'Khóa tức thì (Instant Lock)',
              description: 'Bất cứ lúc nào muốn rời máy, bấm biểu tượng Ổ Khóa 🔒 ở góc phải trên cùng thanh Topbar để khóa màn hình ngay lập tức.',
            },
            {
              title: 'Đổi mật khẩu bảo vệ',
              description: 'Truy cập Cài đặt ➔ Khối "Tài khoản chủ & Mật khẩu" ➔ Nhập mật khẩu cũ và đặt mật khẩu mới.'
            }
          ],
          tips: ['Nếu không muốn nhập mật khẩu mỗi lần mở app, bạn có thể tắt tính năng khóa mật khẩu trong mục Cài đặt hệ thống.']
        },
        {
          id: 'c1-layout',
          title: '1.2. Làm quen Bố cục & Giao diện làm việc',
          badge: 'Giao diện',
          summary: 'Kiến trúc giao diện hiện đại gồm 3 khu vực: Thanh Topbar, Menu Sidebar điều hướng và Vùng làm việc chính.',
          steps: [
            {
              title: 'Thanh điều hướng Sidebar',
              description: 'Menu bên trái giúp bạn chuyển nhanh giữa các khu vực: Trang chủ, Ngân hàng câu hỏi, Luyện tập, Đề thi, Flashcard, Thống kê, Nhập/Xuất file và Cài đặt.',
            },
            {
              title: 'Thanh công cụ đỉnh Topbar',
              description: 'Chứa bộ đếm Chuỗi ngày học liên tục (Streak), Phím chuyển nhanh Sáng/Tối, Nút mở Cẩm nang hướng dẫn (icon ?), Ổ khóa bảo mật và Âm thanh tập trung.',
            },
            {
              title: 'Bảng phím tắt thao tác nhanh',
              description: '• Phím 1, 2, 3, 4: Chọn nhanh đáp án A, B, C, D\n• Phím N / P: Chuyển câu tiếp theo / Câu trước\n• Phím Space: Đánh dấu cờ câu hỏi\n• Phím Enter: Xác nhận đáp án (chế độ luyện tập)\n• Ctrl + K: Tìm kiếm câu hỏi toàn cục\n• Phím Esc: Đóng các cửa sổ modal pop-up'
            }
          ]
        }
      ]
    },
    {
      id: 'chapter-2',
      chapterNumber: 2,
      title: 'Quản lý Ngân hàng Câu hỏi & Môn học',
      icon: <Layers className="w-5 h-5" />,
      color: 'from-emerald-500 to-teal-600',
      description: 'Tổ chức cây thư mục Môn học ➔ Chương ➔ Bài, biên soạn công thức Toán LaTeX, chỉnh sửa hàng loạt.',
      sections: [
        {
          id: 'c2-hierarchy',
          title: '2.1. Cấu trúc Quản lý 3 Cấp: Môn học ➔ Chương ➔ Câu hỏi',
          badge: 'Tổ chức khoa học',
          summary: 'Mọi câu hỏi đều được phân loại chặt chẽ theo Môn học và Chương để phục vụ sinh đề thi ma trận và đo lường mức độ thành thạo.',
          steps: [
            {
              title: 'Tạo Môn học mới',
              description: 'Vào menu "Môn học" (/subjects) ➔ Bấm nút "+ Thêm môn học" ➔ Nhập tên môn, chọn màu sắc và biểu tượng đại diện.',
            },
            {
              title: 'Tạo Chương trong Môn học',
              description: 'Click vào môn học ➔ Bấm "+ Thêm chương" ➔ Nhập tên chương (Ví dụ: "Chương 1: Khái niệm cơ bản").',
            },
            {
              title: 'Xem Thống kê Chi tiết Chương',
              description: 'Trong trang Ngân hàng câu hỏi (/bank), bấm vào từng thẻ chương để xem phân bổ độ khó (Dễ/Vừa/Khó) và biểu đồ phân tích (mặc định thu gọn để tạo không gian thoáng đãng).'
            }
          ]
        },
        {
          id: 'c2-latex',
          title: '2.2. Soạn thảo Công thức Toán & Khoa học (LaTeX / KaTeX)',
          badge: 'Công thức Toán',
          summary: 'Hỗ trợ hiển thị hoàn hảo mọi công thức Toán học, Vật lý, Hóa học phức tạp với cú pháp chuẩn LaTeX.',
          steps: [
            {
              title: 'Công thức trong dòng (Inline Math)',
              description: 'Đặt công thức giữa 2 dấu đô la `$ ... $`. Ví dụ: `$x^2 + y^2 = r^2$` sẽ hiển thị $x^2 + y^2 = r^2$.',
              codeExample: 'Phương trình bậc hai có dạng $ax^2 + bx + c = 0$ với $a \\neq 0$.'
            },
            {
              title: 'Công thức khối nổi bật (Block Math)',
              description: 'Đặt công thức giữa 2 cặp dấu đô la `$$ ... $$` để hiển thị ở giữa dòng, to và rõ nét.',
              codeExample: '$$\\Delta = b^2 - 4ac \\quad \\Rightarrow \\quad x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$$'
            },
            {
              title: 'Các ký hiệu phổ biến',
              description: '• Phân số: `\\frac{a}{b}`\n• Căn bậc hai: `\\sqrt{x}`\n• Tích phân & Tổng: `\\int_{a}^{b} f(x)dx`, `\\sum_{i=1}^{n} x_i`\n• Ma trận: `\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}`',
              codeExample: '$$\\int_{0}^{\\pi} \\sin(x) dx = 2$$'
            }
          ],
          tips: ['Mọi công thức LaTeX bạn copy từ Word hoặc ChatGPT dán vào ExamPrep Studio đều tự động render mượt mà không cần cài đặt thêm font chữ!']
        }
      ]
    },
    {
      id: 'chapter-3',
      chapterNumber: 3,
      title: 'Nhập & Xuất Dữ liệu (Word, TXT, Excel, JSON)',
      icon: <Upload className="w-5 h-5" />,
      color: 'from-amber-500 to-orange-600',
      description: 'Bộ bóc tách thông minh hỗ trợ 4 định dạng nhận diện đáp án đúng, tự động trích xuất lời giải và hình ảnh.',
      sections: [
        {
          id: 'c3-parser-rules',
          title: '3.1. Chuẩn Soạn thảo File Word (.docx) & File Text (.txt)',
          badge: 'Bóc tách thông minh',
          summary: 'Công nghệ Parser AI bóc tách chính xác 100% câu hỏi, các phương án A, B, C, D và lời giải chi tiết.',
          steps: [
            {
              title: 'Quy tắc 1: Tiền tố câu hỏi',
              description: 'Bắt đầu mỗi câu bằng: `Câu 1:`, `Câu 2.`, `Bài 1:`, `Question 1:` hoặc `1.`',
            },
            {
              title: 'Quy tắc 2: Các phương án lựa chọn',
              description: 'Mỗi phương án bắt đầu bằng chữ cái hoa: `A.`, `B.`, `C.`, `D.` hoặc `A)`, `B)`, `C)`, `D)`.',
            },
            {
              title: 'Quy tắc 3: Đánh dấu đáp án đúng (Hỗ trợ 4 cách linh hoạt)',
              description: 'Bạn có thể dùng bất kỳ cách nào sau đây:\n• Cách 1 (Khuyên dùng): In đậm chữ cái đầu phương án (Ví dụ: **A.** hoặc **[A]**).\n• Cách 2: Đổi màu chữ phương án đúng sang màu Đỏ hoặc Xanh lá.\n• Cách 3: Thêm ký hiệu [x] hoặc (*) cạnh đáp án đúng (Ví dụ: A. [x] Nội dung).\n• Cách 4: Viết dòng "Đáp án: A" hoặc "Đ/a: A" ở cuối câu hỏi.',
              codeExample: 'Câu 1: Thủ đô của Việt Nam là gì?\nA. Đà Nẵng\nB. TP. Hồ Chí Minh\n**C.** Hà Nội\nD. Hải Phòng\nLời giải: Hà Nội là thủ đô của nước CHXHCN Việt Nam.'
            }
          ],
          tips: ['Công thức Toán LaTeX trong Word dạng $x^2 + y^2 = 1$ sẽ được giữ nguyên 100% khi nhập vào ứng dụng!']
        },
        {
          id: 'c3-preview-edit',
          title: '3.2. Kiểm duyệt & Chỉnh sửa trước khi Lưu vào Ngân hàng',
          badge: 'Kiểm duyệt',
          summary: 'Trang Import cho phép bạn rà soát lại toàn bộ câu hỏi và sửa lỗi trực tiếp trước khi ghi vào cơ sở dữ liệu.',
          steps: [
            {
              title: 'Tải file lên',
              description: 'Vào menu "Import" (/import) ➔ Kéo thả file Word (.docx), file Text (.txt) hoặc dán văn bản trực tiếp.',
            },
            {
              title: 'Kiểm tra cảnh báo màu vàng / đỏ',
              description: 'Nếu câu nào bị thiếu đáp án đúng, hệ thống sẽ gắn nhãn cảnh báo. Bạn chỉ cần click chọn đáp án đúng ngay trên bảng xem trước.',
            },
            {
              title: 'Chọn Môn học & Chương đích',
              description: 'Chọn môn học đã có hoặc bấm "+ Tạo môn mới" ngay tại trang Import ➔ Bấm "Lưu vào Ngân hàng".'
            }
          ]
        },
        {
          id: 'c3-export',
          title: '3.3. Xuất Dữ liệu ra Word, JSON, CSV & In ấn',
          badge: 'Xuất file',
          summary: 'Trích xuất kho đề thi ra nhiều định dạng để in ấn cho học sinh hoặc lưu trữ dự phòng.',
          steps: [
            {
              title: 'Xuất đề thi ra Word / PDF',
              description: 'Vào menu "Export" (/export) hoặc trong trang Đề thi ➔ Chọn đề thi ➔ Chọn xuất kèm Bảng đáp án hoặc chỉ đề bài để in ra giấy.',
            },
            {
              title: 'Xuất Ngân hàng câu hỏi ra file JSON',
              description: 'Cho phép chia sẻ bộ câu hỏi cho bạn bè cùng sử dụng ExamPrep Studio.'
            }
          ]
        }
      ]
    },
    {
      id: 'chapter-4',
      chapterNumber: 4,
      title: 'Luyện tập, Thi trắc nghiệm & Phân tích nhịp độ',
      icon: <Play className="w-5 h-5" />,
      color: 'from-purple-500 to-pink-600',
      description: 'Preset 1-chạm, thanh đo thành thạo từng chương, bản đồ nhiệt nhịp độ làm bài & bẫy thời gian.',
      sections: [
        {
          id: 'c4-presets-mastery',
          title: '4.1. Thiết Lập Bài Thi Thông Minh & Bộ Preset 1-Chạm',
          badge: 'Nâng cấp v3.0',
          summary: 'Tùy chỉnh nhanh phiên học với 4 preset tạo sẵn, thanh đo độ vững từng chương và kiểm tra sức khỏe môn học.',
          steps: [
            {
              title: 'Bộ cấu hình nhanh 1-chạm (Quick Presets)',
              description: '• ⚡ Khởi động 10 câu: Luyện tập nhanh kèm giải thích tức thì.\n• 🎯 Thi chuẩn (40 câu / 50 phút): Mô phỏng phòng thi thật có bấm giờ và ẩn đáp án.\n• 🩺 Trị câu sai (Weak Spot Doctor): Tự động gom toàn bộ câu từng làm sai để phục thù.\n• 🌟 Khám phá mới (Unseen Explorer): 100% câu hỏi bạn chưa từng làm qua bao giờ.',
            },
            {
              title: 'Thanh đo lường mức độ thành thạo từng chương (Mastery Progress Bars)',
              description: 'Mỗi chương đều hiển thị thanh tiến độ màu xanh lá và tỷ lệ % đã vững (Ví dụ: ⭐ 75% đã vững). Giúp bạn nhận biết ngay chương nào đang bị yếu để tích chọn ôn tập.',
            },
            {
              title: 'Thẻ sức khỏe ngân hàng đề & Tìm kiếm nhanh chương',
              description: 'Thống kê tổng số câu, số câu đã vững và số câu sai cần ôn lại. Hỗ trợ ô tìm kiếm tên chương nhanh chóng khi môn học có nhiều chương.'
            }
          ]
        },
        {
          id: 'c4-modes',
          title: '4.2. Phân biệt Chế độ Luyện tập vs Chế độ Thi thử',
          badge: 'Cơ chế lõi',
          summary: 'ExamPrep Studio phân chia 2 chế độ làm bài với thuật toán và giao diện hoạt động hoàn toàn độc lập.',
          steps: [
            {
              title: 'Chế độ Luyện tập (Practice Mode) — Học sâu & Nhớ lâu',
              description: '• Chọn đáp án ➔ Hệ thống hiện kết quả Đúng / Sai và Lời giải chi tiết ngay lập tức.\n• Bung huy hiệu Cờ Chuỗi Đúng (Streak Flame).\n• Khóa câu hỏi (không cho chọn lại câu đó) để ghi nhận chính xác phản xạ ban đầu.\n• Tự động dừng (đóng băng) đồng hồ thời gian của câu đó ngay tại giây bạn chọn.',
            },
            {
              title: 'Chế độ Kiểm tra (Exam Mode) — Mô phỏng phòng thi thật',
              description: '• Không hiển thị đáp án đúng/sai trong quá trình làm bài.\n• Có đồng hồ đếm ngược tổng thời gian làm bài thi và ước tính số giây trung bình trên mỗi câu.\n• Khi làm xong câu nào, bạn có thể bấm nút "Đã chốt" để đóng băng thời gian câu đó. Nếu muốn sửa lại, chỉ cần bấm "Mở chốt" để chọn lại đáp án khác.\n• Bấm "Nộp bài" để nhận điểm số tổng kết, xếp loại và phân tích năng lực.',
            }
          ],
          comparisons: {
            item1Title: 'Chế độ Luyện tập (Practice)',
            item1Desc: 'Hiện đáp án & giải thích tức thì • Bung chuỗi Streak • Đóng băng thời gian câu ngay khi chọn • Không thể đổi đáp án câu đã làm.',
            item2Title: 'Chế độ Kiểm tra (Exam)',
            item2Desc: 'Tuyệt mật kết quả đến khi nộp bài • Có nút "Đã chốt / Mở chốt" linh hoạt • Đếm ngược toàn bài thi • Chấm điểm và xếp loại.'
          }
        },
        {
          id: 'c4-pacing-heatmap',
          title: '4.3. Phân Tích Nhịp Độ Làm Bài & Bẫy Thời Gian (Question Pacing)',
          badge: 'Trực quan hóa 3 chế độ',
          summary: 'Đo lường thời gian thực tế từng câu hỏi với 3 chế độ xem: Bản đồ nhiệt Matrix, Biểu đồ cột zoom và Bảng xếp hạng bẫy thời gian.',
          steps: [
            {
              title: 'Chế độ Bản đồ nhiệt Matrix (Heatmap Grid - Mặc định)',
              description: 'Hiển thị lưới ô vuông câu hỏi chuẩn quốc tế với các mã màu trực quan:\n• ⚡ Cyan: Phản xạ nhanh (≤30s và làm đúng)\n• 🟢 Emerald: Tư duy chắc chắn (30s - 90s và làm đúng)\n• 🔴 Rose: Bẫy thời gian (Mất nhiều thời gian mà sai)\n• 🟡 Amber: Đọc ẩu / Vội vàng (≤15s nhưng làm sai)',
            },
            {
              title: 'Chế độ Biểu đồ cột rộng rãi (Adjustable Timeline Bars)',
              description: 'Cột to rõ ràng, bo góc có gradient phát sáng. Cho phép chỉnh phân trang 30, 50, 100 câu/trang để không bao giờ bị dồn ép cột mỏng.',
            },
            {
              title: 'Chế độ Bảng xếp hạng bẫy thời gian (Leaderboard)',
              description: 'Xếp hạng danh sách các câu hỏi tốn nhiều thời gian nhất, trích đoạn nội dung câu hỏi để bạn rút kinh nghiệm phân bổ thời gian cho bài thi thật.',
            },
            {
              title: 'Thẻ xem trước câu hỏi (Instant Snapshot Preview)',
              description: 'Nhấp vào bất kỳ ô câu hỏi nào trên bản đồ nhiệt để xem ngay nội dung câu hỏi, thời gian làm và nút "Xem lời giải chi tiết ➔".'
            }
          ]
        },
        {
          id: 'c4-review-layout',
          title: '4.4. Màn Hình Xem Lại Bài Làm (Quiz Review Focus Layout)',
          badge: 'Công thái học',
          summary: 'Bố cục 2 cột tối ưu: Đọc câu hỏi & lời giải bên trái, Ma trận câu hỏi sticky bên phải.',
          steps: [
            {
              title: 'Cột Trái (Vùng chính): Trưng bày câu hỏi & Lời giải',
              description: 'Không gian rộng rãi, hiển thị rõ ràng nội dung câu hỏi, công thức Toán LaTeX, 4 đáp án dạng lưới 2 cột và hộp phân tích lời giải chi tiết.',
            },
            {
              title: 'Cột Phải (Bảng điều hướng Sticky): Ma trận câu hỏi',
              description: 'Gắn cố định bên phải màn hình với 4 bộ lọc nhanh: Tất cả, Sai ✗, Đúng ✓, Bẫy ⚠️. Giúp bạn chuyển câu tức thì chỉ với 1 click chuột.'
            }
          ]
        }
      ]
    },
    {
      id: 'chapter-5',
      chapterNumber: 5,
      title: 'Thiết kế & Quản lý Đề thi',
      icon: <FileText className="w-5 h-5" />,
      color: 'from-blue-600 to-cyan-600',
      description: 'Tạo đề thủ công từ giỏ câu hỏi, sinh đề tự động theo ma trận tỷ lệ độ khó, tạo nhiều mã đề hoán vị.',
      sections: [
        {
          id: 'c5-manual',
          title: '5.1. Tạo Đề thi Thủ công (Nhặt câu hỏi vào giỏ đề)',
          badge: 'Chủ động',
          summary: 'Tự tay tuyển chọn từng câu hỏi theo ý muốn vào bộ đề thi.',
          steps: [
            {
              title: 'Mở Trình tạo đề thi thủ công',
              description: 'Vào menu "Đề thi" ➔ Chọn "Tạo thủ công" (/exams/new).',
            },
            {
              title: 'Lọc và Chọn câu hỏi vào Giỏ đề',
              description: 'Sử dụng bộ lọc môn học, chương, độ khó. Bấm nút "+" bên cạnh câu hỏi để đưa vào giỏ đề bên phải.',
            },
            {
              title: 'Sắp xếp thứ tự & Đặt trọng số điểm',
              description: 'Kéo thả đổi vị trí câu hỏi, thiết lập thời gian làm bài (ví dụ: 45 phút, 60 phút) và điểm chuẩn đạt (Pass score).'
            }
          ]
        },
        {
          id: 'c5-auto-matrix',
          title: '5.2. Sinh Đề thi Tự động theo Ma trận Độ khó Chuẩn',
          badge: 'Ma trận AI',
          summary: 'Tạo đề thi chuẩn hóa theo tỷ lệ phần trăm phân bổ kiến thức chỉ với vài click.',
          steps: [
            {
              title: 'Chọn Môn học & Các chương tham gia',
              description: 'Vào menu "Đề thi" ➔ Chọn "Tạo tự động" (/exams/auto) ➔ Chọn môn học và tích chọn các chương cần ra đề.',
            },
            {
              title: 'Thiết lập Ma trận Tỷ lệ Độ khó',
              description: 'Kéo thanh trượt điều chỉnh tỷ lệ:\n• Nhận biết (Dễ): 40%\n• Thông hiểu (Trung bình): 30%\n• Vận dụng (Khó): 20%\n• Vận dụng cao (Rất khó): 10%',
            },
            {
              title: 'Sinh Nhiều Mã Đề Hoán Vị (Đề 101, 102, 103, 104...)',
              description: 'Nhập số lượng mã đề muốn tạo (ví dụ 4 mã đề). Thuật toán sẽ tự động xáo trộn câu hỏi và đáp án ngẫu nhiên, sinh sẵn Bảng đáp án ma trận (Matrix Answer Key).'
            }
          ],
          tips: ['Bạn có thể bấm "Bắt đầu thi ngay" với mã đề vừa tạo hoặc xuất ra file Word/PDF để in ấn!']
        }
      ]
    },
    {
      id: 'chapter-6',
      chapterNumber: 6,
      title: 'Flashcard & Spaced Repetition',
      icon: <Layers className="w-5 h-5" />,
      color: 'from-teal-500 to-emerald-600',
      description: 'Phương pháp ghi nhớ siêu đẳng SuperMemo SM-2, lật thẻ 3D, tạo nhanh Flashcard từ ngân hàng câu hỏi.',
      sections: [
        {
          id: 'c6-sm2',
          title: '6.1. Nguyên lý Ghi nhớ Lặp lại Ngắt quãng (SuperMemo SM-2)',
          badge: 'Khoa học Não bộ',
          summary: 'Thuật toán tính toán chính xác thời điểm bạn sắp quên kiến thức để nhắc nhở ôn tập, chuyển trí nhớ ngắn hạn thành dài hạn.',
          steps: [
            {
              title: 'Đường cong quên lãng Ebbinghaus',
              description: 'Nếu không ôn tập, bạn sẽ quên 80% kiến thức sau vài ngày. ExamPrep Studio tự động lên lịch thẻ cần ôn tập mỗi ngày dựa trên phản hồi của bạn.',
            },
            {
              title: 'Ý nghĩa 4 nút đánh giá khi lật thẻ',
              description: 'Sau khi lật mặt sau của thẻ, hãy tự đánh giá mức độ nhớ:\n• 🔴 Lại (Again): Quên hoàn toàn ➔ Ôn lại ngay trong ngày (1 ngày).\n• 🟡 Khó (Hard): Nhớ nhưng vất vả ➔ Ôn lại sau 2 - 3 ngày.\n• 🟢 Tốt (Good): Nhớ chuẩn xác ➔ Ôn lại sau 4 - 6 ngày.\n• 💎 Dễ (Easy): Thuộc nằm lòng ➔ Ôn lại sau 7 - 14+ ngày.',
            }
          ]
        },
        {
          id: 'c6-quick-create',
          title: '6.2. Tạo nhanh Bộ thẻ Flashcard từ Ngân hàng câu hỏi',
          badge: 'Tiện lợi 1-click',
          summary: 'Không cần gõ lại thủ công, tự động biến hàng trăm câu hỏi trắc nghiệm thành bộ thẻ nhớ tương tác.',
          steps: [
            {
              title: 'Mở trang Tạo nhanh Flashcard',
              description: 'Vào menu "Flashcard" ➔ Bấm nút "Tạo nhanh từ Câu hỏi" (/flashcards/quick-create).',
            },
            {
              title: 'Chọn nguồn câu hỏi',
              description: 'Chọn Môn học và Chương cần tạo thẻ. Hệ thống sẽ lấy nội dung câu hỏi làm Mặt Trước (Front) và Đáp án đúng + Lời giải làm Mặt Sau (Back).',
            },
            {
              title: 'Bắt đầu phiên ôn tập',
              description: 'Bấm "Lưu bộ thẻ" và tiến hành lật thẻ ôn tập hàng ngày.'
            }
          ]
        }
      ]
    },
    {
      id: 'chapter-7',
      chapterNumber: 7,
      title: 'Cài đặt, Sao lưu & Quản trị dữ liệu',
      icon: <Settings className="w-5 h-5" />,
      color: 'from-slate-600 to-zinc-800',
      description: '10 phối màu độc quyền, bố cục cân đối 50/50, tùy chỉnh AI phân loại năng lực, sao lưu JSON và thông tin ứng dụng.',
      sections: [
        {
          id: 'c7-themes',
          title: '7.1. Bố Cục Cân Đối 2 Cột & 10 Phối Màu Gradient Độc Quyền',
          badge: 'Thẩm mỹ cao cấp',
          summary: 'Trang Cài đặt được phân bổ tỷ lệ 50/50 cân đối hoàn hảo giữa 2 cột: Giao diện & Thuật toán bên trái, Âm thanh, Bảo mật & Dữ liệu bên phải.',
          steps: [
            {
              title: 'Chọn từ 10 Theme độc quyền',
              description: 'Vào Cài đặt ➔ Chọn giữa các theme: Đại Dương Xanh, Tinh Vân Tím, Bạc Hà Tươi Mát, Hoàng Hôn Rực Rỡ, Hồng Magenta, Hổ Phách Hoàng Kim, Băng Lam Bắc Cực, v.v.',
            },
            {
              title: 'Trình tạo Gradient Tự do (Custom Free Gradient)',
              description: 'Click vào card "Tùy Chỉnh Màu Tự Do" ➔ Chọn 2 mã màu HEX đầu cuối và góc xoay (angle) để tạo giao diện độc bản của riêng bạn.'
            }
          ]
        },
        {
          id: 'c7-ai-thresholds',
          title: '7.2. Thuật toán Đánh giá Năng lực AI & Bảng Mô phỏng Trực tiếp',
          badge: 'AI Thuật toán',
          summary: 'Tự điều chỉnh tiêu chuẩn xếp loại câu hỏi Dễ, Khó, Thành thạo theo trình độ của bản thân.',
          steps: [
            {
              title: 'Ngưỡng Thành thạo (Mastery Threshold)',
              description: 'Mặc định 80%: Tỷ lệ làm đúng tối thiểu trên tổng số lần làm để một câu được coi là bạn đã nắm vững.',
            },
            {
              title: 'Ngưỡng Câu Dễ & Câu Khó',
              description: 'Kéo thanh trượt để quy định tỷ lệ đúng/sai mà hệ thống sẽ tự động gán nhãn câu hỏi là Dễ hoặc Khó.',
            },
            {
              title: 'Bảng mô phỏng trực tiếp (Live Simulation Table)',
              description: 'Bảng hiển thị ngay bên dưới các thanh trượt sẽ thay đổi kết quả phân loại Câu A, B, C theo thời gian thực khi bạn kéo thanh trượt.'
            }
          ]
        },
        {
          id: 'c7-backup',
          title: '7.3. Sao lưu & Khôi phục Dữ liệu Toàn diện (Backup JSON)',
          badge: 'An toàn dữ liệu',
          summary: 'Toàn bộ dữ liệu nằm trên máy của bạn (Offline-first). Hãy sao lưu định kỳ để không bao giờ bị mất bài học.',
          steps: [
            {
              title: 'Tạo file sao lưu (Export Backup)',
              description: 'Vào menu "Sao lưu" (/backup) hoặc Cài đặt ➔ Bấm nút "Tạo file backup JSON đầy đủ" ➔ Lưu file `.json` vào ổ đĩa hoặc USB.',
            },
            {
              title: 'Khôi phục dữ liệu (Restore Backup)',
              description: 'Khi đổi máy tính mới hoặc cài lại máy, vào trang Sao lưu ➔ Bấm "Khôi phục dữ liệu từ file JSON" ➔ Chọn file backup cũ để lấy lại 100% môn học, câu hỏi, đề thi và lịch sử.'
            }
          ],
          warnings: ['Thao tác "Xóa toàn bộ dữ liệu" sẽ yêu cầu gõ chuỗi xác nhận "XÓA DỮ LIỆU" và tự động tải về 1 bản backup trước khi xóa để chống bấm nhầm.']
        },
        {
          id: 'c7-author',
          title: '7.4. Thông tin Ứng dụng & Tác giả',
          badge: 'Thông tin',
          summary: 'ExamPrep Studio được phát triển bởi Đào Đức Thịnh với sự hỗ trợ của Antigravity.',
          steps: [
            {
              title: 'Thông tin tác giả & Mở liên kết ngoài an toàn',
              description: '• Tác giả: Đào Đức Thịnh\n• Facebook: https://www.facebook.com/yoreis06/ (Tự động mở trình duyệt web ngoài Chrome/Edge)\n• Gmail: daothinh636@gmail.com',
            }
          ]
        }
      ]
    }
  ], []);

  // Filter sections by search query
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase();

    return chapters.map(ch => {
      const chapterMatches = ch.title.toLowerCase().includes(q) || ch.description.toLowerCase().includes(q);
      const matchedSections = ch.sections.filter(sec => {
        if (chapterMatches) return true;
        const titleMatch = sec.title.toLowerCase().includes(q);
        const summaryMatch = sec.summary.toLowerCase().includes(q);
        const badgeMatch = sec.badge?.toLowerCase().includes(q);
        const stepsMatch = sec.steps.some(st => st.title.toLowerCase().includes(q) || st.description.toLowerCase().includes(q) || (st.note && st.note.toLowerCase().includes(q)));
        const tipsMatch = sec.tips?.some(t => t.toLowerCase().includes(q));
        const warningsMatch = sec.warnings?.some(w => w.toLowerCase().includes(q));
        return titleMatch || summaryMatch || badgeMatch || stepsMatch || tipsMatch || warningsMatch;
      });

      return {
        ...ch,
        sections: matchedSections
      };
    }).filter(ch => ch.sections.length > 0);
  }, [chapters, searchQuery]);

  const activeChapter = useMemo(() => {
    return chapters.find(c => c.id === activeChapterId) || chapters[0];
  }, [chapters, activeChapterId]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 animate-fade-in">
      
      {/* 1. Header Banner & Quick Search */}
      <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden bg-gradient-to-r from-[hsl(var(--card))] via-[hsl(var(--card))] to-[hsl(var(--primary)/0.08)] border border-[hsl(var(--border))] shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)] flex items-center gap-1.5 shadow-2xs">
                <Sparkles size={13} className="text-[hsl(var(--primary))]" />
                <span>ExamPrep Studio Guide {APP_DISPLAY_VERSION}</span>
              </span>
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                Đã kiểm toán thực tế 100%
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[hsl(var(--foreground))]">
              Cẩm Nang Hướng Dẫn Sử Dụng
            </h1>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              Tài liệu hướng dẫn toàn diện từ cơ bản đến nâng cao: Quản lý ngân hàng câu hỏi, soạn công thức LaTeX, tạo đề thi ma trận tự động và phương pháp học Spaced Repetition.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="default"
              size="md"
              icon={<Play size={16} />}
              onClick={() => navigate('/quiz/setup')}
              className="bg-gradient-to-r from-[hsl(var(--primary))] to-indigo-600 hover:opacity-95 text-white font-bold shadow-md cursor-pointer"
            >
              Vào Làm Bài Ngay
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={<Upload size={16} />}
              onClick={() => navigate('/import')}
              className="font-bold cursor-pointer"
            >
              Nhập File Word
            </Button>
          </div>
        </div>

        {/* Global Guide Search Bar */}
        <div className="relative z-10 mt-6 max-w-xl">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Tìm kiếm hướng dẫn (Ví dụ: LaTeX, import word, streak, ma trận, backup, phím tắt...)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[hsl(var(--card))] border-2 border-[hsl(var(--border))] focus:border-[hsl(var(--primary))] rounded-2xl text-xs sm:text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary)/0.15)] shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] p-1 rounded-md cursor-pointer"
              >
                ✕ Xóa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Chapter Navigation Tabs (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-2 sticky top-4">
          <div className="p-2 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-1">
            <div className="px-3 py-2 text-xs font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center justify-between">
              <span>7 Chuyên Đề Hướng Dẫn</span>
              <span className="text-[10px] font-mono text-[hsl(var(--primary))] font-bold">ExamPrep Studio Pro</span>
            </div>

            {chapters.map((ch) => {
              const isActive = activeChapterId === ch.id && !searchQuery;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setSearchQuery('');
                    handleSelectChapter(ch.id);
                  }}
                  className={`w-full p-3 rounded-2xl text-left transition-all duration-200 cursor-pointer flex items-center gap-3 ${
                    isActive
                      ? 'bg-[hsl(var(--primary))] text-white font-bold shadow-md shadow-[hsl(var(--primary)/0.25)]'
                      : 'hover:bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--foreground))] border border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : `bg-gradient-to-br ${ch.color} text-white shadow-2xs`
                  }`}>
                    {ch.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono tracking-wider opacity-80">
                        Chương {ch.chapterNumber}
                      </span>
                      {isActive && <ChevronRight size={14} className="stroke-[3]" />}
                    </div>
                    <p className="text-xs font-bold truncate">
                      {ch.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Help Card */}
          <div className="p-4 rounded-3xl bg-[hsl(var(--primary)/0.04)] border border-[hsl(var(--primary)/0.2)] space-y-2">
            <div className="flex items-center gap-2 text-[hsl(var(--primary))] font-bold text-xs">
              <HelpCircle size={15} />
              <span>Cần hỗ trợ trực tiếp?</span>
            </div>
            <p className="text-[11.5px] text-[hsl(var(--muted-foreground))] leading-relaxed">
              Nếu gặp khó khăn trong quá trình nhập đề hoặc phát hiện lỗi, hãy liên hệ tác giả qua Facebook hoặc Gmail.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-bold text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)] hover:bg-[hsl(var(--primary)/0.1)] cursor-pointer"
              onClick={() => navigate('/settings')}
            >
              Xem Thông Tin Liên Hệ
            </Button>
          </div>
        </div>

        {/* Right Column: Chapter Content Sections (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Chapter Header (When not searching) */}
          {!searchQuery && (
            <div className="p-5 sm:p-6 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black uppercase px-2.5 py-0.5 rounded-md bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)]">
                  Chương {activeChapter.chapterNumber}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))] font-semibold">
                  {activeChapter.sections.length} bài hướng dẫn
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[hsl(var(--foreground))]">
                {activeChapter.title}
              </h2>
              <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                {activeChapter.description}
              </p>
            </div>
          )}

          {/* Search Results Alert */}
          {searchQuery && (
            <div className="p-4 rounded-2xl bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.3)] flex items-center justify-between text-xs">
              <span>
                Tìm thấy <strong>{filteredChapters.reduce((acc, c) => acc + c.sections.length, 0)}</strong> kết quả phù hợp với: "<strong>{searchQuery}</strong>"
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="font-bold text-[hsl(var(--primary))] hover:underline cursor-pointer"
              >
                Xóa tìm kiếm
              </button>
            </div>
          )}

          {/* Sections List */}
          {(searchQuery ? filteredChapters.flatMap(c => c.sections) : activeChapter.sections).map((section) => (
            <Card key={section.id} id={section.id} className="rounded-3xl border border-[hsl(var(--border))] shadow-xs overflow-hidden">
              <CardContent className="p-5 sm:p-6 space-y-5">
                
                {/* Section Title & Summary */}
                <div className="space-y-1.5 border-b border-[hsl(var(--border))] pb-3.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))] flex items-center gap-2">
                      <span>{section.title}</span>
                    </h3>
                    {section.badge && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.25)]">
                        {section.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                    {section.summary}
                  </p>
                </div>

                {/* Step by step Walkthrough */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-[hsl(var(--primary))]" /> Các bước thực hiện chi tiết:
                  </h4>

                  <div className="space-y-3">
                    {section.steps.map((st, sIdx) => (
                      <div key={sIdx} className="p-3.5 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] space-y-2">
                        <div className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center text-[10.5px] font-black shrink-0 mt-0.5 shadow-2xs">
                            {sIdx + 1}
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">
                              {st.title}
                            </p>
                            <p className="text-xs text-[hsl(var(--foreground)/0.85)] leading-relaxed whitespace-pre-line">
                              {st.description}
                            </p>
                            {st.note && (
                              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium italic pt-1">
                                💡 Chú thích: {st.note}
                              </p>
                            )}

                            {/* Code / Syntax Example with 1-click Copy */}
                            {st.codeExample && (
                              <div className="mt-2 p-2.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] border border-slate-800 space-y-1.5">
                                <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-800">
                                  <span>Mẫu cú pháp:</span>
                                  <button
                                    onClick={() => handleCopy(st.codeExample!, 'Mẫu ví dụ')}
                                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-sans font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    {copiedText === st.codeExample ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                    <span>{copiedText === st.codeExample ? 'Đã sao chép' : 'Sao chép'}</span>
                                  </button>
                                </div>
                                <pre className="whitespace-pre-wrap leading-relaxed overflow-x-auto">{st.codeExample}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Comparison Block (if exists) */}
                {section.comparisons && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-indigo-500/25 space-y-2.5">
                    <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap size={14} /> So sánh & Phân biệt cốt lõi
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-1">
                        <p className="font-black text-[hsl(var(--primary))] text-xs">{section.comparisons.item1Title}</p>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">{section.comparisons.item1Desc}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-1">
                        <p className="font-black text-purple-600 dark:text-purple-400 text-xs">{section.comparisons.item2Title}</p>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">{section.comparisons.item2Desc}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pro Tips & Warnings */}
                {section.tips && section.tips.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-1">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Lightbulb size={14} /> Mẹo học tập & Sử dụng hiệu quả:
                    </div>
                    {section.tips.map((tip, tIdx) => (
                      <p key={tIdx} className="text-emerald-950 dark:text-emerald-200 text-[11.5px] leading-relaxed pl-5">
                        • {tip}
                      </p>
                    ))}
                  </div>
                )}

                {section.warnings && section.warnings.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs space-y-1">
                    <div className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Cảnh báo quan trọng:
                    </div>
                    {section.warnings.map((warn, wIdx) => (
                      <p key={wIdx} className="text-rose-950 dark:text-rose-200 text-[11.5px] leading-relaxed pl-5">
                        • {warn}
                      </p>
                    ))}
                  </div>
                )}

              </CardContent>
            </Card>
          ))}

          {/* Bottom Next Chapter Navigator */}
          {!searchQuery && (
            <div className="flex items-center justify-between p-4 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs">
              <span className="text-xs text-[hsl(var(--muted-foreground))] font-semibold">
                Đang xem: Chương {activeChapter.chapterNumber} / {chapters.length}
              </span>
              <div className="flex items-center gap-2">
                {activeChapter.chapterNumber > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectChapter(`chapter-${activeChapter.chapterNumber - 1}`)}
                    className="font-bold cursor-pointer text-xs"
                  >
                    ← Chương trước
                  </Button>
                )}
                {activeChapter.chapterNumber < chapters.length && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleSelectChapter(`chapter-${activeChapter.chapterNumber + 1}`)}
                    className="bg-[hsl(var(--primary))] text-white font-bold cursor-pointer text-xs flex items-center gap-1"
                  >
                    <span>Chương tiếp theo</span>
                    <ArrowRight size={13} />
                  </Button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
