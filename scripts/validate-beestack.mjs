import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ENABLED_SKILLS = Object.freeze([
  "beestack-onboarding",
  "beestack-agent-designer",
  "beestack-make-ui",
  "transcript-healthcheck",
  "routine-healthcheck",
  "beestack-teamwork",
  "beestack-mode",
]);

export const DISABLED_LIBRARY_SKILLS = Object.freeze([
  "beestack-verify",
  "beestack-unslop",
  "beestack-ceo-review",
  "beestack-arch-review",
  "beestack-security-ship",
]);

export const CANONICAL_SKILLS = Object.freeze([
  ...ENABLED_SKILLS,
  ...DISABLED_LIBRARY_SKILLS,
]);

const REQUIRED_ROOT_FILES = Object.freeze([
  "package.json",
  "BOOTSTRAP.md",
  "README.md",
  "LICENSE",
  "NOTICE.md",
]);

const MAX_SKILL_FILES = 200;
const MAX_SKILL_BYTES = 10 * 1024 * 1024;
const MAX_PROFILE_SKILLS = 32;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MIN_AVATAR_BYTES = 100;
const MAX_AVATAR_BYTES = 524288;

const FRONTMATTER_RE = /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const MARKDOWN_LINK_RE = /(?<!!)\[[^\]]*\]\(([^)\r\n]+)\)/g;

function unquoteDouble(raw) {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = raw[++i];
    if (next === undefined) {
      out += "\\";
      break;
    }
    switch (next) {
      case "n":
        out += "\n";
        break;
      case "r":
        out += "\r";
        break;
      case "t":
        out += "\t";
        break;
      case '"':
        out += '"';
        break;
      case "\\":
        out += "\\";
        break;
      case "/":
        out += "/";
        break;
      default:
        out += next;
        break;
    }
  }
  return out;
}

function unquoteSingle(raw) {
  return raw.replace(/''/g, "'");
}

function parseQuotedValue(lines, startIndex, initialRest, quoteChar) {
  let combined = initialRest;
  let endIndex = startIndex;

  const hasClosingQuote = (text) => {
    if (quoteChar === '"') {
      let escaped = false;
      for (let i = 1; i < text.length; i++) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (text[i] === "\\") {
          escaped = true;
          continue;
        }
        if (text[i] === '"') {
          return i;
        }
      }
      return -1;
    }

    for (let i = 1; i < text.length; i++) {
      if (text[i] === "'") {
        if (text[i + 1] === "'") {
          i++;
          continue;
        }
        return i;
      }
    }
    return -1;
  };

  let closePos = hasClosingQuote(combined);
  while (closePos === -1 && endIndex + 1 < lines.length) {
    endIndex++;
    combined += "\n" + lines[endIndex].trimStart();
    closePos = hasClosingQuote(combined);
  }

  if (closePos === -1) {
    const raw = combined.slice(1);
    return {
      value: quoteChar === '"' ? unquoteDouble(raw) : unquoteSingle(raw),
      nextIndex: endIndex,
    };
  }

  const inner = combined.slice(1, closePos);
  return {
    value: quoteChar === '"' ? unquoteDouble(inner) : unquoteSingle(inner),
    nextIndex: endIndex,
  };
}

