import { ConvexError } from "convex/values";

export function getImportErrorMessage(cause: unknown): string {
	if (cause instanceof ConvexError && typeof cause.data === "string") {
		return cause.data;
	}
	if (
		cause instanceof ConvexError &&
		cause.data != null &&
		typeof cause.data === "object" &&
		"message" in cause.data &&
		typeof cause.data.message === "string"
	) {
		return cause.data.message;
	}

	if (cause instanceof Error) return cause.message;

	return "Could not import pull request.";
}
