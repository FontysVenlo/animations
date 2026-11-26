# HashMap Visualiser

**[Open the animation](https://fontysvenlo.github.io/animations/hashmap/)** · Goes with: Java, MOOC part 8: hash maps · [All animations](../README.md)

When are `hashCode` and `equals` called, and what happens when they're missing or wrong? You choose a `Book` implementation and a scenario, then step through `Main.java`, a simplified `HashMap.java` and `Book.java`. The cards show the `Book` objects and the map's 8 lists. The Calls tab lists every map call with how often it called `hashCode` and `equals`. Switching the `Book` keeps you at the same call, so implementations can be compared call by call.

The `Book` implementations are:
- no overrides;
- generated `hashCode` and `equals`;
- `hashCode` returns 4;
- a random `hashCode`;
- `hashCode` on the author only;
- only `equals`;
- only `hashCode`.

The scenarios are the lesson's *Loans*, and *Overwrite or duplicate?*. For a `hashCode` that depends on identity or chance, ↻ draws new numbers.

**Step into hashCode and equals** shows the lines inside those methods. Without it, each call is one step.

## Links

The address bar holds the choice and the step: `?book=generated&scenario=loans&step=42`, plus `&seed=7` after ↻ and `&detail=0` without stepping into `Book`. For example:
- [*Loans* with a random `hashCode`](https://fontysvenlo.github.io/animations/hashmap/?scenario=loans&book=random);
- [*Loans* with `hashCode` returning 4](https://fontysvenlo.github.io/animations/hashmap/?scenario=loans&book=constant);
- [*Overwrite or duplicate?* with only `equals`](https://fontysvenlo.github.io/animations/hashmap/?scenario=overwrite&book=equals-only).

## How it works

- **The code students see:** [`code/hashmap/`](../code/hashmap/). It has `HashMap.java`, a shortened `Object.java` (what `Book` inherits when it doesn't override), and a `Book.java` per implementation in [`book/`](../code/hashmap/book/).
- **The model:** [`src/hashmap/model/`](../src/hashmap/model/):
  - `variants.ts`: the `Book` implementations;
  - `scenarios.ts`: the scenarios and the `Main.java` they generate;
  - `simulate.ts`: follows the code and records a step at each marked line;
  - `javaInt.ts`: Java's `int` arithmetic, for the hash codes.
- **The page:** [`src/hashmap/`](../src/hashmap/): `App.svelte`, the components, the session and the URL.
- **Golden test:** [`java.test.ts`](../src/hashmap/model/java.test.ts) compiles `HashMap.java`, each `Book.java` and the `Main.java` of every `Book` × scenario with `javac`. It runs them with `java` and checks they print exactly what the animation's console shows.

Something wrong or unclear? See [Report a problem or suggest an idea](../README.md#report-a-problem-or-suggest-an-idea).
