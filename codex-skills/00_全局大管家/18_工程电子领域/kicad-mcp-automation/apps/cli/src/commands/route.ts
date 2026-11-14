import { Command } from 'commander';
import { MockKiCadClient } from '@spark-apps/kicad-client';
import chalk from 'chalk';
import ora from 'ora';

export function registerRouteCommand(program: Command): void {
  program
    .command('route')
    .description('Auto-route traces on the board')
    .argument('[project]', 'Project path (defaults to current directory)')
    .action(async (project?: string) => {
      const spinner = ora('Auto-routing traces...').start();

      try {
        const client = new MockKiCadClient();
        client.setSimulateDelay(1000);

        await client.connect();

        const projectPath = project || '.';
        await client.openProject(projectPath);

        await client.autoRoute();

        spinner.succeed(chalk.green('Auto-routing completed!'));
        console.log(
          chalk.cyan('\nAll traces have been routed automatically.')
        );

        await client.disconnect();
      } catch (error) {
        spinner.fail(chalk.red('Auto-routing failed'));
        if (error instanceof Error) {
          console.error(chalk.red(error.message));
        }
        process.exit(1);
      }
    });
}
