import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateRepository } from "./validate-beestack.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXIT_LOCAL_SCRIPTS_INACTIVE = 5;

export function resolveOpenBotCliCandidates(platform = process.platform, env = process.env, home = os.homedir()) {
  if (env.OPENBOT_CLI_PATH) {
    return [path.resolve(env.OPENBOT_CLI_PATH)];
  }

  if (platform === "win32") {
    const localAppData = env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    const programFiles = env.ProgramFiles || "C:\\Program Files";
    return [
      path.join(localAppData, "Programs", "OpenBot", "resources", "cli", "openbot-cli.mjs"),
      path.join(programFiles, "OpenBot", "resources", "cli", "openbot-cli.mjs"),
    ];
  }

  if (platform === "darwin") {
    return [
      "/Applications/OpenBot.app/Contents/Resources/cli/openbot-cli.mjs",
      path.join(home, "Applications", "OpenBot.app", "Contents", "Resources", "cli", "openbot-cli.mjs"),
    ];
  }

  return [
    "/opt/OpenBot/resources/cli/openbot-cli.mjs",
    "/usr/lib/openbot/resources/cli/openbot-cli.mjs",
    "/usr/local/lib/openbot/resources/cli/openbot-cli.mjs",
    path.join(home, ".local", "share", "OpenBot", "resources", "cli", "openbot-cli.mjs"),
  ];
}

export function resolveOpenBotCliPath(platform = process.platform, env = process.env, home = os.homedir()) {
  const candidates = resolveOpenBotCliCandidates(platform, env, home);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  return {
    path: found || candidates[0],
    exists: Boolean(found),
    candidates,
    fromEnv: Boolean(env.OPENBOT_CLI_PATH),
  };
}

export function resolveAutomationDir(platform = process.platform, env = process.env, home = os.homedir()) {
  if (env.OPENBOT_AUTOMATION_DIR) {
    return path.resolve(env.OPENBOT_AUTOMATION_DIR);
  }

  if (platform === "win32") {
    const appData = env.APPDATA || path.join(home, "AppData", "Roaming");
    return path.join(appData, "OpenBot", "automation");
  }

  if (platform === "darwin") {
    return path.join(home, "Library", "Application Support", "OpenBot", "automation");
  }

  const configHome = env.XDG_CONFIG_HOME || path.join(home, ".config");
  return path.join(configHome, "OpenBot", "automation");
}

export function resolveOpenBotDataDir(env = process.env, home = os.homedir()) {
  if (env.OPENBOT_DATA_DIR) {
    return path.resolve(env.OPENBOT_DATA_DIR);
  }
  return path.join(home, "OpenBot");
}

export function inspectEnvironment(repoRoot = REPO_ROOT) {
  const validation = validateRepository(repoRoot);
  const dataDir = resolveOpenBotDataDir();
  const dataDirExists = fs.existsSync(dataDir);
  const cli = resolveOpenBotCliPath();
  const automationDir = resolveAutomationDir();
  const automationUrlPath = path.join(automationDir, "url");
  const localScriptsActive = fs.existsSync(automationUrlPath);

  return {
    repoRoot: path.resolve(repoRoot),
    validation,
    openbot: {
      dataDir,
      dataDirExists,
      cliPath: cli.path,
      cliExists: cli.exists,
      cliCandidates: cli.candidates,
      automationDir,
      automationUrlPath,
      localScriptsActive,
    },
  };
}

function buildBootstrapPasteLine(repoRoot) {
  const bootstrapPath = path.join(repoRoot, "BOOTSTRAP.md");
  return `Read ${bootstrapPath} and run the BeeStack bootstrap.`;
}

function buildSyncPrompt(repoRoot) {
  const skillsDir = path.join(repoRoot, "skills");
  const profilePath = path.join(repoRoot, "agent", "dr-beebot-profile.json");
  const bootstrapPath = path.join(repoRoot, "BOOTSTRAP.md");
  return [
    `Sync the BeeStack local skills library from ${skillsDir}.`,
    `1. Copy each skill directory under ${skillsDir} into a temporary workspace staging folder (e.g. beestack-staging/<slug>).`,
    `2. Call list_local_skills and compare against the 12 canonical skills; call revise_skill for any existing skill that changed or create_skill for any missing skill.`,
    `3. Verify Dr. BeeBot's enabledSkills (7) and disabledLibrarySkills (5) match ${profilePath} (using set_skill_enabled so all 12 stay in the shared library), following ${bootstrapPath}.`,
    `4. Verify with list_local_skills and read_agent, clean up the staging folder, and report updated/created/unchanged skills.`,
  ].join("\n");
}

