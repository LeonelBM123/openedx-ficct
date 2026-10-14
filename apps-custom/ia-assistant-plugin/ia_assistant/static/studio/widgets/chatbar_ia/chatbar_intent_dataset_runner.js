const fs = require('fs');
const path = require('path');
const vm = require('vm');

const detectorCodePath = path.join(__dirname, 'chat_ia_detector_prompt.js');
const datasetPath = path.join(__dirname, 'chatbar_intent_dataset.json');

// Read files
const detectorCode = fs.readFileSync(detectorCodePath, 'utf8');
const datasetContent = fs.readFileSync(datasetPath, 'utf8');
const dataset = JSON.parse(datasetContent);

// Setup VM Context
const sandbox = {
  window: {
    IAAssistant: {
      Studio: {}
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(detectorCode, sandbox);

const Detector = sandbox.window.IAAssistant.Studio.ChatbarIntentDetector;

if (!Detector || typeof Detector.detect !== 'function') {
  console.error("Error: ChatbarIntentDetector.detect not found inside the loaded code.");
  process.exit(1);
}

let total = 0;
let passed = 0;
let failed = 0;
const failures = [];

const categories = {};

dataset.cases.forEach(testCase => {
  total++;
  
  const options = {
    activeComponent: testCase.activeComponentRequired ? {
      id: "demo-component",
      tipo: "teoria",
      data: {
        titulo: "Componente demo"
      }
    } : null
  };

  const result = Detector.detect(testCase.prompt, options);

  const modeMatch = result.mode === testCase.expectedMode;
  const typeMatch = result.componentType === testCase.expectedComponentType;
  
  const isOk = modeMatch && typeMatch;

  const category = testCase.category || 'unknown';
  if (!categories[category]) {
    categories[category] = { total: 0, passed: 0, failed: 0 };
  }
  categories[category].total++;

  if (isOk) {
    passed++;
    categories[category].passed++;
  } else {
    failed++;
    categories[category].failed++;
    failures.push({
      id: testCase.id,
      prompt: testCase.prompt,
      expected: `${testCase.expectedMode} / "${testCase.expectedComponentType}"`,
      received: `${result.mode} / "${result.componentType}"`,
      confidence: result.confidence,
      reason: result.reason,
      scores: result.scores
    });
  }
});

console.log("==========================================");
console.log("Chatbar intent detector dataset report");
console.log("==========================================");
console.log(`Total: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log("------------------------------------------");

console.log("Summary by category:");
Object.keys(categories).forEach(cat => {
  const stats = categories[cat];
  console.log(`- ${cat}: Passed ${stats.passed}/${stats.total} (${Math.round(stats.passed / stats.total * 100)}%)`);
});

if (failures.length > 0) {
  console.log("\nFailures (showing up to 10):");
  failures.slice(0, 10).forEach(f => {
    console.log(`- ${f.id}`);
    console.log(`  Prompt: "${f.prompt}"`);
    console.log(`  Expected: ${f.expected}`);
    console.log(`  Received: ${f.received}`);
    console.log(`  Confidence: ${f.confidence}`);
    console.log(`  Reason: ${f.reason}`);
    console.log(`  Scores: ${JSON.stringify(f.scores)}`);
    console.log("");
  });
  console.log(`Total failures: ${failures.length}. Set process.exitCode = 1.`);
  process.exit(1);
} else {
  console.log("\nAll tests passed successfully!");
  process.exit(0);
}
