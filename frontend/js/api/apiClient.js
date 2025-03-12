const API_BASE_URL = '/api';

async function request(endpoint, options = {}) {
	// ...existing code for default headers, timeout, etc...
	const url = `${API_BASE_URL}/${endpoint}`;
	try {
		const response = await fetch(url, {
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			...options
		});
		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Error fetching ${url}: ${response.status} ${response.statusText}`, errorText);
			throw new Error(`API error: ${response.status}`);
		}
		return await response.json();
	} catch (error) {
		console.error('Request error:', error);
		throw error;
	}
}

export { request, API_BASE_URL };
