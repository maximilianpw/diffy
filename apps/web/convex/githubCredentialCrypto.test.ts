import { describe, expect, it } from "vitest";

import {
	decodeCredentialEncryptionKey,
	decryptGitHubToken,
	encryptGitHubToken,
} from "./githubCredentialCrypto";

const KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const OTHER_KEY =
	"abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

describe("GitHub credential crypto", () => {
	it("encrypts and decrypts a token with a 32-byte app key", async () => {
		const encrypted = await encryptGitHubToken("github_pat_secret", KEY);

		expect(encrypted.encryptedToken).not.toContain("github_pat_secret");
		expect(encrypted.iv).toBeTruthy();
		await expect(decryptGitHubToken(encrypted, KEY)).resolves.toBe(
			"github_pat_secret",
		);
	});

	it("rejects keys that are not 32 bytes", () => {
		expect(() => decodeCredentialEncryptionKey("short")).toThrow("32 bytes");
	});

	it("does not decrypt with a different key", async () => {
		const encrypted = await encryptGitHubToken("github_pat_secret", KEY);

		await expect(decryptGitHubToken(encrypted, OTHER_KEY)).rejects.toThrow();
	});
});
