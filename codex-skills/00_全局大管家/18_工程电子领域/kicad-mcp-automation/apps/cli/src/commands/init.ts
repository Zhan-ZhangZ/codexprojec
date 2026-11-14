import { Command } from 'commander';
import { MockKiCadClient } from '@spark-apps/kicad-client';
import chalk from 'chalk';
import ora from 'ora';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a new KiCad project')
    .argument('<name>', 'Project name')
    .argument('[path]', 'Project path (defaults to current directory)')
    .action(async (name: string, path?: string) => {
      const spinner = ora('Initializing KiCad project...').start();

      try {
        const client = new MockKiCadClient();
        client.setSimulateDelay(500);

        await client.connect();

        const projectPath = path || `./${name}`;
        const project = await client.createProject(name, projectPath);

        spinner.succeed(chalk.green(`Project created successfully!`));
        console.log(chalk.cyan(`\nProject: ${project.name}`));
        console.log(chalk.cyan(`Path: ${project.path}`));
        console.log(chalk.cyan(`Schematic: ${project.schematicPath}`));
        console.log(chalk.cyan(`PCB: ${project.pcbPath}`));

        await client.disconnect();
      } catch (error) {
        spinner.fail(chalk.red('Failed to initialize project'));
        if (error instanceof Error) {
          console.error(chalk.red(error.message));
        }
        process.exit(1);
      }
    });
}
