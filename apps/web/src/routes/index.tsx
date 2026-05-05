import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { TopBar } from "#/components/top-bar";
import { api } from "../../convex/_generated/api";
import { OpenPrsSidebar } from "../features/paste-pr/components/OpenPrsSidebar";
import { PastePrHome } from "../features/paste-pr/components/PastePrHome";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const navigate = Route.useNavigate();

	return (
		<>
			<TopBar />
			<div className="sidebar-page-grid">
				<OpenPrsSidebar
					onSelect={({ owner, repo, number }) =>
						navigate({
							to: "/pr/$owner/$repo/$number",
							params: { owner, repo, number },
						})
					}
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
