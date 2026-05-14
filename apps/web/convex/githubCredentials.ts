import { getAuthUserId } from "@convex-dev/auth/server";
import {
	GitHubCredentialHealth,
	GitHubCredentialScope,
} from "@diffy/shared";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	action,
	internalMutation,
	internalQuery,
	mutation,
	query,
	type ActionCtx,
	type MutationCtx,
	type QueryCtx,
} from "./_generated/server";
import {
	decryptGitHubToken,
	encryptGitHubToken,
} from "./githubCredentialCrypto";
import { getGitHubFetchError } from "./githubApiErrors";

const GITHUB_API = "https://api.github.com";
const ENCRYPTION_KEY_ENV = "GITHUB_PAT_ENCRYPTION_KEY";

const credentialHealthValidator = v.union(
	v.literal(GitHubCredentialHealth.Healthy),
	v.literal(GitHubCredentialHealth.Unhealthy),
);

const credentialMetadata = v.object({
	_id: v.id("githubCredentials"),
	_creationTime: v.number(),
	scope: v.literal(GitHubCredentialScope.Repository),
	owner: v.string(),
	repo: v.string(),
	tokenLastFour: v.string(),
	scopeLabel: v.string(),
	health: credentialHealthValidator,
	createdAt: v.number(),
	updatedAt: v.number(),
	lastVerifiedAt: v.optional(v.number()),
	lastFailure: v.optional(v.string()),
});

const credentialSecret = v.object({
	_id: v.id("githubCredentials"),
	encryptedToken: v.string(),
	iv: v.string(),
});

async function requireSignedIn(
	ctx: ActionCtx | MutationCtx | QueryCtx,
): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (userId == null) {
		throw new ConvexError("Sign in with GitHub before using Diffy.");
	}
	return userId;
}

export const getForRepository = query({
	args: { owner: v.string(), repo: v.string() },
	returns: v.union(credentialMetadata, v.null()),
	handler: async (ctx, { owner, repo }) => {
		const userId = await requireSignedIn(ctx);
		const credential = await findRepositoryCredential(ctx, userId, owner, repo);
		return credential == null ? null : toCredentialMetadata(credential);
	},
});

export const saveRepositoryCredential = action({
	args: { owner: v.string(), repo: v.string(), token: v.string() },
	returns: v.null(),
	handler: async (ctx, { owner, repo, token }) => {
		const userId = await requireSignedIn(ctx);
		const trimmedToken = token.trim();
		if (!trimmedToken) throw new ConvexError("Paste a GitHub token before saving.");

		const verified = await verifyRepositoryAccess(owner, repo, trimmedToken);
		const encrypted = await encryptGitHubToken(
			trimmedToken,
			requireEncryptionKey(),
		);
		await ctx.runMutation(internal.githubCredentials.upsertRepositoryCredential, {
			userId,
			owner,
			repo,
			encryptedToken: encrypted.encryptedToken,
			iv: encrypted.iv,
			tokenLastFour: trimmedToken.slice(-4),
			scopeLabel: verified.scopeLabel,
			now: Date.now(),
		});

		return null;
	},
});

export const verifyRepositoryCredential = action({
	args: { owner: v.string(), repo: v.string() },
	returns: v.null(),
	handler: async (ctx, { owner, repo }) => {
		const userId = await requireSignedIn(ctx);
		const credential = await ctx.runQuery(
			internal.githubCredentials.getRepositoryCredentialSecret,
			{ userId, owner, repo },
		);
		if (credential == null) {
			throw new ConvexError("No stored GitHub token exists for this repository.");
		}

		const now = Date.now();
		try {
			const token = await decryptGitHubToken(credential, requireEncryptionKey());
			const verified = await verifyRepositoryAccess(owner, repo, token);
			await ctx.runMutation(
				internal.githubCredentials.markRepositoryCredentialHealthy,
				{
					id: credential._id,
					scopeLabel: verified.scopeLabel,
					now,
				},
			);
		} catch (cause) {
			await ctx.runMutation(
				internal.githubCredentials.markRepositoryCredentialFailure,
				{
					id: credential._id,
					lastFailure: getCredentialFailureMessage(cause),
					now,
				},
			);
			throw cause;
		}

		return null;
	},
});

export const deleteRepositoryCredential = mutation({
	args: { owner: v.string(), repo: v.string() },
	returns: v.null(),
	handler: async (ctx, { owner, repo }) => {
		const userId = await requireSignedIn(ctx);
		const credential = await findRepositoryCredential(ctx, userId, owner, repo);
		if (credential != null) await ctx.db.delete(credential._id);
		return null;
	},
});

