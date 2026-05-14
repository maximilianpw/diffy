export type EncryptedGitHubToken = {
	encryptedToken: string;
	iv: string;
};

const AES_GCM_KEY_BYTES = 32;
const AES_GCM_IV_BYTES = 12;

export async function encryptGitHubToken(
	token: string,
	encodedKey: string,
): Promise<EncryptedGitHubToken> {
	const iv = new Uint8Array(AES_GCM_IV_BYTES);
	crypto.getRandomValues(iv);

	const key = await importAesGcmKey(encodedKey);
	const encodedToken = new TextEncoder().encode(token);
	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		encodedToken,
	);

	return {
		encryptedToken: bytesToBase64(new Uint8Array(encrypted)),
		iv: bytesToBase64(iv),
	};
}

export async function decryptGitHubToken(
	encrypted: EncryptedGitHubToken,
	encodedKey: string,
): Promise<string> {
	const key = await importAesGcmKey(encodedKey);
	const decrypted = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: toArrayBuffer(base64ToBytes(encrypted.iv)) },
		key,
		toArrayBuffer(base64ToBytes(encrypted.encryptedToken)),
	);

	return new TextDecoder().decode(decrypted);
}

export function decodeCredentialEncryptionKey(encodedKey: string): Uint8Array {
	const trimmed = encodedKey.trim();
	let key: Uint8Array;
	try {
		key =
			/^[0-9a-f]{64}$/i.test(trimmed)
				? hexToBytes(trimmed)
				: base64ToBytes(trimmed);
	} catch {
		throw new Error("GitHub credential encryption key must decode to 32 bytes.");
	}

	if (key.byteLength !== AES_GCM_KEY_BYTES) {
		throw new Error("GitHub credential encryption key must decode to 32 bytes.");
	}

	return key;
}

async function importAesGcmKey(encodedKey: string): Promise<CryptoKey> {
	return await crypto.subtle.importKey(
		"raw",
		toArrayBuffer(decodeCredentialEncryptionKey(encodedKey)),
		{ name: "AES-GCM" },
		false,
		["encrypt", "decrypt"],
	);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
}

function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

function base64ToBytes(base64: string): Uint8Array {
	const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
	const padded = normalized.padEnd(
		normalized.length + ((4 - (normalized.length % 4)) % 4),
		"=",
	);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}
