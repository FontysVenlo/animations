# Animations

Step-by-step animations for programming lessons. Each one lets you step through real code, one line at a time, forwards and backwards, and shows what is hard to see when you only read the code.

**Open them at [fontysvenlo.github.io/animations](https://fontysvenlo.github.io/animations/).**

| Animation | Goes with | What it shows |
|---|---|---|
| [HashMap Visualiser](https://fontysvenlo.github.io/animations/hashmap/) | Java, MOOC part 8: hash maps | When `hashCode` and `equals` are called, for seven `Book` implementations |
| [Inheritance Visualiser](https://fontysvenlo.github.io/animations/inheritance/) | Java, MOOC part 9: inheritance and interfaces | Which method is executed: what the compiler checks with the static type, and how Java finds the method from the dynamic type |

## Using the animations

| Key | Action |
|---|---|
| ← / → (or A / D) | Step back / forward |
| ↑ / ↓ (or W / S) | Previous / next call |
| Home / End | First / last step |
| Space | Play or pause |
| Esc | Restore a maximised card, or leave full screen |

- **Sharing:** the address bar always holds what you chose and the step you are at. Copy it to share exactly what you see, e.g. [`…/inheritance/?example=vehicles&static=Vehicle&dynamic=Car&method=move&step=10`](https://fontysvenlo.github.io/animations/inheritance/?example=vehicles&static=Vehicle&dynamic=Car&method=move&step=10).
- **Projector:** maximise a card to fill the window with larger text, or use full screen.
- **Step into:** each animation can hide its detail steps (the lines inside `hashCode` and `equals`, or each class the method lookup checks), so a call shows as one step.
- **Light and dark:** follows your system setting.

### HashMap Visualiser

You choose a `Book` implementation and a scenario, then step through `Main.java`, a simplified `HashMap.java` and `Book.java`. The cards show the `Book` objects and the map's 8 lists. The Calls tab lists every map call with how often it called `hashCode` and `equals`. Switching the `Book` keeps you at the same call, so implementations can be compared call by call.

The `Book` implementations are:
- no overrides;
- generated `hashCode` and `equals`;
- `hashCode` returns 4;
- a random `hashCode`;
- `hashCode` on the author only;
- only `equals`;
- only `hashCode`.

The scenarios are the lesson's *Loans*, and *Overwrite or duplicate?*. For a `hashCode` that depends on identity or chance, ↻ draws new numbers.

### Inheritance Visualiser

Choose an example (*Parts*: `Part`, `Engine`, `ElectricEngine`; *Vehicles*: `Vehicle`, `MotorizedVehicle`, `Car`, `Motorcycle`, `Bicycle`, `Moveable`, `Startable`). Then choose:
- the static type (the variable);
- the dynamic type (the object);
- a method to call, or a type to cast to.

Or pick one of the scenarios. Stepping through `Main.java` and the classes, you see:

1. **Compile time:**
   - whether the variable may refer to the object;
   - where the compiler finds the method, in the static type and its supertypes;
   - or the compile error javac gives.
2. **Runtime:** how Java looks for the method's code from the dynamic type upwards. A call on `this` starts again at the dynamic type, and `super` starts at the superclass. A cast is checked against the dynamic type and can throw a `ClassCastException`.

The Lookups tab lists every call with its static type, where it was declared, where the lookup started and which code ran.

## Report a problem or suggest an idea

This repository is public: anyone with a GitHub account can open an issue. Go to [**Issues → New issue**](https://github.com/FontysVenlo/animations/issues/new/choose) and pick a form. In an animation, the 💬 button in the header opens the bug form with the animation and a link to your current step already filled in.

| Form | Issue type | Use it when |
|---|---|---|
| **Bug: something is wrong** | Bug | An animation is broken, shows something that real Java doesn't do, or explains something wrongly or unclearly |
| **Idea: an improvement or a new animation** | Feature | Something could be clearer, or a topic deserves an animation of its own |

The issue type is set by the form, so you don't have to choose it. Teachers use a third type, **Task**, for planned work such as "add an animation for streams"; you won't need it.

To make a bug easy to fix:
- include the link to the step (the address bar), so we see exactly what you see;
- say what you expected, and what real Java does if it differs;
- mention your browser, and add a screenshot if it's about how something looks.

### What doesn't belong here

- **Questions about an assignment or the course:** ask your teacher during class.
- **Solutions to assignments, passwords or personal information:** issues are public, so don't post them.

## How it works

Every animation is a small browser app built with [Svelte](https://svelte.dev), [Vite](https://vite.dev) and TypeScript. The code you see is shown with [CodeMirror](https://codemirror.net). The animations share one shell: the layout, the timeline, playback, the keyboard, maximise and full screen, and the shareable URL.

```
java/<animation>/*.java ──(?raw import)──► the code students see, with // @markers
                                             │
choices ──► simulate() ──► one immutable snapshot per step: line, call stack, console, what the visual shows
                                             │
UI renders steps[i]  ·  → = i + 1  ·  ← = i − 1
```

- **Real Java:** the code students see is real Java in [`java/`](java/). Lines the simulation stops on end with a marker such as `// @put.hash`. The marker is removed from the code shown ([`src/lib/lines.ts`](src/lib/lines.ts)).
- **Simulation:** each animation's `simulate()` follows that code by hand and records a snapshot at every step. The current file and line, the call stack, the console and everything the visual needs are in that snapshot. Stepping backwards is just showing an earlier snapshot.
- **Golden tests:** each animation has a `java.test.ts` that compiles and runs the real Java with `javac` and `java`, and checks that it prints exactly what the animation's console shows.
  - For HashMap, it runs every `Book` × scenario.
  - For Inheritance, it covers all 592 combinations, including javac's compile errors and the JVM's `ClassCastException` messages.
  - The tests are skipped when there is no JDK.

```
src/
  lib/            shared: Shell and the other components, StepSession, CodeMirror setup, app.css
  animations.ts   the list of animations (index page, report button)
  index/          the index page
  hashmap/        App, components, session, url, model/ (simulate, scenarios, tests)
  inheritance/    App, components, session, url, model/ (hierarchy, scenarios, simulate, tests)
java/hashmap/, java/inheritance/   the Java students see
index.html, hashmap/index.html, inheritance/index.html   one page per animation
```

## Development

You need Node 22.12 or newer (`.nvmrc` pins the major version) and a JDK (17 or newer) for the golden tests.

```sh
npm install
npm run dev        # dev server at http://localhost:5173/animations/
npm test           # all tests, including the golden Java tests
npm run check      # type-check (svelte-check)
npm run build      # check, then build into dist/
npm run preview    # serve the built site
```

### Adding an animation

1. Add it to `ANIMATIONS` in [`src/animations.ts`](src/animations.ts) (id, title, topic, description, icon). Add its name to the `animation` dropdowns in [`.github/ISSUE_TEMPLATE/bug.yml`](.github/ISSUE_TEMPLATE/bug.yml) and [`idea.yml`](.github/ISSUE_TEMPLATE/idea.yml).
2. Create `<id>/index.html` (copy one of the others) and add it to `build.rollupOptions.input` in [`vite.config.ts`](vite.config.ts).
3. Put the code students see in `java/<id>/`, with `// @marker` comments on the lines to stop on.
4. In `src/<id>/`:
   - write `model/simulate.ts`, whose steps extend `BaseStep` from [`src/lib/trace.ts`](src/lib/trace.ts);
   - write a `Session` that extends `StepSession`;
   - write an `App.svelte` that fills the `Shell`'s snippets (controls, code, visual, lower tabs);
   - write a `main.ts`.
   The two existing animations show the pattern.
5. Add a `model.test.ts` and a golden `java.test.ts`.

Animations that don't step through Java can share the shell too, or use their own page. Anything listed in `animations.ts` appears on the index.

## Contributing

Pull requests are welcome.
- Commit messages and pull request titles follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`, …).
- [CI](.github/workflows/ci.yml) runs the tests and the build on every pull request, and they must pass.
- Dependabot keeps the dependencies and actions up to date.

## Deployment

Every push to `main` is published on GitHub Pages by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The workflow:
1. runs the tests;
2. builds the site for the repository's Pages path;
3. deploys it.

In the repository settings, **Pages → Source** must be **GitHub Actions**.

## License

[MIT](LICENSE)
