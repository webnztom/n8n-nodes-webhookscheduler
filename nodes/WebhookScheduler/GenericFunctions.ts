import {
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type JsonObject,
} from 'n8n-workflow';

const CREDENTIAL_NAME = 'webhookSchedulerApi';
// Fixed on purpose: the API key is attached to these requests, so they must
// never go to any other host. There is no configurable base URL.
export const API_BASE_URL = 'https://webhookscheduler.com';
const CANCELABLE_STATUSES = ['PENDING', 'RETRYING'];
const MAX_LIST_ROUNDS = 20;

interface ApiIssue {
	message?: string;
	path?: Array<string | number>;
}

interface ApiErrorBody {
	error?: string;
	code?: string;
	issues?: ApiIssue[];
	details?: { upgradeUrl?: string; retryAfter?: number } & IDataObject;
}

interface ApiJob {
	id: string;
	status: string;
	url?: string;
	scheduledFor?: string;
	reference?: string | null;
}

interface ApiJobList {
	jobs?: ApiJob[];
	totalCount?: number;
}

function asErrorBody(body: unknown): ApiErrorBody {
	if (body && typeof body === 'object') return body as ApiErrorBody;
	if (typeof body === 'string') {
		try {
			const parsed: unknown = JSON.parse(body);
			if (parsed && typeof parsed === 'object') return parsed as ApiErrorBody;
		} catch {
			return { error: body };
		}
	}
	return {};
}

function describeIssues(issues: ApiIssue[] | undefined): string {
	if (!Array.isArray(issues) || issues.length === 0) return '';
	return issues
		.map((issue) => {
			const field = Array.isArray(issue.path) && issue.path.length ? issue.path.join('.') : '';
			return field ? `${field}: ${issue.message ?? 'invalid'}` : (issue.message ?? 'invalid');
		})
		.join('; ');
}

/**
 * Turns a Webhook Scheduler error response into a message a workflow builder
 * (or an AI Agent) can act on. Returns null for 2xx responses.
 */
export function explainApiError(
	statusCode: number,
	rawBody: unknown,
): { message: string; description: string } | null {
	if (statusCode >= 200 && statusCode < 300) return null;
	const body = asErrorBody(rawBody);
	const serverMessage = body.error ?? '';

	switch (statusCode) {
		case 400: {
			const issues = describeIssues(body.issues);
			return {
				message: `Webhook Scheduler rejected the request: ${issues || serverMessage || 'validation failed'}`,
				description:
					'Check the fields. URL must be public HTTPS, Run At must be in the future, Reference allows only letters, digits and : . _ / - (max 120), and Idempotency Key must be 8 to 80 characters.',
			};
		}
		case 401:
			return {
				message: 'Webhook Scheduler API key is missing, invalid or revoked',
				description:
					'Create a new key at https://webhookscheduler.com/dashboard/api-keys and update the Webhook Scheduler API credential.',
			};
		case 402:
		case 403: {
			const upgradeUrl = body.details?.upgradeUrl;
			return {
				message: `Plan limit reached: ${serverMessage || 'this request is not allowed on your current plan'}`,
				description:
					body.code === 'QUOTA_EXCEEDED'
						? `Your monthly delivery quota is used up. It resets on the 1st of the month.${upgradeUrl ? ` Upgrade: ${upgradeUrl}` : ''}`
						: `The Free plan schedules up to 7 days ahead; paid plans up to 365 days.${upgradeUrl ? ` Upgrade: ${upgradeUrl}` : ''}`,
			};
		}
		case 404:
			return {
				message: 'Scheduled webhook not found',
				description: 'Check the Job ID and that it belongs to the workspace of this API key.',
			};
		case 409:
			return {
				message: serverMessage || 'The job changed state before it could be canceled',
				description: 'It was probably being delivered at that moment. Get the job to see its final status.',
			};
		case 429:
			return {
				message: 'Webhook Scheduler rate limit reached',
				description: `Wait ${body.details?.retryAfter ?? 60} seconds and retry, or enable Retry On Fail on this node.`,
			};
		default:
			return {
				message: `Webhook Scheduler error ${statusCode}${serverMessage ? `: ${serverMessage}` : ''}`,
				description:
					statusCode >= 500
						? 'Temporary server error. Retry in a moment; see https://webhookscheduler.com/status.'
						: 'Unexpected response from the Webhook Scheduler API.',
			};
	}
}

