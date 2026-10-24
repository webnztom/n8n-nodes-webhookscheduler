// Runs against the built package (npm run build first): node --test test/*.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const dist = path.join(__dirname, '..', 'dist');
const { WebhookSchedulerApi } = require(path.join(dist, 'credentials/WebhookSchedulerApi.credentials.js'));
const { WebhookScheduler } = require(path.join(dist, 'nodes/WebhookScheduler/WebhookScheduler.node.js'));
const { API_BASE_URL, cancelJobsByReference } = require(
	path.join(dist, 'nodes/WebhookScheduler/GenericFunctions.js'),
);
const pkg = require('../package.json');

const HOST = 'https://webhookscheduler.com';

test('credential has no configurable base URL', () => {
	const cred = new WebhookSchedulerApi();
	assert.deepEqual(
		cred.properties.map((p) => p.name),
		['apiKey'],
	);
	assert.equal(cred.test.request.baseURL, HOST);
});

test('node request defaults use the fixed host', () => {
	const node = new WebhookScheduler();
	assert.equal(node.description.requestDefaults.baseURL, HOST);
	assert.equal(API_BASE_URL, HOST);
});

test('Cancel by Reference only calls the fixed host, even if a credential has a stale baseUrl', async () => {
	const urls = [];
	const ctx = {
		getNodeParameter: () => 'invoice:42',
		getCredentials: async () => ({ apiKey: 'wh_test_x', baseUrl: 'https://attacker.example' }),
		getNode: () => ({ name: 'Webhook Scheduler' }),
		helpers: {
			httpRequestWithAuthentication: async (_cred, options) => {
				urls.push(options.url);
				return { statusCode: 200, body: { id: 'job_1', status: 'CANCELED' } };
			},
		},
	};
	const [out] = await cancelJobsByReference.call(ctx, [], {
		statusCode: 200,
		body: { jobs: [{ id: 'job_1', status: 'PENDING' }], totalCount: 1 },
	});
	assert.equal(out.json.canceledCount, 1);
	assert.ok(urls.length > 0);
	for (const url of urls) assert.ok(url.startsWith(`${HOST}/api/v1/`), url);
});

test('header help names what the API strips and the safe alternatives', () => {
	const node = new WebhookScheduler();
	const additional = node.description.properties.find(
		(p) => p.name === 'additionalFields' && p.displayOptions?.show?.operation?.includes('schedule'),
	);
	const headers = additional.options.find((o) => o.name === 'headers');
	for (const word of ['Authorization', 'Cookie', 'Content-Type', 'User-Agent', 'X-Forwarded', 'Webhook-Signature', 'X-Api-Key']) {
		assert.ok(headers.description.includes(word), word);
	}
});

test('package is framed as an API client, not a delay/wait node', () => {
	const text = [pkg.description, ...pkg.keywords, new WebhookScheduler().description.description]
		.join(' ')
		.toLowerCase();
	assert.ok(!/\bdelay(ed)?\b/.test(text), 'mentions delay');
	assert.ok(!/\bwait\b/.test(text), 'mentions wait');
});
