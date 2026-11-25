#!/bin/sh
set -eu
fixture=$(mktemp -d)
trap 'rm -rf "$fixture"' EXIT
export GOPASS_FIXTURE=disposable GOPASS_FIXTURE_MOUNT="$fixture/mounted store"
export GIT_AUTHOR_NAME=Fixture GIT_COMMITTER_NAME=Fixture GIT_AUTHOR_EMAIL=fixture@example.invalid GIT_COMMITTER_EMAIL=fixture@example.invalid
GOPASS_HOMEDIR="$fixture/other-config" gopass init --crypto plain --storage fs --path "$GOPASS_FIXTURE_MOUNT" test >/dev/null
printf 'fixture\n' | GOPASS_HOMEDIR="$fixture/other-config" gopass insert fixture
export GOPASS_HOMEDIR="$fixture/config"
gopass init --crypto plain --storage gitfs --path "$fixture/root" test >/dev/null
export GOPASS_FIXTURE_REMOTE="$fixture/remote.git"
git init -q --bare "$GOPASS_FIXTURE_REMOTE"
git -C "$fixture/root" remote add origin "$fixture/remote.git"
git -C "$fixture/root" push -q -u origin HEAD
branch=$(git -C "$fixture/root" branch --show-current)
git clone -q --branch "$branch" "$fixture/remote.git" "$fixture/contributor"
cp -R "$GOPASS_HOMEDIR" "$fixture/contributor-config"
GOPASS_HOMEDIR="$fixture/contributor-config" gopass config mounts.path "$fixture/contributor" >/dev/null
printf 'remote fixture\n' | GOPASS_HOMEDIR="$fixture/contributor-config" gopass insert remote/sample
git -C "$fixture/contributor" push -q origin HEAD
cargo test -p gopass-cli --test local_store -- --ignored --test-threads=1
