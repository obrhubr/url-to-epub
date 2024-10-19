import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { exec } from 'child_process';
import fs from 'fs';
import path, { dirname } from 'path';
import * as urlModule from 'url';

// Define __dirname for use in ES modules
const __filename = urlModule.fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to download the HTML content
async function downloadHtml(url) {
	try {
		const response = await axios.get(url);
		return response.data;
	} catch (error) {
		console.error('Error downloading the page:', error);
	};
};

// Function to extract readable content using Readability
function extractReadableContent(html, url) {
	try {
		const dom = new JSDOM(html, { url });
		const reader = new Readability(dom.window.document);
		const article = reader.parse();

		// Throw error if there is no content instead of failing silently
		if (!article) {
			throw new Error("No readable content.");
		};

		return article;
	} catch (e) {
		console.error(`Could not extract readable content from the URL: ${url}. Error:`, e);
	};
}

// Function to estimate reading time (roughly 200-250 words per minute)
function calculateReadingTime(text) {
	const wordCount = text.split(" ").length;
	
	const wordsPerMinute = 250; // Average reading speed
	const readingTimeMinutes = Math.ceil(wordCount / wordsPerMinute);

	return readingTimeMinutes;
}

// Function to extract the domain from the URL
function getDomain(url) {
	const parsedUrl = new URL(url);
	return parsedUrl.hostname;
}

// Function to add metadata and a header to the content
function addMetadataToContent(article, url, domain, readingTime) {
	const header = `
		<div class="container" style="--line-height: 1.6em;" lang="undefined" dir="ltr">
			<div class="header reader-header reader-show-element">
			  <a class="domain reader-domain" href="${url}">${domain}</a>
			  <div class="domain-border"></div>
			  <h1 class="reader-title">${article.title}</h1>
			  <div class="credits reader-credits"></div>
			  <div class="meta-data">
				<div class="reader-estimated-time">${readingTime} minutes</div>
			  </div>
			</div>
	  
			<hr>
		<div>
	`;

	// Set document title
	const dom = new JSDOM(article.content);
	dom.window.document.title = article.title;

	// Recreate format of Firefox reader mode
	let mainDiv = dom.window.document.getElementById('readability-page-1');

	// If mainDiv exists, prepend the header to it
	if (mainDiv) {
		mainDiv.insertAdjacentHTML('afterbegin', header);
	} else {
		// If mainDiv doesn't exist, just add the header to the content
		dom.window.document.body.insertAdjacentHTML('afterbegin', header);
	}

	return dom.serialize();
}

function formatMetadata(article, url) {
	const domain = getDomain(url);
	const siteName = article.siteName || domain;
	return {
		"title": article.title,
		"author": article.byline || siteName,
		siteName,
		"readingTime": calculateReadingTime(article.textContent),
		"publishedTime": article.publishedTime
	};
};

// Function to save the content to a temporary HTML file
function writeHtml(content, filename) {
	const tempHtmlPath = path.join(__dirname, `${filename}.html`);
	fs.writeFileSync(tempHtmlPath, content);
	return tempHtmlPath;
};

// Function to write metadata to XML for Pandoc
function writeMetadata(title, author, publishedTime, filename) {
	const metadataContent = `
		<dc:title>${title}</dc:title>
		<dc:creator>${author}</dc:creator>
		<dc:date>${publishedTime}</dc:date>
	`;

	const metadataFilePath = path.join(__dirname, `${filename}_metadata.xml`);
	fs.writeFileSync(metadataFilePath, metadataContent);

	return metadataFilePath;
};

// Function to convert the HTML to EPUB using Pandoc and pass metadata
function convertToEpub(htmlFilePath, metadataFilePath, outputEpubPath) {
	const pandocCommand = `pandoc "${htmlFilePath}" -o "${outputEpubPath}" -t epub3 --katex --epub-metadata="${metadataFilePath}"`;

	exec(pandocCommand, (error, _, stderr) => {
		if (error) {
			console.error('Error while running Pandoc to convert the epub:', error);
			console.error(stderr);
		} else {
			console.log('Removing temporary files.');
			// Cleanup: remove the temporary HTML and xml file
			fs.unlinkSync(htmlFilePath);
			fs.unlinkSync(metadataFilePath);
		};
	});
};

// Main function to execute the steps
export async function convert(url, outputFolder = "output") {
	const html = await downloadHtml(url);
	const article = extractReadableContent(html);

	// Format metadata
	const { title, author, siteName, readingTime, publishedTime } = formatMetadata(article, url);

	// Add the metadata and custom header to the article's content
	const updatedContent = addMetadataToContent(article, url, siteName, readingTime);

	// Set filename of the output (remove any non standard chars and replace spaces by underscores)
	const filename = `${title}`.replace(/[^a-zA-Z0-9 -]/g, '').replace(/\s+/g, '_').toLowerCase();
	const fileextension = "epub";

	// Export the epub
	try {
		// Saving HTML to file temporarily
		const tempHtmlPath = writeHtml(updatedContent, filename);

		// Write metadata to XML file for Pandoc
		const metadataFilePath = writeMetadata(title, author, publishedTime, filename);

		const outputEpubPath = path.join(__dirname, outputFolder, `${filename}.${fileextension}`);
		convertToEpub(tempHtmlPath, metadataFilePath, outputEpubPath, title, author, readingTime);
	} catch (error) {
		console.error('An error occurred while creating the epub:', error);
	};

	console.log(`EPUB of ${url} successfully created.`);
	return;
}