import { JsonPatch } from 'projen';
import { NodeProject } from 'projen/lib/javascript';
import { Job, JobMatrix, JobPermission, } from 'projen/lib/github/workflows-model';

const workflowName = 'matrix-workflow';
const jobName = 'matrix-job';

export function gitHubMatrixWorkflow(project: NodeProject) {
    if (project.github) {
        const os: string[] = ['ubuntu-latest', 'macos-latest', 'windows-latest', ];
        const nodeVersion: string[] = ['v18', 'v20', ];
        const matrix: JobMatrix = {
            domain: {
                os: os,
                nodeVersion: nodeVersion,
            },
        }
        const job: Job = {
            name: jobName,
            runsOn: os,
            strategy: {
                failFast: false,
                matrix: matrix,
            },
            permissions: {
                contents: JobPermission.READ,
            },
            steps: [
                {
                    name: 'Checkout',
                    uses: 'actions/checkout@v4',
                    // with: {
                    //     ref: 'main',
                    // },
                },
                {
                    name: 'Setup Node',
                    uses: 'actions/setup-node@v4',
                    with: {
                        'node-version': '${{ matrix.nodeVersion }}',
                    },
                },
                {
                    name: 'Report the Architecture and number of CPUs',
                    run: [
                        'echo "OS: \${{ matrix.os }}"',
                        'echo "Node Version: \${{ matrix.nodeVersion }}"',
                        'node -e \'console.log(`Number of CPUs: ${require("os").cpus().length}\\nArchitecture: ${process.arch}`)\'',
                    ].join('\n'),
                },
                {
                    name: 'Install',
                    run: 'npx -y projen install',
                },
                {
                    name: 'Prepare',
                    run: 'npx projen',
                },
                {
                    name: 'Build',
                    run: 'npx projen build',
                },
            ],
        };

        const workflow = project.github.addWorkflow(workflowName);
        if (workflow) {
            workflow.on({
                workflowDispatch: {},
            });
            workflow.addJob(jobName, job);

            // Patch the `runs-on` with ${{ matrix.os }} when available
            if (job.strategy?.matrix?.domain?.os && workflow.file) {
                workflow.file?.patch(
                    JsonPatch.add(`/jobs/${jobName}/runs-on`, '${{ matrix.os }}'),
                );
            }
        }     
    }
};