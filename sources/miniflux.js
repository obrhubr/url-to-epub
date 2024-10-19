import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Read Miniflux URL and API token from environment variables
const minifluxDomain = process.env.MINIFLUX_DOMAIN;
const minifluxUrl = `${minifluxDomain}/v1/entries?starred=true`;

const apiToken = process.env.API_TOKEN;

// Function to fetch starred articles
async function fetchStarredArticles() {
    try {
        const response = await fetch(minifluxUrl, {
            method: 'GET',
            headers: {
                'X-Auth-Token': apiToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}, ${response.statusText}`);
        }

        const articles = await response.json();
        
		return articles
    } catch (error) {
        console.error('Failed to fetch starred articles:', error);
    };
}

export default async function fetchUrls() {
	// Get starred articles
	const articles = await fetchStarredArticles();

	let urls = [];
	articles.entries.forEach(article => {
		urls.push(article.url);
	});

    return urls;
};