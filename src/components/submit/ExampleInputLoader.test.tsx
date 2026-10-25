import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { LanguageProvider } from '../../lib/i18n/LanguageProvider';
const mocks = vi.hoisted(() => ({ load: vi.fn(), onLoad: vi.fn() }));
vi.mock('../../lib/examples', () => ({ loadExampleInput: mocks.load }));
import { ExampleInputLoader } from './ExampleInputLoader';

beforeEach(() => {
  vi.clearAllMocks(); localStorage.setItem('easymsa.locale', 'en');
  mocks.load.mockResolvedValue({ file: new File(['>one\nACGT\n>two\nACGA\n'], 'example.fa') });
});
afterEach(cleanup);

function LocationProbe() { return <output aria-label="Current route">{useLocation().search}</output>; }
function show({ kind = 'alignment', hasInput = false, confirmationMessage, initialEntry = '/' }: {
  kind?: 'alignment' | 'realignment'; hasInput?: boolean; confirmationMessage?: string; initialEntry?: string;
} = {}) {
  return render(<MemoryRouter initialEntries={[initialEntry]}><LanguageProvider>
    <ExampleInputLoader kind={kind} disabled={false} onLoad={mocks.onLoad} hasInput={hasInput}
      confirmationMessage={confirmationMessage} confirmLabel={confirmationMessage ? 'Confirm load' : undefined} />
    <LocationProbe />
  </LanguageProvider></MemoryRouter>);
}

it('does not load over an existing input until the replacement is confirmed', async () => {
  show({ hasInput: true }); const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Load example' }));
  expect(screen.getByText('The example will replace your current input and task settings.')).toBeVisible();
  expect(mocks.load).not.toHaveBeenCalled(); expect(mocks.onLoad).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('button', { name: 'Replace input' })).not.toBeInTheDocument();
  expect(mocks.load).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Load example' }));
  await user.click(screen.getByRole('button', { name: 'Replace input' }));
  await waitFor(() => expect(mocks.onLoad).toHaveBeenCalledTimes(1));
  expect(mocks.load).toHaveBeenCalledWith('alignment-small');
});

it.each([
  { hasInput: true, confirmationMessage: undefined, confirmName: 'Replace input' },
  { hasInput: false, confirmationMessage: 'This example also resets your settings.', confirmName: 'Confirm load' }
])('requires confirmation for a deep link with input=$hasInput and a custom warning=$confirmationMessage', async props => {
  show({ ...props, initialEntry: '/submit?example=alignment-small&keep=yes' });
  const user = userEvent.setup();
  expect(await screen.findByRole('button', { name: props.confirmName })).toBeVisible();
  expect(mocks.load).not.toHaveBeenCalled(); expect(mocks.onLoad).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Current route')).toHaveTextContent('example=alignment-small');
  await user.click(screen.getByRole('button', { name: props.confirmName }));
  await waitFor(() => expect(mocks.onLoad).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText('Current route')).toHaveTextContent('?keep=yes');
  expect(mocks.load).toHaveBeenCalledTimes(1);
});

it('keeps the original input when a deep-link confirmation is cancelled', async () => {
  show({ hasInput: true, initialEntry: '/submit?example=alignment-small' });
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Cancel' }));
  expect(mocks.load).not.toHaveBeenCalled(); expect(mocks.onLoad).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Replace input' })).not.toBeInTheDocument();
});

it.each(['click', 'deep link'] as const)('preserves the empty realignment shortcut through a %s', async trigger => {
  show({ kind: 'realignment', initialEntry: trigger === 'deep link' ? '/realign?example=realignment-small' : '/realign' });
  if (trigger === 'click') await userEvent.setup().click(screen.getByRole('button', { name: 'Load example' }));
  await waitFor(() => expect(mocks.onLoad).toHaveBeenCalledTimes(1));
  expect(mocks.load).toHaveBeenCalledWith('realignment-small');
  expect(screen.queryByRole('button', { name: 'Replace input' })).not.toBeInTheDocument();
});

it('does not replace the input when the confirmed example cannot be fetched', async () => {
  mocks.load.mockRejectedValueOnce(new Error('Offline'));
  show({ confirmationMessage: 'This example also resets your settings.' });
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Load example' }));
  await user.click(screen.getByRole('button', { name: 'Confirm load' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load the example. Please retry.');
  expect(mocks.onLoad).not.toHaveBeenCalled();
});
