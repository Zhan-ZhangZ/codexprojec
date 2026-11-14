import { Command } from 'commander';
import { MockKiCadClient } from '@spark-apps/kicad-client';
import chalk from 'chalk';
import ora from 'ora';

export function registerFixCommand(program: Command): void {
  program
    .command('fix')
    .description('Run auto-fix operations (DRC/ERC checks and repairs)')
    .argument('[project]', 'Project path (defaults to current directory)')
    .action(async (project?: string) => {
      const spinner = ora('Running auto-fix operations...').start();

      try {
        const client = new MockKiCadClient();
        client.setSimulateDelay(500);

        await client.connect();

        const projectPath = project || '.';
        await client.openProject(projectPath);

        spinner.text = 'Running DRC checks...';
        const drcResult = await client.runDRC();

        spinner.text = 'Running ERC checks...';
        const ercResult = await client.runERC();

        spinner.succeed(chalk.green('Auto-fix operations completed!'));

        console.log(chalk.cyan('\nDRC Results:'));
        console.log(`  Passed: ${drcResult.passed ? chalk.green('✓') : chalk.red('✗')}`);
        console.log(`  Errors: ${drcResult.errors.length}`);
        console.log(`  Warnings: ${drcResult.warnings.length}`);

        console.log(chalk.cyan('\nERC Results:'));
        console.log(`  Passed: ${ercResult.passed ? chalk.green('✓') : chalk.red('✗')}`);
        console.log(`  Errors: ${ercResult.errors.length}`);
        console.log(`  Warnings: ${ercResult.warnings.length}`);

        await client.disconnect();
      } catch (error) {
        spinner.fail(chalk.red('Auto-fix failed'));
        if (error instanceof Error) {
          console.error(chalk.red(error.message));
        }
        process.exit(1);
      }
    });
}