function parseBlockScalar(lines, startIndex, indicator) {
  const isFolded = indicator.startsWith(">");
  const chomp = indicator.includes("-")
    ? "strip"
    : indicator.includes("+")
      ? "keep"
      : "clip";

  const collected = [];
  let blockIndent = null;
  let idx = startIndex;

  while (idx + 1 < lines.length) {
    const nextLine = lines[idx + 1];
    if (nextLine.trim() === "") {
      collected.push("");
      idx++;
      continue;
    }

    const indentMatch = nextLine.match(/^([ \t]+)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    if (indent === 0) {
      break;
    }

    if (blockIndent === null) {
      blockIndent = indent;
    }
    if (indent < blockIndent) {
      break;
    }

    collected.push(nextLine.slice(blockIndent));
    idx++;
  }

  while (collected.length > 0 && collected[collected.length - 1] === "" && chomp === "strip") {
    collected.pop();
  }

  if (!isFolded) {
    let result = collected.join("\n");
    if (chomp === "clip" && collected.length > 0) {
      result += "\n";
    }
    return { value: result.trim(), nextIndex: idx };
  }

  const paragraphs = [];
  let current = [];
  for (const line of collected) {
    if (line === "") {
      if (current.length > 0) {
        paragraphs.push(current.join(" "));
        current = [];
      } else {
        paragraphs.push("");
      }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    paragraphs.push(current.join(" "));
  }

  return { value: paragraphs.join("\n").trim(), nextIndex: idx };
}

export function parseYamlFrontmatter(content) {
  const clean = content.replace(/^\uFEFF/, "");
  const match = clean.match(FRONTMATTER_RE);
  if (!match) {
    return null;
  }

  const lines = match[1].split(/\r?\n/);
  const fields = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!keyMatch) {
      continue;
    }

    const key = keyMatch[1];
    const rest = keyMatch[2].trim();

    if (rest.startsWith('"') || rest.startsWith("'")) {
      const parsed = parseQuotedValue(lines, i, rest, rest[0]);
      fields[key] = parsed.value;
      i = parsed.nextIndex;
      continue;
    }

    if (/^[>|][+-]?\d*[+-]?$/.test(rest)) {
      const parsed = parseBlockScalar(lines, i, rest);
      fields[key] = parsed.value;
      i = parsed.nextIndex;
      continue;
    }

    // Unquoted scalar possibly continued on indented lines.
    const parts = rest ? [rest] : [];
    while (i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (!nextLine.trim()) {
        break;
      }
      if (/^[ \t]+/.test(nextLine) && !/^[ \t]+[A-Za-z0-9_-]+\s*:/.test(nextLine)) {
        parts.push(nextLine.trim());
        i++;
      } else {
        break;
      }
    }
    fields[key] = parts.join(" ").trim();
  }

  return {
    fields,
    body: clean.slice(match[0].length),
  };
}

function extractSkillMarkdownLinks(markdownBody) {
  const targets = [];
  for (const match of markdownBody.matchAll(MARKDOWN_LINK_RE)) {
    let raw = match[1].trim();
    if (!raw) continue;

    if (raw.startsWith("<")) {
      const endAngle = raw.indexOf(">");
      if (endAngle !== -1) {
        raw = raw.slice(1, endAngle).trim();
      }
    } else {
      const titleMatch = raw.match(/^(\S+)\s+(?:"[^"]*"|'[^']*')$/);
      if (titleMatch) {
        raw = titleMatch[1];
      }
    }

    raw = raw.replace(/^<|>$/g, "");
    const withoutAnchor = raw.split("#")[0].trim();
    const normalized = withoutAnchor.replace(/^\.\//, "");

    if (normalized.startsWith("references/") || normalized.startsWith("scripts/")) {
      targets.push(normalized);
    }
  }
  return targets;
}

function walkSkillDirectory(skillDir, slug, errors) {
  let totalFiles = 0;
  let totalBytes = 0;
  let hasEnvFile = false;

  function visit(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir);
    } catch (err) {
      errors.push(`skills/${slug}: failed to read directory ${currentDir}: ${err.message}`);
      return;
    }

    for (const entryName of entries) {
      const entryPath = path.join(currentDir, entryName);
      let stat;
      try {
        stat = fs.lstatSync(entryPath);
      } catch (err) {
        errors.push(`skills/${slug}: failed to stat ${entryPath}: ${err.message}`);
        continue;
      }

      if (stat.isSymbolicLink()) {
        errors.push(`skills/${slug}: symlink not allowed (${path.relative(skillDir, entryPath)})`);
        continue;
      }

      if (/^\.env(\.|$)/i.test(entryName)) {
        hasEnvFile = true;
        errors.push(`skills/${slug}: .env file not allowed (${path.relative(skillDir, entryPath)})`);
      }

      if (stat.isDirectory()) {
        visit(entryPath);
      } else if (stat.isFile()) {
        totalFiles++;
        totalBytes += stat.size;
      } else {
        errors.push(`skills/${slug}: unsupported file type (${path.relative(skillDir, entryPath)})`);
      }
    }
  }

  visit(skillDir);
  return { totalFiles, totalBytes, hasEnvFile };
}

