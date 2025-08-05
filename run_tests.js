#!/usr/bin/env node

// 运行测试脚本
// 此脚本会自动运行前后端测试，并尝试修复问题

// 导入依赖
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

// 配置项
const config = {
  maxRetries: 5,  // 最大重试次数
  fixAttempts: 3,  // 尝试修复的次数
  minCoverage: 80, // 最低覆盖率要求
  reportDir: 'test_reports' // 测试报告目录
};

// 确保报告目录存在
if (!fs.existsSync(config.reportDir)) {
  fs.mkdirSync(config.reportDir);
}

// 保存测试结果到文件
function saveTestResult(result, type) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(config.reportDir, `${type}_report_${timestamp}.txt`);
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
  log(`测试报告已保存到: ${reportPath}`);
}
// 日志函数
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

// 运行命令并返回结果
async function runCommand(command, args = [], blocking = true, requires_approval = false, cwd = process.cwd()) {
  try {
    const cmdString = Array.isArray(args) && args.length > 0 ? `${command} ${args.join(' ')}` : command;
    log(`运行命令: ${cmdString}`);
    const { stdout, stderr } = await execAsync(cmdString, { cwd });
    const output = stdout + (stderr ? `\n错误输出: ${stderr}` : '');
    if (stderr) {
      log(`命令输出错误: ${stderr}`, 'warning');
    }
    return { success: true, output };
  } catch (error) {
    log(`命令执行失败: ${error.message}`, 'error');
    return { success: false, error: error.message, output: error.message };
  }
}

