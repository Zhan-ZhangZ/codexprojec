import { Command } from 'commander';
import { MockKiCadClient, type ExportOptions } from '@spark-apps/kicad-client';
import chalk from 'chalk';
import ora from 'ora';

export function registerExportCommand(program: Command): void {
  program
    .command('export')
    .description('Export board to various formats')
    .argument('<format>', 'Export format (gerber, drill, pdf, svg, step, vrml)')
    .argument('[project]', 'Project path (defaults to current directory)')
    .option('-o, --output <dir>', 'Output directory', './output')
    .action(
      async (
        format: ExportOptions['format'],
        project?: string,
        options?: { output: string }
      ) => {
        const spinner = ora('Exporting board...').start();

        try {
          const client = new MockKiCadClient();
          client.setSimulateDelay(500);

          await client.connect();

          const projectPath = project || '.';
          await client.openProject(projectPath);

          const files = await client.export({
            format,
            outputDir: options?.output || './output',
          });

          spinner.succeed(chalk.green(`Export completed!`));

          console.log(chalk.cyan('\nGenerated files:'));
          files.forEach((file) => {
            console.log(chalk.white(`  ${file}`));
          });

          await client.disconnect();
        } catch (error) {
          spinner.fail(chalk.red('Export failed'));
          if (error instanceof Error) {
            console.error(chalk.red(error.message));
          }
          process.exit(1);
        }
      }
    );
}
