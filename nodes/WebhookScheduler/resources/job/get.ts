import type { INodeProperties } from 'n8n-workflow';

const showOnlyForJobGet = {
	operation: ['get'],
	resource: ['job'],
};

export const jobGetDescription: INodeProperties[] = [
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForJobGet,
		},
		description: 'The ID returned when the job was scheduled',
	},
];
