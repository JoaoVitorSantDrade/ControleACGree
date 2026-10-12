import type { FlyoutTransition } from '../shared/types';

export class FlyoutLifecycle {
  state: FlyoutTransition = { id: 0, phase: 'hidden' };
  private timer?: ReturnType<typeof setTimeout>;
  constructor(private emit: (state: FlyoutTransition) => void, private hide: () => void) {}
  transition(open: boolean) {
    clearTimeout(this.timer);
    this.state = { id: this.state.id + 1, phase: open ? 'opening' : 'closing' };
    this.emit(this.state);
    const id = this.state.id;
    this.timer = setTimeout(() => this.complete(id), 300);
    return this.state;
  }
  complete(id: number) {
    if (id !== this.state.id || !['opening', 'closing'].includes(this.state.phase)) return;
    clearTimeout(this.timer);
    const closing = this.state.phase === 'closing';
    this.state = { id, phase: closing ? 'hidden' : 'open' };
    if (closing) this.hide();
    this.emit(this.state);
  }
  dispose() { clearTimeout(this.timer); }
}