function validateRootFiles(repoRoot, errors) {
  const checked = [];
  for (const relPath of REQUIRED_ROOT_FILES) {
    const fullPath = path.join(repoRoot, relPath);
    if (!fs.existsSync(fullPath)) {
      errors.push(`Missing required root file: ${relPath}`);
      continue;
    }

    const stat = fs.lstatSync(fullPath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      errors.push(`Required root path must be a regular file: ${relPath}`);
      continue;
    }

    if (stat.size === 0) {
      errors.push(`Required root file is empty: ${relPath}`);
      continue;
    }

    const text = fs.readFileSync(fullPath, "utf8");
    if (text.trim().length === 0) {
      errors.push(`Required root file contains only whitespace: ${relPath}`);
      continue;
    }

    if (relPath === "package.json") {
      try {
        JSON.parse(text);
      } catch (err) {
        errors.push(`package.json is not valid JSON: ${err.message}`);
        continue;
      }
    }

    checked.push(relPath);
  }
  return checked;
}

function validateSkills(repoRoot, errors, warnings) {
  const skillsDir = path.join(repoRoot, "skills");
  const skillDetails = {};

  if (!fs.existsSync(skillsDir)) {
    errors.push("Missing required directory: skills/");
    return skillDetails;
  }

  const skillsDirStat = fs.lstatSync(skillsDir);
  if (skillsDirStat.isSymbolicLink() || !skillsDirStat.isDirectory()) {
    errors.push("skills/ must be a regular directory");
    return skillDetails;
  }

  const canonicalSet = new Set(CANONICAL_SKILLS);
  const existingEntries = fs.readdirSync(skillsDir);

  for (const entry of existingEntries) {
    if (!canonicalSet.has(entry)) {
      errors.push(`Unexpected entry under skills/: ${entry}`);
    }
  }

  for (const slug of CANONICAL_SKILLS) {
    const skillDir = path.join(skillsDir, slug);
    if (!fs.existsSync(skillDir)) {
      errors.push(`Missing canonical skill directory: skills/${slug}`);
      continue;
    }

    const dirStat = fs.lstatSync(skillDir);
    if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) {
      errors.push(`skills/${slug} must be a regular directory`);
      continue;
    }

    const { totalFiles, totalBytes } = walkSkillDirectory(skillDir, slug, errors);

    if (totalFiles > MAX_SKILL_FILES) {
      errors.push(`skills/${slug}: file count ${totalFiles} exceeds limit ${MAX_SKILL_FILES}`);
    }
    if (totalBytes > MAX_SKILL_BYTES) {
      errors.push(`skills/${slug}: expanded size ${totalBytes} exceeds ${MAX_SKILL_BYTES} bytes`);
    }

    const skillMdPath = path.join(skillDir, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) {
      errors.push(`skills/${slug}: missing SKILL.md`);
      continue;
    }

    const skillMdStat = fs.lstatSync(skillMdPath);
    if (skillMdStat.isSymbolicLink() || !skillMdStat.isFile()) {
      errors.push(`skills/${slug}/SKILL.md must be a regular file`);
      continue;
    }

    const content = fs.readFileSync(skillMdPath, "utf8");
    const parsed = parseYamlFrontmatter(content);
    if (!parsed) {
      errors.push(`skills/${slug}/SKILL.md: missing or invalid YAML frontmatter`);
      continue;
    }

    const name = typeof parsed.fields.name === "string" ? parsed.fields.name.trim() : "";
    const description =
      typeof parsed.fields.description === "string" ? parsed.fields.description.trim() : "";

    if (name.length < 1 || name.length > 80) {
      errors.push(
        `skills/${slug}/SKILL.md: frontmatter name must be 1..80 chars (got ${name.length})`
      );
    }

    if (description.length < 1 || description.length > 500) {
      errors.push(
        `skills/${slug}/SKILL.md: frontmatter description must be 1..500 chars (got ${description.length})`
      );
    }

    const links = extractSkillMarkdownLinks(parsed.body);
    const resolvedSkillDir = path.resolve(skillDir);
    for (const relTarget of links) {
      const targetPath = path.resolve(resolvedSkillDir, relTarget);
      if (
        targetPath !== resolvedSkillDir &&
        !targetPath.startsWith(resolvedSkillDir + path.sep)
      ) {
        errors.push(`skills/${slug}/SKILL.md: link escapes skill directory (${relTarget})`);
        continue;
      }

      if (!fs.existsSync(targetPath)) {
        errors.push(`skills/${slug}/SKILL.md: broken relative link (${relTarget})`);
        continue;
      }

      const targetStat = fs.lstatSync(targetPath);
      if (targetStat.isSymbolicLink() || !targetStat.isFile()) {
        errors.push(`skills/${slug}/SKILL.md: link target is not a regular file (${relTarget})`);
      }
    }

    if (parsed.body.trim().length === 0) {
      warnings.push(`skills/${slug}/SKILL.md: body after frontmatter is empty`);
    }

    skillDetails[slug] = {
      name,
      descriptionLength: description.length,
      totalFiles,
      totalBytes,
      checkedLinks: links.length,
    };
  }

  return skillDetails;
}

