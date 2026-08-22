const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const quizAppDir = path.resolve(__dirname, '..');
const releaseLatestDir = path.resolve(quizAppDir, '..', 'release', 'latest');
const pkgPath = path.resolve(quizAppDir, 'package.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const currentVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || '3.0.0';

console.log('\n' + '='.repeat(68));
console.log('     🚀 EXAMPREP STUDIO - CÔNG CỤ ĐÓNG GÓI & QUẢN LÝ PHIÊN BẢN');
console.log('='.repeat(68));
console.log(`📌 Phiên bản hiện tại: v${currentVersion}\n`);
console.log('Chọn chế độ đóng gói:');
console.log('  [1] TỰ ĐỘNG TĂNG BẢN MỚI (Patch: +0.0.1) & Đóng gói  [KHUYÊN DÙNG]');
console.log('  [2] Tăng bản tính năng mới (Minor: +0.1.0) & Đóng gói');
console.log('  [3] Tăng bản ĐỘT PHÁ / ĐẠI TU (Major: +1.0.0) & Đóng gói');
console.log('  [4] Đóng gói giữ nguyên số phiên bản hiện tại');
console.log('  [5] Thoát\n');

function askOption() {
  rl.question('Nhập lựa chọn của bạn (1, 2, 3, 4 hoặc 5) rồi ấn Enter: ', (answer) => {
    const opt = answer.trim();

    if (opt === '5') {
      console.log('Đã thoát.');
      rl.close();
      process.exit(0);
    }

    if (!['1', '2', '3', '4'].includes(opt)) {
      console.log('\n❌ Lựa chọn không hợp lệ! Vui lòng chỉ nhập đúng số 1, 2, 3, 4 hoặc 5.\n');
      return askOption(); // Cho phép chọn lại, không thoát ra ngoài!
    }

    try {
      if (opt === '1') {
        console.log('\n⚡ Đang tự động tăng số phiên bản Patch (+0.0.1)...');
        execSync('node scripts/bump-version.cjs patch', { cwd: quizAppDir, stdio: 'inherit' });
      } else if (opt === '2') {
        console.log('\n🌟 Đang tự động tăng số phiên bản Minor (+0.1.0)...');
        execSync('node scripts/bump-version.cjs minor', { cwd: quizAppDir, stdio: 'inherit' });
      } else if (opt === '3') {
        console.log('\n🚀 Đang tự động tăng số phiên bản Major (+1.0.0)...');
        execSync('node scripts/bump-version.cjs major', { cwd: quizAppDir, stdio: 'inherit' });
      } else if (opt === '4') {
        console.log('\n📦 Đóng gói giữ nguyên phiên bản hiện tại...');
      }

      console.log('\n' + '='.repeat(68));
      console.log('📦 Đang tiến hành biên dịch và đóng gói Setup .exe (khoảng 30 giây)...');
      console.log('='.repeat(68) + '\n');

      execSync('npm run build:exe', { cwd: quizAppDir, stdio: 'inherit' });

      console.log('\n' + '='.repeat(68));
      console.log('🎉 ĐÓNG GÓI HOÀN TẤT THÀNH CÔNG!');
      console.log('='.repeat(68));
      console.log('Thư mục chứa 3 file phát hành sẽ được mở ngay sau đây...\n');

      try {
        execSync(`explorer "${releaseLatestDir}"`);
      } catch (e) {}

    } catch (err) {
      console.error('\n❌ Lỗi trong quá trình đóng gói:', err.message);
    } finally {
      rl.close();
    }
  });
}

askOption();
