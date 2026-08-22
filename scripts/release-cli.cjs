const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const quizAppDir = path.resolve(__dirname, '..');
const releaseLatestDir = path.resolve(quizAppDir, '..', 'release', 'latest');
const pkgPath = path.resolve(quizAppDir, 'package.json');
const envPath = path.resolve(quizAppDir, '.env');

// Auto-load GH_TOKEN from .env file if available
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
      if (key.trim()) {
        process.env[key.trim()] = val;
      }
    }
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const currentVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || '3.0.5';

console.log('\n' + '='.repeat(72));
console.log('    🚀 EXAMPREP STUDIO - TỰ ĐỘNG PHÁT HÀNH BẢN CẬP NHẬT 100% (1-CLICK)');
console.log('='.repeat(72));
console.log(`📌 Phiên bản hiện tại: v${currentVersion}`);
if (process.env.GH_TOKEN) {
  console.log('🔑 Trạng thái Token GitHub: ĐÃ KẾT NỐI (Tự động tải lên Release 100%)');
} else {
  console.log('⚠️ Trạng thái Token GitHub: Chưa phát hiện GH_TOKEN (Sẽ mở thư mục để kéo thả thủ công)');
}
console.log('\nChọn loại bản cập nhật:');
console.log('  [1] Bản vá lỗi / Tối ưu nhỏ (Patch: +0.0.1)  [KHUYÊN DÙNG]');
console.log('  [2] Bản bổ sung tính năng mới (Minor: +0.1.0)');
console.log('  [3] Bản nâng cấp lớn / Đột phá (Major: +1.0.0)');
console.log('  [4] Thoát\n');

