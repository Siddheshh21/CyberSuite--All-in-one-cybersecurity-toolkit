// Script to check if the frontend is correctly using the environment variables for API calls
const fs = require('fs');
const path = require('path');

// Define paths
const frontendDir = path.join(__dirname, 'cyber-suite-frontend', 'vite-project');
const envFilePath = path.join(frontendDir, '.env');
const srcDir = path.join(frontendDir, 'src');

// Check if .env file exists and contains the correct API base URL
function checkEnvFile() {
  console.log('Checking .env file...');
  
  try {
    if (fs.existsSync(envFilePath)) {
      const envContent = fs.readFileSync(envFilePath, 'utf8');
      console.log('Environment variables:');
      console.log(envContent);
      
      if (envContent.includes('VITE_API_BASE_URL=https://cybersuite-all-in-one-cybersecurity-toolkit-production.up.railway.app')) {
        console.log('✅ .env file contains the correct API base URL');
        return true;
      } else {
        console.log('❌ .env file does not contain the correct API base URL');
        return false;
      }
    } else {
      console.log('❌ .env file does not exist');
      return false;
    }
  } catch (error) {
    console.error('Error checking .env file:', error.message);
    return false;
  }
}

// Find all files that use the API base URL
function findApiUsage() {
  console.log('\nFinding files that use the API base URL...');
  
  const apiFiles = [];
  
  function searchDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        searchDirectory(filePath);
      } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes('import.meta.env.VITE_API_BASE_URL') || 
            content.includes('process.env.VITE_API_BASE_URL') || 
            content.includes('API_BASE_URL')) {
          apiFiles.push({
            path: filePath,
            relativePath: path.relative(__dirname, filePath)
          });
        }
      }
    }
  }
  
  try {
    searchDirectory(srcDir);
    
    if (apiFiles.length > 0) {
      console.log(`Found ${apiFiles.length} files that use the API base URL:`);
      apiFiles.forEach(file => {
        console.log(`- ${file.relativePath}`);
      });
      return true;
    } else {
      console.log('❌ No files found that use the API base URL');
      return false;
    }
  } catch (error) {
    console.error('Error finding API usage:', error.message);
    return false;
  }
}

// Check if vite.config.js contains the correct proxy configuration
function checkViteConfig() {
  console.log('\nChecking vite.config.js...');
  
  const viteConfigPath = path.join(frontendDir, 'vite.config.js');
  
  try {
    if (fs.existsSync(viteConfigPath)) {
      const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
      
      if (viteConfig.includes('https://cybersuite-all-in-one-cybersecurity-toolkit-production.up.railway.app')) {
        console.log('✅ vite.config.js contains the correct proxy target');
        return true;
      } else {
        console.log('❌ vite.config.js does not contain the correct proxy target');
        return false;
      }
    } else {
      console.log('❌ vite.config.js does not exist');
      return false;
    }
  } catch (error) {
    console.error('Error checking vite.config.js:', error.message);
    return false;
  }
}

// Run all checks
function runChecks() {
  console.log('=== Frontend Environment Check ===\n');
  
  const envCheck = checkEnvFile();
  const apiUsageCheck = findApiUsage();
  const viteConfigCheck = checkViteConfig();
  
  console.log('\n=== Summary ===');
  console.log(`Environment variables: ${envCheck ? '✅' : '❌'}`);
  console.log(`API usage: ${apiUsageCheck ? '✅' : '❌'}`);
  console.log(`Vite config: ${viteConfigCheck ? '✅' : '❌'}`);
  
  if (envCheck && apiUsageCheck && viteConfigCheck) {
    console.log('\n✅ All checks passed! The frontend is correctly configured to use the backend API.');
  } else {
    console.log('\n❌ Some checks failed. The frontend may not be correctly configured to use the backend API.');
  }
}

runChecks();