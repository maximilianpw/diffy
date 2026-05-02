import {
	Bell,
	CircleAlert,
	type LucideIcon,
	Pause,
	RefreshCw,
} from "lucide-react";

export enum PrUpdateCheckStatus {
	Idle = "idle",
	Checking = "checking",
	Available = "available",
	Updating = "updating",
	Paused = "paused",
	Error = "error",
}

type NoticeCopy = {
	title: string;
	description: string;
	Icon: LucideIcon;
};

export const NOTICE_COPY: Record<PrUpdateCheckStatus, NoticeCopy> = {
	[PrUpdateCheckStatus.Available]: {
		title: "Updates available",
		description:
			"GitHub has a newer version of this pull request. Your current diff will stay put until you update.",
		Icon: Bell,
	},
	[PrUpdateCheckStatus.Error]: {
		title: "Update check failed",
		description: "Diffy could not check GitHub for updates.",
		Icon: CircleAlert,
	},
	[PrUpdateCheckStatus.Updating]: {
		title: "Updating pull request",
		description:
			"Refreshing metadata, discussion, and the latest diff snapshot from GitHub.",
		Icon: RefreshCw,
	},
	[PrUpdateCheckStatus.Checking]: {
		title: "Checking for updates",
		description: "Looking for a newer PR snapshot without changing the diff.",
		Icon: RefreshCw,
	},
	[PrUpdateCheckStatus.Paused]: {
		title: "Update checks paused",
		description:
			"Resume checks to get notified when GitHub changes this open pull request.",
		Icon: Pause,
	},
	[PrUpdateCheckStatus.Idle]: {
		title: "Auto-checking for updates",
		description: "Diffy will notify you before applying a newer PR snapshot.",
		Icon: RefreshCw,
	},
};
