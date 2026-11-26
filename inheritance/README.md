# Inheritance Visualiser

**[Open the animation](https://fontysvenlo.github.io/animations/inheritance/)** · Goes with: Java, MOOC part 9: inheritance and interfaces · [All animations](../README.md)

Which method is executed? Choose an example:
- *Parts*: `Part`, `Engine`, `ElectricEngine`;
- *Vehicles*: `Vehicle`, `MotorizedVehicle`, `Car`, `Motorcycle`, `Bicycle`, `Moveable`, `Startable`.

Then choose:
- the static type (the variable);
- the dynamic type (the object);
- a method to call, or a type to cast to.

Or pick one of the scenarios. Stepping through `Main.java` and the classes, you see:

1. **Compile time:**
   - whether the variable may refer to the object;
   - where the compiler finds the method, in the static type and its supertypes;
   - or the compile error javac gives.
2. **Runtime:** how Java looks for the method's code from the dynamic type upwards. A call on `this` starts again at the dynamic type, and `super` starts at the superclass. A cast is checked against the dynamic type and can throw a `ClassCastException`.

The class diagram shows all of this. The Lookups tab lists every call with its static type, where it was declared, where the lookup started and which code ran. **Step into the lookup** shows each class the lookup checks. Without it, each lookup is one step.

## Links

The address bar holds the choice and the step: `?example=vehicles&static=Vehicle&dynamic=Car&method=move&step=9`, or `&cast=Startable` instead of `&method`, plus `&detail=0` without stepping into the lookup. For example:
- [search upwards, then `super`](https://fontysvenlo.github.io/animations/inheritance/?example=parts&static=Part&dynamic=ElectricEngine&method=toString);
- [`move()` calls `start()`](https://fontysvenlo.github.io/animations/inheritance/?example=vehicles&static=Vehicle&dynamic=Car&method=move);
- [a `ClassCastException`](https://fontysvenlo.github.io/animations/inheritance/?example=parts&static=Part&dynamic=Part&cast=Engine).

## How it works

- **The code students see:** [`code/inheritance/`](../code/inheritance/), one file per class. `Object.java` is shortened to the two methods the examples use. `Main.java` is generated from the choice.
- **The model:** [`src/inheritance/model/`](../src/inheritance/model/):
  - `hierarchy.ts`: the types, their methods and positions, the lookups and the cast rules;
  - `scenarios.ts`: the choice, the scenarios and the generated `Main.java`;
  - `simulate.ts`: the compile time and runtime steps.
- **The page:** [`src/inheritance/`](../src/inheritance/): `App.svelte`, the components (controls, class diagram, lookups table), the session and the URL.
- **Golden test:** [`java.test.ts`](../src/inheritance/model/java.test.ts) covers all 592 combinations of example, types and method or cast. It is batched to stay fast:
  - one `javac` run for everything that doesn't compile, comparing javac's first error with the model's;
  - one `javac` and one JVM for everything that runs, comparing the output and the `ClassCastException` messages.

Something wrong or unclear? See [Report a problem or suggest an idea](../README.md#report-a-problem-or-suggest-an-idea).
