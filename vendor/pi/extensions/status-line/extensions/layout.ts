// Keep layout independent of Pi state so width fallbacks can be checked offline.
export function layoutFooter(options: {
	width: number;
	branch: string;
	gitStatus?: string;
	model: string;
	compactModel: string;
	thinking: string;
	cost: string;
	sep: string;
	context: (size: number) => string;
	visibleWidth: (text: string) => number;
	truncateToWidth: (text: string, width: number) => string;
}): string {
	const { width, branch, gitStatus = "", model, compactModel, thinking, cost, sep, context, visibleWidth, truncateToWidth } = options;
	const git = `${branch}${gitStatus ? ` ${gitStatus}` : ""}`;
	const fits = (line: string) => visibleWidth(line) <= width;
	const full = `${git}${sep}${model}${thinking}${sep}${context(20)}${sep}${cost}`;
	if (fits(full)) return full;

	// The visual gauge is expendable; preserve all text before dropping anything else.
	const numericContext = context(0);
	const noGauge = `${git}${sep}${model}${thinking}${sep}${numericContext}${sep}${cost}`;
	if (fits(noGauge)) return noGauge;
	const withoutProvider = `${git}${sep}${compactModel}${thinking}${sep}${numericContext}${sep}${cost}`;
	if (fits(withoutProvider)) return withoutProvider;
	const withoutThinking = `${git}${sep}${compactModel}${sep}${numericContext}${sep}${cost}`;
	if (fits(withoutThinking)) return withoutThinking;
	if (gitStatus) {
		const countsOnly = `${gitStatus}${sep}${compactModel}${sep}${numericContext}${sep}${cost}`;
		if (fits(countsOnly)) return countsOnly;
	}
	const withoutGit = `${compactModel}${sep}${numericContext}${sep}${cost}`;
	if (fits(withoutGit)) return withoutGit;

	// Keep numeric context and cost intact; shed separator padding before
	// shortening the model ID or removing other essential information.
	const compact = `${compactModel} ${numericContext} ${cost}`;
	if (fits(compact)) return compact;
	const suffix = ` ${numericContext} ${cost}`;
	const available = width - visibleWidth(suffix);
	if (available > 0) return truncateToWidth(compactModel, available) + suffix;
	return truncateToWidth(compactModel, Math.max(0, width));
}