function parseArgs(argv) {
  const flags = {
    json: false,
    dryRun: false,
    agent: null,
    help: false,
  };
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") {
      flags.json = true;
    } else if (arg === "--dry-run") {
      flags.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      flags.help = true;
    } else if (arg === "--agent") {
      if (i + 1 >= argv.length) {
        throw new Error("--agent requires a value");
      }
      flags.agent = argv[++i];
    } else if (arg.startsWith("--agent=")) {
      flags.agent = arg.slice("--agent=".length);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown flag: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

function printHelp() {
  console.log(`BeeStack CLI

Usage:
  node scripts/beestack-cli.mjs <command> [options]

Commands:
  validate [repoRoot] [--json]               Validate BeeStack repo structure and contracts
  doctor [--json]                            Check repo, OpenBot data dir, CLI, and Local scripts
  bootstrap [--agent <name>] [--dry-run]     Run BOOTSTRAP.md via OpenBot CLI (requires Local scripts)
  sync [--agent "Dr. BeeBot"] [--dry-run]    Restage skills and call revise_skill/create_skill
  help                                       Show this help message
`);
}

function runValidate(positional, flags) {
  const target = positional[0] ? path.resolve(positional[0]) : REPO_ROOT;
  const result = validateRepository(target);

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`BeeStack validation: ${result.ok ? "PASS" : "FAIL"} (${result.summary.repoRoot})`);
    console.log(
      `Root files: ${result.summary.rootFilesChecked ?? 0}/5, Skills: ${result.summary.skillCount ?? 0}/12`
    );
    if (result.errors.length > 0) {
      console.error("\nErrors:");
      for (const err of result.errors) {
        console.error(`  - ${err}`);
      }
    }
  }

  return result.ok ? 0 : 1;
}

function runDoctor(flags) {
  const report = inspectEnvironment(REPO_ROOT);
  const pastePrompt = buildBootstrapPasteLine(report.repoRoot);

  if (flags.json) {
    console.log(
      JSON.stringify(
        {
          ok: report.validation.ok,
          repoRoot: report.repoRoot,
          validation: report.validation,
          openbot: report.openbot,
          pastePrompt,
        },
        null,
        2
      )
    );
    return report.validation.ok ? 0 : 1;
  }

  console.log("BeeStack Doctor");
  console.log(`- Repository (${report.repoRoot}): ${report.validation.ok ? "PASS" : "FAIL"}`);
  console.log(
    `  Root files: ${report.validation.summary.rootFilesChecked ?? 0}/5 | Skills: ${report.validation.summary.skillCount ?? 0}/12`
  );
  if (!report.validation.ok) {
    for (const err of report.validation.errors) {
      console.error(`  [ERROR] ${err}`);
    }
  }

  console.log(
    `- OpenBot data dir (${report.openbot.dataDir}): ${report.openbot.dataDirExists ? "FOUND" : "NOT FOUND"}`
  );
  console.log(
    `- OpenBot CLI (${report.openbot.cliPath}): ${report.openbot.cliExists ? "FOUND" : "NOT FOUND"}`
  );
  console.log(
    `- Local scripts (${report.openbot.automationUrlPath}): ${report.openbot.localScriptsActive ? "ACTIVE" : "INACTIVE"}`
  );

  console.log("\nNext steps:");
  if (!report.validation.ok) {
    console.log("  1. Fix the repository validation errors above and re-run `npm run doctor`.");
  } else if (report.openbot.localScriptsActive && report.openbot.cliExists) {
    console.log("  - CLI automation is ready:");
    console.log("      npm run bootstrap -- --agent <your-agent-name>");
    console.log('      npm run sync -- --agent "Dr. BeeBot"');
    console.log("  - Or paste directly into OpenBot Desktop:");
    console.log(`      ${pastePrompt}`);
  } else {
    console.log("  Option A (1-line manual paste in OpenBot Desktop — works immediately):");
    console.log(`    ${pastePrompt}`);
    console.log("  Option B (enable CLI bootstrap/sync):");
    console.log("    1. Open OpenBot Desktop -> Settings -> Permissions -> toggle ON 'Local scripts'.");
    console.log("    2. Ensure openbot-cli.mjs is present (or set OPENBOT_CLI_PATH).");
    console.log("    3. Re-run `npm run doctor`, then run `npm run bootstrap` or `npm run sync`.");
  }

  return report.validation.ok ? 0 : 1;
}