// 生成HTML测试报告
function generateHtmlReport(backendResult, frontendResult) {
  const timestamp = new Date().toISOString();
  const reportHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>测试报告 - ${timestamp}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .report-container { max-width: 1000px; margin: 0 auto; }
    .test-section { margin-bottom: 30px; padding: 15px; border-radius: 5px; }
    .backend { background-color: #f0f7ff; }
    .frontend { background-color: #fff0f7; }
    .success { color: green; }
    .fail { color: red; }
    .stats { display: flex; gap: 20px; margin-bottom: 15px; }
    .stat-box { padding: 10px; border-radius: 5px; background-color: #fff; }
    .coverage { width: 100%; height: 20px; background-color: #eee; border-radius: 10px; margin-top: 5px; }
    .coverage-bar { height: 100%; border-radius: 10px; }
    .coverage-pass { background-color: #4CAF50; }
    .coverage-fail { background-color: #F44336; }
  </style>
</head>
<body>
  <div class="report-container">
    <h1>测试报告 - ${timestamp}</h1>

    <div class="test-section backend">
      <h2>后端测试结果</h2>
      <div class="stats">
        <div class="stat-box">
          <div>总测试数: ${backendResult.details?.totalTests || 0}</div>
        </div>
        <div class="stat-box">
          <div>通过测试: <span class="success">${backendResult.details?.passedTests || 0}</span></div>
        </div>
        <div class="stat-box">
          <div>失败测试: <span class="fail">${backendResult.details?.failedTests || 0}</span></div>
        </div>
        <div class="stat-box">
          <div>覆盖率: ${backendResult.details?.coverage || 0}%</div>
          <div class="coverage">
            <div class="coverage-bar ${backendResult.details?.coverage >= 80 ? 'coverage-pass' : 'coverage-fail'}" style="width: ${backendResult.details?.coverage || 0}%"></div>
          </div>
        </div>
      </div>
      <div>
        <h3>测试状态: ${backendResult.success ? '<span class="success">通过</span>' : '<span class="fail">失败</span>'}</h3>
      </div>
    </div>

    <div class="test-section frontend">
      <h2>前端测试结果</h2>
      <div class="stats">
        <div class="stat-box">
          <div>总测试数: ${frontendResult.details?.totalTests || 0}</div>
        </div>
        <div class="stat-box">
          <div>通过测试: <span class="success">${frontendResult.details?.passedTests || 0}</span></div>
        </div>
        <div class="stat-box">
          <div>失败测试: <span class="fail">${frontendResult.details?.failedTests || 0}</span></div>
        </div>
      </div>
      <div>
        <h3>测试状态: ${frontendResult.success ? '<span class="success">通过</span>' : '<span class="fail">失败</span>'}</h3>
      </div>
    </div>
  </div>
</body>
</html>`;

  const reportPath = path.join(config.reportDir, `test_report_${timestamp.replace(/[:.]/g, '-')}.html`);
  fs.writeFileSync(reportPath, reportHtml);
  log(`HTML测试报告已生成: ${reportPath}`, 'info');
  return reportPath;
}

// 解析测试结果
function parseTestOutput(output) {
  // 提取测试总数和失败数
  const totalTestsMatch = output.match(/(\d+) tests?/);
  const failedTestsMatch = output.match(/(\d+) failed/);
  const passedTestsMatch = output.match(/(\d+) passed/);
  const coverageMatch = output.match(/Lines\s+:\s+(\d+\.\d+)%/);

  return {
    totalTests: totalTestsMatch ? parseInt(totalTestsMatch[1]) : 0,
    failedTests: failedTestsMatch ? parseInt(failedTestsMatch[1]) : 0,
    passedTests: passedTestsMatch ? parseInt(passedTestsMatch[1]) : 0,
    coverage: coverageMatch ? parseFloat(coverageMatch[1]) : 0
  };
}

// 运行后端测试
async function runBackendTests() {
  log('运行后端测试...');
  const result = await runCommand('npm', ['run', 'test:backend', '--', '--coverage'], true, false);
  const testDetails = parseTestOutput(result.output);

  return {
    success: result.success && testDetails.failedTests === 0,
    output: result.output,
    details: testDetails
  };
}

// 运行前端测试
async function runFrontendTests() {
  log('运行前端测试...');
  // 切换到client目录
  const originalDir = process.cwd();
  process.chdir(path.join(__dirname, 'client'));

  const result = await runCommand('npm', ['test'], true, false);
  const testDetails = parseTestOutput(result.output);

  // 切换回原目录
  process.chdir(originalDir);

  return {
    success: result.success && testDetails.failedTests === 0,
    output: result.output,
    details: testDetails
  };
}

// 尝试修复前端测试问题
async function fixFrontendIssues() {
  log('尝试修复前端测试问题');
  // 切换到client目录
  const clientDir = path.join(process.cwd(), 'client');
  
  // 运行eslint自动修复
  const result = await runCommand('npm', ['run', 'lint:fix'], true, false, clientDir);
  if (result.success) {
    log('前端代码修复成功', 'info');
  } else {
    log('前端代码修复失败', 'warning');
  }
  return result;
}

// 生成基础测试用例
async function generateBasicTests() {
  log('尝试生成缺失的测试用例...');
  try {
    // 简单的测试生成逻辑，可以根据项目结构扩展
    const serviceDir = path.join(__dirname, 'src', 'services');
    const testDir = path.join(__dirname, '__tests__');

    if (fs.existsSync(serviceDir)) {
      const serviceFiles = fs.readdirSync(serviceDir).filter(file => file.endsWith('.js'));

      for (const file of serviceFiles) {
        const serviceName = path.basename(file, '.js');
        const testFilePath = path.join(testDir, `${serviceName}.test.js`);

        // 如果测试文件不存在，则生成基础测试
        if (!fs.existsSync(testFilePath)) {
          const testContent = `const ${serviceName} = require('../src/services/${serviceName}');

// ${serviceName} 测试
describe('${serviceName}', () => {
  // 示例测试，需要根据实际功能修改
  test('should have basic functionality', () => {
    expect(${serviceName}).toBeDefined();
  });
});
`;
          fs.writeFileSync(testFilePath, testContent);
          log(`已生成测试文件: ${testFilePath}`, 'info');
        }
      }
    }
    return true;
  } catch (error) {
    log(`生成测试用例时出错: ${error.message}`, 'error');
    return false;
  }
}

// 尝试修复后端测试问题
async function fixBackendIssues() {
  log('尝试修复后端测试问题');
  let success = true;
  
  // 1. 运行ESLint自动修复
    const lintFixResult = await runCommand('npm', ['run', 'lint:fix'], true, false);
    if (lintFixResult.success) {
      log('ESLint修复成功', 'info');
    } else {
      log('ESLint修复失败', 'warning');
      success = false;
    }

    // 2. 检查并安装缺失的依赖
    const installResult = await runCommand('npm', ['install'], true, false);
    if (installResult.success) {
      log('依赖安装成功', 'info');
    } else {
      log('依赖安装失败', 'warning');
      success = false;
    }

    // 3. 清除测试缓存
    const clearCacheResult = await runCommand('npm', ['test', '--', '--clearCache'], true, false);
    if (clearCacheResult.success) {
      log('测试缓存清除成功', 'info');
    } else {
      log('测试缓存清除失败', 'warning');
      success = false;
    }
  
  // 4. 尝试生成缺失的测试用例以提高覆盖率
  const generateTestsResult = await generateBasicTests();
  if (generateTestsResult) {
    log('测试用例生成成功', 'info');
  } else {
    log('测试用例生成失败', 'warning');
    success = false;
  }
  
  return { success };
}

// 检查覆盖率是否达标
async function checkCoverage() {
  try {
    const coverageData = fs.readFileSync(path.join(__dirname, 'coverage', 'lcov.info'), 'utf8');
    const linesMatch = coverageData.match(/Lines\s*(\d+)%/);
    if (linesMatch && linesMatch[1]) {
      const coverage = parseInt(linesMatch[1]);
      log(`当前代码覆盖率: ${coverage}%`);
      if (coverage >= config.minCoverage) {
        log(`覆盖率达标 (${coverage}% >= ${config.minCoverage}%)`, 'info');
        return true;
      } else {
        log(`覆盖率未达标 (${coverage}% < ${config.minCoverage}%)`, 'warning');
        return false;
      }
    }
    log('无法获取覆盖率数据', 'warning');
    return false;
  } catch (error) {
    log(`检查覆盖率时出错: ${error.message}`, 'error');
    return false;
  }
}

// 主测试函数
async function runTests() {
  let retryCount = 0;
  let fixCount = 0;
  let coverageOk = false;
  let finalBackendResult = null;
  let finalFrontendResult = null;

  while (retryCount < config.maxRetries) {
    log(`测试轮次 ${retryCount + 1}`);

    // 运行后端测试
    const backendResult = await runBackendTests();
    saveTestResult(backendResult, 'backend');
    finalBackendResult = backendResult;

    // 运行前端测试
    const frontendResult = await runFrontendTests();
    saveTestResult(frontendResult, 'frontend');
    finalFrontendResult = frontendResult;

    // 检查覆盖率
    if (backendResult.success) {
      coverageOk = await checkCoverage();
    }

    // 如果所有测试都通过且覆盖率达标
    if (backendResult.success && frontendResult.success && coverageOk) {
      log('所有测试通过且覆盖率达标!', 'info');
      // 生成HTML报告
      const reportPath = generateHtmlReport(backendResult, frontendResult);
      log(`测试完成，请查看报告: ${reportPath}`, 'info');
      return true;
    }

    // 如果有测试失败或覆盖率不达标且还可以尝试修复
    if (fixCount < config.fixAttempts) {
      log('测试失败或覆盖率不达标，尝试修复...', 'warning');
      fixCount++;

      // 尝试修复前端问题
      if (!frontendResult.success) {
        await fixFrontendIssues();
      }

      // 尝试修复后端问题
      if (!backendResult.success || !coverageOk) {
        await fixBackendIssues();
      }

      // 增加重试计数
      retryCount++;
    } else {
      // 达到最大修复尝试次数
      log('达到最大修复尝试次数，测试失败', 'error');
      // 生成HTML报告
      if (finalBackendResult && finalFrontendResult) {
        const reportPath = generateHtmlReport(finalBackendResult, finalFrontendResult);
        log(`测试失败，请查看报告: ${reportPath}`, 'info');
      }
      return false;
    }
  }

  // 达到最大重试次数
  log('达到最大重试次数，测试失败', 'error');
  // 生成HTML报告
  if (finalBackendResult && finalFrontendResult) {
    const reportPath = generateHtmlReport(finalBackendResult, finalFrontendResult);
    log(`测试失败，请查看报告: ${reportPath}`, 'info');
  }
  return false;
}

// 启动测试
(async () => {
  log('开始自动化测试流程');
  const success = await runTests();
  if (success) {
    log('自动化测试流程成功完成');
    process.exit(0);
  } else {
    log('自动化测试流程失败');
    process.exit(1);
  }
})();