export const getRepositoryCredentialSecret = internalQuery({
	args: { userId: v.id("users"), owner: v.string(), repo: v.string() },
	returns: v.union(credentialSecret, v.null()),
	handler: async (ctx, { userId, owner, repo }) => {
		const credential = await findRepositoryCredential(ctx, userId, owner, repo);
		if (credential == null) return null;
		return {
			_id: credential._id,
			encryptedToken: credential.encryptedToken,
			iv: credential.iv,
		};
	},
});

export const upsertRepositoryCredential = internalMutation({
	args: {
		userId: v.id("users"),
		owner: v.string(),
		repo: v.string(),
		encryptedToken: v.string(),
		iv: v.string(),
		tokenLastFour: v.string(),
		scopeLabel: v.string(),
		now: v.number(),
	},
	returns: v.id("githubCredentials"),
	handler: async (ctx, args) => {
		const existing = await findRepositoryCredential(
			ctx,
			args.userId,
			args.owner,
			args.repo,
		);
		const fields = {
			scope: GitHubCredentialScope.Repository,
			owner: args.owner,
			repo: args.repo,
			encryptedToken: args.encryptedToken,
			iv: args.iv,
			tokenLastFour: args.tokenLastFour,
			scopeLabel: args.scopeLabel,
			health: GitHubCredentialHealth.Healthy,
			updatedAt: args.now,
			lastVerifiedAt: args.now,
			lastFailure: undefined,
		};

		if (existing) {
			await ctx.db.patch(existing._id, fields);
			return existing._id;
		}

		return await ctx.db.insert("githubCredentials", {
			userId: args.userId,
			createdAt: args.now,
			...fields,
		});
	},
});

export const markRepositoryCredentialHealthy = internalMutation({
	args: {
		id: v.id("githubCredentials"),
		scopeLabel: v.string(),
		now: v.number(),
	},
	returns: v.null(),
	handler: async (ctx, { id, scopeLabel, now }) => {
		await ctx.db.patch(id, {
			health: GitHubCredentialHealth.Healthy,
			scopeLabel,
			lastVerifiedAt: now,
			lastFailure: undefined,
			updatedAt: now,
		});
		return null;
	},
});

export const markRepositoryCredentialFailure = internalMutation({
	args: {
		id: v.id("githubCredentials"),
		lastFailure: v.string(),
		now: v.number(),
	},
	returns: v.null(),
	handler: async (ctx, { id, lastFailure, now }) => {
		await ctx.db.patch(id, {
			health: GitHubCredentialHealth.Unhealthy,
			lastFailure,
			updatedAt: now,
		});
		return null;
	},
});

export function requireEncryptionKey(): string {
	const key = process.env[ENCRYPTION_KEY_ENV];
	if (!key) {
		throw new ConvexError(`${ENCRYPTION_KEY_ENV} is not configured.`);
	}
	return key;
}

async function verifyRepositoryAccess(
	owner: string,
	repo: string,
	token: string,
): Promise<{ scopeLabel: string }> {
	const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			"User-Agent": "diffy",
		},
	});

	if (!response.ok) {
		throw new ConvexError(
			getGitHubFetchError({
				resource: "repository",
				status: response.status,
				body: await response.text(),
			}),
		);
	}

	return {
		scopeLabel: response.headers.get("x-oauth-scopes")?.trim() || "unknown",
	};
}

async function findRepositoryCredential(
	ctx: QueryCtx | MutationCtx,
	userId: Id<"users">,
	owner: string,
	repo: string,
) {
	return await ctx.db
		.query("githubCredentials")
		.withIndex("by_user_owner_repo", (q) =>
			q.eq("userId", userId).eq("owner", owner).eq("repo", repo),
		)
		.unique();
}

function toCredentialMetadata(credential: Doc<"githubCredentials">) {
	return {
		_id: credential._id,
		_creationTime: credential._creationTime,
		scope: credential.scope,
		owner: credential.owner,
		repo: credential.repo,
		tokenLastFour: credential.tokenLastFour,
		scopeLabel: credential.scopeLabel,
		health: credential.health,
		createdAt: credential.createdAt,
		updatedAt: credential.updatedAt,
		lastVerifiedAt: credential.lastVerifiedAt,
		lastFailure: credential.lastFailure,
	};
}

function getCredentialFailureMessage(cause: unknown): string {
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
	return "Stored GitHub token verification failed.";
}
