import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../lib/i18n/LanguageProvider';
import { clearDraft, useDraftState } from '../../lib/workspace';
const mocks = vi.hoisted(() => ({ submit: vi.fn(), load: vi.fn(), scroll: vi.fn() }));
vi.mock('../../lib/api/jobs', () => ({ createJob: mocks.submit }));
vi.mock('../../lib/examples', () => ({ loadExampleInput: mocks.load }));
vi.mock('../../lib/query/useServiceHealth', () => ({ useServiceHealth: () => ({
  isPending: false, isError: false, data: { coreReady: true, acceptingJobs: true, maxThreadPerJob: 3,
    algorithms: {}, realignment: { enabled: true, available: true, maxSequences: 2000, maxColumns: 30000, maxCells: 1000000 } }
}) }));
import { SubmitJobForm } from './SubmitJobForm';
const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
beforeEach(() => {
  clearDraft('submit'); vi.clearAllMocks(); localStorage.setItem('easymsa.locale', 'en');
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: mocks.scroll });
  mocks.submit.mockRejectedValue(new Error('Submission unavailable'));
  mocks.load.mockReset();
  mocks.load.mockResolvedValue({ file: new File(['>a\nACGT\n>b\nACGA\n'], 'example.fa') });
});
afterEach(() => {
  cleanup(); vi.unstubAllGlobals();
  if (originalScrollIntoView) Object.defineProperty(Element.prototype, 'scrollIntoView', originalScrollIntoView);
  else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});
