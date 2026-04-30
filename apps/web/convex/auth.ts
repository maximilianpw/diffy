import GitHub from '@auth/core/providers/github';
import { convexAuth } from '@convex-dev/auth/server';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [
		GitHub({
			authorization: { params: { scope: 'read:user user:email repo' } },
			profile(profile, tokens) {
				return {
					id: String(profile.id),
					name: profile.name ?? profile.login,
					email: profile.email ?? undefined,
					image: profile.avatar_url ?? undefined,
					githubAccessToken: tokens.access_token,
				};
			},
		}),
	],
});
