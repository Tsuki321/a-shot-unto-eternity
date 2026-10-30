# A Shot Unto Eternity

An interactive adaptation of **EternalAnon’s** illustrated CYOA. All nine original pages remain intact, with clickable choices, a live build summary, browser autosave, and formatted Markdown export and import.

**[Play on GitHub Pages](https://tsuki321.github.io/a-shot-unto-eternity/)** · **[Original CYOA](https://imgchest.com/p/9249g6vlm7n)**

## Playing

Click choices on an illustrated page, or use **Choice list** to search, select, and open a full size excerpt. The size menu lets you zoom the entire page. On a phone, **Your build** opens the summary.

The summary flags missing requirements and exceeded allowances while preserving your choices. Use the plus and minus controls in the choice list for repeatable training boons. Your first selected course is your academy course. To change it, deselect your courses and select the new academy course first.

The quest pages let you select up to four quests, adjust their rewards, or skip quests for up to four substitute rewards. Switching modes preserves inactive selections. Only the active mode contributes rewards.

**Export Markdown** downloads a readable dossier, including rule status and a fenced import block. Keep that block to restore your build with **Import build**. No account or server is required; saving uses this browser’s local storage. Import and reset replace the saved build after an in-app confirmation.

## Rules and interpretations

- One academy course and a specialization within it; three boon points. Alternative Studies adds a course without its own specialization. Multipurpose Specialist adds a specialization within any selected course. Both are repeatable. Outside Fate costs two points.
- Up to two sponsors across pages 3–4, or three with A Nobody. A selected sponsor grants both ordinary boons; a single selected sponsor also grants its solo boon.
- Up to six companions and one conspiracy across pages 6–7, including that conspiracy’s printed Focus.
- Up to four quests across pages 8–9. Existing prerequisites unlock printed quest rewards. Without a companion prerequisite, the reward is that companion; without a sponsor prerequisite, choose one ordinary boon from that sponsor. An existing sponsor can instead grant its missing solo boon. Any quest reward can be declined.
- Quest and substitute rewards do not consume the initial companion or sponsor allowance. Initial sponsorship determines automatic solo bonuses. Rewards are evaluated against initial selections, with no circular reward dependencies.
- Skipping quests allows companions not selected initially, conspiracy characters, or boons from sponsors not selected initially. The printed skip rule does not exclude solo boons, so these are available as substitute rewards.
- Some names vary between the character page and quest text. Quest prerequisites are linked to the corresponding character or sponsor. Sponsor boon names in the interface are descriptive labels for source boxes simply titled “Boon”. Printed quest rewards and narrative variants remain in the original artwork; record individual interpretations, equipment variants, and story details in Character notes.

## Files and checks

`site/` is a standalone static site using HTML, CSS, and browser JavaScript. `data.js` maps every selectable source entry to its image region; `rules.js` owns validation, grants, and Markdown serialization. No application build or compilation is needed.

GitHub Actions runs the rule tests and desktop/mobile browser checks before deploying `site/` to GitHub Pages. Checks cover all nine image assets under a repository path, autosave, unavailable storage, export/import, quest rewards, and substitute rewards. Browser screenshots are saved as workflow artifacts.

For development, serve `site/` with an ordinary static HTTP server. Run `npm test` for the rules. Browser tests use Playwright and an internal HTTP server; `npm run test:browser` checks the local files, or `SITE_URL` can point it to a deployed site. Any future build or compilation work belongs in GitHub Actions, per the workspace skill.

## Attribution

Story, writing, layout, and original illustrated pages: **EternalAnon** and their respective artwork creators. This repository is a fan-made interactive adaptation and claims no ownership of the source artwork or text. Source images were recovered from the supplied archive and its linked ImageChest gallery. Local recovery files and saved assistant sessions are excluded from the repository.
