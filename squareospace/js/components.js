/**
 * Web Components for the personal website
 */

class CitationLink extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        const n = this.getAttribute('n');
        const href = this.getAttribute('href');

        if (n && href) {
            this.innerHTML = `
        <sup>
          <a href="${href}" target="_blank" style="text-decoration: none;">
            (${n})
          </a>
        </sup>
      `;
        }
    }
}

customElements.define('citation-link', CitationLink);
