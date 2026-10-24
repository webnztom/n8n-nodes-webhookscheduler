import type { INodeProperties } from 'n8n-workflow';

const showOnlyForJobCancelByReference = {
	operation: ['cancelByReference'],
	resource: ['job'],
};

export const jobCancelByReferenceDescription: INodeProperties[] = [
	{
		displayName: 'Reference',
		name: 'reference',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'trial-reminder:cus_4821',
		displayOptions: {
			show: showOnlyForJobCancelByReference,
		},
		description:
			'The exact reference you set when scheduling. Every job with this reference that has not been sent yet is canceled. Returns one item with the canceled and skipped jobs.',
		routing: {
			send: {
				type: 'query',
				property: 'reference',
			},
		},
	},
];