/** postReceive hook: throws a clear NodeApiError on any non-2xx response. */
export async function handleApiError(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const explained = explainApiError(response.statusCode, response.body);
	if (explained) {
		throw new NodeApiError(this.getNode(), asErrorBody(response.body) as JsonObject, {
			message: explained.message,
			description: explained.description,
			httpCode: String(response.statusCode),
		});
	}
	return items;
}

async function apiRequest(
	ctx: IExecuteSingleFunctions,
	options: Pick<IHttpRequestOptions, 'method' | 'url' | 'qs'>,
): Promise<IN8nHttpFullResponse> {
	return (await ctx.helpers.httpRequestWithAuthentication.call(ctx, CREDENTIAL_NAME, {
		...options,
		url: `${API_BASE_URL}${options.url}`,
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		headers: { Accept: 'application/json' },
	})) as IN8nHttpFullResponse;
}

function throwIfError(ctx: IExecuteSingleFunctions, response: IN8nHttpFullResponse): void {
	const explained = explainApiError(response.statusCode, response.body);
	if (explained) {
		throw new NodeApiError(ctx.getNode(), asErrorBody(response.body) as JsonObject, {
			message: explained.message,
			description: explained.description,
			httpCode: String(response.statusCode),
		});
	}
}

/**
 * postReceive hook for "Cancel by Reference". The routed request already
 * listed open jobs for the reference; this cancels every PENDING or RETRYING
 * one, then re-lists until nothing cancelable is left. Jobs that are being
 * delivered right now (PROCESSING) or that change state mid-way are reported
 * as skipped instead of failing the whole run.
 */
export async function cancelJobsByReference(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	throwIfError(this, response);

	const reference = String(this.getNodeParameter('reference', '')).trim();

	const canceled: IDataObject[] = [];
	const skipped: IDataObject[] = [];
	const seen = new Set<string>();

	let rateLimited = false;

	const cancelBatch = async (jobs: ApiJob[]): Promise<number> => {
		let canceledNow = 0;
		for (const job of jobs) {
			if (seen.has(job.id)) continue;
			if (rateLimited) break;
			seen.add(job.id);
			if (!CANCELABLE_STATUSES.includes(job.status)) {
				skipped.push({ id: job.id, status: job.status, reason: 'Being delivered right now' });
				continue;
			}
			const result = await apiRequest(this, {
				method: 'POST',
				url: `/api/v1/jobs/${encodeURIComponent(job.id)}/cancel`,
			});
			if (result.statusCode === 400 || result.statusCode === 404 || result.statusCode === 409) {
				const body = asErrorBody(result.body);
				skipped.push({ id: job.id, status: job.status, reason: body.error ?? 'No longer cancelable' });
				continue;
			}
			if (result.statusCode === 429) {
				// Cancel is limited to 30 calls a minute. Stop and report instead of
				// losing the list of jobs already canceled.
				rateLimited = true;
				seen.delete(job.id);
				break;
			}
			throwIfError(this, result);
			const body = result.body as ApiJob;
			canceled.push({
				id: body.id,
				status: body.status,
				url: body.url,
				scheduledFor: body.scheduledFor,
			});
			canceledNow += 1;
		}
		return canceledNow;
	};

	const first = (response.body ?? {}) as ApiJobList;
	await cancelBatch(first.jobs ?? []);

	// More than one page of open jobs: canceled jobs leave the open set, so
	// re-reading page 1 for each cancelable status walks the rest.
	if (!rateLimited && (first.totalCount ?? 0) > (first.jobs ?? []).length) {
		for (const status of CANCELABLE_STATUSES) {
			for (let round = 0; round < MAX_LIST_ROUNDS; round++) {
				const page = await apiRequest(this, {
					method: 'GET',
					url: '/api/v1/jobs',
					qs: { reference, status, limit: 100, page: 1 },
				});
				throwIfError(this, page);
				const jobs = ((page.body ?? {}) as ApiJobList).jobs ?? [];
				if (jobs.length === 0) break;
				const progress = await cancelBatch(jobs);
				if (progress === 0 || rateLimited) break;
			}
		}
	}

	return [
		{
			json: {
				reference,
				canceledCount: canceled.length,
				skippedCount: skipped.length,
				complete: !rateLimited,
				...(rateLimited
					? {
							note: 'Stopped at the cancel rate limit (30 a minute). Run Cancel by Reference again in a minute to cancel the rest.',
						}
					: {}),
				canceled,
				skipped,
			},
		},
	];
}
