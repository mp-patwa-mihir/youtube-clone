/* eslint-disable no-undef */
import fs from 'fs';
import readline from 'readline';

const packageJsonPath = './version-update.json';

// Function to read and parse package.json content
const readPackageJson = (path) => {
  const content = fs.readFileSync(path, 'utf8');
  return JSON.parse(content);
};

// Function to write updated package.json content
const writePackageJson = (path, content) => {
  fs.writeFileSync(path, JSON.stringify(content, null, 2));
  console.log(`Updated version to ${content.version}`);
};

// Function to update the version based on increment type
const updateVersion = (version, incrementType) => {
  const [major, minor, patch] = version.split('.').map(Number);

  switch (incrementType) {
    case 'major':
    case '1':
      return `${major + 1}.0.0`;
    case 'minor':
    case '2':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    case '3':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
};

// Function to prompt user for increment type with a default fallback
const getIncrementType = () => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Enter the increment type (1. major, 2. minor, or 3. patch): ', (input) => {
      rl.close();
      resolve(input.trim());
    });

    setTimeout(() => {
      if (!rl.input.destroyed) {
        rl.close();
        resolve('patch');
      }
    }, 5000);
  });
};

// Main function to handle version increment process
const processVersionIncrement = async () => {
  const packageJson = readPackageJson(packageJsonPath);
  const incrementType = await getIncrementType();
  packageJson.version = updateVersion(packageJson.version, incrementType);
  writePackageJson(packageJsonPath, packageJson);
};

// Run the process
processVersionIncrement();
