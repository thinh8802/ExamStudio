const fs = require('fs');
const path = require('path');

const releaseDir = path.resolve(__dirname, '..', '..', 'release');

if (!fs.existsSync(releaseDir)) {
  console.log('[Release Organizer] Release directory does not exist yet.');
  process.exit(0);
}

console.log('[Release Organizer] Organizing release directory for NSIS & Auto-Updater...');

// 1. Remove unwanted temporary build debug files from release root
const junkFiles = ['builder-debug.yml', 'builder-effective-config.yaml'];
junkFiles.forEach(file => {
  const filePath = path.join(releaseDir, file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`[Release Organizer] Removed debug junk file: ${file}`);
    } catch (e) {}
  }
});

// 2. Identify all versioned executables and group them into release/vX.Y.Z/
const exeRegex = /(?:ExamPrepStudio|ExamStudio)-(?:Setup|Portable)-v(\d+\.\d+\.\d+)\.exe$/i;
const versionMap = new Map(); // version -> [files]

fs.readdirSync(releaseDir).forEach(item => {
  const itemPath = path.join(releaseDir, item);
  const stat = fs.statSync(itemPath);

  if (stat.isFile()) {
    const match = item.match(exeRegex);
    if (match) {
      const version = `v${match[1]}`;
      if (!versionMap.has(version)) {
        versionMap.set(version, []);
      }
      versionMap.get(version).push(item);
      
      // Also associate corresponding blockmap if exists
      const blockmapFile = `${item}.blockmap`;
      if (fs.existsSync(path.join(releaseDir, blockmapFile))) {
        versionMap.get(version).push(blockmapFile);
      }
    }
  }
});

// Also associate latest.yml if present at release root
const latestYmlPath = path.join(releaseDir, 'latest.yml');

// Move files into their respective version folders with retry
versionMap.forEach((fileList, version) => {
  const versionFolder = path.join(releaseDir, version);
  if (!fs.existsSync(versionFolder)) {
    fs.mkdirSync(versionFolder, { recursive: true });
  }

  fileList.forEach(file => {
    const srcPath = path.join(releaseDir, file);
    const destPath = path.join(versionFolder, file);
    if (fs.existsSync(srcPath)) {
      let moved = false;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          fs.copyFileSync(srcPath, destPath);
          try { fs.unlinkSync(srcPath); } catch (e) {}
          console.log(`[Release Organizer] Successfully moved ${file} -> ${version}/`);
          moved = true;
          break;
        } catch (err) {
          if (attempt === 5) {
            console.warn(`[Release Organizer] Warning: Could not move ${file} after 5 attempts: ${err.message}`);
          } else {
            const waitMs = 500 * attempt;
            const start = Date.now();
            while (Date.now() - start < waitMs) {}
          }
        }
      }
    }
  });

  // Copy latest.yml into versionFolder as well
  if (fs.existsSync(latestYmlPath)) {
    try {
      fs.copyFileSync(latestYmlPath, path.join(versionFolder, 'latest.yml'));
      console.log(`[Release Organizer] Preserved latest.yml -> ${version}/`);
    } catch (e) {}
  }
});

// 3. Quản lý số lượng phiên bản lưu trữ (Giữ tối đa 3 bản mới nhất, tự động xóa các bản cũ hơn)
const MAX_KEPT_VERSIONS = 3;
const versionFolders = fs.readdirSync(releaseDir).filter(name => {
  return /^v\d+\.\d+\.\d+$/.test(name) && fs.statSync(path.join(releaseDir, name)).isDirectory();
});

function compareSemVer(a, b) {
  const numA = a.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const numB = b.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if (numA[i] > numB[i]) return 1;
    if (numA[i] < numB[i]) return -1;
  }
  return 0;
}

versionFolders.sort(compareSemVer); // Sắp xếp tăng dần

