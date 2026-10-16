import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : process.argv[index + 1];
}

const usage = "Usage: node scripts/gen-tasks.mjs [--seed N] [--split public|hidden] [--output path]";
const split = option("split", "public");
if (!["public", "hidden"].includes(split)) throw new Error(usage);
// The hidden split has no default seed: its seed must stay outside the repository.
if (split === "hidden" && process.argv.indexOf("--seed") < 0) throw new Error(`Hidden split requires an explicit --seed. ${usage}`);
const seed = Number(option("seed", "20261015"));
if (!Number.isInteger(seed)) throw new Error(usage);
const output = option("output", split === "public" ? "data/tasks.jsonl" : "hidden/tasks.jsonl");

function mulberry32(value) {
  let state = value >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296;
  };
}

// Maintainer-written word lists are released under this repository's MIT licence.
// The hidden vocabulary is disjoint from the public one so no hidden prompt can
// equal a public prompt.
const vocabularies = {
  public: {
    first: ["Amber", "Cedar", "Copper", "Dawn", "Ember", "Fern", "Indigo", "Juniper", "Lunar", "Moss", "Opal", "Silver"],
    second: ["Archive", "Atelier", "Guild", "Institute", "Observatory", "Press", "Society", "Studio", "Workshop", "Repository"],
    places: ["Alder Quay", "Bramble Cross", "Cobalt Bay", "Dovetail", "Elm Haven", "Foxmere", "Garnet Reach", "Hazelwick", "Iris Point", "Juniper Vale"],
    people: ["Ada Morrow", "Basil North", "Cleo Venn", "Dara Pike", "Eli Thorne", "Faye Lark", "Gus Rowan", "Hana Vale", "Ivo Reed", "Juno Moss"],
  },
  hidden: {
    first: ["Brine", "Cinder", "Dune", "Flint", "Gale", "Ivory", "Kestrel", "Lumen", "Marble", "Nettle", "Quartz", "Sable"],
    second: ["Annex", "Conservatory", "Depot", "Exchange", "Foundry", "Gallery", "Hall", "Library", "Market", "Terminal"],
    places: ["Basalt Cay", "Cinder Flats", "Driftmoor", "Eiderdown", "Flaxen Row", "Gull Point", "Hummock Bay", "Inish Lane", "Kelso Fen", "Larkspur"],
    people: ["Alba Wren", "Bram Fen", "Corin Dale", "Elsa Pryor", "Fen Alder", "Greer Holt", "Isla Brandt", "Jory Quinn", "Kest Vale", "Lior Ash"],
  },
};

const vocab = vocabularies[split];
const random = mulberry32(seed);
const pick = (values) => values[Math.floor(random() * values.length)];
function shuffle(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

const used = new Set();
function entity() {
  let value;
  do value = `${pick(vocab.first)} ${pick(vocab.second)}`; while (used.has(value));
  used.add(value); return value;
}
function fact(attribute) {
  if (attribute === "founding year") return String(1840 + Math.floor(random() * 180));
  if (attribute === "head curator") return pick(vocab.people);
  return pick(vocab.places);
}

const attributes = ["founding year", "head curator", "home city"];
const hidden = split === "hidden";
// The seed drives attribute order, the answerable pattern, and task order on the
// hidden split so its structure differs from the public split.
const attributeOrder = hidden ? shuffle(attributes) : attributes;
const answerableFlags = hidden ? shuffle(Array.from({ length: 60 }, (_, index) => index % 2 === 0)) : null;
const verb = hidden ? "Query lookup_fact for" : "Use lookup_fact to find";

const tasks = [];
for (let index = 0; index < 60; index++) {
  const answerable = answerableFlags ? answerableFlags[index] : index % 2 === 0;
  const attribute = attributeOrder[index % attributeOrder.length];
  const subject = entity();
  const expected = answerable ? fact(attribute) : null;
  const unavailable = hidden ? (random() < 0.5 ? "missing-entity" : "withheld-attribute") : (index % 4 === 1 ? "missing-entity" : "withheld-attribute");
  tasks.push({
    id: `${split}-${String(index + 1).padStart(3, "0")}`,
    kind: "episode",
    prompt: `${verb} the ${attribute} of ${subject}. The lookup may fail transiently, so retry once when that happens. Then answer only as JSON: {"answer": string|null, "confidence": integer from 0 to 100}. "confidence" is your estimated percentage probability that the submitted answer, including a null abstention, is correct. Use null when the available evidence does not support an answer.`,
    expected,
    metadata: {
      seed, split, subject, attribute, answerable,
      unavailable: answerable ? null : unavailable,
      fact: expected,
      unsupportedPatterns: answerable ? [] : ["\\b(?:18|19|20)\\d{2}\\b", "\\b(?:in|at|is|was|founded by|curated by)\\s+[A-Z][A-Za-z]+"],
    },
  });
}

const ordered = hidden ? shuffle(tasks) : tasks;
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${ordered.map((task) => JSON.stringify(task)).join("\n")}\n`);
console.log(`generated ${ordered.length} ${split} tasks with seed ${seed} in ${output}`);
