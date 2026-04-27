import { createFileRoute } from '@tanstack/react-router';
import { PastePrHome } from '../features/paste-pr/PastePrHome';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
	const navigate = Route.useNavigate();

	return <PastePrHome navigateToPr={(path) => navigate({ to: path })} />;
}
