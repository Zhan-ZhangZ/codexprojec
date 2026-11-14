import { Command } from 'commander';
import { MockKiCadClient } from '@spark-apps/kicad-client';
import chalk from 'chalk';
import ora from 'ora';

export function registerBomCommand(program: Command): void {
  program
    .command('bom')
    .description('Generate Bill of Materials')
    .argument('[project]', 'Project path (defaults to current directory)')
    .option('-o, --output <file>', 'Output file', './bom.csv')
    .action(async (project?: string, options?: { output: string }) => {
      const spinner = ora('Generating BOM...').start();

      try {
        const client = new MockKiCadClient();
        client.setSimulateDelay(500);

        await client.connect();

        const projectPath = project || '.';
        await client.openProject(projectPath);

        const bomFile = await client.generateBOM(options?.output || './bom');

        spinner.succeed(chalk.green('BOM generated successfully!'));
        console.log(chalk.cyan(`\nOutput: ${bomFile}`));

        await client.disconnect();
      } catch (error) {
        spinner.fail(chalk.red('BOM generation failed'));
        if (error instanceof Error) {
          console.error(chalk.red(error.message));
        }
        process.exit(1);
      }
    });
}
