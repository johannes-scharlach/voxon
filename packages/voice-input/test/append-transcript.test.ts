import { describe, expect, it } from "vitest";
import { appendTranscript } from "../src/append-transcript";

describe("appendTranscript", () => {
  it("returns the transcript when there is no existing text", () => {
    expect(appendTranscript("", "hello")).toBe("hello");
  });

  it("appends the transcript with a space when there is existing text", () => {
    expect(appendTranscript("hello", "world")).toBe("hello world");
  });

  it("trims leading and trailing whitespace from the transcript", () => {
    expect(appendTranscript("hello", "  world  ")).toBe("hello world");
  });

  it("does not add a separator when existing text already ends with whitespace", () => {
    expect(appendTranscript("hello ", "world")).toBe("hello world");
    expect(appendTranscript("hello\n", "world")).toBe("hello\nworld");
  });

  it("ignores empty transcripts", () => {
    expect(appendTranscript("hello", "")).toBe("hello");
    expect(appendTranscript("hello", "   ")).toBe("hello");
  });
});
