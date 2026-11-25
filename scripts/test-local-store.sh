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
git init -q --bare "$fixture/remote.git"
git -C "$fixture/root" remote add origin "$fixture/remote.git"
git -C "$fixture/root" push -q -u origin HEAD
cargo test -p gopass-cli --test local_store -- --ignored --test-threads=1
