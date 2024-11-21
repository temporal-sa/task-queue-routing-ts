import { sleep } from '@temporalio/activity';

export async function greet(name: string): Promise<string> {
  await sleep(50000)
  return `Hello, ${name}!`;
}
