import { describe, expect, test } from "vitest";
import { resolveHomeDirectory, resolveUserConfigRoot } from "../../src/config/user-config.js";

describe("user config helpers", () => {
    test("prefers HOME when resolving the user config root", () => {
        const env = { HOME: "/tmp/mawm-home", USERPROFILE: "/tmp/profile" };

        expect(resolveUserConfigRoot(env)).toBe("/tmp/mawm-home/.config/mawm");
    });

    test("combines HOMEDRIVE and HOMEPATH when HOME is unavailable", () => {
        const env = { HOMEDRIVE: "C:", HOMEPATH: "\\Users\\mawm" };

        expect(resolveHomeDirectory(env)).toBe("C:\\Users\\mawm");
    });
});
