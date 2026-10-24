import type { INodeProperties } from 'n8n-workflow';
import { cancelJobsByReference, handleApiError } from '../../GenericFunctions';
import { jobScheduleDescription } from './schedule';
import { jobGetDescription } from './get';
import { jobGetManyDescription } from './getAll';
import { jobCancelDescription } from './cancel';
import { jobCancelByReferenceDescription } from './cancelByReference';

const showOnlyForJobs = {
	resource: ['job'],
};

export const jobDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForJobs,
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel a scheduled webhook',
				description: 'Cancel one job by ID before it is sent',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/jobs/{{ encodeURIComponent($parameter.jobId) }}/cancel',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleApiError],
					},
				},
			},
			{
				name: 'Cancel by Reference',
				value: 'cancelByReference',
				action: 'Cancel scheduled webhooks by reference',
				description:
					'Cancel every job with a given reference that has not been sent yet (for example when the customer paid)',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/jobs',
						qs: {
							state: 'open',
							limit: 100,
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [cancelJobsByReference],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a scheduled webhook',
				description: 'Get one job with its delivery attempts',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/jobs/{{ encodeURIComponent($parameter.jobId) }}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleApiError],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many scheduled webhooks',
				description: 'List jobs, most recent first, filtered by reference, state or status',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/jobs',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [
							handleApiError,
							{
								type: 'rootProperty',
								properties: {
									property: 'jobs',
								},
							},
						],
					},
				},
			},
			{
				name: 'Schedule',
				value: 'schedule',
				action: 'Schedule a webhook',
				description: 'Schedule an HTTP call to be sent at a future date and time',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/schedule',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleApiError],
					},
				},
			},
		],
		default: 'schedule',
	},
	...jobScheduleDescription,
	...jobGetDescription,
	...jobGetManyDescription,
	...jobCancelDescription,
	...jobCancelByReferenceDescription,
];
