import { Command } from 'commander';
import { MockKiCadClient } from '@spark-apps/kicad-client';
import chalk from 'chalk';
import ora from 'ora';

export function registerGen3DCommand(program: Command): void {
  program
    .command('gen-3d')
    .description('Generate 3D model of the board')
    .argument('[project]', 'Project path (defaults to current directory)')
    .option('-f, --format <type>', 'Output format (step, vrml)', 'step')
    .option('-o, --output <file>', 'Output file', './board')
    .action(
      async (
        project?: string,
        options?: { format: 'step' | 'vrml'; output: string }
      ) => {
        const spinner = ora('Generating 3D model...').start();

        try {
          const client = new MockKiCadClient();
          client.setSimulateDelay(500);

          await client.connect();

          const projectPath = project || '.';
          await client.openProject(projectPath);

          const format = options?.format || 'step';
          const outputFile = await client.generate3D(
            options?.output || './board',
            format
          );

          spinner.succeed(chalk.green('3D model generated successfully!'));
          console.log(chalk.cyan(`\nFormat: ${format.toUpperCase()}`));
          console.log(chalk.cyan(`Output: ${outputFile}`));

          await client.disconnect();
        } catch (error) {
          spinner.fail(chalk.red('3D generation failed'));
          if (error instanceof Error) {
            console.error(chalk.red(error.message));
          }
          process.exit(1);
        }
      }
    );
}
