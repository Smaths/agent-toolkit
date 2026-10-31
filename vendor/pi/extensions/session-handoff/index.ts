import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { fileURLToPath } from "node:url";
import { installHandoff } from "./runtime.mjs";

export default function (pi: ExtensionAPI) {
  installHandoff(pi, Type, {
    skillPath: fileURLToPath(new URL("../../../../skills/session-handoff/SKILL.md", import.meta.url)),
  });
}
