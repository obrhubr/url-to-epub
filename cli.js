import { convert } from './convert.js';

// Sources (they have to provide a default function that returns a list of urls.)
import miniflux from './sources/miniflux.js';

// Check for cli arguments
if (process.argv.length >= 3) {
	const arg = process.argv[2];

	// Determine if the source is a url or an adapter.
	const isUrl = arg.substring(0, 4) == "http";
	let urls = [];
	if (isUrl) {
		urls = [arg];
	} else {
		switch  (arg) {
			case "miniflux":
				const source = miniflux;
				urls = await source();
			default:
				break;
		};
	};

	// Run the conversion for each url
	console.log(`Exctracting content from ${urls.length} to epubs.`);
	urls.forEach(async url => {
		await convert(url);
	});
} else {
	console.log("Please provide a source.");
};