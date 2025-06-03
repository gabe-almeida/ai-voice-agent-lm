#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Pre-Deployment Checklist for Render.com\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function checkMark(passed: boolean, warning = false): string {
  if (passed) {
    checks.passed++;
    return '✅';
  } else if (warning) {
    checks.warnings++;
    return '⚠️';
  } else {
    checks.failed++;
    return '❌';
  }
}

// Check 1: TypeScript compilation
console.log('1. Checking TypeScript compilation...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log(`${checkMark(true)} TypeScript compiles successfully`);
} catch (error) {
  console.log(`${checkMark(false)} TypeScript compilation failed`);
  console.log('   Run "npm run build" to see errors');
}

// Check 2: Required files exist
console.log('\n2. Checking required files...');
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'render.yaml',
  '.gitignore',
  'src/index.ts',
  'src/app.ts',
  'src/config/index.ts'
];

requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`${checkMark(exists)} ${file}`);
});

// Check 3: Environment variables
console.log('\n3. Checking environment variables...');
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER'
];

const envExample = fs.existsSync('.env.example');
const envProduction = fs.existsSync('.env.production.example');
console.log(`${checkMark(envExample)} .env.example exists`);
console.log(`${checkMark(envProduction)} .env.production.example exists`);

// Check 4: Dependencies
console.log('\n4. Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const criticalDeps = [
  'express',
  'ws',
  'twilio',
  'openai',
  'dotenv',
  'cors'
];

criticalDeps.forEach(dep => {
  const hasDep = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
  console.log(`${checkMark(!!hasDep)} ${dep} dependency`);
});

// Check 5: Build output
console.log('\n5. Checking build output...');
const distExists = fs.existsSync('dist');
const distHasFiles = distExists && fs.readdirSync('dist').length > 0;
console.log(`${checkMark(distExists)} dist/ directory exists`);
console.log(`${checkMark(distHasFiles)} dist/ contains files`);

// Check 6: Port configuration
console.log('\n6. Checking port configuration...');
const configFile = fs.readFileSync('src/config/index.ts', 'utf-8');
const hasPortConfig = configFile.includes('process.env.PORT');
console.log(`${checkMark(hasPortConfig)} PORT environment variable used`);

// Check 7: Health endpoint
console.log('\n7. Checking health endpoint...');
const healthRouteExists = fs.existsSync('src/routes/health.routes.ts');
console.log(`${checkMark(healthRouteExists)} Health route exists`);

// Check 8: WebSocket support
console.log('\n8. Checking WebSocket configuration...');
const wsServerExists = fs.existsSync('src/websocket/server.ts');
const wsOpenAIExists = fs.existsSync('src/websocket/openai-realtime.ws.ts');
console.log(`${checkMark(wsServerExists)} WebSocket server exists`);
console.log(`${checkMark(wsOpenAIExists)} OpenAI WebSocket handler exists`);

// Check 9: Knowledge base
console.log('\n9. Checking knowledge base...');
const knowledgeBaseExists = fs.existsSync('data/knowledge-base.json');
if (knowledgeBaseExists) {
  const kb = JSON.parse(fs.readFileSync('data/knowledge-base.json', 'utf-8'));
  const hasContent = kb.companyInfo && kb.services && kb.faqs;
  console.log(`${checkMark(hasContent)} Knowledge base has content`);
} else {
  console.log(`${checkMark(false, true)} Knowledge base file missing (optional)`);
}

// Check 10: Git status
console.log('\n10. Checking Git status...');
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
  const isClean = gitStatus.trim() === '';
  console.log(`${checkMark(isClean, !isClean)} Git repository ${isClean ? 'clean' : 'has uncommitted changes'}`);
  
  const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  console.log(`${checkMark(true)} Current branch: ${branch}`);
} catch (error) {
  console.log(`${checkMark(false)} Git not initialized`);
}

// Summary
console.log('\n📊 Summary:');
console.log(`✅ Passed: ${checks.passed}`);
console.log(`⚠️  Warnings: ${checks.warnings}`);
console.log(`❌ Failed: ${checks.failed}`);

if (checks.failed === 0) {
  console.log('\n🎉 Your application is ready for deployment to Render!');
  console.log('\nNext steps:');
  console.log('1. Commit and push your changes to GitHub');
  console.log('2. Follow the deployment guide in docs/RENDER_DEPLOYMENT_GUIDE.md');
  console.log('3. Set up environment variables in Render dashboard');
  console.log('4. Deploy and test your application');
} else {
  console.log('\n⚠️  Please fix the failed checks before deploying.');
  console.log('Refer to docs/RENDER_DEPLOYMENT_GUIDE.md for help.');
}

// Additional tips
console.log('\n💡 Pro Tips:');
console.log('- Use "npm run build" locally to catch TypeScript errors early');
console.log('- Test WebSocket connections locally before deploying');
console.log('- Monitor your API usage costs closely in production');
console.log('- Set up alerts in Render for error monitoring');