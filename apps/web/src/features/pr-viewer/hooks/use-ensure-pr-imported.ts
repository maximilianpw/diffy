import { useEffect, useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { PrDoc } from "../../../../convex/docTypes";
import { shouldBackfillDiscussion } from "../model/discussion-backfill";
import { getImportErrorMessage } from "../model/import-error-message";

type PrSnapshot =
	| (PrDoc & {
			diffUrl?: string | null;
	  })
	| null
	| undefined;

type ImportPr = (args: {
	owner: string;
	repo: string;
	number: number;
}) => Promise<Id<"pullRequests">>;

type ImportDiscussion = (args: {
	pullRequestId: Id<"pullRequests">;
	owner: string;
	repo: string;
	number: number;
}) => Promise<null>;

type Args = {
	pr: PrSnapshot;
	owner: string;
	repo: string;
	number: number;
	importPr: ImportPr;
	importDiscussion: ImportDiscussion;
};

export function useEnsurePrImported({
	pr,
	owner,
	repo,
	number,
	importPr,
	importDiscussion,
}: Args): string | null {
	const [importError, setImportError] = useState<string | null>(null);
	const [importStarted, setImportStarted] = useState(false);
	const [discussionImportStarted, setDiscussionImportStarted] = useState(false);

	useEffect(() => {
		if (pr !== null || importStarted) return;

		setImportStarted(true);
		void importPr({ owner, repo, number }).catch((cause) => {
			setImportError(getImportErrorMessage(cause));
		});
	}, [importPr, importStarted, owner, pr, number, repo]);

	useEffect(() => {
		if (!pr || !shouldBackfillDiscussion(pr) || discussionImportStarted) return;

		setDiscussionImportStarted(true);
		void importDiscussion({
			pullRequestId: pr._id,
			owner,
			repo,
			number,
		}).catch((cause) => {
			setImportError(getImportErrorMessage(cause));
		});
	}, [discussionImportStarted, importDiscussion, owner, pr, number, repo]);

	return importError;
}