function validateProfile(repoRoot, errors) {
  const profilePath = path.join(repoRoot, "agent", "dr-beebot-profile.json");
  if (!fs.existsSync(profilePath)) {
    errors.push("Missing required file: agent/dr-beebot-profile.json");
    return null;
  }

  const stat = fs.lstatSync(profilePath);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    errors.push("agent/dr-beebot-profile.json must be a regular file");
    return null;
  }

  let profile;
  try {
    profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
  } catch (err) {
    errors.push(`agent/dr-beebot-profile.json: invalid JSON (${err.message})`);
    return null;
  }

  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    errors.push("agent/dr-beebot-profile.json: root must be a JSON object");
    return null;
  }

  if (typeof profile.name !== "string" || profile.name.length < 1 || profile.name.length > 80) {
    errors.push("agent/dr-beebot-profile.json: name must be 1..80 chars");
  }

  if (typeof profile.title !== "string" || profile.title.length < 1 || profile.title.length > 120) {
    errors.push("agent/dr-beebot-profile.json: title must be 1..120 chars");
  }

  if (
    typeof profile.description !== "string" ||
    profile.description.length < 400 ||
    profile.description.length > 2000
  ) {
    const len = typeof profile.description === "string" ? profile.description.length : "non-string";
    errors.push(`agent/dr-beebot-profile.json: description must be 400..2000 chars (got ${len})`);
  }

  if (profile.avatarHue !== 55) {
    errors.push(`agent/dr-beebot-profile.json: avatarHue must be 55 (got ${profile.avatarHue})`);
  }

  if (profile.timezone !== "America/Sao_Paulo") {
    errors.push(
      `agent/dr-beebot-profile.json: timezone must be "America/Sao_Paulo" (got ${profile.timezone})`
    );
  }

  const enabled = Array.isArray(profile.enabledSkills) ? profile.enabledSkills : null;
  const disabled = Array.isArray(profile.disabledLibrarySkills)
    ? profile.disabledLibrarySkills
    : null;

  if (!enabled || !disabled) {
    errors.push(
      "agent/dr-beebot-profile.json: enabledSkills and disabledLibrarySkills must both be arrays"
    );
  } else {
    const combined = [...enabled, ...disabled];
    if (combined.length > MAX_PROFILE_SKILLS) {
      errors.push(
        `agent/dr-beebot-profile.json: total skills ${combined.length} exceeds ${MAX_PROFILE_SKILLS}`
      );
    }

    const seen = new Set();
    for (const slug of combined) {
      if (typeof slug !== "string" || !slug) {
        errors.push("agent/dr-beebot-profile.json: skill slug entries must be non-empty strings");
        continue;
      }
      if (seen.has(slug)) {
        errors.push(`agent/dr-beebot-profile.json: duplicate skill slug "${slug}"`);
      }
      seen.add(slug);
    }

    for (const canonical of CANONICAL_SKILLS) {
      if (!seen.has(canonical)) {
        errors.push(`agent/dr-beebot-profile.json: missing canonical skill "${canonical}"`);
      }
    }

    const canonicalSet = new Set(CANONICAL_SKILLS);
    for (const slug of seen) {
      if (!canonicalSet.has(slug)) {
        errors.push(`agent/dr-beebot-profile.json: unknown skill slug "${slug}"`);
      }
    }
  }

  if (!Array.isArray(profile.routines)) {
    errors.push("agent/dr-beebot-profile.json: routines must be an array");
  } else {
    const transcriptRoutine = profile.routines.find((r) => r && r.name === "transcript-healthcheck");
    if (!transcriptRoutine) {
      errors.push("agent/dr-beebot-profile.json: missing routine transcript-healthcheck");
    } else {
      if (transcriptRoutine.active !== true) {
        errors.push("agent/dr-beebot-profile.json: transcript-healthcheck must have active: true");
      }
      if (transcriptRoutine.schedule?.kind !== "weekdays") {
        errors.push(
          'agent/dr-beebot-profile.json: transcript-healthcheck schedule.kind must be "weekdays"'
        );
      }
      if (transcriptRoutine.schedule?.time !== "08:44") {
        errors.push(
          'agent/dr-beebot-profile.json: transcript-healthcheck schedule.time must be "08:44"'
        );
      }
    }

    const routineCheck = profile.routines.find((r) => r && r.name === "routine-healthcheck");
    if (!routineCheck) {
      errors.push("agent/dr-beebot-profile.json: missing routine routine-healthcheck");
    } else {
      if (routineCheck.active !== true) {
        errors.push("agent/dr-beebot-profile.json: routine-healthcheck must have active: true");
      }
      if (routineCheck.schedule?.kind !== "weekly") {
        errors.push(
          'agent/dr-beebot-profile.json: routine-healthcheck schedule.kind must be "weekly"'
        );
      }
      if (routineCheck.schedule?.weekday !== 1) {
        errors.push("agent/dr-beebot-profile.json: routine-healthcheck schedule.weekday must be 1");
      }
      if (routineCheck.schedule?.time !== "08:49") {
        errors.push(
          'agent/dr-beebot-profile.json: routine-healthcheck schedule.time must be "08:49"'
        );
      }
    }
  }

  return {
    name: profile.name,
    descriptionLength: typeof profile.description === "string" ? profile.description.length : 0,
    enabledCount: enabled ? enabled.length : 0,
    disabledCount: disabled ? disabled.length : 0,
    routineCount: Array.isArray(profile.routines) ? profile.routines.length : 0,
  };
}

