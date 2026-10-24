import type { INodeProperties } from 'n8n-workflow';

const showOnlyForJobGetMany = {
	operation: ['getAll'],
	resource: ['job'],
};

export const jobGetManyDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: showOnlyForJobGetMany,
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		routing: {
			send: {
				paginate: '={{ $value }}',
				type: 'query',
				property: 'limit',
				value: '100',
			},
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: '={{ ($response.body.page ?? 1) < ($response.body.totalPages ?? 1) }}',
						request: {
							qs: {
								page: '={{ ($response.body.page ?? 1) + 1 }}',
								limit: '100',
							},
						},
					},
				},
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				...showOnlyForJobGetMany,
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		routing: {
			send: {
				type: 'query',
				property: 'limit',
			},
			output: {
				maxResults: '={{$value}}',
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: {
			show: showOnlyForJobGetMany,
		},
		default: {},
		options: [
			{
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				default: '',
				description:
					'Exact match on the business reference you gave when scheduling. Combine with State = Open to find the job to cancel.',
				routing: {
					send: {
						type: 'query',
						property: 'reference',
					},
				},
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'open',
						description: 'Still actionable: PENDING, PROCESSING or RETRYING',
					},
					{
						name: 'Terminal',
						value: 'terminal',
						description: 'Finished: SUCCESS, FAILED or CANCELED',
					},
				],
				default: 'open',
				routing: {
					send: {
						type: 'query',
						property: 'state',
					},
				},
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Canceled', value: 'CANCELED' },
					{ name: 'Failed', value: 'FAILED' },
					{ name: 'Pending', value: 'PENDING' },
					{ name: 'Processing', value: 'PROCESSING' },
					{ name: 'Retrying', value: 'RETRYING' },
					{ name: 'Success', value: 'SUCCESS' },
				],
				default: 'PENDING',
				description: 'Exact job status. Takes precedence over State when both are set.',
				routing: {
					send: {
						type: 'query',
						property: 'status',
					},
				},
			},
		],
	},
];
