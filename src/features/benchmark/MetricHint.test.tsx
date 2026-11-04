import "@testing-library/jest-dom/vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {Hint} from "./MetricHint";

afterEach(()=>{cleanup();vi.useRealTimers();});
describe("metric explanation portal",()=>{
  it("describes the focused control from outside its scrolling ancestor and closes with Escape",()=>{
    const {container}=render(<div data-testid="scroll"><Hint text="A reference score"><button>Q</button></Hint></div>);
    const trigger=screen.getByRole('button',{name:'Q'});
    fireEvent.focus(trigger);
    const tip=screen.getByRole('tooltip');expect(tip).toHaveTextContent('A reference score');
    expect(container.contains(tip)).toBe(false);expect(tip.parentElement).toBe(document.body);
    expect(trigger).toHaveAttribute('aria-describedby',tip.id);
    fireEvent.keyDown(document,{key:'Escape'});expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });
  it("keeps hover text readable when the pointer moves onto it",()=>{
    vi.useFakeTimers();render(<Hint text="Details"><button>Time</button></Hint>);
    const wrapper=screen.getByRole('button').parentElement!;
    fireEvent.mouseEnter(wrapper);const tip=screen.getByRole('tooltip');
    fireEvent.mouseLeave(wrapper);fireEvent.mouseEnter(tip);vi.advanceTimersByTime(150);
    expect(tip).toBeInTheDocument();
    fireEvent.mouseLeave(tip);vi.advanceTimersByTime(150);
  });
  it("preserves existing control descriptions and click behavior",()=>{
    const click=vi.fn();render(<><span id="unit">Seconds</span><Hint text="Lower is better"><button aria-describedby="unit" onClick={click}>Time</button></Hint></>);
    const button=screen.getByRole('button');fireEvent.focus(button);
    expect(button.getAttribute('aria-describedby')!.split(' ')).toEqual(['unit',screen.getByRole('tooltip').id]);
    fireEvent.click(button);expect(click).toHaveBeenCalledOnce();fireEvent.blur(button);
    expect(button).toHaveAttribute('aria-describedby','unit');expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
