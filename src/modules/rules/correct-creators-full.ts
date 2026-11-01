import { getPref } from "../../utils/prefs";
import { splitPinyin } from "./correct-creators-pinyin";
import { defineRule } from "./rule-base";

interface CorrectCreatorsFullOptions {
  removeHyphen: boolean;
}

export const CorrectCreatorsFull = defineRule({
  id: "correct-creators-full",
  scope: "field",
  targetItemField: "creators",
  apply({ item, debug }) {
    const options: CorrectCreatorsFullOptions = {
      removeHyphen: getPref("rule.correct-creators-full.remove-hyphen"),
    };

    const creators = item.getCreators();
    let changed = false;
    const newCreators = creators.map((creator) => {
      if (creator.fieldMode !== 0)
        return creator;

      const firstName = correctFullName(creator.firstName ?? "", options, true);
      const lastName = correctFullName(creator.lastName ?? "", options, false);
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

export function correctFullName(name: string, options: CorrectCreatorsFullOptions, expandAbbreviation: boolean): string {
  let result = name;
  if (options.removeHyphen)
    result = removePinyinHyphen(result);
  if (expandAbbreviation)
    result = expandAbbreviatedName(result);
  return result;
}

// Matches tokens like "J.", "J.B." or "J.B.C." where every letter is followed by a dot,
// e.g. "Ph.D." does not match since "P" is not followed by a dot.
const abbreviatedTokenPattern = /^(?:\p{L}\.)+$/u;

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
