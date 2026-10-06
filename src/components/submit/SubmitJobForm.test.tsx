import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../lib/i18n/LanguageProvider';
import { clearDraft, useDraftState } from '../../lib/workspace';
const mocks = vi.hoisted(() => ({ submit: vi.fn(), load: vi.fn() }));
vi.mock('../../lib/api/jobs', () => ({ createJob: mocks.submit }));
vi.mock('../../lib/examples', () => ({ loadExampleInput: mocks.load }));
vi.mock('../../lib/query/useServiceHealth', () => ({ useServiceHealth: () => ({
  isPending: false, isError: false, data: { coreReady: true, acceptingJobs: true, maxThreadPerJob: 3,
    algorithms: {}, realignment: { enabled: true, available: true, maxSequences: 2000, maxColumns: 30000, maxCells: 1000000 } }
}) }));
import { SubmitJobForm } from './SubmitJobForm';
beforeEach(() => {
  clearDraft('submit'); vi.clearAllMocks(); localStorage.setItem('easymsa.locale', 'en');
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  mocks.submit.mockRejectedValue(new Error('Submission unavailable'));
  mocks.load.mockResolvedValue({ file: new File(['>a\nACGT\n>b\nACGA\n'], 'example.fa') });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const show = () => render(<MemoryRouter><LanguageProvider><SubmitJobForm /></LanguageProvider></MemoryRouter>);
const submitButton = () => screen.getByRole('button', { name: 'Submit Job' });
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
it('defaults to audit, ignores the old filter draft, and removes the size sentence', async () => {
  function LegacyDraft() { const [, set] = useDraftState('submit:preprocess', 'audit'); useEffect(() => set('filter'), [set]); return null; }
  const legacy = render(<LegacyDraft />); legacy.unmount(); show(); const user = await validInput();
  expect(document.querySelector('.work-parameters')).not.toHaveAttribute('open');
  expect(screen.queryByText('FASTA and compressed files, up to 100 MiB.')).not.toBeInTheDocument();
  await user.click(submitButton());
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({ preprocessMode: 'audit', algorithm: 'auto', realignEnabled: false })));
});
it('submits thread and preprocessing selections and updates the input hint', async () => {
  show(); const user = await validInput(); await user.click(screen.getByText('Advanced settings'));
  await user.selectOptions(screen.getByLabelText('Preprocess mode'), 'filter');
  await user.type(screen.getByRole('spinbutton', { name: /Thread/ }), '2');
  expect(screen.getByText('Input sequences are checked and flagged sequences are filtered.')).toBeVisible();
  await user.click(submitButton());
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({ preprocessMode: 'filter', algorithmParams: { thread: 2 } })));
});
it('opens advanced settings and focuses an out-of-range thread value', async () => {
  show(); const user = await validInput(); await user.click(screen.getByText('Advanced settings'));
  const thread = screen.getByRole('spinbutton', { name: /Thread/ }); await user.type(thread, '4');
  await user.click(screen.getByText('Advanced settings')); await user.click(submitButton());
  await waitFor(() => expect(thread).toHaveFocus());
  expect(document.querySelector('.work-parameters')).toHaveAttribute('open');
  expect(mocks.submit).not.toHaveBeenCalled();
});
it('restores defaults and retains new preprocessing selections across remounts', async () => {
  const first = show(); const user = userEvent.setup(); await user.click(screen.getByText('Advanced settings'));
  await user.selectOptions(screen.getByLabelText('Preprocess mode'), 'filter'); first.unmount(); show();
  expect(document.querySelector('.work-parameters')).not.toHaveAttribute('open');
  await user.click(screen.getByText('Advanced settings'));
  expect(screen.getByLabelText('Preprocess mode')).toHaveValue('filter');
  await user.type(screen.getByRole('spinbutton', { name: /Thread/ }), '2');
  await user.click(screen.getByRole('button', { name: /Restore|Reset/ }));
  expect(screen.getByLabelText('Preprocess mode')).toHaveValue('audit');
  expect(screen.getByRole('spinbutton', { name: /Thread/ })).toHaveValue(null);
});
it('preserves the example name on focus and keeps refinement opt-in', async () => {
  show(); const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: 'Load example' }));
  const name = screen.getByLabelText('Job name'); await waitFor(() => expect(name).toHaveValue('Synthetic DNA example'));
  await user.click(name); expect(name).toHaveValue('Synthetic DNA example');
  expect(screen.getByRole('checkbox', { name: 'Refine alignment quality' })).not.toBeChecked();
});