// Xóa các thư mục phiên bản cũ vượt quá giới hạn MAX_KEPT_VERSIONS
if (versionFolders.length > MAX_KEPT_VERSIONS) {
  const foldersToDelete = versionFolders.slice(0, versionFolders.length - MAX_KEPT_VERSIONS);
  foldersToDelete.forEach(oldFolder => {
    const oldFolderPath = path.join(releaseDir, oldFolder);
    try {
      fs.rmSync(oldFolderPath, { recursive: true, force: true });
      console.log(`[Release Organizer] Deleted old version to save disk space: ${oldFolder}/`);
    } catch (e) {
      console.error(`[Release Organizer] Failed to delete ${oldFolder}:`, e);
    }
  });
}

// Cập nhật lại danh sách các folder phiên bản còn tồn tại
const remainingVersionFolders = fs.readdirSync(releaseDir).filter(name => {
  return /^v\d+\.\d+\.\d+$/.test(name) && fs.statSync(path.join(releaseDir, name)).isDirectory();
});
remainingVersionFolders.sort(compareSemVer);

// 4. Đồng bộ phiên bản mới nhất vào thư mục release/latest/ (Giữ nguyên tên theo số phiên bản vX.Y.Z và latest.yml)
if (remainingVersionFolders.length > 0) {
  const latestVersion = remainingVersionFolders[remainingVersionFolders.length - 1];
  const latestDir = path.join(releaseDir, 'latest');

  if (!fs.existsSync(latestDir)) {
    fs.mkdirSync(latestDir, { recursive: true });
  }

  // Xóa các file cũ trong release/latest/ (trừ thư mục data nếu có)
  fs.readdirSync(latestDir).forEach(item => {
    const itemPath = path.join(latestDir, item);
    if (fs.statSync(itemPath).isFile()) {
      try {
        fs.unlinkSync(itemPath);
      } catch (e) {}
    }
  });

  // Copy các file từ thư mục latestVersion sang latest/
  const latestSourceDir = path.join(releaseDir, latestVersion);
  const latestFiles = fs.readdirSync(latestSourceDir);

  latestFiles.forEach(file => {
    const src = path.join(latestSourceDir, file);
    const dest = path.join(latestDir, file);
    try {
      fs.copyFileSync(src, dest);
      console.log(`[Release Organizer] Đã cập nhật vào release/latest/${file}`);
    } catch (err) {
      if (err.code === 'EBUSY') {
        console.log(`[Release Organizer] Lưu ý: File ${file} trong latest đang chạy.`);
      } else {
        console.error(`[Release Organizer] Lỗi khi copy ${file}:`, err.message);
      }
    }
  });

  // Also preserve latest.yml at release/latest/latest.yml
  if (fs.existsSync(latestYmlPath)) {
    try {
      fs.copyFileSync(latestYmlPath, path.join(latestDir, 'latest.yml'));
      // Remove latest.yml at root once copied
      try { fs.unlinkSync(latestYmlPath); } catch (e) {}
      console.log(`[Release Organizer] Đã chuyển latest.yml vào release/latest/`);
    } catch (e) {}
  }

  // 5. Cập nhật RELEASES.md tổng hợp
  const readmeContent = `# ExamPrep Studio Releases

### 🌟 Phiên Bản Mới Nhất: ${latestVersion}
- 📁 **Thư mục Nhanh (Latest)**: \`release/latest/\`
  - \`ExamStudio-Setup-${latestVersion}.exe\` (Bản Cài Đặt NSIS cho Auto Update)
  - \`latest.yml\` (Metadata cần thiết cho Auto-Updater)
  - \`ExamStudio-Setup-${latestVersion}.exe.blockmap\` (Dữ liệu tải vi sai)

- 📁 **Thư mục Lưu Trữ**: \`release/${latestVersion}/\`

### 📚 Danh Sách Các Bản Phát Hành (${remainingVersionFolders.length} bản gần nhất):
${remainingVersionFolders.slice().reverse().map(v => `- [${v}](./${v}/): \`ExamStudio-Setup-${v}.exe\``).join('\n')}
`;
  fs.writeFileSync(path.join(releaseDir, 'RELEASES.md'), readmeContent, 'utf8');
}

console.log('[Release Organizer] Hoàn tất tổ chức thư mục release!');
