import uuid from './uuid';
import { getAttribute, setAttribute, hasAttribute, removeAttribute, addCss } from './dom';
import registerDoubleclickAdslot from './double-click-ad-slots';
import { parseAttributesIntoValidMapping, getEligibleSizesForResolution } from './size-mapping';

import styles from './ad-slot-styles.scss';

const registerElement = (name = 'as24-ad-slot') => {

    const AS24AdSlotPrototype = Object.create(HTMLElement.prototype, {
        attachedCallback: {
            value: function() {
                const pageResolution = {
                    x: window.innerWidth,
                    y: window.innerHeight
                };

                const sizeMapping = parseAttributesIntoValidMapping(this.attributes);
                const eligibleSizes = getEligibleSizesForResolution(sizeMapping, pageResolution);
                const hasEligibleSizes = eligibleSizes && eligibleSizes.length > 0;

                setAttribute(this, 'size-mapping', JSON.stringify(sizeMapping));
                setAttribute(this, 'sizes', JSON.stringify(eligibleSizes));

                if (!hasEligibleSizes) {
                    setAttribute(this, 'empty', '');
                    this.dispatchEvent(new Event('ad-slot-empty'), { bubbles: true });

                    return;
                }

                const elementId = `ad-${uuid()}`;
                const adunit = getAttribute(this, 'ad-unit');
                const outOfPage = hasAttribute(this, 'out-of-page');
                const immediate = hasAttribute(this, 'immediate');
                const collapseEmpty = hasAttribute(this, 'collapse-empty');
                const openxIgnore = hasAttribute(this, 'openx-ignore');
                const preload = getAttribute(this, 'preload') | 0;

                const container = this.container = document.createElement('div');
                container.id = elementId;
                this.appendChild(container);

                if (!collapseEmpty) {
                    const sizes = eligibleSizes.filter(s => s !== 'fluid').sort((a, b) => a[1] - b[1]);
                    const minHeight = sizes[0][1];
                    const minWidth = sizes[0][0];

                    container.style.minHeight = this.style.minHeight = `${minHeight}px`;
                    container.style.minWidth = this.style.minWidth = `${minWidth}px`;
                }

                this.adslot = registerDoubleclickAdslot({
                    adunit,
                    outOfPage,
                    sizeMapping,
                    container,
                    slotElement: this,
                    immediate,
                    collapseEmpty,
                    openxIgnore,
                    preload
                });


                this.adslot.onempty = () => {
                    setAttribute(this, 'empty', '');
                    this.dispatchEvent(new Event('ad-slot-empty'), { bubbles: true });
                };

                this.adslot.onload = () => {
                    setAttribute(this, 'loaded', '');
                    this.className += ` rnd-${ (Math.random() * 10000) | 0 }`; // this causes redraw in IE, because attribute change doesn't
                    this.dispatchEvent(new Event('ad-slot-loaded'), { bubbles: true });

                    if (!collapseEmpty) {
                        const oldMinHeight = parseInt(this.style.minHeight, 10);
                        const height = container.clientHeight;
                        const oldMinWidth = parseInt(this.style.minWidth, 10);
                        const width = container.clientWidth;
                        this.style.minHeight = `${Math.max(oldMinHeight, height)}px`;
                        this.style.minWidth = `${Math.max(oldMinWidth, width)}px`;
                    }
                };

                this.adslot.onrefresh = () => {
                    removeAttribute(this, 'loaded');
                    removeAttribute(this, 'empty');
                };

            }
        },

        detachedCallback: {
            value: function() {
                if (this.adslot) {
                    this.adslot.destroy();
                }
            }
        },
        refreshAdSlot: {
            value: function() {
                if (this.adslot) {
                    this.container.innerHTML = '';
                    this.adslot.refresh();
                }
            }
        }
    });

    const stylesForCurrentTagName = styles.replace(/as24-ad-slot/g, name);
    addCss(stylesForCurrentTagName);

    document.registerElement(name, { prototype: AS24AdSlotPrototype });
};

export default registerElement;
