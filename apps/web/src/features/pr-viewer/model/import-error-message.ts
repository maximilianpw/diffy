import { ConvexError } from "convex/values";

export type ImportErrorDetails = {
	message: string;
	canSaveRepositoryCredential: boolean;
};

export function getImportErrorDetails(cause: unknown): ImportErrorDetails {
	if (cause instanceof ConvexError && typeof cause.data === "string") {
		return {
			message: cause.data,
			canSaveRepositoryCredential: false,
		};
	}

	const convexData = getConvexErrorData(cause);
	const message = getImportErrorMessage(cause);

	return {
		message,
		canSaveRepositoryCredential:
			convexData?.kind === "github_org_oauth_app_restricted" ||
			convexData?.kind === "github_stored_pat_failed",
	};
}

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

function getConvexErrorData(cause: unknown): { kind?: unknown } | null {
	if (
		cause instanceof ConvexError &&
		cause.data != null &&
		typeof cause.data === "object"
	) {
		return cause.data as { kind?: unknown };
	}

	return null;
}
