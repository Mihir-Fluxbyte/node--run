#!/usr/bin/env node

const { exec } = require("child_process");
const fs = require("fs");

const loadingAnimation = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧"];
let animationIndex = 0;

const loadingInterval = setInterval(() => {
  process.stdout.write(`\r${loadingAnimation[animationIndex]}`);
  animationIndex = (animationIndex + 1) % loadingAnimation.length;
}, 100);

// Load the configuration file
const configFile = "ex-cm.config.json"; // Change this if needed
let config = {};
try {
  config = JSON.parse(fs.readFileSync(configFile, "utf8"));
} catch {
  console.error(
    `\x1b[38;5;166mPlease provide valid json config in file "ex-cm.config.js"\x1b[0m`
  );
  process.exit();
}

// Extract the command from CLI arguments
const command = process.argv[2] == "--help" ? undefined : process.argv[2];
// Extract the optional --parallel flag or --help flag
const isParallel = process.argv.includes("--parallel");
const isHelp = process.argv.includes("--help");
const commandsToExecute = command
  ? Array.isArray(config[command])
    ? config[command]
    : [config[command]]
  : [];

/**
 * Executes command
 * @param {string} command
 */
function executeCommand(command, logPrefix = "") {
  const buildProcess = exec(command);
  console.log(`\nExecuting ${logPrefix}\x1b[38;5;2m${command}\x1b[0m\n`);

  return new Promise((resolve, reject) => {
    buildProcess.stdout.on("data", (data) => {
      console.log(`\r${logPrefix}${data}`);
    });

    buildProcess.stderr.on("data", (data) => {
      console.error(`\r\x1b[38;5;178m${logPrefix}${data}\x1b[0m`);
    });

    buildProcess.on("close", (code) => {
      if (code === 0) {
        console.log(
          `\r\x1b[38;5;2m${logPrefix}Exectution completed successfully.\x1b[0m`
        );
        resolve(true);
      } else {
        console.error(
          `\r\x1b[38;5;166m${logPrefix}Execution failed with code ${code}\x1b[0m`
        );
        resolve(false);
      }
    });
  });
}

/**
 * Execute the command(s) from the config file
 */
async function runCommands() {
  if (config[command]) {
    if (isParallel) {
      await Promise.all(
        commandsToExecute.map((command, index) => {
          return executeCommand(command, `${index + 1} >> `);
        })
      );
    } else {
      for (let i in commandsToExecute) {
        const resolved = await executeCommand(commandsToExecute[i]);
        if (!resolved) break;
      }
    }
  } else {
    console.error("\r\x1b[38;5;166mCommand not found in the configuration file.\x1b[0m");
  }
}

/**
 * Main function
 */
async function main() {
  if (isHelp) {
    if (command && commandsToExecute.length) {
      console.log(
        `\x1b[1m${command}\x1b[0m will execute \x1b[1m${commandsToExecute}\x1b[0m (${
          isParallel ? "parallel" : "sequential"
        })`
      );
    }
    console.log("\nUsage: node ex-cm <command> [--parallel] [--help]");
    console.log("\nAvailable Commands:");
    Object.keys(config).forEach((cmd) => {
      console.log(`  \x1b[1m${cmd}\x1b[0m`);
    });
  } else {
    await runCommands();
  }
  clearInterval(loadingInterval);
}

main();
