import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const modelId = "muse-spark-1.3-contributor";
const chunksDir = "/app/.build/next/server/chunks";
const runtimeNeedle =
  '{id:"muse-spark-1.2-contributor",name:"Muse Spark 1.2 Contributor",contextLength:1048576,maxOutputTokens:131072,supportsReasoning:!0,supportsVision:!0,supportsAudio:!0,supportsVideo:!0,targetFormat:"openai-responses"}';
const runtimeModel =
  '{id:"muse-spark-1.3-contributor",name:"Muse Spark 1.3 Contributor",supportsReasoning:!0,targetFormat:"openai-responses"}';

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : [file];
  });
}

let patchedChunks = 0;
for (const file of filesIn(chunksDir).filter((entry) => entry.endsWith(".js"))) {
  const contents = readFileSync(file, "utf8");
  if (contents.includes(modelId)) continue;
  if (!contents.includes(runtimeNeedle)) continue;

  writeFileSync(file, contents.replaceAll(runtimeNeedle, `${runtimeNeedle},${runtimeModel}`));
  patchedChunks += 1;
}

if (patchedChunks === 0) {
  throw new Error("Muse Spark 1.3 runtime registry patch did not match any server chunk");
}

const sourceFile = "/app/open-sse/config/providers/registry/opencode/go/index.ts";
const source = readFileSync(sourceFile, "utf8");
const sourceNeedle = `      targetFormat: "openai-responses",
    },`;
const sourceModel = `
    {
      id: "${modelId}",
      name: "Muse Spark 1.3 Contributor",
      supportsReasoning: true,
      targetFormat: "openai-responses",
    },`;

if (!source.includes(modelId)) {
  const modelStart = source.indexOf('      id: "muse-spark-1.2-contributor",');
  const insertAt = source.indexOf(sourceNeedle, modelStart);
  if (modelStart < 0 || insertAt < 0) {
    throw new Error("Muse Spark 1.3 source registry patch did not find its anchor");
  }
  const afterNeedle = insertAt + sourceNeedle.length;
  writeFileSync(sourceFile, source.slice(0, afterNeedle) + sourceModel + source.slice(afterNeedle));
}

console.log(`Patched Muse Spark 1.3 into ${patchedChunks} runtime registry chunks`);
