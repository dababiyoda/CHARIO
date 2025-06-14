const fs = require('fs');

let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  const report = JSON.parse(data || '{}');
  const meta = report.metadata && report.metadata.vulnerabilities || {};
  const high = meta.high || 0;
  const critical = meta.critical || 0;
  if (high > 0 || critical > 0) {
    console.error(`\u274c npm audit found ${high} high and ${critical} critical vulnerabilities`);
    process.exit(1);
  }
  console.log('\u2705 No high or critical vulnerabilities');
});
