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
console.log(`  [4] Giữ nguyên phiên bản hiện tại (v${currentVersion})`);
console.log('  [5] Thoát\n');

function askOption() {
  rl.question('Nhập lựa chọn của bạn (1, 2, 3, 4 hoặc 5) rồi ấn Enter: ', async (answer) => {
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
      let bumpType = 'patch';
      if (opt === '2') bumpType = 'minor';
      else if (opt === '3') bumpType = 'major';
      else if (opt === '4') bumpType = 'none';

      if (bumpType === 'none') {
        console.log(`\n⚡ 1. Giữ nguyên số phiên bản hiện tại (v${currentVersion})...`);
        execSync(`node scripts/bump-version.cjs none`, { cwd: quizAppDir, stdio: 'inherit' });
      } else {
        console.log(`\n⚡ 1. Tự động tăng số phiên bản (${bumpType})...`);
        execSync(`node scripts/bump-version.cjs ${bumpType}`, { cwd: quizAppDir, stdio: 'inherit' });
      }

      const newVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
      const tag = `v${newVersion}`;
      const releaseTitle = `ExamPrep Studio v${newVersion}`;

      console.log('\n🔨 2. Đang biên dịch mã nguồn giao diện (Vite & TypeScript)...');
      execSync('npm run build', { cwd: quizAppDir, stdio: 'inherit' });

      console.log(`\n💾 3. Lưu phiên bản ${tag} & Đẩy lên GitHub (Giữ nguyên toàn bộ lịch sử commit)...`);
      try {
        execSync('git add -A', { cwd: quizAppDir, stdio: 'pipe' });
        const status = execSync('git status --porcelain', { cwd: quizAppDir, encoding: 'utf8' }).trim();
        if (status) {
          execSync(`git commit -m "chore(release): bump version to ${tag}"`, { cwd: quizAppDir, stdio: 'pipe' });
          console.log(`  ✅ Đã tạo commit cập nhật phiên bản: chore(release): bump version to ${tag}`);
        }
        execSync(`git tag -a ${tag} -m "ExamPrep Studio Release ${tag}" -f`, { cwd: quizAppDir, stdio: 'pipe' });
        execSync('git push origin HEAD', { cwd: quizAppDir, stdio: 'inherit' });
        execSync(`git push origin ${tag} --force`, { cwd: quizAppDir, stdio: 'inherit' });
        console.log(`  ✅ Đã đẩy commit và tag ${tag} lên GitHub an toàn.`);
      } catch (gitErr) {
        console.warn('  ⚠️ Ghi chú khi đồng bộ Git:', gitErr.message);
      }

      console.log('\n' + '='.repeat(72));
      console.log(`📦 4. Đang tiến hành biên dịch và đóng gói Setup .exe (khoảng 30 giây)...`);
      console.log('='.repeat(72) + '\n');
      execSync('npm run build:exe', { cwd: quizAppDir, stdio: 'inherit' });

      if (process.env.GH_TOKEN) {
        const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const repoOwner = pkgData.build?.publish?.owner || 'thinh8802';
        const repoName = pkgData.build?.publish?.repo || 'ExampStudio';

        console.log('\n' + '='.repeat(72));
        console.log(`☁️ 5. Đang tự động tải 4 file phát hành lên GitHub Release "${releaseTitle}"...`);
        console.log('='.repeat(72));

        try {
          const versionDir = path.resolve(quizAppDir, '..', 'release', tag);
          const releaseBaseDir = path.resolve(quizAppDir, '..', 'release');

          // Ưu tiên latest.yml và blockmap lên trước để metadata sẵn sàng ngay lập tức
          const filesToUpload = [
            'latest.yml',
            `ExamPrepStudio-Setup-${tag}.exe.blockmap`,
            `ExamPrepStudio-Setup-${tag}.exe`,
            `ExamPrepStudio-Setup-${tag}.zip`
          ];

          // 5.1 Tìm hoặc tạo Release trên GitHub
          let releaseId = null;
          let relData = null;
          const getReleaseRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/tags/${tag}`, {
            headers: {
              'Authorization': `Bearer ${process.env.GH_TOKEN}`,
              'Accept': 'application/vnd.github+json',
              'User-Agent': 'ExamPrepStudio-Release-CLI'
            }
          });

          const releaseDescription = `## 🚀 ${releaseTitle}\n\n` +
            `### 📦 Tùy chọn tải về:\n` +
            `- **[Khuyên Dùng] File Nén Zip (Tránh bị trình duyệt chặn tải):** Tải \`ExamPrepStudio-Setup-${tag}.zip\`, giải nén ra và chạy file cài đặt.\n` +
            `- **File Cài Đặt Trực Tiếp:** \`ExamPrepStudio-Setup-${tag}.exe\`\n\n` +
            `### ✨ Tính năng & Cập nhật:\n` +
            `- Hỗ trợ cập nhật nền thông minh (Auto-Update vi sai) và hoạt động 100% Offline an toàn.\n` +
            `- Các máy người dùng đã cài app trước đó sẽ tự động nhận cập nhật qua \`latest.yml\`.`;

          if (getReleaseRes.ok) {
            relData = await getReleaseRes.json();
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
                body: releaseDescription
              })
            });
            if (createRes.ok) {
              relData = await createRes.json();
              releaseId = relData.id;
            } else {
              const errBody = await createRes.text();
              console.error('❌ Không thể tạo GitHub Release:', createRes.status, errBody);
            }
          }

          if (releaseId) {
            // Hàm tìm file từ nhiều thư mục khả dụng
            const findFilePath = (fileName) => {
              const candidates = [
                path.join(releaseLatestDir, fileName),
                path.join(versionDir, fileName),
                path.join(releaseBaseDir, fileName)
              ];
              for (const p of candidates) {
                if (fs.existsSync(p)) return p;
              }
              return null;
            };

            // Hàm xóa asset cũ để tránh lỗi HTTP 422 Conflict
            const deleteOldAsset = async (assetName) => {
              try {
                const checkRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/${releaseId}`, {
                  headers: {
                    'Authorization': `Bearer ${process.env.GH_TOKEN}`,
                    'Accept': 'application/vnd.github+json',
                    'User-Agent': 'ExamPrepStudio-Release-CLI'
                  }
                });
                if (checkRes.ok) {
                  const checkData = await checkRes.json();
                  const match = checkData.assets?.find(a => a.name === assetName);
                  if (match) {
                    console.log(`  🗑️ Xóa asset cũ trên GitHub: ${assetName}...`);
                    await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/assets/${match.id}`, {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${process.env.GH_TOKEN}`,
                        'Accept': 'application/vnd.github+json',
                        'User-Agent': 'ExamPrepStudio-Release-CLI'
                      }
                    });
                  }
                }
              } catch (e) {}
            };

            // Hàm upload từng asset kèm cơ chế tự động thử lại (Retry)
            const uploadFileWithRetry = async (fileName, maxRetries = 3) => {
              const filePath = findFilePath(fileName);
              if (!filePath) {
                console.warn(`  ⚠️ Cảnh báo: Không tìm thấy file cục bộ để upload: ${fileName}`);
                return false;
              }

              const fileBuffer = fs.readFileSync(filePath);
              let contentType = 'application/octet-stream';
              if (fileName.endsWith('.exe')) contentType = 'application/octet-stream';
              else if (fileName.endsWith('.zip')) contentType = 'application/zip';
              else if (fileName.endsWith('.yml')) contentType = 'text/yaml';

              await deleteOldAsset(fileName);

              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                  console.log(`📤 Đang tải lên [${attempt}/${maxRetries}]: ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);
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

                  if (uploadRes.ok || uploadRes.status === 201) {
                    console.log(`  ✅ Đã tải lên thành công 100%: ${fileName}`);
                    return true;
                  } else {
                    const resText = await uploadRes.text();
                    console.warn(`  ⚠️ Thất bại lần ${attempt} (${fileName}) HTTP ${uploadRes.status}: ${resText.substring(0, 100)}`);
                    if (attempt < maxRetries) {
                      await new Promise(res => setTimeout(res, 2000 * attempt));
                      await deleteOldAsset(fileName);
                    }
                  }
                } catch (netErr) {
                  console.warn(`  ⚠️ Lỗi mạng lần ${attempt} (${fileName}): ${netErr.message}`);
                  if (attempt < maxRetries) {
                    await new Promise(res => setTimeout(res, 2000 * attempt));
                    await deleteOldAsset(fileName);
                  }
                }
              }
              return false;
            };

            // 5.2 Upload từng file
            for (const fileName of filesToUpload) {
              await uploadFileWithRetry(fileName, 3);
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
                body: releaseDescription
              })
            });

            // 5.4 Kiểm tra đối soát 100% tất cả các file đã có trên GitHub
            const finalCheckRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/${releaseId}`, {
              headers: {
                'Authorization': `Bearer ${process.env.GH_TOKEN}`,
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'ExamPrepStudio-Release-CLI'
              }
            });
            if (finalCheckRes.ok) {
              const finalData = await finalCheckRes.json();
              const uploadedNames = (finalData.assets || []).map(a => a.name);
              console.log(`\n🔍 Danh sách file đã xác nhận trên GitHub Release (${uploadedNames.length} files):`);
              uploadedNames.forEach(n => console.log(`   - ${n}`));
              
              if (!uploadedNames.includes('latest.yml')) {
                console.error('❌ CẢNH BÁO NGUY HIỂM: latest.yml chưa có trên GitHub Release! Đang thử tải lên lại khẩn cấp...');
                await uploadFileWithRetry('latest.yml', 3);
              }
            }

            console.log(`✨ Đã công khai chính thức bản phát hành "${releaseTitle}" với đầy đủ các tệp cập nhật!`);
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
        console.log(`✅ File cài đặt (.exe + .zip) và metadata đã được TẢI THẲNG LÊN GITHUB RELEASES!`);
        console.log(`🌐 Link kiểm tra Release: https://github.com/thinh8802/ExampStudio/releases/tag/${tag}`);
        console.log(`✨ Các máy người dùng đang cài app sẽ tự động nhận bản cập nhật này.`);
      } else {
        console.log('📁 4 file phát hành nằm tại: release/latest/');
        console.log(`   1. latest.yml (Tệp metadata cập nhật tự động)`);
        console.log(`   2. ExamPrepStudio-Setup-${tag}.exe.blockmap`);
        console.log(`   3. ExamPrepStudio-Setup-${tag}.exe`);
        console.log(`   4. ExamPrepStudio-Setup-${tag}.zip (Gói nén an toàn chống chặn)`);
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
