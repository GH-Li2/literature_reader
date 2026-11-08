# Third-party notices

This plugin bundles or depends on the following third-party components.

## PDF.js 4.10.38

- Location: `vendor/pdfjs/pdf.mjs`, `vendor/pdfjs/pdf.worker.mjs`
- License: Apache License 2.0
- License text: `vendor/pdfjs/LICENSE`
- Project: https://github.com/mozilla/pdf.js

## PyMuPDF 1.26.5

- Location: `vendor/python/` (full release zip) or installed by `scripts/install-vendor.ps1`
- License: GNU Affero General Public License v3.0 (AGPL-3.0)
- Project: https://github.com/pymupdf/PyMuPDF
- License text: https://www.gnu.org/licenses/agpl-3.0.html

PyMuPDF is **not** covered by this repository's MIT license. If you redistribute
a package that includes `vendor/python/`, review the AGPL-3.0 obligations and
provide the corresponding source / license notices. The GitHub source package
omits `vendor/python/`; the user installs it locally with the setup script.

## DeepSeek Harness

This is a plugin for DeepSeek Harness. DeepSeek Harness itself is not included
in this repository. Its own license and terms apply.
