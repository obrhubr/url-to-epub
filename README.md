# URL to EPUB converter

This NodeJS script allows you to convert the content on any website into an epub using [Mozilla's Readability library](https://github.com/mozilla/readability).

### Requirements

You need to have `pandoc` and `node` & `npm` installed.

### Usage

To convert the contents of a site into an epub, use
`npm run convert [url]`.

If you have a miniflux instance, you can fetch your starred articles and convert them to epub automatically.

Create a `.env` file with `MINIFLUX_URL` and `API_TOKEN` variables and use the command `npm run convert miniflux`.

### Extensions

You can also write extensions to fetch urls from different aggregators, bookmarking services or any other source.

Create a `[source].js` file in the `sources` directory. It needs to export a default function that returns a list of urls.

```js
export default async function fetchUrls() {
    return urls;
};
```

Then, import the module in the `cli.js` script and create a new case in the source selection code:

```js
switch  (arg) {
	case "your new source":
		const source = yourNewSource;
		urls = await source();
	default:
		break;
};
```