# Task Queue Routing & Graceful Worker Shutdown

This sample shows how to keep workers running while workflows are present on a given task queue while using task queue
routing as a versioning strategy for new workflow executions. Using this strategy it is possible to keep old workers
alive only so long as work is available for them to do, virtually eliminating the need to maintain old code paths.

## Warnings
This strategy has tradeoffs which are not present in other versioning strategies. It makes the maintaining of old code
version generally unnecessary, but introduces some unique constraints.

1. If using this strategy with Kubernetes rolling deployments it is important to recognize that during a rollout there is a sharing of pods between two task queues which may mean there is increased end-to-end latency for workflow executions on the old task queue
2. Use of Workflow Queries IS NOT generally safe—as old workers/versions will not be guaranteed to be available for the purpose of Querying once all workflow executions on a task queue have completed
3. This strategy complicates the use of workflow replay testing, as histories are task queue specific. That said, replays do not apply to this strategy except by Workflow Query.
4. Any need to roll back to an old code version implies getting old code out of version control, switching task queues, and redeploying. This is not unique to Temporal, though other strategies imply maintaining old code/workers so switching back is theoretically simpler.

### Running this sample

1. `temporal server start-dev` to start [Temporal Server](https://github.com/temporalio/cli/#installation).
2. `npm install` to install dependencies.
3. `npm run start.server` to start the server.
4. Visit `localhost:8000` to start a workflow
5. Visit your local Temporal server frontend (usually `localhost:8233`) to verify the workflow started
6. Visit `localhost:8000` to start a workflow
7. Before the workflow ends (50 seconds-you can change this to be as long as you like in `activities.ts:4`) modify:
    1. The port on `server.ts:10` (e.g. 8001 instead of 8000)
    2. Uncomment `workflows.ts:11` to add a breaking change to the workflow definition
    3. Change `taskqueue.txt:1` to any new value (e.g. `my-task-queue-1`)
8. Visit `localhost:8000` to start a new workflow—it will start on the new task queue declared in Step 7.3
9. In a new shell run `npm run start.server` starting a new worker on the new task queue
10. Visit `localhost:{portDeclaredInStep7.1}` to start a new workflow
11. All previous workflow executions on the original task queue will end, resulting in the shutdown of the original worker process
12. You can still visit the `localhost:{portDeclaredInStep7.1}` to start new workflows on the new worker process

