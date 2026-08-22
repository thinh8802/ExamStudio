// ============================================
// SAMPLE TEMPLATES GENERATOR FOR IMPORT ENGINE
// ============================================

export const SAMPLE_TXT_TEMPLATE = `Câu 1: Kinh tế học vi mô nghiên cứu về vấn đề nào sau đây?
A. Hành vi của các cá nhân và doanh nghiệp trên thị trường
B. Tổng sản phẩm quốc nội (GDP) của nền kinh tế
C. Tỷ lệ lạm phát và thất nghiệp toàn cầu
D. Chính sách tài khóa và tiền tệ của chính phủ
Đáp án đúng: A
Giải thích: Kinh tế học vi mô tập trung vào việc phân tích hành vi ra quyết định của từng chủ thể kinh tế đơn lẻ như hộ gia đình và doanh nghiệp.

Câu 2: Quy luật cầu chỉ ra rằng khi giá của một hàng hóa tăng lên (các yếu tố khác không đổi) thì:
*A. Lượng cầu về hàng hóa đó sẽ giảm xuống
B. Lượng cầu về hàng hóa đó sẽ tăng lên
C. Lượng cung về hàng hóa đó sẽ giảm xuống
D. Cầu về hàng hóa đó tăng mạnh
Lời giải: Theo quy luật cầu, mối quan hệ giữa giá cả và lượng cầu là nghịch biến.

Câu 3: Đâu là các yếu tố ảnh hưởng đến độ co giãn của cầu theo giá? (Chọn các đáp án đúng)
A. Sự sẵn có của hàng hóa thay thế
B. Tỷ trọng chi tiêu cho hàng hóa trong thu nhập
C. Khoảng thời gian kể từ khi giá thay đổi
D. Màu sắc bao bì của sản phẩm
Đáp án: A, B, C

Câu 4: Hàng hóa công cộng thuần túy có đặc điểm nào dưới đây?
A. Tính không loại trừ và tính không cạnh tranh trong tiêu dùng
B. Tính loại trừ cao và tính cạnh tranh cao
C. Do các doanh nghiệp tư nhân độc quyền phân phối
D. Có giá bán bằng 0 trên thị trường tự do
Key: A

Câu 5: Khi thị trường cạnh tranh hoàn hảo đạt trạng thái cân bằng dài hạn, lợi nhuận kinh tế của các doanh nghiệp sẽ bằng:
A. Dương rất lớn
B. Bằng không (0)
C. Âm
D. Vô cùng
Đ/A: B
`;

export const SAMPLE_JSON_TEMPLATE = JSON.stringify([
  {
    "content": "Kinh tế học vi mô nghiên cứu về vấn đề nào sau đây?",
    "answers": [
      { "label": "A", "content": "Hành vi của các cá nhân và doanh nghiệp trên thị trường" },
      { "label": "B", "content": "Tổng sản phẩm quốc nội (GDP) của nền kinh tế" },
      { "label": "C", "content": "Tỷ lệ lạm phát và thất nghiệp toàn cầu" },
      { "label": "D", "content": "Chính sách tài khóa và tiền tệ của chính phủ" }
    ],
    "correctAnswer": "A",
    "explanation": "Kinh tế học vi mô tập trung vào phân tích hành vi của các chủ thể kinh tế đơn lẻ."
  },
  {
    "content": "Quy luật cầu chỉ ra rằng khi giá của một hàng hóa tăng lên (các yếu tố khác không đổi) thì:",
    "answers": [
      { "label": "A", "content": "Lượng cầu về hàng hóa đó sẽ giảm xuống" },
      { "label": "B", "content": "Lượng cầu về hàng hóa đó sẽ tăng lên" },
      { "label": "C", "content": "Lượng cung về hàng hóa đó sẽ giảm xuống" },
      { "label": "D", "content": "Cầu về hàng hóa đó tăng mạnh" }
    ],
    "correctAnswer": "A",
    "explanation": "Theo quy luật cầu, giá cả và lượng cầu có mối quan hệ nghịch biến."
  }
], null, 2);

export const SAMPLE_CSV_TEMPLATE = `Câu hỏi,Đáp án A,Đáp án B,Đáp án C,Đáp án D,Đáp án đúng,Giải thích
"Kinh tế học vi mô nghiên cứu về vấn đề nào?","Hành vi cá nhân & doanh nghiệp","Tổng sản phẩm GDP","Tỷ lệ lạm phát","Chính sách tài khóa","A","Kinh tế vi mô phân tích chủ thể đơn lẻ."
"Khi giá hàng hóa tăng thì lượng cầu thay đổi thế nào?","Lượng cầu giảm","Lượng cầu tăng","Lượng cung giảm","Không đổi","A","Mối quan hệ nghịch biến giữa giá và lượng cầu."
`;

export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
