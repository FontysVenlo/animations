# Git Graph Visualiser

**[Open the animation](https://fontysvenlo.github.io/animations/git-graph/)** · Goes with: Git, version control · [All animations](../README.md)

A replay of 14 git commands in an empty repository:
- commits on `main`;
- a branch `feat1` (`git branch`, then `git switch`);
- a merge, and an amended commit;
- then `git log`, `git reflog` and `git fsck`.

For each command you see:
- its line in `gitexperiment.sh`;
- what git does, and the same in graph terms;
- the commit graph: each commit is a vertex and each parent an edge, and the branches and HEAD are labels;
- what git prints, in the Terminal tab;
- |V|, |E|, the roots, merges, forks and unreachable commits, and the adjacency list, in the Graph tab.

Click a commit to see everything it can reach: exactly what `git log` prints for it.

With **Predict first** (or the P key), each command first runs without showing what it does. The graph and the terminal still show the repository before it, so you can predict the result, then check it with →.

## Links

The address bar holds the step: `?step=9`, plus `&predict=1` in predict mode. For example:
- [the merge](https://fontysvenlo.github.io/animations/git-graph/?step=9);
- [the amend, which leaves E unreachable](https://fontysvenlo.github.io/animations/git-graph/?step=11);
- [the whole replay in predict mode](https://fontysvenlo.github.io/animations/git-graph/?predict=1).

## How it works

- **The code students see:** [`code/git-graph/gitexperiment.sh`](../code/git-graph/gitexperiment.sh), one command per line.
- **The model:** [`src/git-graph/model/`](../src/git-graph/model/):
  - `history.ts`: each command's output, the commit it adds, which labels move, and the explanations;
  - `graph.ts`: reachability, the statistics and the adjacency list;
  - `simulate.ts`: the steps, with a predict step before each command.
- **The page:** [`src/git-graph/`](../src/git-graph/): `App.svelte`, the components (diagram, explanation, terminal, graph tab), the session and the URL.
- **Golden test:** [`git.test.ts`](../src/git-graph/model/git.test.ts) runs the commands with `git`. A fixed author and fixed dates make the hashes the same every time. After every command it checks:
  - the output;
  - the branches and HEAD;
  - each commit's hash and parents.

  It also checks what the explanations claim about the reflog and `git fsck`. The default branch is `main` (`init.defaultBranch`), as on the students' computers.

Something wrong or unclear? See [Report a problem or suggest an idea](../README.md#report-a-problem-or-suggest-an-idea).