function askOption() {
  rl.question('Nhập lựa chọn của bạn (1, 2, 3 hoặc 4) rồi ấn Enter: ', async (answer) => {
    const opt = answer.trim();

    if (opt === '4') {
      console.log('Đã thoát.');
      rl.close();
      process.exit(0);
    }

    if (!['1', '2', '3'].includes(opt)) {
      console.log('\n❌ Lựa chọn không hợp lệ! Vui lòng chỉ nhập đúng số 1, 2, 3 hoặc 4.\n');
      return askOption(); // Cho phép chọn lại, không thoát ra ngoài!
    }

    try {
      let bumpType = 'patch';
      if (opt === '2') bumpType = 'minor';
      else if (opt === '3') bumpType = 'major';

      console.log(`\n⚡ 1. Tự động tăng số phiên bản (${bumpType})...`);
      execSync(`node scripts/bump-version.cjs ${bumpType}`, { cwd: quizAppDir, stdio: 'inherit' });

      const newVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
      const tag = `v${newVersion}`;
      const releaseTitle = `ExamPrep Studio v${newVersion}`;

      console.log('\n🔨 2. Đang biên dịch mã nguồn giao diện (Vite & TypeScript)...');
      execSync('npm run build', { cwd: quizAppDir, stdio: 'inherit' });

      console.log(`\n💾 3. Đồng bộ 100% tất cả các file về phiên bản ${tag} & Đẩy lên GitHub...`);
      const tempBranch = `clean_${Date.now()}`;
      execSync(`git checkout --orphan ${tempBranch}`, { cwd: quizAppDir, stdio: 'pipe' });
      execSync('git add -A', { cwd: quizAppDir, stdio: 'pipe' });
      execSync(`git commit -m "ExamPrep Studio ${tag} - Official Production Release"`, { cwd: quizAppDir, stdio: 'pipe' });
      execSync('git branch -D master', { cwd: quizAppDir, stdio: 'pipe' });
      execSync('git branch -m master', { cwd: quizAppDir, stdio: 'pipe' });
      execSync(`git tag -a ${tag} -m "ExamPrep Studio Release ${tag}" -f`, { cwd: quizAppDir, stdio: 'pipe' });
      execSync('git push -f origin master', { cwd: quizAppDir, stdio: 'inherit' });
      execSync(`git push origin ${tag} --force`, { cwd: quizAppDir, stdio: 'inherit' });

      console.log('\n' + '='.repeat(72));
      console.log(`📦 4. Đang tiến hành biên dịch và đóng gói Setup .exe (khoảng 30 giây)...`);
      console.log('='.repeat(72) + '\n');
      execSync('npm run build:exe', { cwd: quizAppDir, stdio: 'inherit' });

      if (process.env.GH_TOKEN) {
        const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const repoOwner = pkgData.build?.publish?.owner || 'thinh8802';
        const repoName = pkgData.build?.publish?.repo || 'ExampStudio';

        console.log('\n' + '='.repeat(72));
        console.log(`☁️ 5. Đang tự động tải 3 file phát hành lên GitHub Release "${releaseTitle}"...`);
        console.log('='.repeat(72));

        try {
          // 5.1 Tìm hoặc tạo Release trên GitHub
          let releaseId = null;
          const getReleaseRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/tags/${tag}`, {
            headers: {
              'Authorization': `Bearer ${process.env.GH_TOKEN}`,
              'Accept': 'application/vnd.github+json',
              'User-Agent': 'ExamPrepStudio-Release-CLI'
            }
          });

          if (getReleaseRes.ok) {
            const relData = await getReleaseRes.json();
            releaseId = relData.id;
          } else {
            const createRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.GH_TOKEN}`,
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'ExamPrepStudio-Release-CLI',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                tag_name: tag,
                name: releaseTitle,
                draft: false,
                prerelease: false,
                body: `## 🚀 ${releaseTitle}\n\n- Bản phát hành chính thức tự động của **ExamPrep Studio**.\n- Hỗ trợ cập nhật nền thông minh (Auto-Update vi sai) và hoạt động 100% Offline an toàn.`
              })
            });
            if (createRes.ok) {
              const newRelData = await createRes.json();
              releaseId = newRelData.id;
            }
          }

          if (releaseId) {
            // 5.2 Upload từng file trực tiếp từ thư mục release/latest/
            const filesToUpload = [
              `ExamPrepStudio-Setup-${tag}.exe`,
              `latest.yml`,
              `ExamPrepStudio-Setup-${tag}.exe.blockmap`
            ];

            for (const fileName of filesToUpload) {
              const filePath = path.join(releaseLatestDir, fileName);
              if (fs.existsSync(filePath)) {
                const fileBuffer = fs.readFileSync(filePath);
                const contentType = fileName.endsWith('.exe') ? 'application/octet-stream' : (fileName.endsWith('.yml') ? 'text/yaml' : 'application/octet-stream');
                console.log(`📤 Đang tải lên: ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);

                const uploadRes = await fetch(`https://uploads.github.com/repos/${repoOwner}/${repoName}/releases/${releaseId}/assets?name=${encodeURIComponent(fileName)}`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${process.env.GH_TOKEN}`,
                    'Accept': 'application/vnd.github+json',
                    'User-Agent': 'ExamPrepStudio-Release-CLI',
                    'Content-Type': contentType,
                    'Content-Length': fileBuffer.length.toString()
                  },
                  body: fileBuffer
                });

                if (uploadRes.ok) {
                  console.log(`  ✅ Đã tải lên thành công: ${fileName}`);
                } else {
                  console.log(`  ⚠️ Ghi chú upload (${fileName}):`, uploadRes.status);
                }
              }
            }

            // 5.3 Cập nhật trạng thái Public và tiêu đề chuẩn
            await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/${releaseId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${process.env.GH_TOKEN}`,
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'ExamPrepStudio-Release-CLI',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: releaseTitle,
                draft: false,
                prerelease: false,
                body: `## 🚀 ${releaseTitle}\n\n- Bản phát hành chính thức tự động của **ExamPrep Studio**.\n- Hỗ trợ cập nhật nền thông minh (Auto-Update vi sai) và hoạt động 100% Offline an toàn.`
              })
            });
            console.log(`✨ Đã công khai chính thức bản phát hành "${releaseTitle}" với đầy đủ 3 files!`);
          }
        } catch (apiErr) {
          console.error('❌ Lỗi upload lên GitHub Releases:', apiErr.message);
        }
      }

      console.log('\n📁 6. Tổ chức & dọn dẹp thư mục phát hành...');
      execSync('node scripts/organize-release.cjs', { cwd: quizAppDir, stdio: 'inherit' });

      console.log('\n' + '='.repeat(72));
      console.log(`🎉 PHÁT HÀNH THÀNH CÔNG PHIÊN BẢN ${releaseTitle}!`);
      console.log('='.repeat(72));
      if (process.env.GH_TOKEN) {
        console.log(`✅ File cài đặt và file chỉ dẫn cập nhật đã được TẢI THẲNG LÊN GITHUB RELEASES!`);
        console.log(`🌐 Link kiểm tra Release: https://github.com/thinh8802/ExamStudio/releases/tag/${tag}`);
        console.log(`✨ Các máy người dùng đang cài app sẽ tự động nhận bản cập nhật này.`);
      } else {
        console.log('📁 3 file phát hành nằm tại: release/latest/');
        console.log(`   1. ExamPrepStudio-Setup-${tag}.exe`);
        console.log(`   2. latest.yml`);
        console.log(`   3. ExamPrepStudio-Setup-${tag}.exe.blockmap`);
        console.log('\n✨ Đang mở thư mục release/latest để bạn kéo thả lên GitHub...');
        try {
          execSync(`explorer "${releaseLatestDir}"`);
        } catch (e) {}
      }
      console.log('='.repeat(72) + '\n');

    } catch (err) {
      console.error('\n❌ Lỗi trong quá trình phát hành:', err.message);
    } finally {
      rl.close();
    }
  });
}

askOption();
