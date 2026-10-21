// @ts-nocheck
import { describe, expect, it } from "vitest";
import { formatDate, relativeTime, initials, excerpt, toPublicUser, paginate, slugify } from "../src/lib/utils";

describe("utils", () => {
  it("slugify converts text to slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("Hello   World!!!")).toBe("hello-world");
  });

  it("formatDate returns formatted date", () => {
    const result = formatDate("2026-01-15T00:00:00.000Z");
    expect(result).toContain("2026");
  });

  it("relativeTime returns relative time string", () => {
    const now = new Date().toISOString();
    const result = relativeTime(now);
    expect(result).toBe("just now");
  });

  it("initials extracts initials from name", () => {
    expect(initials("John Doe")).toBe("JD");
    expect(initials("John")).toBe("J");
  });

  it("excerpt truncates text", () => {
    const result = excerpt("This is a long text that should be truncated", 10);
    expect(result).toBe("This is a…");
  });

  it("toPublicUser maps user to public user", () => {
    const user = {
      id: "user-1",
      username: "testuser",
      fullName: "Test User",
      email: "test@example.com",
      avatar: "/images/avatars/avatar-1.svg",
      bio: "Test bio",
      divisionId: null,
      districtId: null,
      upazilaId: null,
      role: "user",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as any;
    const publicUser = toPublicUser(user);
    expect(publicUser.id).toBe("user-1");
    expect(publicUser.username).toBe("testuser");
    expect(publicUser.fullName).toBe("Test User");
  });

  it("paginate returns paginated items", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = paginate(items, 1, 3);
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.meta.total).toBe(10);
    expect(result.meta.totalPages).toBe(4);
    expect(result.meta.hasNext).toBe(true);
  });
});