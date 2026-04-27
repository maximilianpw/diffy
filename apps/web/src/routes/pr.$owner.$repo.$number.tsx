import { createFileRoute } from '@tanstack/react-router';
import { PrViewerShell } from '../features/pr-viewer/PrViewerShell';

export const Route = createFileRoute('/pr/$owner/$repo/$number')({
	component: PrRoute,
});

function PrRoute() {
	const { owner, repo, number } = Route.useParams();

	return (
		<PrViewerShell
			owner={owner}
			repo={repo}
			number={Number(number)}
		/>
	);
}
