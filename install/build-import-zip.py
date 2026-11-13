#!/usr/bin/env python3
"""Build the OpenBot import ZIP from original BeeStack sources only.

The manifest follows the public OpenBot contract (openbot-import.json, version 1):
  format = "openbot-agent-import"
  agents[].key = [a-z0-9] with hyphens, at most 64 characters
  description at most 2000 characters
  skill and files paths inside agents/<key>/
"""
from __future__ import annotations

import json
import re
import shutil
import sys
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "install" / "dist"
OUT = DIST / "beestack-openbot-import.zip"
KEY = "beestack"
MAX_DESCRIPTION = 2000
MAX_MEMORY = 500
KEY_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")


def persona_from_agent_md(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    start = text.find("```")
    if start < 0:
        raise SystemExit(f"no fenced persona in {path}")
    end = text.find("```", start + 3)
    if end < 0:
        raise SystemExit(f"unclosed fence in {path}")
    block = text[start + 3 : end]
    if block.startswith("\n"):
        block = block[1:]
    block = block.rstrip() + "\n"
    if len(block) > MAX_DESCRIPTION:
        raise SystemExit(f"description is {len(block)} chars; max is {MAX_DESCRIPTION}")
    return block


def main() -> int:
    if not KEY_RE.match(KEY) or len(KEY) > 64:
        raise SystemExit(f"invalid agent key: {KEY}")

    description = persona_from_agent_md(ROOT / "agents" / "beestack" / "AGENT.md")
    memories = [
        "Caminho A: o designer de agentes é o Dr. Eggbot oficial do OpenBot Marketplace. O BeeStack só aplica as convenções da casa.",
        "Implementação, CI e PRs vão para o Engineering Lead. Specs de feature para o Full Stack Architect; mockups para o UI Designer.",
        "pstack instala-se pelo Marketplace, manualmente; a API do OpenBot não instala skills de Marketplace noutro agente.",
    ]
    for memory in memories:
        if len(memory) > MAX_MEMORY:
            raise SystemExit(f"memory too long: {len(memory)}")

    exported_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    manifest = {
        "format": "openbot-agent-import",
        "version": 1,
        "source": {"app": "beestack", "exportedAt": exported_at},
        "agents": [
            {
                "key": KEY,
                "name": "BeeStack",
                "title": "Convenções da casa no OpenBot",
                "description": description,
                "avatar": None,
                "skills": [f"agents/{KEY}/skills/joao-openbot-conventions"],
                "files": f"agents/{KEY}/files",
                "routines": [],
                "memories": memories,
            }
        ],
    }

    with tempfile.TemporaryDirectory() as raw:
        stage = Path(raw)
        agent = stage / "agents" / KEY
        skill = agent / "skills" / "joao-openbot-conventions"
        files = agent / "files" / "templates"
        skill.mkdir(parents=True)
        files.mkdir(parents=True)
        shutil.copy(
            ROOT / "skills" / "joao-openbot-conventions" / "SKILL.md",
            skill / "SKILL.md",
        )
        shutil.copy(ROOT / "agents" / "beestack" / "AGENTS.md", agent / "files" / "AGENTS.md")
        shutil.copy(ROOT / "docs" / "quality-bar.md", agent / "files" / "quality-bar.md")
        shutil.copy(ROOT / "docs" / "agent-shape.md", agent / "files" / "agent-shape.md")
        shutil.copy(ROOT / "templates" / "coding-agent.md", files / "coding-agent.md")
        shutil.copy(ROOT / "templates" / "noncoding-agent.md", files / "noncoding-agent.md")
        (stage / "openbot-import.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

        DIST.mkdir(parents=True, exist_ok=True)
        if OUT.exists():
            OUT.unlink()
        with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for path in sorted(stage.rglob("*")):
                if path.is_file():
                    zf.write(path, path.relative_to(stage).as_posix())

    print(f"Wrote {OUT}")
    with zipfile.ZipFile(OUT) as zf:
        for info in zf.infolist():
            print(f"  {info.file_size:8}  {info.filename}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
