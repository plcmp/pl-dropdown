import { html, PlElement, css } from "polylib";
import { addOverlay, removeOverlay } from "@plcmp/utils";

function calcPosRect(direction, around, target) {
    let a = { x: null, y: null, height: target.height, width: target.width };
    switch (direction) {
        case 'left':
            a.y = around.top;
            a.x = around.left - target.width;
            break;
        case 'right':
            a.y = around.top;
            a.x = around.right;
            break;
        case 'right-up':
            a.y = around.bottom - target.height;
            a.x = around.right;
            break;
        case 'left-up':
            a.y = around.bottom - target.height;
            a.x = around.left - target.width;
            break;
        case 'up':
            a.y = around.top - target.height;
            a.x = around.left;
            break;
        case 'up-left':
            a.y = around.top - target.height;
            a.x = around.right - target.width;
            break;
        case 'down-left':
            a.y = around.bottom;
            a.x = around.right - target.width;
            break;
        case 'down':
        default:
            a.y = around.bottom;
            a.x = around.left;
    }
    return DOMRect.fromRect(a);
}
function calcIntersect(a, b) {
    let width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    let height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (height <= 0 || width <= 0) return 0
    else return (height * width) / (a.height * a.width);
}
const order = ['down', 'down-left', 'up', 'up-left', 'right', 'right-up', 'left', 'left-up'];

class PlDropdown extends PlElement {
    static properties = {
        opened: { type: Boolean, value: false, reflectToAttribute: true },
        fitInto: { value: null },
        direction: { value: 'down' } // down, up, left, right
    }

    static css = css`
        :host {
            display: none;
            position: fixed;
            background: var(--surface-color);
            padding: var(--space-md);
            box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.08);
        }
        
        :host([opened]) {
            display: block;
        }
    `;

    static template = html`
        <slot></slot>
    `;

    constructor() {
        super();
        this._callback = () => {
            this.reFit(this.target, this.fitInto);
        };
        this._close = e => {
            let path = e.composedPath();
            if (!path.includes(this)) {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            }
        }
        this.addEventListener('mousedown', e => {
            // prevent window click event when mousedown was in dropdown area and click outside
            addEventListener('click', e => { if (!e.composedPath().includes(this)) e.stopImmediatePropagation() }, { once: true, capture: true });
        });
    }
    open(target, fitInto, opts) {
        if (opts?.model) this.model = opts.model;
        if (this.opened) return;
        this.opened = true;
        this.target = target;
        this.reFit(target, fitInto);
        addOverlay(this);

        addEventListener('resize', this._callback, { passive: true });
        addEventListener('scroll', this._callback, { passive: true });
        // delay attach event listener to let all current events dispatch fully
        setTimeout(() => addEventListener('click', this._close), 0);
        this.dispatchEvent(new CustomEvent('pl-dropdown-show', { bubbles: true, composed: true }));
    }
    close() {
        if (!this.opened) return;
        this.opened = false;
        removeOverlay(this);
        removeEventListener('resize', this._callback, { passive: true });
        removeEventListener('scroll', this._callback, { passive: true });
        removeEventListener('click', this._close);
        this.dispatchEvent(new CustomEvent('pl-dropdown-hide', { bubbles: true, composed: true }));
    }
    reFit(fitAround, fitInto) {
        if (!fitAround) return;
        let fitRect = fitInto?.getBoundingClientRect?.() ?? DOMRect.fromRect({ x: 0, y: 0, width: document.documentElement.clientWidth, height: document.documentElement.clientHeight });
        let s = this.getBoundingClientRect();
        let dx = s.left - this.offsetLeft, dy = s.top - this.offsetTop;
        let sl = this.style;
        let t = fitAround.getBoundingClientRect();
        // пробуем для указанного направления
        let a = calcPosRect(this.direction, t, s);
        let iRate = calcIntersect(a, fitRect);
        if (iRate < 1) {
            // если не уместилось перебираем направления пока не влезет, либо оставляем наилучшее
            let bestDir = this.direction;
            for (let d in order) {
                let q = calcPosRect(order[d], t, s);
                let iRate2 = calcIntersect(q, fitRect);
                if (iRate2 > iRate) {
                    bestDir = order[d];
                    a = q;
                    iRate = iRate2;
                }
                if (iRate2 === 1) break;
            }
        }
        sl.left = r(a.x - dx);
        sl.top = r(a.y - dy);
    }
}
function r(x) { return Math.round(x) + 'px'; }

customElements.define('pl-dropdown', PlDropdown);