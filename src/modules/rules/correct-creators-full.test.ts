import { describe, expect, it } from "vitest";
import { expandAbbreviatedName, removePinyinHyphen } from "./correct-creators-full";

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
