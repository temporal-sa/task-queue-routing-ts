import http from 'http';
import fs from 'fs';
import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './activities';
import { Client, Connection } from '@temporalio/client';
import { example } from './workflows';
import { nanoid } from 'nanoid';

const host = 'localhost';
const port = 8000;

async function getClientConnection() {
  return await Connection.connect({ address: 'localhost:7233' });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function guardWorkerShutdown(connection: Connection, originalTaskQueue: string) {
  const currentTaskQueue = fs.readFileSync('taskqueue.txt', 'utf8')
  const taskQueueChanged = originalTaskQueue != currentTaskQueue
  const countWorkflowsResponse = await connection.workflowService.countWorkflowExecutions({
    namespace: "default",
    query:`ExecutionStatus="Running" AND TaskQueue="${originalTaskQueue}"`,
  })
  if (taskQueueChanged && countWorkflowsResponse.count.lte(0)) {
    return
  }
  await sleep(1000)
  await guardWorkerShutdown(connection, originalTaskQueue)
}

async function run(clientConnection: Connection) {
  const myTaskQueue = fs.readFileSync('taskqueue.txt', 'utf8')
  const connection = await NativeConnection.connect({
    address: 'localhost:7233',
  });
  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue: myTaskQueue,
    workflowsPath: require.resolve('./workflows'),
    activities,
  });

  console.log(`worker starting for ${myTaskQueue}`);
  await worker.runUntil(guardWorkerShutdown(clientConnection, myTaskQueue))
}
  function makeRequestListener(client: Client): any {
    return async (req: any, res: any) => {
      if (req.url === '/' && req.method === 'GET') {
        // Browser requests favicon so require a strict request to the 'home page'
        const myTaskQueue = fs.readFileSync('taskqueue.txt', 'utf8')
        await client.workflow.start(example, {
          taskQueue: myTaskQueue,
          args: ['Temporal'],
          workflowId: 'workflow-' + nanoid(),
        });
      }

      res.writeHead(200);
      res.end("Workflow started!");
    }
  }

getClientConnection().then((connection) => {
  if (connection) {
    const client = new Client({
      connection,
    });
    const rl = makeRequestListener(client);
    run(connection)
      .then(p => {
        console.log("that's all folks!");
        process.exit(0);
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      })
    const server = http.createServer(rl);
    server.listen(port, host, () => {
      console.log(`Server is running on http://${host}:${port}`);
    });
  }
}).catch((err) => {
  console.error(err);
})