"""Generate illustrative investigation and decision reports in the OS temp directory.

Usage: python3 tests/examples.py --design-system /path/to/design-system
"""

import argparse
from html import escape
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import sys

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "embed_css.py"
CSS = """<style>
.report .report-intro { max-width: var(--measure); }
.report .report-grid { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); }
.report .report-band { border-left: var(--border-width) solid var(--border-strong); padding-left: var(--space-4); }
.report .report-overflow { overflow-x: auto; max-width: 100%; }
.report .report-overflow table { min-width: 32rem; }
.report .report-card { min-width: 0; overflow-wrap: anywhere; }
.report .report-card h3 { margin-top: 0; }
</style>"""


def link(label, href):
    if not (href.startswith("https://") or href.startswith("http://") or href.startswith("#")):
        raise ValueError("untrusted URL scheme")
    return f'<a href="{escape(href, quote=True)}">{escape(label)}</a>'


def page(title, intro, content):
    return f'''<!doctype html>
<html lang="en" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{escape(title)}</title>
<!-- SNARFUM_STYLES -->{CSS}</head><body class="report"><a class="sn-skip-link" href="#main">Skip to content</a>
<header class="sn-header"><div class="sn-container sn-section sn-section--compact"><p class="sn-label">Illustrative report · Offline example</p></div></header>
<main id="main" class="sn-container sn-section"><h1>{escape(title)}</h1><p class="report-intro">{escape(intro)}</p>{content}</main></body></html>'''


def investigation():
    title = 'Why Did the Export Stall?'
    evidence = link('trace <worker>& log', 'https://example.org/log?job=42&view=raw')
    return page(title, 'Question: did queue time or processing time cause the delay? Synthetic example; no real system was investigated.', f'''
<section aria-labelledby="finding"><h2 id="finding">Finding: Queue Time Dominated</h2>
<p class="sn-prose">In this synthetic example, the export waited 11 min and processed for 2 min. The {evidence} supports only the sample timeline, not a population-level claim.</p>
<figure class="sn-card report-card"><figcaption><strong>Illustrative elapsed time</strong> · One export, minutes; larger values mean longer waiting.</figcaption>
<div class="report-grid"><p class="report-band"><span class="sn-label">Queued</span><br><strong>11 minutes</strong></p><p class="report-band"><span class="sn-label">Running</span><br><strong>2 minutes</strong></p></div></figure></section>
<section aria-labelledby="unknown"><h2 id="unknown">What Remains Unknown</h2><p class="sn-prose">One trace cannot establish frequency. Check a representative sample and worker saturation before changing capacity.</p></section>
<section aria-labelledby="next"><h2 id="next">Recommendation</h2><p class="sn-prose">Measure queue time across all export jobs, then decide whether concurrency or scheduling needs adjustment.</p></section>''')


def decision():
    title = 'Choose an Export Delivery Path'
    rows = [
        ('Direct download', 'Simple', 'Request timeout risk'),
        ('Background job', 'Handles long runs', 'Requires job status'),
        ('Scheduled batch', 'Predictable load', 'Delayed results'),
    ]
    table = ''.join(f'<tr><th scope="row">{escape(name)}</th><td>{escape(benefit)}</td><td>{escape(cost)}</td></tr>' for name, benefit, cost in rows)
    return page(title, 'Decision: deliver a large export without holding an HTTP request open. All facts below are illustrative assumptions.', f'''
<section aria-labelledby="constraints"><h2 id="constraints">Constraints</h2><p class="sn-prose">Users need a result on the same day; request timeouts cannot be raised. Validate volume and security before committing.</p></section>
<section aria-labelledby="approaches"><h2 id="approaches">Three Approaches</h2>
<div class="sn-prose report-overflow" role="region" aria-label="Delivery approach comparison" tabindex="0"><table><caption>Trade-offs under the illustrative constraints</caption><thead><tr><th scope="col">Approach</th><th scope="col">Benefit</th><th scope="col">Cost</th></tr></thead><tbody>{table}</tbody></table></div>
<div class="report-grid"><article class="sn-card report-card"><h3>Direct Download</h3><p>Fast to ship, but bounded by timeout.</p></article><article class="sn-card report-card"><h3>Background Job</h3><p>Independent of request duration; progress needs a status endpoint.</p></article><article class="sn-card report-card"><h3>Scheduled Batch</h3><p>Predictable capacity at the cost of immediacy.</p></article></div></section>
<section aria-labelledby="choice"><h2 id="choice">Recommendation</h2><p class="sn-prose">Choose a background job if the timeout and same-day assumptions hold. Start with a job-status contract and access control; revisit after measuring volume.</p></section>''')


class Structure(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.hrefs = []
        self.styles = 0
        self.main = 0
        self.titles = 0
        self.lang = False
        self.dark = False
        self.viewport = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        if tag == 'a':
            self.hrefs.append(attrs.get('href', ''))
        if tag == 'style':
            self.styles += 1
        if tag == 'main':
            self.main += 1
        if tag == 'h1':
            self.titles += 1
        if tag == 'html':
            self.lang = bool(attrs.get('lang'))
            self.dark = attrs.get('class') == 'dark'
        if tag == 'meta' and attrs.get('name') == 'viewport':
            self.viewport = True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--design-system', required=True)
    args = parser.parse_args()
    for name, draft in (('investigation', investigation()), ('decision', decision())):
        run = subprocess.run([sys.executable, str(SCRIPT), '--design-system', args.design_system],
                             input=draft, text=True, capture_output=True, check=True)
        path = Path(run.stdout.strip())
        content = path.read_text(encoding='utf-8')
        parsed = Structure()
        parsed.feed(content)
        assert parsed.lang and parsed.dark and parsed.viewport and parsed.main == parsed.titles == 1
        assert parsed.styles == 2 and all(h.startswith('#') and h[1:] in parsed.ids or h.startswith('https://') for h in parsed.hrefs)
        assert 'trace &lt;worker&gt;&amp; log' in content if name == 'investigation' else '<th scope="row">' in content
        assert 'url(' not in content and '@import' not in content
        print(f'{name}: {path}')


if __name__ == '__main__':
    main()