function validateAvatar(repoRoot, errors) {
  const avatarPath = path.join(repoRoot, "agent", "dr-beebot-avatar.png");
  if (!fs.existsSync(avatarPath)) {
    errors.push("Missing required file: agent/dr-beebot-avatar.png");
    return null;
  }

  const stat = fs.lstatSync(avatarPath);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    errors.push("agent/dr-beebot-avatar.png must be a regular file");
    return null;
  }

  if (stat.size < MIN_AVATAR_BYTES || stat.size > MAX_AVATAR_BYTES) {
    errors.push(
      `agent/dr-beebot-avatar.png: size ${stat.size} must be ${MIN_AVATAR_BYTES}..${MAX_AVATAR_BYTES} bytes`
    );
  }

  const buf = fs.readFileSync(avatarPath);
  if (buf.length < PNG_MAGIC.length || !buf.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    errors.push("agent/dr-beebot-avatar.png: invalid PNG magic header");
  }

  return { bytes: stat.size };
}

export function validateRepository(repoRoot) {
  const resolvedRoot = path.resolve(repoRoot);
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(resolvedRoot) || !fs.statSync(resolvedRoot).isDirectory()) {
    errors.push(`Repository root does not exist or is not a directory: ${resolvedRoot}`);
    return {
      ok: false,
      errors,
      warnings,
      summary: { repoRoot: resolvedRoot },
    };
  }

  const rootFiles = validateRootFiles(resolvedRoot, errors);
  const skills = validateSkills(resolvedRoot, errors, warnings);
  const profile = validateProfile(resolvedRoot, errors);
  const avatar = validateAvatar(resolvedRoot, errors);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      repoRoot: resolvedRoot,
      rootFilesChecked: rootFiles.length,
      skillCount: Object.keys(skills).length,
      skills,
      profile,
      avatar,
      errorCount: errors.length,
      warningCount: warnings.length,
    },
  };
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
  const args = process.argv.slice(2);
  const jsonFlag = args.includes("--json");
  const positional = args.filter((arg) => !arg.startsWith("-"));
  const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const targetRoot = positional[0] ? path.resolve(positional[0]) : defaultRoot;

  const result = validateRepository(targetRoot);

  if (jsonFlag) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`BeeStack validation: ${result.ok ? "PASS" : "FAIL"} (${result.summary.repoRoot})`);
    console.log(
      `Checked: ${result.summary.rootFilesChecked ?? 0} root files, ${result.summary.skillCount ?? 0}/12 skills`
    );
    if (result.warnings.length > 0) {
      console.log("\nWarnings:");
      for (const warning of result.warnings) {
        console.log(`  - ${warning}`);
      }
    }
    if (result.errors.length > 0) {
      console.error("\nErrors:");
      for (const error of result.errors) {
        console.error(`  - ${error}`);
      }
    }
  }

  process.exit(result.ok ? 0 : 1);
}
