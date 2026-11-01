import { getPref } from "../../utils/prefs";
import { splitPinyin } from "./correct-creators-pinyin";
import { defineRule } from "./rule-base";
import { extractIdentifiers, isPreprint } from "./tool-update-metadata/identifiers";

export const CorrectCreatorsFull = defineRule({
  id: "correct-creators-full",
  scope: "field",
  targetItemField: "creators",
  async apply({ item, debug }) {
    const removeHyphen = getPref("rule.correct-creators-full.remove-hyphen");
    const expandAbbreviation = getPref("rule.correct-creators-full.expand-abbreviation");

    const creators = item.getCreators();

    let fullNameCreators: _ZoteroTypes.Item.Creator[] | undefined;
    if (expandAbbreviation && creators.some(c => c.fieldMode === 0 && isAbbreviatedName(c.firstName ?? "")))
      fullNameCreators = await fetchFullCreators(item, debug);

    let changed = false;
    const newCreators = creators.map((creator) => {
      if (creator.fieldMode !== 0)
        return creator;

      let firstName = creator.firstName ?? "";
      if (removeHyphen)
        firstName = removePinyinHyphen(firstName);

      if (isAbbreviatedName(firstName)) {
        const fullFirstName = fullNameCreators
          ? matchFullFirstName(firstName, creator.lastName ?? "", fullNameCreators)
          : undefined;
        if (fullFirstName) {
          debug(`Expand abbreviated name via metadata lookup: ${creator.lastName}, ${firstName} -> ${fullFirstName}`);
          firstName = fullFirstName;
        }
        else {
          firstName = expandAbbreviatedName(firstName);
        }
      }

      const lastName = removeHyphen ? removePinyinHyphen(creator.lastName ?? "") : creator.lastName ?? "";
      if (firstName !== creator.firstName || lastName !== creator.lastName) {
        changed = true;
        debug(`Correct full name: ${creator.lastName}, ${creator.firstName} -> ${lastName}, ${firstName}`);
      }
      return { ...creator, firstName, lastName };
    });

    if (changed)
      item.setCreators(newCreators);
  },
});

/**
 * Query external metadata services (via DOI/title/URL) for the item's full creator list.
 */
async function fetchFullCreators(item: Zotero.Item, debug: (...args: any[]) => void): Promise<_ZoteroTypes.Item.Creator[] | undefined> {
  // Lazy import: the services touch the Zotero global at module load,
  // which is unavailable in unit tests.
  const { services } = await import("./tool-update-metadata/services");

  const identifiers = extractIdentifiers(item);
  if (Object.keys(identifiers).length === 0) {
    debug("No identifiers found, skip metadata lookup");
    return undefined;
  }

  for (const service of services) {
    if (!service.fetch || !service.shouldApply({ item, identifiers, isPreprint: isPreprint(item, identifiers), debug }))
      continue;

    const res = await service.fetch({ item, identifiers, isPreprint: isPreprint(item, identifiers), debug: (msg: string) => debug(`[${service.id}] ${msg}`) })
      .catch((error) => {
        debug(`Service ${service.name} failed: ${error.message}`);
        return undefined;
      });
    if (!res)
      continue;

    const data = service.transform?.(res);
    if (data?.creators?.length) {
      debug(`Got ${data.creators.length} full creators via ${service.name}`);
      return data.creators;
    }
  }
  return undefined;
}

// Matches tokens like "J.", "J.B." or "J.B.C." where every letter is followed by a dot,
// e.g. "Ph.D." does not match since "P" is not followed by a dot.
const abbreviatedTokenPattern = /^(?:\p{L}\.)+$/u;

export function isAbbreviatedName(name: string): boolean {
  return name.split(/\s+/).some(token => abbreviatedTokenPattern.test(token));
}

/**
 * Expand abbreviated name tokens with dots (e.g. "J." -> "J", "J.B." -> "J B").
 * Zotero stores initials without dots; CSL styles add the dots when rendering.
 */
export function expandAbbreviatedName(name: string): string {
  return name
    .split(/\s+/)
    .map((token) => {
      if (!abbreviatedTokenPattern.test(token))
        return token;
      return token.split(".").filter(Boolean).map(letter => letter.toUpperCase()).join(" ");
    })
    .join(" ");
}

/**
 * Match an abbreviated first name (e.g. "J B") against full creators fetched from metadata,
 * by last name and initial prefix. Returns the full first name only when the match is unambiguous.
 */
export function matchFullFirstName(abbreviated: string, lastName: string, candidates: _ZoteroTypes.Item.Creator[]): string | undefined {
  const initials = abbreviated.replace(/[.\s]/g, "").toUpperCase().split("");
  if (!initials.length || !lastName.trim())
    return undefined;

  const matched = candidates
    .filter(c => c.fieldMode !== 1)
    .filter(c => (c.lastName ?? "").trim().toLowerCase() === lastName.trim().toLowerCase())
    .filter(c => initialsMatch(initials, c.firstName ?? ""))
    .map(c => (c.firstName ?? "").trim())
    .filter(Boolean);

  const unique = [...new Set(matched)];
  return unique.length === 1 ? unique[0] : undefined;
}

function initialsMatch(initials: string[], fullFirstName: string): boolean {
  const words = fullFirstName.split(/\s+/).filter(Boolean);
  if (words.length < initials.length)
    return false;
  return initials.every((initial, i) => words[i].charAt(0).toUpperCase() === initial);
}

/**
 * Remove hyphens in hyphenated pinyin names (e.g. "Jian-Bei" -> "Jian Bei").
 * Non-pinyin hyphenated names (e.g. "Smith-Jones") are kept as is.
 */
export function removePinyinHyphen(name: string): string {
  if (!name.includes("-"))
    return name;

  const parts = name.split("-");
  if (parts.some(part => part.length === 0 || splitPinyin(part.toLowerCase()).length === 0))
    return name;

  return parts.map(part => splitPinyin(part.toLowerCase())[0]).join(" ");
}
