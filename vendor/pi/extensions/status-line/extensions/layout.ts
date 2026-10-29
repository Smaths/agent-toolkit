// Keep layout independent of Pi state so width fallbacks can be checked offline.
export function layoutFooter(options: {
	width: number;
	branch: string;
	model: string;
	compactModel: string;
	thinking: string;
	cost: string;
	sep: string;
	context: (size: number) => string;
	visibleWidth: (text: string) => number;
	truncateToWidth: (text: string, width: number) => string;
}): string {
	const { width, branch, model, compactModel, thinking, cost, sep, context, visibleWidth, truncateToWidth } = options;
	const fits = (line: string) => visibleWidth(line) <= width;
	const full = `${branch}${sep}${model}${thinking}${sep}${context(20)}${sep}${cost}`;
	if (fits(full)) return full;
	// The provider goes first; keep the branch and thinking when they still fit.
	const withoutProvider = `${branch}${sep}${compactModel}${thinking}${sep}${context(20)}${sep}${cost}`;
	if (fits(withoutProvider)) return withoutProvider;
	const withoutBranch = `${compactModel}${thinking}${sep}${context(20)}${sep}${cost}`;
	if (fits(withoutBranch)) return withoutBranch;

	// Keep used/max figures at narrow widths; shed thinking and separator padding
	// before shortening the model ID or removing other essential information.
	const tryLayout = (name: string, effort: string, separator: string, minBar: number) => {
		for (let size = 20; size >= minBar; size--) {
			const line = `${name}${effort}${separator}${context(size)}${separator}${cost}`;
			if (fits(line)) return line;
		}
	};
	return tryLayout(compactModel, thinking, sep, 5) ??
		tryLayout(compactModel, "", sep, 5) ??
		tryLayout(compactModel, "", " ", 5) ??
		// A shorter bar stops being useful: omit it before shortening the model ID.
		(() => {
			const noBar = `${compactModel}${sep}${context(0)}${sep}${cost}`;
			if (fits(noBar)) return noBar;
			const compactNoBar = `${compactModel} ${context(0)} ${cost}`;
			if (fits(compactNoBar)) return compactNoBar;
			const suffix = ` ${context(0)} ${cost}`;
			const available = width - visibleWidth(suffix);
			if (available > 0) return truncateToWidth(compactModel, available) + suffix;
			return truncateToWidth(compactModel, Math.max(0, width));
		})();
}