function runOpenBotPrompt({ mode, agent, prompt, dryRun, fallbackPaste }) {
  const report = inspectEnvironment(REPO_ROOT);
  if (!report.validation.ok) {
    console.error("Repository validation failed. Fix errors before running " + mode + ":");
    for (const err of report.validation.errors) {
      console.error(`  - ${err}`);
    }
    return 1;
  }

  if (dryRun) {
    console.log(`[dry-run] Mode: ${mode}`);
    console.log(`[dry-run] Target agent: ${agent}`);
    console.log(`[dry-run] OpenBot CLI: ${report.openbot.cliPath} (${report.openbot.cliExists ? "found" : "not found"})`);
    console.log(`[dry-run] Local scripts: ${report.openbot.localScriptsActive ? "active" : "inactive"}`);
    console.log("\n--- Prompt ---");
    console.log(prompt);
    return 0;
  }

  if (!report.openbot.localScriptsActive || !report.openbot.cliExists) {
    console.error(`Cannot run automated ${mode}: OpenBot Local scripts automation is not active or openbot-cli.mjs is missing.`);
    console.error(`- Local scripts URL file (${report.openbot.automationUrlPath}): ${report.openbot.localScriptsActive ? "found" : "missing"}`);
    console.error(`- OpenBot CLI (${report.openbot.cliPath}): ${report.openbot.cliExists ? "found" : "missing"}`);
    console.error("\nTo enable CLI automation:");
    console.error("  1. Open OpenBot Desktop -> Settings -> Permissions -> enable 'Local scripts'.");
    console.error("  2. Ensure OpenBot is installed (or set OPENBOT_CLI_PATH / OPENBOT_AUTOMATION_DIR).");
    console.error("\nOr paste this directly into OpenBot Desktop chat:");
    console.error(`  ${fallbackPaste}`);
    return EXIT_LOCAL_SCRIPTS_INACTIVE;
  }

  const child = spawnSync(
    process.execPath,
    [report.openbot.cliPath, "run", agent, "-", "--wait"],
    {
      input: prompt,
      stdio: ["pipe", "inherit", "inherit"],
      encoding: "utf8",
    }
  );

  if (child.error) {
    console.error(`Failed to execute openbot-cli.mjs: ${child.error.message}`);
    return 1;
  }

  return typeof child.status === "number" ? child.status : 1;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    printHelp();
    process.exit(0);
  }

  const command = argv[0];
  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }

  let parsed;
  try {
    parsed = parseArgs(argv.slice(1));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  if (parsed.flags.help) {
    printHelp();
    process.exit(0);
  }

  let exitCode = 0;
  switch (command) {
    case "validate":
      exitCode = runValidate(parsed.positional, parsed.flags);
      break;
    case "doctor":
      exitCode = runDoctor(parsed.flags);
      break;
    case "bootstrap": {
      const agent = parsed.flags.agent || "OpenBot";
      const prompt = buildBootstrapPasteLine(REPO_ROOT);
      exitCode = runOpenBotPrompt({
        mode: "bootstrap",
        agent,
        prompt,
        dryRun: parsed.flags.dryRun,
        fallbackPaste: prompt,
      });
      break;
    }
    case "sync": {
      const agent = parsed.flags.agent || "Dr. BeeBot";
      const prompt = buildSyncPrompt(REPO_ROOT);
      exitCode = runOpenBotPrompt({
        mode: "sync",
        agent,
        prompt,
        dryRun: parsed.flags.dryRun,
        fallbackPaste: prompt,
      });
      break;
    }
    default:
      console.error(`Unknown subcommand: ${command}\n`);
      printHelp();
      exitCode = 1;
      break;
  }

  process.exit(exitCode);
}

function isMainModule() {
  if (!process.argv[1]) return false;
  const entry = path.resolve(process.argv[1]);
  const self = fileURLToPath(import.meta.url);
  return process.platform === "win32"
    ? entry.toLowerCase() === self.toLowerCase()
    : entry === self;
}

if (isMainModule()) {
  main();
}