const show = () => render(<MemoryRouter><LanguageProvider><SubmitJobForm /></LanguageProvider></MemoryRouter>);
const submitButton = () => screen.getByRole('button', { name: 'Submit Job' });
const advancedToggle = () => screen.getByText('Advanced settings', { selector: 'span' });
const method = () => screen.getByRole('combobox', { name: 'Alignment method' });
const exampleButton = () => screen.getByRole('button', { name: 'Load example & settings' });
async function validInput() {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText('Job name'));
  await user.type(screen.getByLabelText('FASTA sequences'), '>a\nACGT\n>b\nACGA\n');
  return user;
}
it('suggests a name on focus and preserves edited names', async () => {
  show(); const user = userEvent.setup(); const name = screen.getByLabelText('Job name');
  fireEvent.focus(name);
  expect((name as HTMLInputElement).value).toMatch(/^Alignment-\d{8}-\d{6}$/);
  await user.clear(name); await user.type(name, 'my-analysis');
  await user.click(screen.getByLabelText(/Notification email/)); await user.click(name);
  expect(name).toHaveValue('my-analysis');
});
it('names a job the user never named', async () => {
  show(); const user = userEvent.setup();
  await user.type(screen.getByLabelText('FASTA sequences'), '>a\nACGT\n>b\nACGA\n');
  expect(screen.getByLabelText('Job name')).toHaveAccessibleDescription('Left blank, the job is named by its submission time.');
  await user.click(submitButton());
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({ jobName: expect.stringMatching(/^Alignment-\d{8}-\d{6}$/) })));
});
it('defaults to audit, ignores the old filter draft, and removes the size sentence', async () => {
  function LegacyDraft() { const [, set] = useDraftState('submit:preprocess', 'audit'); useEffect(() => set('filter'), [set]); return null; }
  const legacy = render(<LegacyDraft />); legacy.unmount(); show(); const user = await validInput();
  expect(document.querySelector('.work-parameters')).not.toHaveAttribute('open');
  expect(screen.queryByText('FASTA and compressed files, up to 100 MiB.')).not.toBeInTheDocument();
  await user.click(submitButton());
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({ preprocessMode: 'audit', algorithm: 'auto', realignEnabled: false })));
});
it('submits thread and preprocessing selections and updates the input hint', async () => {
  show(); const user = await validInput(); await user.click(advancedToggle());
  await user.selectOptions(screen.getByLabelText('Preprocess mode'), 'filter');
  await user.type(screen.getByRole('spinbutton', { name: /Thread/ }), '2');
  expect(screen.getByText('Sequences that fail the filters will be removed.')).toBeVisible();
  await user.click(submitButton());
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({ preprocessMode: 'filter', algorithmParams: { thread: 2 } })));
});
it('opens advanced settings and focuses an out-of-range thread value', async () => {
  show(); const user = await validInput(); await user.click(advancedToggle());
  const thread = screen.getByRole('spinbutton', { name: /Thread/ }); await user.type(thread, '4');
  await user.click(advancedToggle()); await user.click(submitButton());
  await waitFor(() => expect(thread).toHaveFocus());
  expect(document.querySelector('.work-parameters')).toHaveAttribute('open');
  expect(mocks.scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'instant' });
  expect(mocks.scroll.mock.contexts).toContain(thread);
  expect(mocks.submit).not.toHaveBeenCalled();
});
it('restores defaults and retains new preprocessing selections across remounts', async () => {
  const first = show(); const user = userEvent.setup(); await user.click(advancedToggle());
  await user.selectOptions(screen.getByLabelText('Preprocess mode'), 'filter'); first.unmount(); show();
  expect(document.querySelector('.work-parameters')).not.toHaveAttribute('open');
  await user.click(advancedToggle());
  expect(screen.getByLabelText('Preprocess mode')).toHaveValue('filter');
  await user.type(screen.getByRole('spinbutton', { name: /Thread/ }), '2');
  await user.click(screen.getByRole('button', { name: /Restore|Reset/ }));
  expect(screen.getByLabelText('Preprocess mode')).toHaveValue('audit');
  expect(screen.getByRole('spinbutton', { name: /Thread/ })).toHaveValue(null);
});
it('preserves the example name on focus and keeps refinement opt-in', async () => {
  show(); const user = userEvent.setup(); await user.click(exampleButton());
  expect(mocks.load).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Confirm load' }));
  const name = screen.getByLabelText('Job name'); await waitFor(() => expect(name).toHaveValue('Synthetic DNA example'));
  await user.click(name); expect(name).toHaveValue('Synthetic DNA example');
  expect(screen.getByRole('checkbox', { name: 'Realign after alignment' })).not.toBeChecked();
  expect(screen.getByRole('tab', { name: 'Paste FASTA' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByLabelText('FASTA sequences')).toHaveValue('>a\nACGT\n>b\nACGA\n');
});
it('disables empty input and protects a restored draft from an example URL', async () => {
  const initial = show(); expect(submitButton()).toBeDisabled();
  const user = await validInput();
  const oldName = (screen.getByLabelText('Job name') as HTMLInputElement).value;
  initial.unmount();
  render(<MemoryRouter initialEntries={['/submit?example=alignment-small']}><LanguageProvider><SubmitJobForm /></LanguageProvider></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Confirm load' })).toBeVisible();
  expect(mocks.load).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Job name')).toHaveValue(oldName);
  expect(screen.getByLabelText('FASTA sequences')).toHaveValue('>a\nACGT\n>b\nACGA\n');
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByLabelText('Job name')).toHaveValue(oldName);
});

async function configureCustomSettings(user: ReturnType<typeof userEvent.setup>) {
  const name = screen.getByLabelText('Job name');
  await user.clear(name); await user.type(name, 'Original analysis');
  await user.type(screen.getByLabelText(/Notification email/), 'researcher@example.com');
  await user.selectOptions(method(), 'mafft');
  await user.click(advancedToggle());
  await user.selectOptions(screen.getByLabelText('Preprocess mode'), 'filter');
  await user.type(screen.getByRole('spinbutton', { name: /Thread/ }), '2');
  await user.selectOptions(screen.getByLabelText('MAFFT mode'), 'globalpair');
  await user.type(screen.getByRole('spinbutton', { name: 'Maximum iterations' }), '42');
  await user.click(screen.getByRole('checkbox', { name: /Reorder aligned sequences/ }));
  await user.click(screen.getByRole('checkbox', { name: 'Realign after alignment' }));
  await user.click(screen.getByText('Realignment settings and limits'));
  await user.selectOptions(screen.getByLabelText('Execution order'), '2');
}

function expectCustomSettings() {
  expect(screen.getByLabelText('Job name')).toHaveValue('Original analysis');
  expect(screen.getByLabelText(/Notification email/)).toHaveValue('researcher@example.com');
  expect(method()).toHaveValue('mafft');
  expect(screen.getByLabelText('Preprocess mode')).toHaveValue('filter');
  expect(screen.getByRole('spinbutton', { name: /Thread/ })).toHaveValue(2);
  expect(screen.getByLabelText('MAFFT mode')).toHaveValue('globalpair');
  expect(screen.getByRole('spinbutton', { name: 'Maximum iterations' })).toHaveValue(42);
  expect(screen.getByRole('checkbox', { name: /Reorder aligned sequences/ })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Realign after alignment' })).toBeChecked();
  expect(screen.getByLabelText('Execution order')).toHaveValue('2');
}

it('keeps the original input and settings until example loading is confirmed and preserves email', async () => {
  show(); const user = await validInput(); await configureCustomSettings(user);
  const originalInput = (screen.getByLabelText('FASTA sequences') as HTMLTextAreaElement).value;
  await user.click(exampleButton());
  expect(screen.getByText(/Your email stays unchanged/)).toBeVisible();
  expect(mocks.load).not.toHaveBeenCalled();
  expect(screen.getByLabelText('FASTA sequences')).toHaveValue(originalInput);
  expectCustomSettings();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(mocks.load).not.toHaveBeenCalled();
  expectCustomSettings();

  await user.click(exampleButton());
  await user.click(screen.getByRole('button', { name: 'Confirm load' }));
  await waitFor(() => expect(screen.getByLabelText('Job name')).toHaveValue('Synthetic DNA example'));
  expect(method()).toHaveValue('minipoa');
  expect(screen.getByLabelText('Preprocess mode')).toHaveValue('audit');
  expect(screen.getByRole('spinbutton', { name: /Thread/ })).toHaveValue(null);
  expect(screen.getByRole('checkbox', { name: 'Realign after alignment' })).not.toBeChecked();
  expect(screen.getByLabelText(/Notification email/)).toHaveValue('researcher@example.com');
  expect(screen.getByText(/Applied on load: MiniPOA/)).toBeVisible();
  expect(screen.getByRole('tab', { name: 'Paste FASTA' })).toHaveAttribute('aria-selected', 'true');
  await user.click(submitButton());
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({
    algorithm: 'minipoa', preprocessMode: 'audit', algorithmParams: undefined,
    realignEnabled: false, realignPattern: 1, email: 'researcher@example.com', inputMethod: 'paste', pastedSequence: '>a\nACGT\n>b\nACGA\n'
  })));
  await waitFor(() => expect(submitButton()).not.toBeDisabled());
  await user.selectOptions(method(), 'mafft');
  expect(screen.getByLabelText('MAFFT mode')).toHaveValue('auto');
  expect(screen.getByRole('spinbutton', { name: 'Maximum iterations' })).toHaveValue(null);
  expect(screen.getByRole('checkbox', { name: /Reorder aligned sequences/ })).not.toBeChecked();
});

it.each(['paste', 'upload'] as const)('undo restores the previous %s input and all task settings', async inputMethod => {
  show(); const user = await validInput(); await configureCustomSettings(user);
  const originalInput = (screen.getByLabelText('FASTA sequences') as HTMLTextAreaElement).value;
  const originalFile = new File(['>one\nACGT\n>two\nACGA\n'], 'original.fa', { type: 'text/plain' });
  if (inputMethod === 'upload') {
    await user.click(screen.getByRole('tab', { name: 'Upload File' }));
    await user.upload(document.querySelector<HTMLInputElement>('#inputFile')!, originalFile);
  }
  await user.click(exampleButton());
  await user.click(screen.getByRole('button', { name: 'Confirm load' }));
  await user.click(await screen.findByRole('button', { name: 'Undo example load' }));
  expectCustomSettings();
  expect(screen.getByLabelText('FASTA sequences')).toHaveValue(originalInput);
  expect(screen.getByRole('tab', { name: inputMethod === 'paste' ? 'Paste FASTA' : 'Upload File' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('Previous input and settings restored.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Undo example load' })).not.toBeInTheDocument();
  await user.click(submitButton());
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({
    jobName: 'Original analysis', email: 'researcher@example.com', algorithm: 'mafft',
    preprocessMode: 'filter', algorithmParams: { thread: 2, mode: 'globalpair', maxiterate: 42, reorder: true },
    realignEnabled: true, realignPattern: 2, inputMethod,
    ...(inputMethod === 'paste' ? { pastedSequence: originalInput } : { file: originalFile, fileName: 'original.fa' })
  })));
});

