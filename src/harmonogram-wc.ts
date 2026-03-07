import { LitElement, html, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';

/**
 * Represents a single task/event on the schedule.
 */
export interface HarmonogramTask {
  /** Unique identifier for the task. */
  id: string;
  /** Display label for the task. */
  label: string;
  /** ISO 8601 start datetime string. */
  start: string;
  /** ISO 8601 end datetime string. */
  end: string;
}

/**
 * `<harmonogram-wc>` — a schedule visualisation WebComponent.
 *
 * @fires harmonogram-task-click - Fired when a task is clicked.
 *   The `detail` object contains the clicked {@link HarmonogramTask}.
 *
 * @csspart container - The outer wrapper element.
 * @csspart header    - The component header containing the title.
 * @csspart grid      - The schedule grid area.
 * @csspart task      - An individual task bar inside the grid.
 *
 * @cssprop [--harmonogram-primary-color=#1565c0] - Primary accent colour.
 * @cssprop [--harmonogram-font-family=sans-serif] - Font family used throughout.
 *
 * @example
 * ```html
 * <harmonogram-wc title="Project Timeline"></harmonogram-wc>
 * ```
 */
@customElement('harmonogram-wc')
export class HarmonogramWc extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: var(--harmonogram-font-family, sans-serif);
      box-sizing: border-box;
    }

    [part='container'] {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    [part='header'] {
      background: var(--harmonogram-primary-color, #1565c0);
      color: #fff;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      font-weight: 600;
    }

    [part='grid'] {
      padding: 1rem;
      min-height: 4rem;
    }

    [part='task'] {
      background: var(--harmonogram-primary-color, #1565c0);
      color: #fff;
      border-radius: 3px;
      padding: 0.25rem 0.5rem;
      margin-bottom: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
    }

    [part='task']:last-child {
      margin-bottom: 0;
    }

    .empty-message {
      color: #595959;
      font-size: 0.875rem;
    }
  `;

  /** The title displayed in the component header. */
  @property({ type: String })
  override title = 'Harmonogram';

  /** The list of tasks to display on the schedule. */
  @property({ type: Array, attribute: false })
  tasks: HarmonogramTask[] = [];

  private _handleTaskClick(task: HarmonogramTask): void {
    this.dispatchEvent(
      new CustomEvent<HarmonogramTask>('harmonogram-task-click', {
        detail: task,
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render(): unknown {
    return html`
      <div part="container">
        <div part="header">${this.title}</div>
        <div part="grid">
          ${this.tasks.length === 0
            ? html`<span class="empty-message">No tasks to display.</span>`
            : this.tasks.map(
                (task) => html`
                  <div
                    part="task"
                    @click=${() => this._handleTaskClick(task)}
                    aria-label=${task.label}
                    role="button"
                    tabindex="0"
                    @keydown=${(e: KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        this._handleTaskClick(task);
                      }
                    }}
                  >
                    ${task.label}
                  </div>
                `,
              )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'harmonogram-wc': HarmonogramWc;
  }
}
