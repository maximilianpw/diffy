import { useConvexAuth } from "@convex-dev/auth/react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { TopBar } from "#/components/top-bar";
import { api } from "../../convex/_generated/api";
import { OpenPrsSidebar } from "../features/paste-pr/components/OpenPrsSidebar";
import { PastePrHome } from "../features/paste-pr/components/PastePrHome";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const navigate = Route.useNavigate();
	const { isAuthenticated, isLoading } = useConvexAuth();
	const openPrs = useQuery(
		api.pullRequests.listOpen,
		isAuthenticated ? {} : "skip",
	);
	const touchPr = useMutation(api.pullRequests.touch);

	function navigateToPr({
		owner,
		repo,
		number,
	}: {
		owner: string;
		repo: string;
		number: number;
	}) {
		void navigate({
			to: "/pr/$owner/$repo/$number",
			params: { owner, repo, number },
		});
	}

	return (
		<>
			<TopBar />
			<div className="sidebar-page-grid">
				<OpenPrsSidebar
					isAuthenticated={isAuthenticated}
					openPrs={openPrs}
					onSelect={(entry) => {
						void touchPr({ id: entry.id });
						navigateToPr(entry);
					}}
				/>
				<PastePrHome
					isAuthenticated={isAuthenticated}
					isLoading={isLoading}
					navigateToPr={navigateToPr}
				/>
			</div>
		</>
	);
}
