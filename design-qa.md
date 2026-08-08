# Markdown 工具栏 Design QA

This report documents the version 2.3.0 release QA record. Previously verified surfaces remain: Home, reader, split editor, About and update dialogs; Simplified Chinese and English; light and dark themes; table-of-contents navigation, recent-file removal, search, print, back-to-top, editor focus, Markdown highlighting, save/save-as, unsaved-change protection, and transparent application icons. Existing evidence remains under `screenshots/` and `screenshots/en/`.

- Source visual truth: `design-qa-artifacts/toolbar-reference.png`
- Implementation screenshots: `design-qa-artifacts/toolbar-wide.png`, `design-qa-artifacts/toolbar-narrow.png`, `design-qa-artifacts/toolbar-minimum.png`, `design-qa-artifacts/toolbar-dark.png`, `design-qa-artifacts/toolbar-focus.png`
- Combined comparison: `design-qa-artifacts/toolbar-comparison.png`
- Source pixels: 1548 × 222 px
- Focused implementation pixels: 681 × 43 px at CSS pixel density 1
- Full implementation viewports: 1550 × 900, 1100 × 800, 920 × 700 CSS px at device scale factor 1
- State: Chinese interface, split Markdown editing view, light and dark modes

## Full-view comparison evidence

The supplied reference shows the editor toolbar generating a horizontal scrollbar. In the implementation, the toolbar measured `scrollWidth === clientWidth` at all three tested widths:

- 1550 px viewport: toolbar 681 / 681 px; horizontal rule, table and image moved to More Formats.
- 1100 px viewport: toolbar 443 / 443 px; nine lower-priority formats moved to More Formats.
- 920 px viewport: toolbar 347 / 347 px; twelve formats moved to More Formats while Undo, Heading, Bold, Italic and More Formats remained directly available.

Dark mode also measured 347 / 347 px with `overflow-x: hidden`. The More Formats control retained the selected accent treatment and readable contrast.

## Focused region comparison evidence

`toolbar-comparison.png` places the supplied toolbar crop and the focused implementation capture in one view. The reference scrollbar is absent in the implementation, persistent controls remain vertically aligned, and More Formats stays visible at the right edge. Existing source SVG icons were preserved; no target asset was replaced or approximated.

## Required fidelity surfaces

- Fonts and typography: Existing macOS/PingFang system typography, weights and 31 px controls are preserved. Collapsed option labels use the same bilingual translation source as tooltips.
- Spacing and layout rhythm: The 43 px toolbar height, dividers, 3 px control gap and 5 px vertical padding remain unchanged. Orphan dividers hide with their collapsed groups.
- Colors and visual tokens: Toolbar, hover/focus states and the More Formats accent surface continue to use the existing theme tokens in light and dark modes.
- Image quality and assets: All existing toolbar SVG icons remain intact and render sharply at their original size. No new raster asset is required for this behavior change.
- Copy and content: More Formats now contains the exact names of every collapsed command in toolbar order, followed by the extended-format group. Chinese and English labels are present.
- Responsiveness and accessibility: No horizontal scrollbar appears at the three tested widths. All commands remain keyboard reachable through native select controls, focus styles remain visible, and the toolbar keeps its semantic `role="toolbar"` label.

## Interaction and console checks

- Created a browser-mode Markdown document and entered editing mode.
- Inserted Autolink from More Formats and verified `<https://example.com>` in CodeMirror.
- Undid the insertion, inserted Bold Italic, and verified `***粗斜体***` plus its live preview.
- Verified collapsed option lists at 1550, 1100 and 920 px.
- Checked light and dark modes.
- Browser console errors: none.

## Findings

No actionable P0, P1 or P2 differences remain for the requested toolbar behavior. The focused implementation capture is upscaled only inside the comparison board for readability; the actual application renders icons at native scale.

## Comparison history

- Initial supplied state: horizontal scrollbar visible below the toolbar (P1 usability issue).
- Fix: replaced horizontal scrolling with measured priority-based collapsing into More Formats; added divider cleanup and a persistent More Formats control.
- Post-fix evidence: `toolbar-wide.png`, `toolbar-narrow.png`, `toolbar-minimum.png`, `toolbar-dark.png` and `toolbar-comparison.png`; all measured widths have no horizontal overflow.

## Follow-up polish

No P3 follow-up is required for the requested scope.

final result: passed
