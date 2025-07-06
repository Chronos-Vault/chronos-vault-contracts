/**
 * Test Runner for Cross-Chain Failover Tests
 */

import Mocha from 'mocha';
import path from 'path';
import fs from 'fs';

// Create a new Mocha instance
const mocha = new Mocha({
  timeout: 5000,
  reporter: 'spec'
});

// Get the test directory path
const testDir = path.join(__dirname, 'security');

// Add all .test.ts files to the mocha instance
fs.readdirSync(testDir)
  .filter(file => file.endsWith('.test.ts'))
  .forEach(file => {
    mocha.addFile(path.join(testDir, file));
  });

// Run the tests and log the results
mocha.run(failures => {
  if (failures) {
    console.error(`${failures} tests failed.`);
    process.exit(1);
  } else {
    console.log('All tests passed!');
    process.exit(0);
  }
});