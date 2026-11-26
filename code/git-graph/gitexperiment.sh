# Empty commits: only the shape of the history matters.
mkdir gitexperiment && cd gitexperiment && git init # @init
git commit --allow-empty -m "A" # @a
git commit --allow-empty -m "B" # @b
git checkout -b feat1 # @branch
git commit --allow-empty -m "C" # @c
git checkout main # @checkout
git commit --allow-empty -m "D" # @d
git merge feat1 # @merge
git commit --allow-empty -m "E" # @e
git commit --amend --allow-empty -m "EE" # @amend
git log --oneline --graph --all # @log
git reflog # @reflog
git fsck --unreachable --no-reflogs # @fsck
