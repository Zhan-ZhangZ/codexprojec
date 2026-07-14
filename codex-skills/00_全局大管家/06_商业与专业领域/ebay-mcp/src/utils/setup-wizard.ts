import { platform } from 'os';
import { spawn } from 'child_process';
import prompts from 'prompts';

type PromptValue = string | string[] | undefined;
type MaybePromise<T> = T | Promise<T>;

interface BaseStep {
  id: string;
  type: 'select' | 'text' | 'password' | 'multiselect' | 'note';
  message: string;
  description?: string;
  required?: boolean;
  default?: string;
  when?: { field: string; equals: string };
}

interface SelectStep extends BaseStep {
  type: 'select';
  options: { value: string; label: string }[];
}

interface TextStep extends BaseStep {
  type: 'text' | 'password';
  validate?: { rule: 'required' }[];
}

interface MultiselectStep extends BaseStep {
  type: 'multiselect';
  options: { value: string; label: string }[];
}

interface NoteStep extends BaseStep {
  type: 'note';
}

type WizardStep = SelectStep | TextStep | MultiselectStep | NoteStep;

interface WizardConfig {
  meta?: { name?: string; description?: string };
  theme?: unknown;
  steps: WizardStep[];
}

interface WizardContext {
  answers: Record<string, unknown>;
  setNextStep: (stepId: string) => void;
  showNote: (title: string, body: string) => void;
  openBrowser: (url: string) => Promise<void>;
}

interface RunWizardOptions {
  renderer?: unknown;
  quiet?: boolean;
  optionsProvider?: (
    stepId: string
  ) => MaybePromise<{ value: string; label: string }[] | undefined>;
  asyncValidate?: (stepId: string, value: unknown) => MaybePromise<string | null>;
  onAfterStep?: (stepId: string, value: unknown, context: WizardContext) => MaybePromise<void>;
  onCancel?: () => void;
}

/**
 * Placeholder renderer type kept for compatibility with clack-style setup code.
 */
export class ClackRenderer {}

/**
 * Preserves wizard configuration typing without transforming the config.
 */
export function defineWizard<T extends WizardConfig>(config: T): T {
  return config;
}

function openUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    const currentPlatform = platform();
    let command = '';
    let args: string[] = [];

    switch (currentPlatform) {
      case 'darwin':
        command = 'open';
        args = [url];
        break;
      case 'win32':
        command = 'cmd';
        args = ['/c', 'start', '', url];
        break;
      default:
        command = 'xdg-open';
        args = [url];
        break;
    }

    const child = spawn(command, args, {
      stdio: 'ignore',
      detached: true,
    });

    child.on('error', () => resolve());
    child.unref();
    resolve();
  });
}

function getSelectDefaultIndex(
  options: { value: string; label: string }[],
  stepDefault?: string
): number {
  if (!stepDefault) return 0;
  const index = options.findIndex((option) => option.value === stepDefault);
  return index >= 0 ? index : 0;
}

async function promptStep(
  step: WizardStep,
  optionsOverride: { value: string; label: string }[] | undefined,
  onCancel?: () => void
): Promise<{ cancelled: boolean; value: PromptValue }> {
  if (step.type === 'note') {
    if (step.message) console.log(`\n  ${step.message}`);
    if (step.description) console.log(`  ${step.description}\n`);
    return { cancelled: false, value: undefined };
  }

  let cancelled = false;
  const promptOptions = optionsOverride ?? ('options' in step ? step.options : undefined);

  const promptControl = {
    onCancel: () => {
      cancelled = true;
      return false;
    },
  };

  let response: Record<string, unknown>;
  switch (step.type) {
    case 'select':
      response = await prompts(
        {
          type: 'select',
          name: 'value',
          message: step.message,
          initial: getSelectDefaultIndex(promptOptions ?? [], step.default),
          choices: (promptOptions ?? []).map((option) => ({
            title: option.label,
            value: option.value,
          })),
          instructions: false,
        },
        promptControl
      );
      break;
    case 'multiselect':
      response = await prompts(
        {
          type: 'multiselect',
          name: 'value',
          message: step.message,
          choices: (promptOptions ?? []).map((option) => ({
            title: option.label,
            value: option.value,
          })),
          instructions: false,
        },
        promptControl
      );
      break;
    default:
      response = await prompts(
        {
          type: step.type,
          name: 'value',
          message: step.message,
          initial: step.default ?? '',
          validate: (value: string) => {
            const requiredRule = step.validate?.some((rule) => rule.rule === 'required');
            const isRequired = requiredRule || step.required === true;
            if (!isRequired && value.trim().length === 0) return true;
            if (isRequired && value.trim().length === 0) return 'This field is required';
            return true;
          },
        },
        promptControl
      );
      break;
  }

  if (cancelled) {
    onCancel?.();
    return { cancelled: true, value: undefined };
  }

  const responseValue = response.value;
  if (typeof responseValue === 'string' || responseValue === undefined) {
    return { cancelled: false, value: responseValue };
  }
  if (Array.isArray(responseValue) && responseValue.every((value) => typeof value === 'string')) {
    return { cancelled: false, value: responseValue };
  }
  return { cancelled: false, value: undefined };
}

/**
 * Runs an interactive setup wizard and returns answers keyed by step id.
 */
export async function runWizard(
  config: WizardConfig,
  runOptions: RunWizardOptions = {}
): Promise<Record<string, unknown>> {
  const answers: Record<string, unknown> = {};
  const indexByStepId = new Map(config.steps.map((step, index) => [step.id, index]));
  let currentIndex = 0;
  let forcedNextStep: string | undefined;

  const context: WizardContext = {
    answers,
    setNextStep(stepId: string) {
      forcedNextStep = stepId;
    },
    showNote(title: string, body: string) {
      console.log(`\n  ${title}`);
      console.log(`  ${body}\n`);
    },
    openBrowser(url: string) {
      return openUrl(url);
    },
  };

  while (currentIndex < config.steps.length) {
    const step = config.steps[currentIndex];

    if (step.when) {
      const expected = answers[step.when.field];
      if (expected !== step.when.equals) {
        currentIndex += 1;
        continue;
      }
    }

    const optionsOverride = runOptions.optionsProvider
      ? await runOptions.optionsProvider(step.id)
      : undefined;
    const result = await promptStep(step, optionsOverride, runOptions.onCancel);

    if (result.cancelled) {
      return answers;
    }

    if (step.type !== 'note') {
      let validationError =
        runOptions.asyncValidate && result.value !== undefined
          ? await runOptions.asyncValidate(step.id, result.value)
          : null;

      while (validationError) {
        console.log(`\n  ${validationError}\n`);
        const retry = await promptStep(step, optionsOverride, runOptions.onCancel);
        if (retry.cancelled) return answers;
        validationError =
          runOptions.asyncValidate && retry.value !== undefined
            ? await runOptions.asyncValidate(step.id, retry.value)
            : null;
        answers[step.id] = retry.value;
      }

      answers[step.id] = result.value;
    }

    if (runOptions.onAfterStep) {
      await runOptions.onAfterStep(step.id, answers[step.id], context);
    }

    if (forcedNextStep) {
      const nextIndex = indexByStepId.get(forcedNextStep);
      forcedNextStep = undefined;
      if (nextIndex !== undefined) {
        currentIndex = nextIndex;
        continue;
      }
    }

    currentIndex += 1;
  }

  return answers;
}
