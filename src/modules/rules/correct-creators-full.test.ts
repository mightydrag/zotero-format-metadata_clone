import { describe, expect, it } from "vitest";
import { expandAbbreviatedName, isAbbreviatedName, matchFullFirstName, removePinyinHyphen } from "./correct-creators-full";

function makeCreator(firstName: string, lastName: string): _ZoteroTypes.Item.Creator {
  return {
    fieldMode: 0,
    firstName,
    lastName,
    creatorTypeID: 1,
  };
}

describe("isAbbreviatedName", () => {
  it("should detect single initial with dot", () => {
    expect(isAbbreviatedName("J.")).toBe(true);
  });

  it("should detect compact multi-initials", () => {
    expect(isAbbreviatedName("J.B.")).toBe(true);
  });

  it("should detect initial among full words", () => {
    expect(isAbbreviatedName("John J.")).toBe(true);
  });

  it("should not flag full names", () => {
    expect(isAbbreviatedName("John")).toBe(false);
  });

  it("should not flag degrees", () => {
    expect(isAbbreviatedName("Ph.D.")).toBe(false);
  });
});

describe("matchFullFirstName", () => {
  const candidates = [
    makeCreator("John Brian", "Zhang"),
    makeCreator("Jane", "Li"),
  ];

  it("should expand single initial via metadata", () => {
    expect(matchFullFirstName("J.", "Zhang", candidates)).toBe("John Brian");
  });

  it("should expand multi-initials matching the prefix", () => {
    expect(matchFullFirstName("J.B.", "Zhang", candidates)).toBe("John Brian");
  });

  it("should be case-insensitive on last name", () => {
    expect(matchFullFirstName("J.", "zhang", candidates)).toBe("John Brian");
  });

  it("should return undefined when initial does not match", () => {
    expect(matchFullFirstName("X.", "Zhang", candidates)).toBeUndefined();
  });

  it("should return undefined when multiple different full names match", () => {
    const ambiguous = [makeCreator("John", "Zhang"), makeCreator("Jane", "Zhang")];
    expect(matchFullFirstName("J.", "Zhang", ambiguous)).toBeUndefined();
  });

  it("should return the name when multiple identical matches agree", () => {
    const duplicate = [makeCreator("John", "Zhang"), makeCreator("John", "Zhang")];
    expect(matchFullFirstName("J.", "Zhang", duplicate)).toBe("John");
  });
});

describe("expandAbbreviatedName", () => {
  it("should expand a single initial with dot", () => {
    expect(expandAbbreviatedName("J.")).toBe("J");
  });

  it("should expand compact multi-initials", () => {
    expect(expandAbbreviatedName("J.B.")).toBe("J B");
  });

  it("should expand initials in a full first name", () => {
    expect(expandAbbreviatedName("John J.")).toBe("John J");
  });

  it("should lowercase initial be capitalized", () => {
    expect(expandAbbreviatedName("j.")).toBe("J");
  });

  it("should keep full names unchanged", () => {
    expect(expandAbbreviatedName("John")).toBe("John");
  });

  it("should keep degrees like Ph.D. unchanged", () => {
    expect(expandAbbreviatedName("Ph.D.")).toBe("Ph.D.");
  });

  it("should keep names without dots unchanged", () => {
    expect(expandAbbreviatedName("JB")).toBe("JB");
  });
});

describe("removePinyinHyphen", () => {
  it("should remove hyphen in hyphenated pinyin", () => {
    expect(removePinyinHyphen("Jian-Bei")).toBe("Jian Bei");
  });

  it("should keep non-pinyin hyphenated names", () => {
    expect(removePinyinHyphen("Smith-Jones")).toBe("Smith-Jones");
  });

  it("should keep names without hyphen unchanged", () => {
    expect(removePinyinHyphen("Jianbei")).toBe("Jianbei");
  });

  it("should keep invalid hyphen parts unchanged", () => {
    expect(removePinyinHyphen("Jian-xyz")).toBe("Jian-xyz");
  });
});