it('keeps the active preprocessing and parameter summary visible when advanced settings is closed', async () => {
  show(); const user = await validInput(); await configureCustomSettings(user);
  await user.click(advancedToggle());
  const panel = document.querySelector<HTMLDetailsElement>('.work-parameters')!;
  expect(panel).not.toHaveAttribute('open');
  expect(within(panel.querySelector('summary')!).getByText('Filter flagged sequences · Custom algorithm parameters')).toBeVisible();
  const summary = screen.getByLabelText('Job summary');
  expect(within(summary).getByText('MAFFT')).toBeVisible();
  expect(within(summary).getByText('Filter flagged sequences')).toBeVisible();
  expect(within(summary).getByText('On')).toBeVisible();
  expect(within(summary).getByText('Custom algorithm parameters')).toBeVisible();
});

it('blocks editing and submission until a delayed example has finished loading', async () => {
  let finishLoading!: (value: { file: File }) => void;
  mocks.load.mockReturnValueOnce(new Promise<{ file: File }>(resolve => { finishLoading = resolve; }));
  show(); const user = await validInput(); await configureCustomSettings(user);
  const form = document.querySelector('form')!;
  const submit = submitButton();
  const input = screen.getByLabelText('FASTA sequences');
  const originalInput = (input as HTMLTextAreaElement).value;

  await user.click(exampleButton());
  await user.click(screen.getByRole('button', { name: 'Confirm load' }));
  expect(mocks.load).toHaveBeenCalledTimes(1);
  expect(form).toHaveAttribute('aria-busy', 'true');
  expect(form.querySelector('fieldset')).toBeDisabled();
  expect(input).toBeDisabled();
  expect(screen.getByLabelText('Job name')).toBeDisabled();
  expect(method()).toBeDisabled();
  expect(submit).toBeDisabled();
  expect(input).toHaveValue(originalInput);
  expectCustomSettings();
  await user.click(submit);
  await act(async () => { fireEvent.submit(form); });
  expect(mocks.submit).not.toHaveBeenCalled();

  await act(async () => {
    finishLoading({ file: new File(['>a\nACGT\n>b\nACGA\n'], 'delayed-example.fa') });
  });
  await waitFor(() => expect(submit).not.toBeDisabled());
  expect(form).toHaveAttribute('aria-busy', 'false');
  expect(form.querySelector('fieldset')).not.toBeDisabled();
  expect(input).not.toBeDisabled();
  expect(method()).toHaveValue('minipoa');
  expect(screen.getByLabelText('Job name')).toHaveValue('Synthetic DNA example');
  expect(screen.getByLabelText('Preprocess mode')).toHaveValue('audit');
  expect(screen.getByRole('spinbutton', { name: /Thread/ })).toHaveValue(null);
  expect(screen.getByRole('checkbox', { name: 'Realign after alignment' })).not.toBeChecked();
  expect(screen.getByLabelText(/Notification email/)).toHaveValue('researcher@example.com');
  expect(screen.getByRole('tab', { name: 'Paste FASTA' })).toHaveAttribute('aria-selected', 'true');
  await user.click(submit);
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({
    algorithm: 'minipoa', preprocessMode: 'audit', algorithmParams: undefined,
    realignEnabled: false, inputMethod: 'paste', pastedSequence: '>a\nACGT\n>b\nACGA\n'
  })));
});

