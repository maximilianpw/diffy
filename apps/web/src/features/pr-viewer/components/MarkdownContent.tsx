import ReactMarkdown, {
	type Options as ReactMarkdownOptions,
} from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, {
	defaultSchema,
	type Options as RehypeSanitizeOptions,
} from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import "./MarkdownContent.scss";

type MarkdownContentProps = {
	children: string;
};

const remarkPlugins = [remarkGfm, remarkBreaks];
const sanitizeSchema = {
	...defaultSchema,
	attributes: {
		...defaultSchema.attributes,
		details: [...(defaultSchema.attributes?.details ?? []), ["open", true]],
		input: [...(defaultSchema.attributes?.input ?? []), ["checked", true]],
	},
} satisfies RehypeSanitizeOptions;

const rehypePlugins = [
	rehypeRaw,
	[rehypeSanitize, sanitizeSchema],
] satisfies NonNullable<ReactMarkdownOptions["rehypePlugins"]>;

export function MarkdownContent({ children }: MarkdownContentProps) {
	return (
		<div className="markdown-content">
			<ReactMarkdown
				remarkPlugins={remarkPlugins}
				rehypePlugins={rehypePlugins}
			>
				{children}
			</ReactMarkdown>
		</div>
	);
}
