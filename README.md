# HashMap Visualiser

This browser app lets students step through a `HashMap`, one line at a time, forwards and backwards. At each step it shows:

- the code: `Main.java`, a simplified `HashMap.java`, the chosen `Book.java` and, where Book doesn't override a method, `Object.java`;
- the Book objects;
- the map's 8 lists;
- what is printed, the calls so far and the call stack.

The point of it is to make visible **when `hashCode` is called and when `equals` is called**, and how that depends on the way
`Book` implements them. It goes with the lesson on hash maps (MOOC part 8).

**Book implementations:**
- no overrides (Object's `hashCode` and `equals`);
- generated `hashCode` and `equals`;
- `hashCode` returns 4;
- a random `hashCode`;
- `hashCode` on the author only;
- only `equals` overridden;
- only `hashCode` overridden.

**Scenarios:**
- *Loans*: the lesson's `Main.java`;
- *Overwrite or duplicate?*: `put(got, 1)`, `put(got, 2)` and `put(got2, 3)`, then `size()`.

## How it works

The map is the MOOC's "array of lists". `put` and `get`:
1. call `key.hashCode()` once;
2. pick a list with `Math.abs(hash % 8)`;
3. check the pairs in that list as `java.util.HashMap` does: `pair.hash == hash && (pair.key == key || key.equals(pair.key))`.

So `equals` only runs when the hash codes match and the keys are different objects.

The Java students see is real Java, in [`java/`](java/):

| File | Contents |
|---|---|
| `java/HashMap.java` | The simplified map |
| `java/Object.java` | A shortened `java.lang.Object`; for display only |
| `java/book/*.java` | One `Book.java` per implementation |

`Main.java` is generated from the scenario data in [`src/model/scenarios.ts`](src/model/scenarios.ts).

- **Simulation:** [`src/model/simulate.ts`](src/model/simulate.ts) follows that code by hand and records an immutable snapshot at every step. Lines are found through end-of-line markers such as `// @put.hash`, which are removed from the code shown.
- **Golden test:** [`src/model/java.test.ts`](src/model/java.test.ts) compiles and runs the real Java for every Book × scenario and checks that it prints exactly what the visualiser's console shows. The test is skipped when there is no JDK.
- **Exact numbers:** hash codes are computed as Java computes them (`String.hashCode`, `71 * hash + …` with int overflow), so the numbers match a real run.
- **Seed:** identity hash codes (Object's `hashCode`) and random numbers come from a seed. **↻** draws new ones.

The books are the ones from the lesson's `Main.java`, but with "George R.R. Martin" spelled correctly. The lesson file says "Gearge", so fix it there too if you want the hash codes in a live demo to match.

## Development

Requires Node 22.12 or newer (`.nvmrc` pins the major version). A JDK is needed for the golden test.

```sh
npm install
npm run dev        # start the dev server
npm test           # run the tests (including the golden Java test)
npm run check      # type-check (svelte-check)
npm run build      # check, then build into dist/
npm run preview    # serve the built site
```

## Adding a Book implementation or a scenario

- **Book:** add `java/book/<id>.java` and mark the lines the simulation stops on, with the same markers as
  [`generated.java`](java/book/generated.java). Then add an entry to `VARIANTS` in [`src/model/variants.ts`](src/model/variants.ts).
  If the new `hashCode` or `equals` behaves in a new way, add a case for it in `simulate.ts`.
- **Scenario:** add an entry to `SCENARIOS` in [`src/model/scenarios.ts`](src/model/scenarios.ts).
- Then run `npm test`.

## Using the app

| Key | Action |
|---|---|
| ← / → (or A / D) | step back / forward |
| ↑ / ↓ (or W / S) | previous / next map call |
| Home / End | first / last step |
| Space | play or pause |

- **Step into hashCode and equals:** turn it off to skip the lines inside Book. Each call then shows as one step with its result.
- **Calls tab:** one row per map call, with how often it called `hashCode` and `equals`. Click a call to go there.
  Switching the Book keeps you at the same call, so implementations can be compared call by call.
- **Projector:** maximise a card to make it fill the window and scale up, or use full screen.
- **Sharing:** the URL holds the Book, the scenario, the step and, after ↻, the seed. For example,
  `?book=constant&scenario=loans&step=120` links to that moment.

## Deployment

Every push to `main` is published on GitHub Pages by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It
runs the tests, builds the site for the repository's Pages path and deploys it. In the repository settings,
**Pages → Source** must be **GitHub Actions**. Other branches and pull requests are checked by
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).
