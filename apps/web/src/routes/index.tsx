import { createFileRoute } from "@tanstack/react-router";
import { Crumb, TopBar } from "#/components/top-bar";
import { OpenPrsSidebar } from "../features/paste-pr/components/OpenPrsSidebar";
import { PastePrHome } from "../features/paste-pr/components/PastePrHome";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const navigate = Route.useNavigate();

	return (
		<>
			<TopBar breadcrumb={<Crumb>Diffy</Crumb>} />
			<div className="grid min-h-[calc(100vh-3rem)] grid-cols-1 lg:grid-cols-[280px_1fr]">
				<OpenPrsSidebar
					onSelect={({ owner, repo, number }) =>
						navigate({
							to: "/pr/$owner/$repo/$number",
							params: { owner, repo, number: String(number) },
						})
					}
				/>
				<PastePrHome navigateToPr={(path) => navigate({ to: path })} />
			</div>
		</>
	);
}
