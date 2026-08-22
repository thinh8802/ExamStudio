const fs = require('fs');
const path = require('path');

// Root directories
const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const versionTsPath = path.join(rootDir, 'src', 'constants', 'version.ts');

/**
 * Increment SemVer version: [major, minor, patch]
 * Supports infinite numerical growth without ceiling.
 */
function bump(versionStr, type = 'patch') {
  const parts = versionStr.split('.').map(num => parseInt(num, 10) || 0);
  while (parts.length < 3) parts.push(0);

  let [major, minor, patch] = parts;

  if (type === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    // patch
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

// 1. Read current version from package.json
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = pkg.version || '2.0.1';
const bumpType = process.argv[2] || 'patch'; // 'patch' | 'minor' | 'major' | explicit version string

let newVersion;
if (['patch', 'minor', 'major'].includes(bumpType)) {
  newVersion = bump(currentVersion, bumpType);
} else if (/^\d+\.\d+\.\d+$/.test(bumpType)) {
  newVersion = bumpType;
} else if (['none', 'current', 'same'].includes(bumpType)) {
  newVersion = currentVersion;
} else {
  newVersion = bump(currentVersion, 'patch');
}

if (newVersion === currentVersion) {
  console.log(`[Version Manager] Giữ nguyên phiên bản: ${currentVersion}`);
} else {
  console.log(`[Version Manager] Bumping version: ${currentVersion} -> ${newVersion} (${bumpType})`);
}

// 2. Update package.json
pkg.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// 3. Update src/constants/version.ts
const today = new Date().toISOString().split('T')[0];
const versionTsContent = `// =========================================================
// ExamPrep Studio - Single Source of Truth for Versioning
// Formatted as MAJOR.MINOR.PATCH (Infinite SemVer)
// =========================================================

export const APP_VERSION = '${newVersion}';
export const APP_NAME = 'ExamPrep Studio';
export const APP_DISPLAY_VERSION = \`v\${APP_VERSION}\`;
export const APP_BUILD_DATE = '${today}';
export const APP_AUTHOR = 'Đào Đức Thịnh';
export const APP_CONTACT = 'daothinh636@gmail.com';
export const APP_FACEBOOK = 'https://www.facebook.com/yoreis06/';
`;
fs.writeFileSync(versionTsPath, versionTsContent, 'utf8');

// 4. Update README.md in workspace root if exists
const readmePath = path.resolve(rootDir, '..', 'README.md');
if (fs.existsSync(readmePath)) {
  let readmeContent = fs.readFileSync(readmePath, 'utf8');
  // Cập nhật tên file setup: ExamPrepStudio-Setup-vX.Y.Z.exe
  readmeContent = readmeContent.replace(
    /ExamPrepStudio-Setup-v\d+\.\d+\.\d+\.exe/g,
    `ExamPrepStudio-Setup-v${newVersion}.exe`
  );
  fs.writeFileSync(readmePath, readmeContent, 'utf8');
  console.log(`[Version Manager] Synchronized version ${newVersion} into README.md!`);
}

console.log(`[Version Manager] Successfully synchronized version ${newVersion} across all project files!`);