it('restores an empty form without adding a job-name error when example loading is undone', async () => {
  show(); const user = userEvent.setup();
  expect(screen.getByLabelText('Job name')).toHaveValue('');
  await user.click(exampleButton());
  await user.click(screen.getByRole('button', { name: 'Confirm load' }));
  await user.click(await screen.findByRole('button', { name: 'Undo example load' }));
  expect(screen.getByLabelText('Job name')).toHaveValue('');
  expect(screen.getByLabelText('Job name')).toHaveAttribute('aria-invalid', 'false');
  expect(document.querySelector('#jobName-error')).not.toBeInTheDocument();
  expect(screen.getByLabelText('FASTA sequences')).toHaveValue('');
  expect(method()).toHaveValue('auto');
  expect(mocks.submit).not.toHaveBeenCalled();
});

it('preserves the original uploaded file and settings for undo after returning to the form', async () => {
  const first = show(); const user = await validInput(); await configureCustomSettings(user);
  const originalInput = (screen.getByLabelText('FASTA sequences') as HTMLTextAreaElement).value;
  const originalFile = new File(['>one\nACGT\n>two\nACGA\n'], 'original.fa', { type: 'text/plain' });
  await user.click(screen.getByRole('tab', { name: 'Upload File' }));
  await user.upload(document.querySelector<HTMLInputElement>('#inputFile')!, originalFile);
  await user.click(exampleButton());
  await user.click(screen.getByRole('button', { name: 'Confirm load' }));
  await screen.findByRole('button', { name: 'Undo example load' });
  first.unmount(); show();

  expect(screen.getByLabelText('Job name')).toHaveValue('Synthetic DNA example');
  await user.click(screen.getByRole('button', { name: 'Undo example load' }));
  await user.click(advancedToggle());
  await user.click(screen.getByText('Realignment settings and limits'));
  expectCustomSettings();
  expect(screen.getByLabelText('FASTA sequences')).toHaveValue(originalInput);
  expect(screen.getByRole('tab', { name: 'Upload File' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.queryByRole('button', { name: 'Undo example load' })).not.toBeInTheDocument();
  await user.click(submitButton());
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({
    jobName: 'Original analysis', email: 'researcher@example.com', algorithm: 'mafft',
    preprocessMode: 'filter', algorithmParams: { thread: 2, mode: 'globalpair', maxiterate: 42, reorder: true },
    realignEnabled: true, realignPattern: 2, inputMethod: 'upload', file: originalFile, fileName: 'original.fa'
  })));
});
